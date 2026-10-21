import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', protect, getDashboardStats);

export default router;
