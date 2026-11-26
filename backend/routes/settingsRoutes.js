import express from 'express';
import {
  getSettings,
  updateProfile,
  changePassword,
  createUser,
  toggleUserStatus,
  getWardSecretariesList,
  registerWardSecretary,
  toggleWardSecretaryStatus,
} from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// General User management
router.post('/users', protect, authorize('superadmin', 'district_admin'), createUser);
router.patch('/users/:id/toggle-status', protect, authorize('superadmin', 'district_admin'), toggleUserStatus);

// Dedicated Ward Secretary Account Management
router.get('/ward-secretaries', protect, authorize('superadmin', 'district_admin', 'subadmin'), getWardSecretariesList);
router.post('/ward-secretaries', protect, authorize('superadmin', 'district_admin'), registerWardSecretary);
router.patch('/ward-secretaries/:id/toggle-status', protect, authorize('superadmin', 'district_admin'), toggleWardSecretaryStatus);

export default router;
