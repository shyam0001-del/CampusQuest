import { Response } from 'express';
import { Types } from 'mongoose';
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

    const query: any = { role: 'student', isActive: { $ne: false } };

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

    // Retrieve students matching filters
    const students = await User.find(query)
      .select('name email avatar rollNumber department section coins points xp level streak createdAt')
      .lean();

    const studentIds = students.map((s) => s._id);

    // Build matching criteria for single grouped submissions aggregation
    const submissionMatch: any = {
      student: { $in: studentIds },
    };
    if (subjectId && typeof subjectId === 'string' && Types.ObjectId.isValid(subjectId)) {
      submissionMatch.subject = new Types.ObjectId(subjectId);
    }
    if (timeFilter) {
      Object.assign(submissionMatch, timeFilter);
    }

    // Single aggregation query across all students to eliminate N+1 roundtrips
    const groupedStats = await Submission.aggregate([
      { $match: submissionMatch },
      {
        $group: {
          _id: '$student',
          tasksCompleted: { $sum: 1 },
          earlyBirdBonuses: {
            $sum: {
              $cond: [{ $gt: ['$bonusRankAwarded', 0] }, 1, 0],
            },
          },
          periodPoints: { $sum: { $ifNull: ['$rewardPoints', 0] } },
          periodCoins: { $sum: { $ifNull: ['$rewardCoins', 0] } },
          latestSubmissionDate: { $max: '$submittedAt' },
        },
      },
    ]);

    // Build lookup map by student ID string
    const statsMap = new Map<
      string,
      {
        tasksCompleted: number;
        earlyBirdBonuses: number;
        periodPoints: number;
        periodCoins: number;
        latestSubmissionDate: Date;
      }
    >();

    for (const stat of groupedStats) {
      statsMap.set(stat._id.toString(), stat);
    }

    // Combine student record with aggregated submission statistics
    const studentStats = students.map((student) => {
      const stats = statsMap.get(student._id.toString());
      const tasksCompleted = stats?.tasksCompleted || 0;
      const earlyBirdBonuses = stats?.earlyBirdBonuses || 0;

      let periodPoints = student.points || 0;
      let periodCoins = student.coins || 0;

      // If time filtered or subject filtered, compute period specific points
      if (period === 'weekly' || period === 'monthly' || subjectId) {
        periodPoints = stats?.periodPoints || 0;
        periodCoins = stats?.periodCoins || 0;
      }

      return {
        ...student,
        tasksCompleted,
        earlyBirdBonuses,
        leaderboardPoints: periodPoints,
        leaderboardCoins: periodCoins,
        latestSubmissionDate: stats?.latestSubmissionDate || student.createdAt,
      };
    });

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
