import { Router } from 'express';
import authRoutes from './authRoutes';
import subjectRoutes from './subjectRoutes';
import taskRoutes from './taskRoutes';
import submissionRoutes from './submissionRoutes';
import leaderboardRoutes from './leaderboardRoutes';
import analyticsRoutes from './analyticsRoutes';
import achievementRoutes from './achievementRoutes';
import notificationRoutes from './notificationRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/tasks', taskRoutes);
router.use('/submissions', submissionRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/achievements', achievementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);

export default router;
