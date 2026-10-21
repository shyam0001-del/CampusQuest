import { Router } from 'express';
import { getGlobalLeaderboard } from '../controllers/leaderboardController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getGlobalLeaderboard);

export default router;
