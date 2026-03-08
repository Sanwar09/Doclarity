import express from 'express';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';

import { extractTextFromBuffer } from '../services/documentParser.js';
import { extractTextFromImage } from '../services/ocr.js';
import { analyzeWithDocumentIntelligence } from '../services/documentIntelligence.js';
import { createRagDocument } from '../services/ragStore.js';

dotenv.config();

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

router.post('/', async (req, res) => {
  try {
    const { docId, docType, documentName } = req.body || {};
    if (!docId) {
      return res.status(400).json({ message: 'docId is required' });
    }

    const filePath = path.join(UPLOAD_DIR, docId);
    if (!fssync.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found', filePath });
    }

    const fileBuf = await fs.readFile(filePath);
    const { text, kind } = await extractTextFromBuffer(fileBuf);
    if (!text || text.length < 50) {
      return res.status(400).json({ message: 'Could not extract readable text from document.' });
    }

    const pageEstimate = estimatePages(text);
    const analysis = await analyzeWithDocumentIntelligence({
      text,
      docTypeHint: docType,
      pageEstimate,
      fileKind: kind
    });

    const rag = createRagDocument({
      rawText: text,
      analysis: analysis.dashboard,
      documentName: documentName || docId,
      sourceDocId: docId
    });

    return res.json({
      ...analysis.dashboard,
      ...rag,
      structured: analysis.structured,
      analysisEngine: analysis.meta.engine,
      analysisMeta: analysis.meta
    });
  } catch (error) {
    console.error('[ANALYZE:file] error:', error);
    return res.status(500).json({ message: 'Analysis failed', error: error?.message || 'Unknown error' });
  }
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/') || file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }
    cb(new Error('Only image uploads are allowed'));
  }
});

router.post('/text', async (req, res) => {
  try {
    const { text, docType } = req.body || {};
    const clean = String(text || '').trim();
    if (clean.length < 30) {
      return res.status(400).json({ message: 'Please provide at least ~30 characters of text.' });
    }

    const analysis = await analyzeWithDocumentIntelligence({
      text: clean,
      docTypeHint: docType,
      pageEstimate: estimatePages(clean),
      fileKind: 'text'
    });

    const rag = createRagDocument({
      rawText: clean,
      analysis: analysis.dashboard,
      documentName: 'Quick Analysis (Text)',
      sourceDocId: null
    });

    return res.json({
      ...analysis.dashboard,
      ...rag,
      structured: analysis.structured,
      analysisEngine: analysis.meta.engine,
      analysisMeta: analysis.meta
    });
  } catch (error) {
    console.error('[ANALYZE:text] error:', error);
    return res.status(500).json({ message: 'Analysis failed', error: error?.message || 'Unknown error' });
  }
});

router.post('/image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const rawLang = req.body?.lang || 'eng';
    const text = await extractTextFromImage(req.file.buffer, rawLang);
    if (!text || text.length < 30) {
      return res.status(400).json({ message: 'Could not extract enough text from the image.' });
    }

    const analysis = await analyzeWithDocumentIntelligence({
      text,
      docTypeHint: req.body?.docType,
      pageEstimate: estimatePages(text),
      fileKind: 'image-ocr'
    });

    const rag = createRagDocument({
      rawText: text,
      analysis: analysis.dashboard,
      documentName: 'Quick Analysis (Image)',
      sourceDocId: null
    });

    return res.json({
      ...analysis.dashboard,
      ...rag,
      structured: analysis.structured,
      analysisEngine: analysis.meta.engine,
      analysisMeta: analysis.meta
    });
  } catch (error) {
    console.error('[ANALYZE:image] error:', error);
    return res.status(500).json({ message: 'Analysis failed', error: error?.message || 'Unknown error' });
  }
});

router.get('/:docId', async (_req, res) => {
  return res.status(501).json({ message: 'Not implemented. Persist analysis by docId to use this.' });
});

function estimatePages(text) {
  const value = String(text || '');
  const markerMatches = value.match(/\bpage\s+\d+\b/gi) || [];
  const markerEstimate = markerMatches.length;
  const charEstimate = Math.max(1, Math.ceil(value.length / 3000));
  return Math.max(markerEstimate, charEstimate);
}

export default router;
