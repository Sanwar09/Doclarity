import mammoth from 'mammoth';
import { extractPdfText } from './pdfText.js';

export async function extractTextFromBuffer(fileBuf) {
  const kind = detectFileKind(fileBuf);

  if (kind === 'pdf') {
    const text = await extractPdfText(fileBuf);
    return { text, kind };
  }

  if (kind === 'docx') {
    const out = await mammoth.extractRawText({ buffer: fileBuf });
    const text = tidy(out.value || '');
    return { text, kind };
  }

  // Fallback: assume UTF-8 text
  return { text: tidy(fileBuf.toString('utf8')), kind: 'unknown' };
}

function detectFileKind(buf) {
  if (!buf || buf.length < 4) return 'unknown';
  const magic = buf.slice(0, 4).toString('ascii');
  if (magic.startsWith('%PDF')) return 'pdf';
  if (magic.startsWith('PK')) return 'docx'; // DOCX is a ZIP
  return 'unknown';
}

function tidy(t) {
  return String(t)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}