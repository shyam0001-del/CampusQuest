import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleArchiveSubject,
} from '../controllers/subjectController';
import { protect, adminOnly, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getSubjects);
router.get('/:id', optionalAuth, getSubjectById);
router.post('/', protect, adminOnly, createSubject);
router.put('/:id', protect, adminOnly, updateSubject);
router.patch('/:id/archive', protect, adminOnly, toggleArchiveSubject);

export default router;
