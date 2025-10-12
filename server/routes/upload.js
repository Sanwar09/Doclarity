import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads') });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Use Multer’s generated filename as docId (matches the saved file)
    const docId = req.file.filename;
    res.json({ docId, originalName: req.file.originalname });
  } catch (e) {
	console.error('Upload error:', e);
    res.status(500).json({ message: 'Upload failed' });
  }
});

export default router;