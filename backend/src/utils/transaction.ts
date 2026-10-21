import mongoose, { ClientSession } from 'mongoose';

/**
 * Checks whether the current MongoDB deployment supports multi-document transactions.
 * Transactions require a replica set or sharded cluster.
 */
export const isTransactionSupported = (): boolean => {
  try {
    const client = (mongoose.connection as any).client;
    const topology = client?.topology?.description;
    if (!topology) return false;
    const type = topology.type;
    return type === 'ReplicaSetWithPrimary' || type === 'ReplicaSetNoPrimary' || type === 'Sharded';
  } catch {
    return false;
  }
};

/**
 * Executes a function inside a MongoDB transaction if the topology supports it,
 * with automatic retries on WriteConflict and TransientTransactionError.
 * If transactions are not supported (e.g. standalone local test instances),
 * executes the operation without a session.
 */
export const runTransactionWithRetry = async <T>(
  operation: (session: ClientSession | null) => Promise<T>,
  maxRetries = 10
): Promise<T> => {
  if (!isTransactionSupported()) {
    // Standalone fallback: execute directly without a session
    return operation(null);
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();
    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore abort cleanup error
        }
      }

      // Check if error is transient / write conflict eligible for transaction retry
      const errMsg = (error?.message || '').toLowerCase();
      const isTransient =
        error?.hasErrorLabel?.('TransientTransactionError') ||
        error?.hasErrorLabel?.('UnknownTransactionCommitResult') ||
        error?.code === 112 || // WriteConflict
        errMsg.includes('write conflict') ||
        errMsg.includes('writeconflict') ||
        errMsg.includes('transienttransactionerror') ||
        (error?.code === 11000 && (errMsg.includes('bonusrankawarded') || error?.keyPattern?.bonusRankAwarded));

      if (isTransient && attempt < maxRetries) {
        // Exponential backoff with random jitter to prevent herd collisions
        const jitter = Math.floor(Math.random() * 50);
        const backoffMs = jitter + 35 * Math.pow(1.4, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new Error('Transaction exceeded maximum retry attempts');
};
