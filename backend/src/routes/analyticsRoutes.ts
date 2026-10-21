import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', optionalAuth, getDashboardStats);

export default router;
