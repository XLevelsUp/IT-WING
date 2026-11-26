import express from 'express';
import { getReportData, exportReportExcel } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/data', protect, getReportData);
router.get('/export/excel', protect, exportReportExcel);

export default router;
