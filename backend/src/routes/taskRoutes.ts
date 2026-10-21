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
import { protect, adminOnly, optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, getTasks);
router.get('/:id', optionalAuth, getTaskById);
router.get('/:id/roster', protect, adminOnly, getTaskRoster);
router.get('/:id/export-csv', protect, adminOnly, exportRosterCSV);
router.post('/', protect, adminOnly, createTask);
router.put('/:id', protect, adminOnly, updateTask);
router.delete('/:id', protect, adminOnly, deleteTask);

export default router;
