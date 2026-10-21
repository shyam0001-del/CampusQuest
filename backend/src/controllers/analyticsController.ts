import { Response } from 'express';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { Submission } from '../models/Submission';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const now = new Date();
    const isStudent = req.user.role === 'student';
    const isFacultyOrAdmin =
      req.user.role === 'admin' ||
      (req.user.role === 'faculty' && req.user.approvalStatus === 'approved');

    if (!isStudent && !isFacultyOrAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Account approval required to access faculty analytics',
      });
      return;
    }

    const userId = req.user._id;

    // Validate days parameter: must be strictly 7, 14, or 30 if provided
    let numDays = 7;
    if (req.query.days !== undefined) {
      const parsed = parseInt(req.query.days as string, 10);
      if (![7, 14, 30].includes(parsed)) {
        res.status(400).json({
          success: false,
          message: 'Invalid date range: days must be exactly 7, 14, or 30',
        });
        return;
      }
      numDays = parsed;
    }

    // 1. Tasks Counts
    const totalTasks = await Task.countDocuments({ status: 'published' });
    const totalSubjects = await Subject.countDocuments({ isArchived: false });
    const totalStudents = await User.countDocuments({ role: 'student' });

    let completedSubmissions = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    let myCoins = req.user.coins || 0;
    let myPoints = req.user.points || 0;
    let myStreak = req.user.streak || 0;
    let myRank = 1;

    // Submissions for student
    if (isStudent && userId) {
      const mySubs = await Submission.find({ student: userId });
      completedSubmissions = mySubs.length;

      const subTaskIds = new Set(mySubs.map((s) => s.task.toString()));
      const publishedTasks = await Task.find({ status: 'published' });

      publishedTasks.forEach((task) => {
        if (!subTaskIds.has(task._id.toString())) {
          if (new Date(task.deadline) < now) {
            overdueTasks++;
          } else {
            pendingTasks++;
          }
        }
      });

      // Rank calculation
      const higherRanked = await User.countDocuments({
        role: 'student',
        $or: [
          { points: { $gt: myPoints } },
          { points: myPoints, coins: { $gt: myCoins } },
        ],
      });
      myRank = higherRanked + 1;
    } else {
      // Admin/Faculty overall counts
      completedSubmissions = await Submission.countDocuments();
      const publishedTasks = await Task.find({ status: 'published' });
      overdueTasks = publishedTasks.filter((t) => new Date(t.deadline) < now).length;
      pendingTasks = totalTasks - overdueTasks;
    }

    // 2. Upcoming Deadlines (nearest 5 published tasks)
    const upcomingDeadlines = await Task.find({
      status: 'published',
      deadline: { $gte: now },
    })
      .populate('subject', 'name code color icon')
      .sort({ deadline: 1 })
      .limit(5);

    // Attach student submission status to upcoming deadlines
    let upcomingWithStatus: any[] = upcomingDeadlines.map((t) => t.toObject());
    if (isStudent && userId) {
      const subMap = new Set(
        (await Submission.find({ student: userId, task: { $in: upcomingDeadlines.map((t) => t._id) } })).map((s) =>
          s.task.toString()
        )
      );
      upcomingWithStatus = upcomingDeadlines.map((t) => ({
        ...t.toObject(),
        isSubmitted: subMap.has(t._id.toString()),
      }));
    }

    // 3. Subject-wise Progress
    const subjects = await Subject.find({ isArchived: false }).limit(6);
    const subjectProgress = await Promise.all(
      subjects.map(async (subj) => {
        const count = await Task.countDocuments({ subject: subj._id, status: 'published' });
        let done = 0;
        if (isStudent && userId) {
          done = await Submission.countDocuments({ subject: subj._id, student: userId });
        } else {
          done = await Submission.countDocuments({ subject: subj._id });
        }
        return {
          id: subj._id,
          name: subj.name,
          code: subj.code,
          color: subj.color,
          icon: subj.icon,
          totalTasks: count,
          completedTasks: done,
          progressPct: count > 0 ? Math.round((done / count) * 100) : 0,
        };
      })
    );

    // 4. Activity Volume (strictly 7, 14, or 30 days)
    // Earned coin types: excludes spent coins, penalties, reversals, or unrelated admin adjustments
    const EARNED_COIN_TYPES = ['base_reward', 'early_bird_bonus', 'streak_reward', 'achievement_reward'];

    const startDate = new Date(now.getTime() - (numDays - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const activityData: { day: string; date: string; submissions: number; coins: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      nextD.setHours(0, 0, 0, 0);

      const subFilter: any = { submittedAt: { $gte: d, $lt: nextD } };
      const coinFilter: any = {
        createdAt: { $gte: d, $lt: nextD },
        type: { $in: EARNED_COIN_TYPES },
        amount: { $gt: 0 },
      };

      if (isStudent && userId) {
        subFilter.student = userId;
        coinFilter.student = userId;
      }

      const daySubs = await Submission.countDocuments(subFilter);
      const dayCoinTx = await CoinTransaction.find(coinFilter);
      const dayCoins = dayCoinTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const month = d.getMonth() + 1;
      const dateNum = d.getDate();
      const label = numDays > 7 ? `${month}/${dateNum}` : dayNames[d.getDay()];

      activityData.push({
        day: label,
        date: `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`,
        submissions: daySubs,
        coins: dayCoins,
      });
    }

    // 5. Recent Activity Feed
    let recentActivity: any[] = [];
    if (isStudent && userId) {
      const recentTx = await CoinTransaction.find({ student: userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('task', 'title category');

      recentActivity = recentTx.map((tx) => ({
        id: tx._id,
        type: tx.type,
        title: tx.reason,
        amount: tx.amount,
        timestamp: tx.createdAt,
      }));
    } else {
      const recentSubs = await Submission.find()
        .sort({ submittedAt: -1 })
        .limit(6)
        .populate('student', 'name avatar rollNumber')
        .populate('task', 'title category');

      recentActivity = recentSubs.map((sub: any) => ({
        id: sub._id,
        type: 'submission',
        title: `${sub.student?.name || 'A student'} submitted "${sub.task?.title || 'an assignment'}"`,
        amount: sub.rewardCoins,
        timestamp: sub.submittedAt,
        student: sub.student,
      }));
    }

    // 6. Personal Targets
    const targetWeeklyTasks = req.user?.targetWeeklyTasks || 5;
    const targetCoinGoal = req.user?.targetCoinGoal || 500;

    // This week's completed submissions
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let weeklyCompletedCount = 0;
    if (isStudent && userId) {
      weeklyCompletedCount = await Submission.countDocuments({
        student: userId,
        submittedAt: { $gte: startOfWeek },
      });
    }

    const targets = {
      weeklyTasks: {
        target: targetWeeklyTasks,
        completed: weeklyCompletedCount,
        percentage: Math.min(100, Math.round((weeklyCompletedCount / targetWeeklyTasks) * 100)),
      },
      coinGoal: {
        target: targetCoinGoal,
        current: myCoins,
        percentage: Math.min(100, Math.round((myCoins / targetCoinGoal) * 100)),
      },
    };

    res.json({
      success: true,
      stats: {
        totalTasks,
        completedSubmissions,
        pendingTasks,
        overdueTasks,
        coinsEarned: myCoins,
        points: myPoints,
        streak: myStreak,
        rank: myRank,
        totalStudents,
        totalSubjects,
      },
      upcomingDeadlines: upcomingWithStatus,
      subjectProgress,
      activityData,
      recentActivity,
      targets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching dashboard stats' });
  }
};
