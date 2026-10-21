import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleArchiveSubject,
} from '../controllers/subjectController';
import { protect, facultyOrAdmin, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getSubjects);
router.get('/:id', optionalAuth, getSubjectById);
router.post('/', protect, facultyOrAdmin, createSubject);
router.put('/:id', protect, facultyOrAdmin, updateSubject);
router.patch('/:id/archive', protect, facultyOrAdmin, toggleArchiveSubject);

export default router;
