// server/services/ocr.js
import Tesseract from 'tesseract.js';
import os from 'os';
import path from 'path';

const DEFAULT_LANG = process.env.OCR_LANG || 'eng';

let worker;
let currentLang = '';

const tidy = (t = '') =>
  String(t)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Turn anything (array, CSV, "eng+spa", JSON string) into "eng+spa"
// Turn anything into "eng+spa" style string
function normalizeLang(input) {
  try {
    if (Array.isArray(input)) {
      return input.map(s => String(s).trim()).filter(Boolean).join('+') || DEFAULT_LANG;
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      // Handle JSON array string '["eng","spa"]'
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(s => String(s).trim()).filter(Boolean).join('+') || DEFAULT_LANG;
        }
      }
      const parts = trimmed.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      return parts.length ? parts.join('+') : DEFAULT_LANG;
    }
    if (input && typeof input === 'object') {
      const vals = Object.values(input).map(v => String(v).trim()).filter(Boolean);
      return vals.length ? vals.join('+') : DEFAULT_LANG;
    }
    return DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export async function initOcr(langInput = DEFAULT_LANG) {
  if (!worker) {
    worker = await createWorker({
      // Use a public tessdata mirror for language files
      // You can change to your own URL if needed.
      langPath: process.env.TESSDATA_URL || 'https://tessdata.projectnaptha.com/4.0.0',
      // Optional logs
      logger: process.env.TESSERACT_LOG === 'true' ? (m) => console.log('[OCR]', m) : undefined,
      // Optional cache directory; avoid write on read-only fs (comment out if needed)
      cachePath: path.join(os.tmpdir(), 'tessdata')
    });
  }
  const lang = normalizeLang(langInput);
  if (currentLang !== lang) {
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    currentLang = lang;
  }
}

/**
 * Extract text from an image Buffer using Tesseract only.
 */
// export async function extractTextFromImage(buffer, lang = DEFAULT_LANG) {
//   await initOcr(lang);
//   const { data } = await worker.recognize(buffer);
//   return tidy(data?.text || '');
// }
export async function extractTextFromImage(buffer, langInput) {
  const lang = normalizeLang(langInput || DEFAULT_LANG);

  // Recognize directly (internally spins up a worker once)
  const { data } = await Tesseract.recognize(buffer, lang, {
    // Uncomment to debug Tesseract:
    // logger: (m) => console.log('[OCR]', m)
  });

  return tidy(data?.text || '');
}

/**
 * Gracefully stop the worker (optional, e.g., on shutdown).
 */
export async function stopOcr() {
  try {
    if (worker) await worker.terminate();
  } finally {
    worker = undefined;
    currentLang = '';
  }
}