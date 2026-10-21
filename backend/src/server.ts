import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development, allow localhost ports and Vercel preview URLs
      return callback(null, true);
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

// Serve persistent uploads folder
const uploadsPath = path.join(process.cwd(), ENV.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsPath));

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
