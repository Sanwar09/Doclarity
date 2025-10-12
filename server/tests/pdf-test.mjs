// test.mjs
import fs from 'fs';
import { extractPdfText } from '../services/pdfText.js';

const buf = fs.readFileSync('../sample/Agreement-Purchase-MBRS-project.pdf');
extractPdfText(buf).then(t => {
  console.log('OK, got text len:', t.length);
}).catch(console.error);