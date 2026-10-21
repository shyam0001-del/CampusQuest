import mongoose, { Document, Schema, Types } from 'mongoose';

export type CoinTransactionType =
  | 'base_reward'
  | 'early_bird_bonus'
  | 'streak_reward'
  | 'achievement_reward'
  | 'admin_adjustment';

export interface ICoinTransaction extends Document {
  student: Types.ObjectId;
  task?: Types.ObjectId;
  amount: number;
  type: CoinTransactionType;
  reason: string;
  balanceAfter: number;
  createdAt: Date;
}

const CoinTransactionSchema = new Schema<ICoinTransaction>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task' },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['base_reward', 'early_bird_bonus', 'streak_reward', 'achievement_reward', 'admin_adjustment'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    balanceAfter: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

CoinTransactionSchema.index({ student: 1, createdAt: -1 });

// Partial unique index to strictly prevent duplicate base or early-bird rewards per student per task
CoinTransactionSchema.index(
  { student: 1, task: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      task: { $exists: true },
      type: { $in: ['base_reward', 'early_bird_bonus'] },
    },
  }
);

export const CoinTransaction = mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);
