import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAchievement extends Document {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: 'submission' | 'streak' | 'coins' | 'special';
  xpReward: number;
  coinReward: number;
  createdAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    category: {
      type: String,
      enum: ['submission', 'streak', 'coins', 'special'],
      default: 'submission',
    },
    xpReward: { type: Number, default: 50 },
    coinReward: { type: Number, default: 25 },
  },
  { timestamps: true }
);

export const Achievement = mongoose.model<IAchievement>('Achievement', AchievementSchema);

export interface IUserAchievement extends Document {
  student: Types.ObjectId;
  achievement: Types.ObjectId;
  unlockedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    achievement: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true, index: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserAchievementSchema.index({ student: 1, achievement: 1 }, { unique: true });

export const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', UserAchievementSchema);
