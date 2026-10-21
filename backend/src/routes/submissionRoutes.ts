import { Router } from 'express';
import {
  submitWork,
  getMySubmissions,
  reviewSubmission,
} from '../controllers/submissionController';
import { protect, facultyOrAdmin, approvedOnly } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/submit', protect, approvedOnly, upload.single('file'), submitWork);
router.get('/my-submissions', protect, getMySubmissions);
router.patch('/:id/review', protect, facultyOrAdmin, reviewSubmission);

export default router;
