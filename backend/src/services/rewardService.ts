import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Task, ITask } from '../models/Task';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { Notification } from '../models/Notification';
import { checkAndAwardAchievements } from './achievementService';

export interface RewardCalculationResult {
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  totalPoints: number;
  bonusRank: 1 | 2 | 3 | null;
  isLate: boolean;
  streakUpdated: boolean;
  currentStreak: number;
  newLevel: number;
}

export const processSubmissionReward = async (
  studentId: Types.ObjectId | string,
  taskId: Types.ObjectId | string,
  serverTimestamp: Date = new Date()
): Promise<RewardCalculationResult> => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const student = await User.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // 1. Check deadline & lateness
  const isLate = serverTimestamp > new Date(task.deadline);
  let baseCoins = task.maxBasePoints || 100;
  let bonusCoins = 0;
  let bonusRank: 1 | 2 | 3 | null = null;

  if (isLate) {
    // Deduct late penalty
    const penaltyPct = task.bonusRules?.latePenaltyPct ?? 50;
    baseCoins = Math.max(10, Math.round(baseCoins * (1 - penaltyPct / 100)));
  } else {
    // 2. Determine Early Bird Bonus with atomic count of prior on-time submissions for this task
    const priorSubmissionsCount = await Submission.countDocuments({
      task: task._id,
      student: { $ne: student._id },
      isLate: false,
    });

    if (priorSubmissionsCount === 0) {
      bonusRank = 1;
      bonusCoins = task.bonusRules?.firstBonus ?? 50;
    } else if (priorSubmissionsCount === 1) {
      bonusRank = 2;
      bonusCoins = task.bonusRules?.secondBonus ?? 35;
    } else if (priorSubmissionsCount === 2) {
      bonusRank = 3;
      bonusCoins = task.bonusRules?.thirdBonus ?? 20;
    }
  }

  const totalCoins = baseCoins + bonusCoins;
  const totalPoints = totalCoins; // Points track with coins for leaderboard

  // 3. Update Streak
  const todayStr = serverTimestamp.toISOString().split('T')[0];
  let streak = student.streak || 0;
  let streakUpdated = false;

  if (student.lastSubmittedDate) {
    const lastDate = new Date(student.lastSubmittedDate);
    const currentDate = new Date(todayStr);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak += 1;
      streakUpdated = true;
    } else if (diffDays > 1) {
      streak = 1;
      streakUpdated = true;
    }
    // If diffDays === 0, submitted on same day, streak stays the same
  } else {
    streak = 1;
    streakUpdated = true;
  }

  // 4. Update Student Balances, XP, and Level
  const newXP = (student.xp || 0) + Math.round(totalCoins * 1.5);
  // Level curve: Level = floor(sqrt(XP / 80)) + 1
  const newLevel = Math.max(1, Math.floor(Math.sqrt(newXP / 80)) + 1);

  const updatedStudent = await User.findByIdAndUpdate(
    student._id,
    {
      $inc: {
        coins: totalCoins,
        points: totalPoints,
        xp: Math.round(totalCoins * 1.5),
      },
      $set: {
        streak,
        lastSubmittedDate: todayStr,
        level: newLevel,
      },
    },
    { new: true }
  );

  const newBalance = updatedStudent?.coins || student.coins + totalCoins;

  // 5. Create Auditable Coin Transactions
  await CoinTransaction.create({
    student: student._id,
    task: task._id,
    amount: baseCoins,
    type: 'base_reward',
    reason: `Submission completed: "${task.title}"${isLate ? ' (Late)' : ''}`,
    balanceAfter: newBalance - bonusCoins,
  });

  if (bonusCoins > 0 && bonusRank) {
    const rankLabels = ['1st', '2nd', '3rd'];
    await CoinTransaction.create({
      student: student._id,
      task: task._id,
      amount: bonusCoins,
      type: 'early_bird_bonus',
      reason: `Early Bird Podium Bonus (${rankLabels[bonusRank - 1]} submitter): "${task.title}"`,
      balanceAfter: newBalance,
    });
  }

  // 6. Send Reward Notification
  await Notification.create({
    user: student._id,
    title: bonusRank ? `🎉 Submission Reward + ${bonusRank === 1 ? '🥇 1st' : bonusRank === 2 ? '🥈 2nd' : '🥉 3rd'} Place Bonus!` : '🎉 Submission Reward Earned!',
    message: `You earned ${totalCoins} coins (${baseCoins} base${bonusCoins ? ` + ${bonusCoins} bonus` : ''}) for submitting "${task.title}".`,
    type: 'reward_earned',
    link: `/tasks/${task._id}`,
  });

  // 7. Check and trigger achievements
  await checkAndAwardAchievements(student._id, {
    bonusRank,
    streak,
    totalCoins: newBalance,
    taskCategory: task.category,
  });

  return {
    baseCoins,
    bonusCoins,
    totalCoins,
    totalPoints,
    bonusRank,
    isLate,
    streakUpdated,
    currentStreak: streak,
    newLevel,
  };
};
