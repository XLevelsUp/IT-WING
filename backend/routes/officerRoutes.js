import express from 'express';
import {
  getOfficers,
  getOfficerById,
  createOfficer,
  updateOfficer,
  deleteOfficer,
  exportOfficersExcel,
} from '../controllers/officerController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getOfficers);
router.get('/export', protect, exportOfficersExcel);
router.get('/:id', protect, getOfficerById);

router.post('/', protect, authorize('superadmin', 'district_admin'), createOfficer);
router.put('/:id', protect, authorize('superadmin', 'district_admin'), updateOfficer);
router.delete('/:id', protect, authorize('superadmin', 'district_admin'), deleteOfficer);

export default router;
