import express from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  exportMembersExcel,
} from '../controllers/memberController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMembers);
router.get('/export', protect, exportMembersExcel);
router.get('/:id', protect, getMemberById);

router.post('/', protect, createMember);
router.put('/:id', protect, updateMember);
router.delete('/:id', protect, authorize('superadmin', 'district_admin'), deleteMember);

export default router;
