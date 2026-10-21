import { Response } from 'express';
import { Achievement, UserAchievement } from '../models/Achievement';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allAchievements = await Achievement.find().sort({ coinReward: 1 });

    let unlockedMap = new Set<string>();
    let unlockedDates: Record<string, Date> = {};

    if (req.user) {
      const userAchievements = await UserAchievement.find({ student: req.user._id });
      userAchievements.forEach((ua) => {
        unlockedMap.add(ua.achievement.toString());
        unlockedDates[ua.achievement.toString()] = ua.unlockedAt;
      });
    }

    const achievementsWithStatus = allAchievements.map((ach) => {
      const isUnlocked = unlockedMap.has(ach._id.toString());
      return {
        ...ach.toObject(),
        isUnlocked,
        unlockedAt: unlockedDates[ach._id.toString()] || null,
      };
    });

    const unlockedCount = achievementsWithStatus.filter((a) => a.isUnlocked).length;

    res.json({
      success: true,
      achievements: achievementsWithStatus,
      totalCount: allAchievements.length,
      unlockedCount,
      completionPercentage: allAchievements.length > 0 ? Math.round((unlockedCount / allAchievements.length) * 100) : 0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching achievements' });
  }
};
