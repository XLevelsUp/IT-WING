import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / citizen & admin accessible projects listing
router.get('/', getProjects);
router.get('/:id', getProjectById);

// Admin-only mutation routes
router.post('/', protect, authorize('superadmin', 'district_admin'), createProject);
router.put('/:id', protect, authorize('superadmin', 'district_admin'), updateProject);
router.delete('/:id', protect, authorize('superadmin', 'district_admin'), deleteProject);

export default router;
