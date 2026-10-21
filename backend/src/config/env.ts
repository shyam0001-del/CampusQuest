import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env file across standard project root and backend locations
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../backend/.env'),
];

let envLoaded = false;
for (const p of candidateEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

// Strict requirement: MONGODB_URI must be provided; never silently fall back to localhost
if (!process.env.MONGODB_URI) {
  console.error('❌ [FATAL CONFIG ERROR] MONGODB_URI is missing from your environment.');
  console.error('   Please define MONGODB_URI in your backend/.env file with your MongoDB Atlas connection string.');
  console.error('   CampusQuest will NOT silently fall back to localhost.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

// Fail safely in production if critical JWT variables are missing or default
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'campusquest_super_secret_jwt_key_2026') {
    console.error('❌ [FATAL CONFIG ERROR] A secure, non-default JWT_SECRET is required in production.');
    process.exit(1);
  }
}

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: isProduction ? (process.env.JWT_SECRET as string) : (process.env.JWT_SECRET || 'campusquest_super_secret_jwt_key_2026'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  TRUST_PROXY: process.env.TRUST_PROXY || (isProduction ? '1' : 'loopback'),
};
