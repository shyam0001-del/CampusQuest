import { Response } from 'express';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { Subject } from '../models/Subject';
import { AuthRequest } from '../middleware/authMiddleware';

export const getGlobalLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      period = 'all_time', // 'weekly' | 'monthly' | 'semester' | 'all_time'
      department,
      section,
      subjectId,
      limit = 50,
      page = 1,
    } = req.query;

    const query: any = { role: 'student' };

    if (department && department !== 'all') {
      query.department = department;
    }
    if (section && section !== 'all') {
      query.section = section;
    }

    // Determine time boundary if period is weekly or monthly
    let timeFilter: any = null;
    const now = new Date();
    if (period === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFilter = { submittedAt: { $gte: oneWeekAgo } };
    } else if (period === 'monthly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeFilter = { submittedAt: { $gte: oneMonthAgo } };
    }

    // If subjectId is specified or period is constrained, calculate dynamic scores from submissions
    let students = await User.find(query)
      .select('name email avatar rollNumber department section coins points xp level streak createdAt')
      .lean();

    // Attach completed tasks count and early bonus count for each student
    const studentStats = await Promise.all(
      students.map(async (student) => {
        const subQuery: any = { student: student._id };
        if (subjectId) subQuery.subject = subjectId;
        if (timeFilter) Object.assign(subQuery, timeFilter);

        const submissions = await Submission.find(subQuery).select('rewardPoints rewardCoins bonusRankAwarded submittedAt isLate');

        const tasksCompleted = submissions.length;
        const earlyBirdBonuses = submissions.filter((s) => s.bonusRankAwarded && s.bonusRankAwarded > 0).length;
        
        let periodPoints = student.points;
        let periodCoins = student.coins;

        // If time filtered, compute period specific points
        if (period === 'weekly' || period === 'monthly' || subjectId) {
          periodPoints = submissions.reduce((sum, s) => sum + (s.rewardPoints || 0), 0);
          periodCoins = submissions.reduce((sum, s) => sum + (s.rewardCoins || 0), 0);
        }

        const latestSubmission = submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];

        return {
          ...student,
          tasksCompleted,
          earlyBirdBonuses,
          leaderboardPoints: periodPoints,
          leaderboardCoins: periodCoins,
          latestSubmissionDate: latestSubmission?.submittedAt || student.createdAt,
        };
      })
    );

    // Apply deterministic tie-breaking policy:
    // 1. Leaderboard Points (DESC)
    // 2. Early Bird Bonuses Count (DESC)
    // 3. Leaderboard Coins (DESC)
    // 4. Streak (DESC)
    // 5. Earlier registration / stable ID
    studentStats.sort((a, b) => {
      if (b.leaderboardPoints !== a.leaderboardPoints) {
        return b.leaderboardPoints - a.leaderboardPoints;
      }
      if (b.earlyBirdBonuses !== a.earlyBirdBonuses) {
        return b.earlyBirdBonuses - a.earlyBirdBonuses;
      }
      if (b.leaderboardCoins !== a.leaderboardCoins) {
        return b.leaderboardCoins - a.leaderboardCoins;
      }
      if (b.streak !== a.streak) {
        return b.streak - a.streak;
      }
      return a._id.toString().localeCompare(b._id.toString());
    });

    // Assign rank 1-indexed
    const rankedStudents = studentStats.map((st, idx) => ({
      ...st,
      rank: idx + 1,
    }));

    // Find current user's rank
    let currentUserRank = null;
    if (req.user && req.user.role === 'student') {
      const found = rankedStudents.find((s) => s._id.toString() === req.user!._id.toString());
      if (found) {
        currentUserRank = {
          rank: found.rank,
          points: found.leaderboardPoints,
          coins: found.leaderboardCoins,
          tasksCompleted: found.tasksCompleted,
        };
      }
    }

    // Top 3 Podium
    const topThree = rankedStudents.slice(0, 3);
    const restOfLeaderboard = rankedStudents.slice(3, Number(limit));

    res.json({
      success: true,
      period,
      topThree,
      leaderboard: rankedStudents.slice(0, Number(limit)),
      totalParticipants: rankedStudents.length,
      currentUserRank,
      tieBreakerPolicy: 'Ranked by: Total Points > Early Bird Bonuses > Total Coins > Streak > Earliest Timestamp',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching leaderboard' });
  }
};
