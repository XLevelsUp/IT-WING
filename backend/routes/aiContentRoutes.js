import express from 'express';
import {
  generateContent,
  saveGeneratedContent,
  getSavedContents,
  deleteSavedContent,
} from '../controllers/aiContentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', protect, generateContent);
router.post('/save', protect, saveGeneratedContent);
router.get('/saved', protect, getSavedContents);
router.delete('/:id', protect, deleteSavedContent);

export default router;
