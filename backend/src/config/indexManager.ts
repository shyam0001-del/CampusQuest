import mongoose from 'mongoose';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';

export interface IndexCheckItem {
  modelName: string;
  name: string;
  keys: Record<string, number>;
  unique: boolean;
  isPartial: boolean;
}

export const REQUIRED_INDEXES: IndexCheckItem[] = [
  {
    modelName: 'Submission',
    name: 'task_1_student_1',
    keys: { task: 1, student: 1 },
    unique: true,
    isPartial: false,
  },
  {
    modelName: 'Submission',
    name: 'task_1_bonusRankAwarded_1',
    keys: { task: 1, bonusRankAwarded: 1 },
    unique: true,
    isPartial: true,
  },
  {
    modelName: 'CoinTransaction',
    name: 'student_1_task_1_type_1',
    keys: { student: 1, task: 1, type: 1 },
    unique: true,
    isPartial: true,
  },
  {
    modelName: 'User',
    name: 'email_1',
    keys: { email: 1 },
    unique: true,
    isPartial: false,
  },
];

export interface IndexProvisionResult {
  success: boolean;
  alreadyPresent: string[];
  newlyCreated: string[];
  missing: string[];
  warnings: string[];
}

/**
 * Inspects active indexes across Mongoose models without dropping any existing indexes.
 */
export const inspectActiveIndexes = async (): Promise<Record<string, any[]>> => {
  const result: Record<string, any[]> = {};

  try {
    result.Submission = await Submission.collection.indexes();
  } catch (err: any) {
    result.Submission = [];
  }

  try {
    result.CoinTransaction = await CoinTransaction.collection.indexes();
  } catch (err: any) {
    result.CoinTransaction = [];
  }

  try {
    result.User = await User.collection.indexes();
  } catch (err: any) {
    result.User = [];
  }

  return result;
};

/**
 * Checks whether an index matches a required definition by matching keys and uniqueness.
 */
const matchesIndex = (existing: any, req: IndexCheckItem): boolean => {
  const existingKey = existing.key || {};
  const reqKey = req.keys;

  const existingKeys = Object.keys(existingKey);
  const reqKeys = Object.keys(reqKey);

  if (existingKeys.length !== reqKeys.length) return false;
  for (const k of reqKeys) {
    if (existingKey[k] !== reqKey[k]) return false;
  }

  if (req.unique && !existing.unique) return false;
  if (req.isPartial && !existing.partialFilterExpression) return false;

  return true;
};

/**
 * Safe, idempotent index provisioning.
 * Uses Model.createIndexes() which NEVER drops existing or operational DBA indexes.
 */
export const ensureDatabaseIndexes = async (): Promise<IndexProvisionResult> => {
  const report: IndexProvisionResult = {
    success: true,
    alreadyPresent: [],
    newlyCreated: [],
    missing: [],
    warnings: [],
  };

  try {
    // 1. Inspect existing indexes prior to provisioning
    const beforeIndexes = await inspectActiveIndexes();

    for (const req of REQUIRED_INDEXES) {
      const activeList = beforeIndexes[req.modelName] || [];
      const found = activeList.some((idx) => matchesIndex(idx, req));
      if (found) {
        report.alreadyPresent.push(`${req.modelName}.${req.name}`);
      }
    }

    // 2. Safe, non-destructive index creation for all models
    // createIndexes() creates missing indexes and is a no-op for existing identical indexes
    await Promise.all([
      Submission.createIndexes(),
      CoinTransaction.createIndexes(),
      User.createIndexes(),
    ]);

    // 3. Verify indexes after creation
    const afterIndexes = await inspectActiveIndexes();

    for (const req of REQUIRED_INDEXES) {
      const activeList = afterIndexes[req.modelName] || [];
      const found = activeList.some((idx) => matchesIndex(idx, req));
      const qualifiedName = `${req.modelName}.${req.name}`;

      if (found) {
        if (!report.alreadyPresent.includes(qualifiedName)) {
          report.newlyCreated.push(qualifiedName);
        }
      } else {
        report.missing.push(qualifiedName);
        report.success = false;
        report.warnings.push(`Required index ${qualifiedName} could not be verified on database.`);
      }
    }
  } catch (error: any) {
    report.success = false;
    report.warnings.push(`Index provisioning encountered an error: ${error.message}`);
  }

  return report;
};
