import express from 'express';
import {
  login,
  registerCitizen,
  getLocationOptions,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', registerCitizen);
router.post('/signup', registerCitizen);
router.get('/location-options', getLocationOptions);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
