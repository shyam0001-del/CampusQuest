import mongoose, { Document, Schema, Types } from 'mongoose';

export type TaskCategory =
  | 'assignment'
  | 'lab_activity'
  | 'presentation'
  | 'practical_record'
  | 'project'
  | 'other';

export type TaskStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface ITaskBonusRules {
  firstBonus: number;
  secondBonus: number;
  thirdBonus: number;
  latePenaltyPct: number;
}

export interface ITaskAttachment {
  name: string;
  url: string;
  size?: number;
}

export interface ITask extends Document {
  title: string;
  description: string;
  instructions: string;
  subject: Types.ObjectId;
  category: TaskCategory;
  deadline: Date;
  maxBasePoints: number;
  bonusRules: ITaskBonusRules;
  attachments: ITaskAttachment[];
  allowedSubmissionTypes: ('file' | 'url' | 'text')[];
  allowResubmission: boolean;
  status: TaskStatus;
  submissionCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    category: {
      type: String,
      enum: ['assignment', 'lab_activity', 'presentation', 'practical_record', 'project', 'other'],
      default: 'assignment',
      index: true,
    },
    deadline: { type: Date, required: true, index: true },
    maxBasePoints: { type: Number, default: 100 },
    bonusRules: {
      firstBonus: { type: Number, default: 50 },
      secondBonus: { type: Number, default: 35 },
      thirdBonus: { type: Number, default: 20 },
      latePenaltyPct: { type: Number, default: 50 },
    },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        size: { type: Number },
      },
    ],
    allowedSubmissionTypes: {
      type: [String],
      enum: ['file', 'url', 'text'],
      default: ['file', 'url', 'text'],
    },
    allowResubmission: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'archived'],
      default: 'published',
      index: true,
    },
    submissionCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ status: 1, deadline: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
