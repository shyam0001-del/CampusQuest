import { Router } from 'express';
import {
  register,
  login,
  demoLogin,
  getMe,
  updateProfile,
  getPendingFaculty,
  approveFaculty,
  rejectFaculty,
} from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo-login', demoLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Admin-Only Faculty Verification & Approval Workflow
router.get('/faculty/pending', protect, adminOnly, getPendingFaculty);
router.patch('/faculty/:id/approve', protect, adminOnly, approveFaculty);
router.patch('/faculty/:id/reject', protect, adminOnly, rejectFaculty);

export default router;
