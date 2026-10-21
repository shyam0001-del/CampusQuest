import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = 'student' | 'faculty' | 'admin';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  facultyDesignation?: string;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
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
  isActive: boolean;
  deactivatedAt?: Date;
  deactivatedBy?: Types.ObjectId;
  deactivationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
    facultyDesignation: { type: String, default: '', trim: true },
    rejectionReason: { type: String, default: '', trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
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
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deactivationReason: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Helpful index for leaderboard tie-breakers
UserSchema.index({ points: -1, coins: -1, createdAt: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
