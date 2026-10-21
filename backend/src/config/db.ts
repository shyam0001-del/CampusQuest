import mongoose from 'mongoose';
import { ENV } from './env';
import { ensureDatabaseIndexes } from './indexManager';

// Helper to mask any credentials before printing database error messages
const sanitizeErrorMessage = (error: any): string => {
  if (!error) return 'Unknown database error';
  const msg = typeof error === 'string' ? error : error.message || error.toString();
  return msg.replace(/\/\/([^:]+):([^@]+)@/g, '//$1:****@');
};

export const connectDB = async (): Promise<void> => {
  try {
    if (!ENV.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined. Please configure your MongoDB Atlas connection string in .env');
    }

    mongoose.set('strictQuery', false);

    // Default to 'campusquest' database name if not specified in the URI path
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      dbName: 'campusquest',
      serverSelectionTimeoutMS: 10000,
    });

    const host = conn.connection.host;
    const name = conn.connection.name;
    const isAtlas = host.includes('mongodb.net');

    console.log(`[MongoDB] Connected successfully to ${isAtlas ? 'MongoDB Atlas' : 'database'}: ${host}/${name}`);

    // Verify and provision required unique & partial indexes safely without dropping existing indexes
    const indexReport = await ensureDatabaseIndexes();
    if (indexReport.success) {
      console.log(`[MongoDB Indexes] Verified all required unique & partial indexes (Already present: ${indexReport.alreadyPresent.length}, Newly created: ${indexReport.newlyCreated.length})`);
    } else {
      console.warn(`⚠️ [MongoDB Indexes] Warning: some required indexes are missing: ${indexReport.missing.join(', ')}`);
    }
  } catch (error: any) {
    console.error('❌ [MongoDB Connection Error]', sanitizeErrorMessage(error));
    process.exit(1);
  }
};
