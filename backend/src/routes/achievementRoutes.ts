import { Router } from 'express';
import { getAchievements } from '../controllers/achievementController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getAchievements);

export default router;
