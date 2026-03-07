import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOAD_DIR });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.filename) {
      return res.status(400).json({ message: 'No file received' });
    }

    const docId = req.file.filename;
    return res.json({ docId, originalName: req.file.originalname });
  } catch (e) {
    console.error('Upload error:', e);
    return res.status(500).json({ message: 'Upload failed' });
  }
});

export default router;
