import express from 'express';
import {
  getDistrictOverview,
  getConstituencies,
  getConstituencyById,
  getPaguthiDetails,
  getWards,
  getWardById,
  createWard,
  updateWard,
  deleteWard,
} from '../controllers/districtController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getDistrictOverview);
router.get('/constituencies', protect, getConstituencies);
router.get('/constituencies/:id', protect, getConstituencyById);
router.get('/constituencies/:id/paguthi/:paguthiName', protect, getPaguthiDetails);
router.get('/wards', protect, getWards);
router.get('/wards/:id', protect, getWardById);

router.post('/wards', protect, authorize('superadmin', 'district_admin'), createWard);
router.put('/wards/:id', protect, authorize('superadmin', 'district_admin'), updateWard);
router.delete('/wards/:id', protect, authorize('superadmin', 'district_admin'), deleteWard);

export default router;
