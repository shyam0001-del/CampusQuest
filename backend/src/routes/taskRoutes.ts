import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskRoster,
  exportRosterCSV,
} from '../controllers/taskController';
import { protect, facultyOrAdmin, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getTasks);
router.get('/:id', optionalAuth, getTaskById);
router.get('/:id/roster', protect, facultyOrAdmin, getTaskRoster);
router.get('/:id/export-csv', protect, facultyOrAdmin, exportRosterCSV);
router.post('/', protect, facultyOrAdmin, createTask);
router.put('/:id', protect, facultyOrAdmin, updateTask);
router.delete('/:id', protect, facultyOrAdmin, deleteTask);

export default router;
