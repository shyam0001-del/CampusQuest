import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  avatar: string;
  rollNumber: string;
  department: string;
  year: string;
  section: string;
  coins: number;
  points: number; // Leaderboard ranking metric
  xp: number;
  level: number;
  streak: number;
  lastSubmittedDate?: string; // YYYY-MM-DD for streak tracking
  targetWeeklyTasks: number;
  targetCoinGoal: number;
  isDemoUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
    avatar: { type: String, default: '' },
    rollNumber: { type: String, default: '', trim: true },
    department: { type: String, default: 'Computer Science & Engineering', trim: true },
    year: { type: String, default: '3rd Year', trim: true },
    section: { type: String, default: 'Section A', trim: true },
    coins: { type: Number, default: 0, index: true },
    points: { type: Number, default: 0, index: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastSubmittedDate: { type: String, default: '' },
    targetWeeklyTasks: { type: Number, default: 5 },
    targetCoinGoal: { type: Number, default: 500 },
    isDemoUser: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Helpful index for leaderboard tie-breakers
UserSchema.index({ points: -1, coins: -1, createdAt: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
