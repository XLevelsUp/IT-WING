import express from 'express';
import {
  bookAppointment,
  trackAppointment,
  getMyCitizenAppointments,
  getAppointments,
  getAppointmentById,
  confirmAppointment,
  rescheduleAppointment,
  rejectAppointment,
  completeAppointment,
  reviewAppointment,
  updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Citizen Routes
router.post('/', (req, res, next) => {
  // Try protect if token exists, otherwise proceed
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
}, bookAppointment);

router.get('/track', trackAppointment);
router.get('/my', protect, getMyCitizenAppointments);

// Subadmin & Admin Appointment Management Routes
router.get('/', protect, authorize('superadmin', 'district_admin', 'subadmin'), getAppointments);
router.get('/:id', protect, getAppointmentById);

router.put('/:id/confirm', protect, authorize('superadmin', 'district_admin', 'subadmin'), confirmAppointment);
router.put('/:id/reschedule', protect, authorize('superadmin', 'district_admin', 'subadmin'), rescheduleAppointment);
router.put('/:id/reject', protect, authorize('superadmin', 'district_admin', 'subadmin'), rejectAppointment);
router.put('/:id/complete', protect, authorize('superadmin', 'district_admin', 'subadmin'), completeAppointment);

// Legacy compatibility
router.put('/:id/review', protect, authorize('superadmin', 'district_admin', 'subadmin'), reviewAppointment);
router.put('/:id', protect, authorize('superadmin', 'district_admin', 'subadmin'), updateAppointmentStatus);

export default router;
