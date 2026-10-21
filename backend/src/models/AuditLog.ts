import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  performedBy: Types.ObjectId;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    ip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
