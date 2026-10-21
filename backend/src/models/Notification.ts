import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'task_published'
  | 'reward_earned'
  | 'deadline_warning'
  | 'rank_change'
  | 'achievement_unlocked'
  | 'general';

export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['task_published', 'reward_earned', 'deadline_warning', 'rank_change', 'achievement_unlocked', 'general'],
      default: 'general',
    },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
