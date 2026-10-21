import { Response } from 'express';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { Submission } from '../models/Submission';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      subject,
      category,
      status = 'published',
      filter, // 'all' | 'pending' | 'submitted' | 'overdue' | 'due_today' | 'due_this_week'
      search,
      sortBy = 'deadline',
      order = 'asc',
    } = req.query;

    const query: any = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (subject) {
      query.subject = subject;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructions: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('subject', 'name code color icon')
      .populate('createdBy', 'name email')
      .sort(sortOptions);

    // If user is logged in, attach their individual submission status
    let userSubmissionsMap: Record<string, any> = {};
    if (req.user && req.user.role === 'student') {
      const submissions = await Submission.find({ student: req.user._id });
      submissions.forEach((s) => {
        userSubmissionsMap[s.task.toString()] = s;
      });
    }

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let enhancedTasks = tasks.map((task) => {
      const userSub = userSubmissionsMap[task._id.toString()];
      const isSubmitted = !!userSub;
      const isOverdue = !isSubmitted && new Date(task.deadline) < now;
      const isDueToday = !isSubmitted && !isOverdue && new Date(task.deadline) <= todayEnd;
      const isDueThisWeek = !isSubmitted && !isOverdue && new Date(task.deadline) <= weekEnd;

      return {
        ...task.toObject(),
        userSubmission: userSub || null,
        userStatus: isSubmitted
          ? (userSub.isLate ? 'late' : 'submitted')
          : (isOverdue ? 'overdue' : 'pending'),
        isDueToday,
        isDueThisWeek,
      };
    });

    // Apply client filter if student
    if (req.user && req.user.role === 'student' && filter && filter !== 'all') {
      if (filter === 'pending') {
        enhancedTasks = enhancedTasks.filter((t) => t.userStatus === 'pending');
      } else if (filter === 'submitted') {
        enhancedTasks = enhancedTasks.filter((t) => t.userStatus === 'submitted' || t.userStatus === 'late');
      } else if (filter === 'overdue') {
        enhancedTasks = enhancedTasks.filter((t) => t.userStatus === 'overdue');
      } else if (filter === 'due_today') {
        enhancedTasks = enhancedTasks.filter((t) => t.isDueToday);
      } else if (filter === 'due_this_week') {
        enhancedTasks = enhancedTasks.filter((t) => t.isDueThisWeek);
      }
    }

    res.json({ success: true, tasks: enhancedTasks, count: enhancedTasks.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching tasks' });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate('subject', 'name code color icon facultyName semester')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Fetch top 3 early bird submitters for this task
    const topEarlySubmitters = await Submission.find({ task: task._id, isLate: false })
      .sort({ submittedAt: 1 })
      .limit(3)
      .populate('student', 'name avatar rollNumber department');

    let userSubmission = null;
    if (req.user && req.user.role === 'student') {
      userSubmission = await Submission.findOne({ task: task._id, student: req.user._id });
    }

    // Count submissions
    const totalSubmissions = await Submission.countDocuments({ task: task._id });

    res.json({
      success: true,
      task,
      topEarlySubmitters,
      userSubmission,
      totalSubmissions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching task' });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      instructions,
      subject,
      category = 'assignment',
      deadline,
      maxBasePoints = 100,
      bonusRules,
      allowedSubmissionTypes = ['file', 'url', 'text'],
      allowResubmission = false,
      attachments = [],
      status = 'published',
    } = req.body;

    if (!title || !subject || !deadline) {
      res.status(400).json({ success: false, message: 'Title, Subject, and Deadline are required' });
      return;
    }

    const subjectObj = await Subject.findById(subject);
    if (!subjectObj) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }

    const task = await Task.create({
      title,
      description: description || '',
      instructions: instructions || '',
      subject,
      category,
      deadline: new Date(deadline),
      maxBasePoints: Number(maxBasePoints),
      bonusRules: bonusRules || {
        firstBonus: 50,
        secondBonus: 35,
        thirdBonus: 20,
        latePenaltyPct: 50,
      },
      allowedSubmissionTypes,
      allowResubmission,
      attachments,
      status,
      createdBy: req.user!._id,
    });

    // Notify enrolled students
    if (status === 'published') {
      const students = await User.find({ role: 'student' }).select('_id');
      const notifications = students.map((s) => ({
        user: s._id,
        title: `📚 New Task: ${title}`,
        message: `A new ${category.replace('_', ' ')} has been posted in ${subjectObj.name}. Submit early for up to +50 bonus coins!`,
        type: 'task_published' as const,
        link: `/tasks/${task._id}`,
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    await AuditLog.create({
      action: 'CREATE_TASK',
      performedBy: req.user!._id,
      targetType: 'Task',
      targetId: task._id.toString(),
      details: { title: task.title, category: task.category, deadline: task.deadline },
    });

    res.status(201).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating task' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.deadline) {
      updates.deadline = new Date(updates.deadline);
    }

    const task = await Task.findByIdAndUpdate(id, updates, { new: true });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await AuditLog.create({
      action: 'UPDATE_TASK',
      performedBy: req.user!._id,
      targetType: 'Task',
      targetId: task._id.toString(),
      details: updates,
    });

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Also remove associated submissions
    await Submission.deleteMany({ task: id });

    await AuditLog.create({
      action: 'DELETE_TASK',
      performedBy: req.user!._id,
      targetType: 'Task',
      targetId: id,
      details: { title: task.title },
    });

    res.json({ success: true, message: 'Task and related submissions deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting task' });
  }
};

export const getTaskRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate('subject');
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Get all students
    const allStudents = await User.find({ role: 'student' }).sort({ rollNumber: 1, name: 1 });
    const submissions = await Submission.find({ task: id });
    const subMap = new Map();
    submissions.forEach((s) => subMap.set(s.student.toString(), s));

    const now = new Date();
    const isDeadlinePassed = now > new Date(task.deadline);

    const roster = allStudents.map((student) => {
      const sub = subMap.get(student._id.toString());
      let status: 'submitted' | 'late' | 'overdue' | 'pending' = 'pending';

      if (sub) {
        status = sub.isLate ? 'late' : 'submitted';
      } else if (isDeadlinePassed) {
        status = 'overdue';
      }

      return {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          avatar: student.avatar,
          department: student.department,
          section: student.section,
        },
        status,
        submission: sub || null,
      };
    });

    const submittedCount = roster.filter((r) => r.status === 'submitted' || r.status === 'late').length;
    const pendingCount = roster.filter((r) => r.status === 'pending').length;
    const overdueCount = roster.filter((r) => r.status === 'overdue').length;

    res.json({
      success: true,
      task,
      roster,
      stats: {
        totalStudents: allStudents.length,
        submittedCount,
        pendingCount,
        overdueCount,
        submissionRate: allStudents.length > 0 ? Math.round((submittedCount / allStudents.length) * 100) : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching task roster' });
  }
};

export const exportRosterCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate('subject', 'name code');
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const allStudents = await User.find({ role: 'student' }).sort({ rollNumber: 1 });
    const submissions = await Submission.find({ task: id });
    const subMap = new Map();
    submissions.forEach((s) => subMap.set(s.student.toString(), s));

    const now = new Date();
    const isDeadlinePassed = now > new Date(task.deadline);

    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Department',
      'Section',
      'Status',
      'Submission Timestamp',
      'Bonus Rank',
      'Coins Awarded',
      'Points Awarded',
      'Submission File / Link',
    ];

    const rows = allStudents.map((st) => {
      const sub = subMap.get(st._id.toString());
      let status = 'Pending';
      if (sub) {
        status = sub.isLate ? 'Late Submission' : 'Submitted';
      } else if (isDeadlinePassed) {
        status = 'Overdue';
      }

      const fileOrUrl = sub ? (sub.fileUrl || sub.submissionUrl || 'Text submission') : 'None';
      const bonusRankStr = sub?.bonusRankAwarded ? `${sub.bonusRankAwarded} place` : 'None';

      return [
        `"${st.rollNumber || 'N/A'}"`,
        `"${st.name}"`,
        `"${st.email}"`,
        `"${st.department || 'CSE'}"`,
        `"${st.section || 'A'}"`,
        `"${status}"`,
        `"${sub ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}"`,
        `"${bonusRankStr}"`,
        sub ? sub.rewardCoins : 0,
        sub ? sub.rewardPoints : 0,
        `"${fileOrUrl}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="roster_${task.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error generating CSV' });
  }
};
