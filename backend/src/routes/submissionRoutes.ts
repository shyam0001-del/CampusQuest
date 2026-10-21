import { Router } from 'express';
import {
  submitWork,
  getMySubmissions,
  reviewSubmission,
} from '../controllers/submissionController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/submit', protect, upload.single('file'), submitWork);
router.get('/my-submissions', protect, getMySubmissions);
router.patch('/:id/review', protect, adminOnly, reviewSubmission);

export default router;
