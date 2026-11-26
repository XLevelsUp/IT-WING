import express from 'express';
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  addIssueActivity,
  deleteIssue,
  exportIssuesExcel,
  startWork,
  completeWork,
  assignIssue,
  getWardSecretaries,
} from '../controllers/issueController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getIssues);
router.get('/ward-secretaries', protect, authorize('superadmin', 'district_admin', 'subadmin'), getWardSecretaries);
router.get('/export', protect, exportIssuesExcel);
router.get('/:id', protect, getIssueById);

router.post('/', protect, createIssue);
router.put('/:id', protect, updateIssue);
router.patch('/:id', protect, updateIssue);
router.put('/:id/assign', protect, authorize('superadmin', 'district_admin', 'subadmin'), assignIssue);
router.patch('/:id/assign', protect, authorize('superadmin', 'district_admin', 'subadmin'), assignIssue);
router.put('/:id/start-work', protect, startWork);
router.post('/:id/start-work', protect, startWork);
router.put('/:id/complete-work', protect, completeWork);
router.post('/:id/complete-work', protect, completeWork);
router.put('/:id/complete', protect, completeWork);
router.post('/:id/complete', protect, completeWork);
router.post('/:id/activity', protect, addIssueActivity);
router.delete('/:id', protect, authorize('superadmin', 'district_admin'), deleteIssue);

export default router;
