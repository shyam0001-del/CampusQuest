import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code: string;
  description: string;
  semester: string;
  academicYear: string;
  facultyName: string;
  color: string;
  icon: string;
  isArchived: boolean;
  enrolledStudents: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    semester: { type: String, default: 'Semester V', trim: true },
    academicYear: { type: String, default: '2026-2027', trim: true },
    facultyName: { type: String, default: 'Faculty In-Charge', trim: true },
    color: { type: String, default: '#8b5cf6' },
    icon: { type: String, default: 'BookOpen' },
    isArchived: { type: Boolean, default: false, index: true },
    enrolledStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

SubjectSchema.index({ code: 1, isArchived: 1 });

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
