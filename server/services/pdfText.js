import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Extract text from a PDF Buffer using pdfjs-dist
export async function extractPdfText(buffer) {
  if (!buffer) throw new Error('No buffer provided to extractPdfText');

  // const uint8 = new Uint8Array(buffer.buffer);
  const uint8 = toUint8Array(buffer);

  // Tolerant header check: allow BOM/junk before header
  const headerView = uint8.subarray(0, Math.min(uint8.length, 1024));
  const headerStr = bytesToAscii(headerView);
  if (!headerStr.includes('%PDF-')) {
    throw new Error('Not a PDF or corrupted file (missing %PDF- header)');
  }


  // Avoid worker setup in Node
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    disableWorker: true,
    // These options can reduce Node quirks; safe to keep
    isEvalSupported: false,
    nativeImageDecoderSupport: 'none',
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({
      normalizeWhitespace: true,
      includeMarkedContent: false,
    });

    fullText += normalizeTextContent(textContent) + '\n\n';
  }

  return tidy(fullText);
}

function toUint8Array(input) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(input)) {
    // Return a plain Uint8Array view over the same memory (no copy)
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  // if (input instanceof Uint8Array && input.constructor === Uint8Array) {
  //   return input;
  // }
  if (ArrayBuffer.isView(input) && input.buffer) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof input === 'string') {
    return new Uint8Array(Buffer.from(input));
  }
  throw new Error('Unsupported input type for pdfjs getDocument');
}

function bytesToAscii(bytes) {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function normalizeTextContent(textContent) {
  // Build text, adding newlines for EOL and rough line breaks using Y movement
  let out = '';
  let lastY = null;

  for (const item of textContent.items) {
    const str = item.str || '';
    const ts = item.transform;
    const y = Array.isArray(ts) ? ts[5] : null;

    // Heuristic: new line if Y moved significantly
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
      out += '\n';
    }

    out += str;
    out += item.hasEOL ? '\n' : ' ';
    lastY = y;
  }

  return out;
}

function tidy(t) {
  return String(t)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}