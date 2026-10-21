import { Types } from 'mongoose';
import { Achievement, UserAchievement } from '../models/Achievement';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { Notification } from '../models/Notification';

export interface AchievementCheckContext {
  bonusRank?: 1 | 2 | 3 | null;
  streak?: number;
  totalCoins?: number;
  taskCategory?: string;
}

export const awardAchievement = async (
  studentId: Types.ObjectId | string,
  slug: string
): Promise<boolean> => {
  const achievement = await Achievement.findOne({ slug });
  if (!achievement) return false;

  // Check if already unlocked
  const existing = await UserAchievement.findOne({
    student: studentId,
    achievement: achievement._id,
  });

  if (existing) return false;

  // Unlock it
  await UserAchievement.create({
    student: studentId,
    achievement: achievement._id,
    unlockedAt: new Date(),
  });

  // Award achievement coins and XP
  const user = await User.findById(studentId);
  if (user) {
    const updatedCoins = user.coins + (achievement.coinReward || 0);
    const updatedXP = user.xp + (achievement.xpReward || 0);
    user.coins = updatedCoins;
    user.xp = updatedXP;
    user.level = Math.max(1, Math.floor(Math.sqrt(updatedXP / 80)) + 1);
    await user.save();

    if (achievement.coinReward > 0) {
      await CoinTransaction.create({
        student: user._id,
        amount: achievement.coinReward,
        type: 'achievement_reward',
        reason: `Unlocked Achievement: "${achievement.title}"`,
        balanceAfter: updatedCoins,
      });
    }

    await Notification.create({
      user: user._id,
      title: `🏆 Achievement Unlocked: ${achievement.title}!`,
      message: `${achievement.description} (+${achievement.coinReward} Coins, +${achievement.xpReward} XP)`,
      type: 'achievement_unlocked',
      link: '/achievements',
    });
  }

  return true;
};

export const checkAndAwardAchievements = async (
  studentId: Types.ObjectId | string,
  context: AchievementCheckContext
): Promise<void> => {
  try {
    const totalSubmissions = await Submission.countDocuments({ student: studentId });

    // 1. First submission ever
    if (totalSubmissions === 1) {
      await awardAchievement(studentId, 'first_submission');
    }

    // 2. 5 submissions finisher
    if (totalSubmissions >= 5) {
      await awardAchievement(studentId, 'assignment_finisher');
    }

    // 3. Early Bird (1st place submission)
    if (context.bonusRank === 1) {
      await awardAchievement(studentId, 'early_bird');
    }

    // 4. Podium Finisher (Top 3 on any task)
    if (context.bonusRank && [1, 2, 3].includes(context.bonusRank)) {
      await awardAchievement(studentId, 'podium_finisher');
    }

    // 5. Consistency Champion (3-day streak)
    if (context.streak && context.streak >= 3) {
      await awardAchievement(studentId, 'consistency_champion');
    }

    // 6. 7-Day Super Streak
    if (context.streak && context.streak >= 7) {
      await awardAchievement(studentId, 'unstoppable_streak');
    }

    // 7. Coin Tycoon (500+ coins)
    if (context.totalCoins && context.totalCoins >= 500) {
      await awardAchievement(studentId, 'coin_tycoon');
    }

    // 8. Category-specific achievements
    if (context.taskCategory === 'lab_activity') {
      const labCount = await Submission.countDocuments({
        student: studentId,
      }).populate({
        path: 'task',
        match: { category: 'lab_activity' },
      });
      if (labCount >= 3) {
        await awardAchievement(studentId, 'lab_master');
      }
    } else if (context.taskCategory === 'presentation') {
      const presCount = await Submission.countDocuments({
        student: studentId,
      }).populate({
        path: 'task',
        match: { category: 'presentation' },
      });
      if (presCount >= 2) {
        await awardAchievement(studentId, 'presentation_pro');
      }
    }
  } catch (error) {
    console.error('Error in checkAndAwardAchievements:', error);
  }
};
