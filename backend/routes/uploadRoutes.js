import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Handle single image upload (field name can be 'image' or 'file')
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('image');
  uploadSingle(req, res, (err) => {
    if (err) {
      // Check if file was sent with field name 'file'
      const uploadFile = upload.single('file');
      uploadFile(req, res, (err2) => {
        if (err2) {
          return res.status(400).json({
            success: false,
            message: err2.message || 'Image upload failed. Allowed formats: JPG, PNG, WebP, GIF (Max 10MB)',
          });
        }
        next();
      });
    } else {
      next();
    }
  });
};

router.post('/', protect, handleUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided. Please choose a valid image to upload.',
    });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    url: fileUrl,
    filePath: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
