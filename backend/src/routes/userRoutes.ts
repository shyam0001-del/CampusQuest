import { Router } from 'express';
import {
  getAllUsers,
  getAllStudents,
  addStudent,
  importStudentsCSV,
  getAuditLogs,
  removeStudent,
  reactivateStudent,
} from '../controllers/userController';
import { protect, facultyOrAdmin, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// Admin-Only: Get all registered users (students, faculty, administrators)
router.get('/', protect, adminOnly, getAllUsers);

router.get('/students', protect, facultyOrAdmin, getAllStudents);
router.post('/students', protect, facultyOrAdmin, addStudent);
router.post('/students/import-csv', protect, facultyOrAdmin, importStudentsCSV);
router.get('/audit-logs', protect, adminOnly, getAuditLogs);

// Admin-Only: Secure student removal / deactivation & reactivation
router.delete('/:id', protect, adminOnly, removeStudent);
router.patch('/:id/reactivate', protect, adminOnly, reactivateStudent);

export default router;
