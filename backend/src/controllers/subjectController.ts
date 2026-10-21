import { Response } from 'express';
import { Subject } from '../models/Subject';
import { Task } from '../models/Task';
import { Submission } from '../models/Submission';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/authMiddleware';

export const getSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, semester, includeArchived } = req.query;

    const query: any = {};
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { facultyName: { $regex: search, $options: 'i' } },
      ];
    }

    if (semester) {
      query.semester = semester;
    }

    const subjects = await Subject.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Enhance each subject with task count and student completion stats
    const enhancedSubjects = await Promise.all(
      subjects.map(async (subj) => {
        const totalTasks = await Task.countDocuments({ subject: subj._id, status: 'published' });
        
        let completedTasks = 0;
        if (req.user && req.user.role === 'student') {
          completedTasks = await Submission.countDocuments({
            subject: subj._id,
            student: req.user._id,
          });
        }

        const totalEnrolled = subj.enrolledStudents?.length || 0;

        return {
          ...subj.toObject(),
          totalTasks,
          completedTasks,
          progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          totalEnrolled,
        };
      })
    );

    res.json({ success: true, subjects: enhancedSubjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching subjects' });
  }
};

export const getSubjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id)
      .populate('createdBy', 'name email avatar')
      .populate('enrolledStudents', 'name email avatar rollNumber department section');

    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }

    const tasks = await Task.find({ subject: subject._id })
      .sort({ deadline: 1 });

    // Category breakdown
    const categoriesCount = {
      assignment: 0,
      lab_activity: 0,
      presentation: 0,
      practical_record: 0,
      project: 0,
      other: 0,
    };

    tasks.forEach((t) => {
      if (t.category && categoriesCount[t.category] !== undefined) {
        categoriesCount[t.category]++;
      }
    });

    let studentSubmissions: Record<string, any> = {};
    if (req.user && req.user.role === 'student') {
      const subs = await Submission.find({ subject: subject._id, student: req.user._id });
      subs.forEach((s) => {
        studentSubmissions[s.task.toString()] = s;
      });
    }

    res.json({
      success: true,
      subject,
      tasks,
      categoriesCount,
      studentSubmissions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching subject' });
  }
};

export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description, semester, academicYear, facultyName, color, icon } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, message: 'Subject name and code are required' });
      return;
    }

    const existingCode = await Subject.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      res.status(409).json({ success: false, message: `Subject with code ${code} already exists` });
      return;
    }

    // Default: enroll all existing students into this subject
    const allStudents = await User.find({ role: 'student' }).select('_id');
    const studentIds = allStudents.map((s) => s._id);

    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      description: description || '',
      semester: semester || 'Semester V',
      academicYear: academicYear || '2026-2027',
      facultyName: facultyName || (req.user?.name || 'Faculty In-Charge'),
      color: color || '#8b5cf6',
      icon: icon || 'BookOpen',
      enrolledStudents: studentIds,
      createdBy: req.user!._id,
    });

    await AuditLog.create({
      action: 'CREATE_SUBJECT',
      performedBy: req.user!._id,
      targetType: 'Subject',
      targetId: subject._id.toString(),
      details: { name: subject.name, code: subject.code },
    });

    res.status(201).json({ success: true, subject });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating subject' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, semester, academicYear, facultyName, color, icon, isArchived } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }

    if (name) subject.name = name;
    if (code) subject.code = code.toUpperCase();
    if (description !== undefined) subject.description = description;
    if (semester) subject.semester = semester;
    if (academicYear) subject.academicYear = academicYear;
    if (facultyName) subject.facultyName = facultyName;
    if (color) subject.color = color;
    if (icon) subject.icon = icon;
    if (isArchived !== undefined) subject.isArchived = isArchived;

    await subject.save();

    await AuditLog.create({
      action: 'UPDATE_SUBJECT',
      performedBy: req.user!._id,
      targetType: 'Subject',
      targetId: subject._id.toString(),
      details: { name: subject.name, code: subject.code, isArchived: subject.isArchived },
    });

    res.json({ success: true, subject });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating subject' });
  }
};

export const toggleArchiveSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }

    subject.isArchived = !subject.isArchived;
    await subject.save();

    await AuditLog.create({
      action: subject.isArchived ? 'ARCHIVE_SUBJECT' : 'UNARCHIVE_SUBJECT',
      performedBy: req.user!._id,
      targetType: 'Subject',
      targetId: subject._id.toString(),
    });

    res.json({ success: true, isArchived: subject.isArchived, message: `Subject ${subject.isArchived ? 'archived' : 'restored'}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error archiving subject' });
  }
};
