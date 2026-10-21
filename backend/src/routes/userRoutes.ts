import { Router } from 'express';
import {
  getAllStudents,
  addStudent,
  importStudentsCSV,
  getAuditLogs,
} from '../controllers/userController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/students', protect, getAllStudents);
router.post('/students', protect, adminOnly, addStudent);
router.post('/students/import-csv', protect, adminOnly, importStudentsCSV);
router.get('/audit-logs', protect, adminOnly, getAuditLogs);

export default router;
