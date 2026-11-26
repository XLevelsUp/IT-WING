import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getPaguthiDashboard,
  getPaguthiWardComplaints,
} from '../controllers/paguthiSeyalaalarController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('paguthi_seyalaalar', 'superadmin', 'district_admin'));

router.get('/dashboard', getPaguthiDashboard);
router.get('/wards/:wardId/complaints', getPaguthiWardComplaints);

export default router;
