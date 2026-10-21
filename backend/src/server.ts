import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Configure Express proxy trust safely
// Do not blindly set to boolean `true` (which trusts all arbitrary client-spoofed headers).
// Instead, trust the configured number of upstream proxy hops (e.g. 1 for Render/Vercel/Railway/ALB/Nginx),
// or a specific subnet ('loopback'), or 'false' for direct connections.
const trustProxyVal = ENV.TRUST_PROXY.toLowerCase().trim();
if (trustProxyVal === 'false' || trustProxyVal === '0') {
  app.set('trust proxy', false);
} else if (trustProxyVal === 'true') {
  app.set('trust proxy', 1);
} else if (!isNaN(Number(trustProxyVal))) {
  app.set('trust proxy', Number(trustProxyVal));
} else {
  const proxyList = ENV.TRUST_PROXY.split(',').map((s) => s.trim());
  app.set('trust proxy', proxyList.length === 1 ? proxyList[0] : proxyList);
}

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  ENV.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development, allow requests from any origin for ease of local testing
      if (ENV.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // In production, strictly enforce allowed origins
      if (allowedOrigins.includes(origin) || origin === ENV.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Request body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Logging in dev
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate Limiting (Relaxed for dev & demonstration, strict for brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve persistent uploads folder with security headers against stored XSS
const uploadsPath = path.isAbsolute(ENV.UPLOAD_DIR)
  ? ENV.UPLOAD_DIR
  : path.join(process.cwd(), ENV.UPLOAD_DIR);
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const dangerousExtensions = ['.html', '.htm', '.svg', '.xml', '.js', '.mjs', '.xhtml'];
      if (dangerousExtensions.includes(ext)) {
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('Content-Type', 'text/plain');
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Health check endpoint (for Render / Vercel uptime monitoring)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CampusQuest Backend API',
    uptime: process.uptime(),
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  const PORT = parseInt(ENV.PORT, 10) || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [CampusQuest Backend] Running on http://localhost:${PORT}`);
    console.log(`📁 [Uploads Directory] ${uploadsPath}`);
  });
};

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});

export default app;
