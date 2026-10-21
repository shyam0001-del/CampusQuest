import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'late' | 'revision_requested' | 'graded';

export interface ISubmission extends Document {
  task: Types.ObjectId;
  student: Types.ObjectId;
  subject: Types.ObjectId;
  submissionType: 'file' | 'url' | 'text';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  submissionUrl?: string;
  textResponse?: string;
  notes?: string;
  status: SubmissionStatus;
  submittedAt: Date;
  isLate: boolean;
  rewardCoins: number;
  rewardPoints: number;
  bonusRankAwarded?: 1 | 2 | 3 | null;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    submissionType: {
      type: String,
      enum: ['file', 'url', 'text'],
      required: true,
    },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileMimeType: { type: String, default: '' },
    submissionUrl: { type: String, default: '' },
    textResponse: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['submitted', 'late', 'revision_requested', 'graded'],
      default: 'submitted',
      index: true,
    },
    submittedAt: { type: Date, default: Date.now, required: true },
    isLate: { type: Boolean, default: false },
    rewardCoins: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    bonusRankAwarded: { type: Number, enum: [1, 2, 3, null], default: null },
    feedback: { type: String, default: '' },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per student per task
SubmissionSchema.index({ task: 1, student: 1 }, { unique: true });
SubmissionSchema.index({ task: 1, submittedAt: 1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
