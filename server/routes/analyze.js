import express from 'express';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import multer from 'multer';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromBuffer } from '../services/documentParser.js';
import { extractTextFromImage } from '../services/ocr.js';
import { safetySettings } from '../services/gemini.js';
// import your existing analyzeDocumentWithGemini function
// import { analyzeDocumentWithGemini } from '...';

dotenv.config();

const DEBUG = process.env.ANALYZE_DEBUG === 'true';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID_SUMMARY = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';   // quality
const MODEL_ID_CHUNK = process.env.GEMINI_CHUNK_MODEL_ID || 'gemini-2.0-flash'; // speed

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const RISK_KEYWORDS = [
	'indemn', 'liabil', 'warrant', 'damages', 'arbitration', 'dispute',
	'jurisdiction', 'governing law', 'limitation of liability', 'waiver',
	'termination', 'renewal', 'auto-renew', 'confidential', 'assignment',
	'non-compete', 'noncompete', 'non-solicit', 'privacy', 'data', 'penalty',
	'late fee', 'interest', 'attorney', 'notice', 'cure period', 'default'
];

const FIN_KEYWORDS = [
	'fee', 'payment', 'charge', 'amount', 'price', 'rate', 'interest',
	'$', '%', 'per month', 'monthly', 'per year', 'annually', 'deposit',
	'balance', 'invoice', 'late', 'penalty'
];

function removeFrequentLines(raw) {
	// Remove headers/footers that repeat on many pages
	const lines = raw.split('\n');
	const freq = new Map();
	for (const l of lines) {
		const s = l.trim();
		if (!s) continue;
		if (s.length > 120) continue; // skip long content lines
		const key = s.toLowerCase();
		freq.set(key, (freq.get(key) || 0) + 1);
	}
	const threshold = Math.max(3, Math.floor(lines.length * 0.01)); // common repeated lines
	const filtered = lines.filter(l => {
		const s = l.trim().toLowerCase();
		if (!s) return true;
		if (s.match(/^page\s+\d+(\s*of\s*\d+)?$/i)) return false;
		if (s.match(/^\d+\s*$/)) return false; // page numbers
		if ((freq.get(s) || 0) > threshold) return false;
		return true;
	});
	return filtered.join('\n');
}

function paragraphs(text) {
	// Split into paragraphs, normalize whitespace
	return text
		.split(/\n{2,}/g)
		.map(p => p.replace(/\s+/g, ' ').trim())
		.filter(p => p.length > 0);
}

function scoreParagraph(p) {
	const lower = p.toLowerCase();
	let score = 0;
	for (const k of RISK_KEYWORDS) if (lower.includes(k)) score += 3;
	for (const k of FIN_KEYWORDS) if (lower.includes(k)) score += 2;
	if (/[0-9]{4}-[0-9]{2}-[0-9]{2}|within\s+\d+\s+days|no\s+less\s+than\s+\d+\s+days/i.test(lower)) score += 2; // dates/deadlines
	if (/[£$€]\s?\d|%\s?(fee|interest|penalty|charge)/i.test(lower)) score += 2; // money
	if (/section\s+\d+(\.\d+)*/i.test(lower)) score += 1; // clause markers
	if (p.length > 800) score -= 1; // discourage very long paragraphs
	return score;
}

function selectTopParagraphs(text, maxChars = 60000, maxParas = 120) {
	const clean = removeFrequentLines(text);
	const paras = paragraphs(clean);
	// rank by heuristic score
	const ranked = paras
		.map(p => ({ p, s: scoreParagraph(p) }))
		.sort((a, b) => b.s - a.s);

	const picked = [];
	let total = 0;
	for (const { p } of ranked) {
		if (picked.length >= maxParas) break;
		const len = p.length + 2;
		if (total + len > maxChars) break;
		picked.push(p);
		total += len;
	}

	// Fallback: if scoring yielded too little, take first N paragraphs
	if (total < 5000) {
		for (const p of paras) {
			if (picked.includes(p)) continue;
			if (picked.length >= maxParas) break;
			const len = p.length + 2;
			if (total + len > maxChars) break;
			picked.push(p);
			total += len;
		}
	}

	return picked.join('\n\n');
}

// Helper to safely extract response text
function getResponseText(resp) {
	if (!resp) return '';
	try {
		const t = resp.text();
		if (t && typeof t === 'string') return t;
	} catch { }
	try {
		const parts = resp.candidates?.[0]?.content?.parts || [];
		return parts.map(p => p.text || '').join('');
	} catch {
		return '';
	}
}

// POST /api/analyze -> analyze a real uploaded document
router.post('/', async (req, res) => {
	try {
		const { docId, docType } = req.body;
		if (!docId) return res.status(400).json({ message: 'docId is required' });

		const filePath = path.join(UPLOAD_DIR, docId);
		if (!fssync.existsSync(filePath)) {
			return res.status(404).json({ message: 'File not found', filePath });
		}

		const fileBuf = await fs.readFile(filePath);

		// Extract text using pdfjs-dist (PDF) or mammoth (DOCX)
		const { text, kind } = await extractTextFromBuffer(fileBuf);

		if (!text || text.length < 50) {
			return res.status(400).json({ message: 'Could not extract readable text from the document' });
		}

		// Run analysis (auto map-reduce for very large docs)
		const analysis = await analyzeDocumentWithGemini(text, docType);

		// Optional: persist analysis by docId (in-memory or DB)
		// analysisStore.set(docId, analysis)

		res.json(analysis);
	} catch (e) {
		console.error('Analyze error:', e);
		res.status(500).json({ message: 'Analysis failed' });
	}
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    // Accept images; allow octet-stream too (browsers sometimes send it)
    if (file.mimetype?.startsWith('image/') || file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }
    cb(new Error('Only image uploads are allowed'));
  }
});

// Analyze pasted text
router.post('/text', async (req, res) => {
  try {
    const { text, docType } = req.body || {};
    const clean = String(text || '').trim();
    if (clean.length < 30) {
      return res.status(400).json({ message: 'Please provide at least ~30 characters of text.' });
    }
    const analysis = await analyzeDocumentWithGemini(clean, docType);
    return res.json(analysis);
  } catch (e) {
    console.error('Analyze text error:', e);
    res.status(500).json({ message: 'Analysis failed' });
  }
});

// OCR image then analyze (Tesseract only)
router.post('/image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // console.log('[ANALYZE:image] bytes:', req.file.buffer.length, 'type:', req.file.mimetype);
    const rawLang = req.body?.lang; // can be undefined
    // console.log('[ANALYZE:image] raw lang:', rawLang);

    const text = await extractTextFromImage(req.file.buffer, rawLang || 'eng');
    // console.log('[ANALYZE:image] OCR text length:', text.length);

    if (!text || text.length < 30) {
      return res.status(400).json({ message: 'Could not extract enough text from the image' });
    }

    // Your existing analysis pipeline
    const analysis = await analyzeDocumentWithGemini(text, req.body?.docType);
    return res.json(analysis);
  } catch (err) {
    console.error('[ANALYZE:image] error:', err);
    return res.status(500).json({
      message: 'Analysis failed',
      error: err?.message,
      ...(process.env.NODE_ENV !== 'production' ? { stack: err?.stack } : {})
    });
  }
});

// GET /api/analyze/:docId -> fetch saved analysis (stub)
router.get('/:docId', async (req, res) => {
	// If you persist analysis, return it here
	return res.status(501).json({ message: 'Not implemented. Persist analysis by docId to use this.' });
});

export default router;

/* ---------------- Helpers ---------------- */

function chunkText(text, maxChars = 45000) {
	if (text.length <= maxChars) return [text];
	const chunks = [];
	let i = 0;
	while (i < text.length) {
		chunks.push(text.slice(i, i + maxChars));
		i += maxChars;
	}
	return chunks;
}

async function analyzeDocumentWithGemini(text, docType) {
	// If text is small enough, single-pass; else map-reduce
	const focused = selectTopParagraphs(text, 60000, 120); // ~15–20k tokens
	const SINGLE_PASS_LIMIT = 70000; // chars
	if (focused.length <= SINGLE_PASS_LIMIT) {
		return summarizeWhole(focused, docType);
	} else {
		const chunks = chunkText(focused, 30000);
		const partials = [];
		for (const [idx, chunk] of chunks.entries()) {
			partials.push(await analyzeChunk(chunk, docType, idx + 1, chunks.length));
		}
		return await mergePartials(partials, docType);
	}
}

// Limits (adjustable via env if you want)
const LIMITS_DEFAULT = {
	keyPoints: 5,
	risks: 6,
	benefits: 4,
	financialTerms: 5,
	importantDates: 5,
	clauses: 6,
	explanationWords: 30,
	quoteChars: 50
};

const LIMITS_COMPACT = {
	keyPoints: 3,
	risks: 4,
	benefits: 3,
	financialTerms: 3,
	importantDates: 3,
	clauses: 4,
	explanationWords: 20,
	quoteChars: 0 // paraphrase only
};

function baseGenerationConfig(schema, maxTokens) {
	return {
		temperature: 0.15,
		topK: 32,
		topP: 0.9,
		maxOutputTokens: maxTokens,
		responseMimeType: 'application/json',
		responseSchema: schema
	};
}

// Separate schemas for summary and clauses
const SUMMARY_ONLY_SCHEMA = {
	type: 'object',
	properties: {
		documentType: { type: 'string' },
		keyPoints: { type: 'array', maxItems: 5, items: { type: 'string' } },
		benefits: { type: 'array', maxItems: 4, items: { type: 'string' } },
		risks: { type: 'array', maxItems: 6, items: { type: 'string' } },
		importantDates: {
			type: 'array', maxItems: 5,
			items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }
		},
		financialTerms: {
			type: 'array', maxItems: 5,
			items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }
		},
		overallRiskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
	},
	required: ['documentType', 'keyPoints', 'risks', 'overallRiskLevel']
};

const CLAUSES_ONLY_SCHEMA = {
	type: 'object',
	properties: {
		clauses: {
			type: 'array', maxItems: 6,
			items: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					section: { type: 'string' },
					explanation: { type: 'string' },
					implications: { type: 'array', maxItems: 2, items: { type: 'string' } },
					actionItems: { type: 'array', maxItems: 2, items: { type: 'string' } },
					importance: { type: 'string', enum: ['low', 'medium', 'high'] }
				},
				required: ['title', 'explanation', 'importance']
			}
		}
	},
	required: ['clauses']
};

// Schema for chunk analysis (inputs to merge)
const CHUNK_SCHEMA = {
	type: 'object',
	properties: {
		keyPoints: { type: 'array', items: { type: 'string' } },
		benefits: { type: 'array', items: { type: 'string' } },
		risks: { type: 'array', items: { type: 'string' } },
		importantDates: {
			type: 'array',
			items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }
		},
		financialTerms: {
			type: 'array',
			items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }
		},
		clauses: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					section: { type: 'string' },
					explanation: { type: 'string' },
					implications: { type: 'array', items: { type: 'string' } },
					actionItems: { type: 'array', items: { type: 'string' } },
					importance: { type: 'string', enum: ['low', 'medium', 'high'] }
				}
			}
		}
	}
};

// Split summarizeWhole into two separate API calls
async function summarizeWhole(text, docType) {
	const model = genAI.getGenerativeModel({
		model: MODEL_ID_SUMMARY,
		systemInstruction: 'You are a legal document analyzer. Be extremely concise. Output valid JSON only.'
	});

	// 1) Get summary with very tight constraints
	const summaryPrompt = [
		'Extract from this legal document:',
		'- documentType (guess if needed)',
		'- 3 keyPoints (each max 10 words)',
		'- 3 risks (each max 10 words)',
		'- 2 benefits (each max 10 words)',
		'- overallRiskLevel (low/medium/high)',
		'Output JSON matching the schema. Nothing else.',
		'Text snippet:',
		truncate(text, 30000) // Much smaller input
	].join('\n');

	let summary = null;
	try {
		const summaryResult = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
			generationConfig: {
				temperature: 0.1,
				topK: 20,
				topP: 0.8,
				maxOutputTokens: 400, // Very small
				responseMimeType: 'application/json',
				responseSchema: {
					type: 'object',
					properties: {
						documentType: { type: 'string' },
						keyPoints: { type: 'array', maxItems: 3, items: { type: 'string' } },
						risks: { type: 'array', maxItems: 3, items: { type: 'string' } },
						benefits: { type: 'array', maxItems: 2, items: { type: 'string' } },
						overallRiskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
					},
					required: ['documentType', 'keyPoints', 'risks', 'overallRiskLevel']
				}
			},
			safetySettings
		});

		const summaryRaw = getResponseText(summaryResult.response);
		const summaryC0 = summaryResult.response?.candidates?.[0];
		
		if (DEBUG) {
			console.log('[ANALYZE:summary] finishReason:', summaryC0?.finishReason);
			console.log('[ANALYZE:summary] raw len:', summaryRaw?.length);
		}

		summary = safeJson(summaryRaw);
	} catch (e) {
		if (DEBUG) console.error('[ANALYZE:summary] Error:', e);
	}

	// Fallback summary
	if (!summary) {
		summary = {
			documentType: docType || 'Legal Document',
			keyPoints: ['Document uploaded', 'Analysis pending', 'Review required'],
			risks: ['Unable to analyze', 'Manual review needed'],
			benefits: ['Document received'],
			overallRiskLevel: 'medium'
		};
	}

	// 2) Extract dates and money separately (deterministic)
	const dates = extractDates(text);
	const money = extractMoney(text);
	
	summary.importantDates = dates.slice(0, 3);
	summary.financialTerms = money.slice(0, 3);

	// 3) Get just 3 clauses with minimal output
	let clauses = [];
	try {
		const clausesPrompt = [
			'Extract 3-5 important clauses from this legal document.',
			'For each clause provide:',
			'- title: descriptive name (max 5 words)',
			'- section: section number if visible (e.g. "Section 4.2" or "Article III")',
			'- explanation: what this clause means in plain English (max 25 words)',
			'- importance: high/medium/low',
			'Output valid JSON only.',
			'Text:',
			truncate(text, 25000)
		].join('\n');

		const clausesResult = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: clausesPrompt }] }],
			generationConfig: {
				temperature: 0.1,
				topK: 20,
				topP: 0.8,
				maxOutputTokens: 600,
				responseMimeType: 'application/json',
				responseSchema: {
					type: 'object',
					properties: {
						clauses: {
							type: 'array',
							maxItems: 5,
							items: {
								type: 'object',
								properties: {
									title: { type: 'string' },
									section: { type: 'string' },
									explanation: { type: 'string' },
									importance: { type: 'string', enum: ['low', 'medium', 'high'] }
								},
								required: ['title', 'explanation', 'importance']
							}
						}
					},
					required: ['clauses']
				}
			},
			safetySettings
		});

		const clausesRaw = getResponseText(clausesResult.response);
		const clausesC0 = clausesResult.response?.candidates?.[0];
		
		if (DEBUG) {
			console.log('[ANALYZE:clauses] finishReason:', clausesC0?.finishReason);
			console.log('[ANALYZE:clauses] raw len:', clausesRaw?.length);
		}

		const clausesData = safeJson(clausesRaw);
		if (clausesData && Array.isArray(clausesData.clauses)) {
			clauses = clausesData.clauses.map((c, i) => ({
				id: `c${i + 1}`,
				title: c.title || `Section ${i + 1}`,
				section: c.section || '',
				originalText: '',
				explanation: c.explanation || 'Review this clause carefully',
				implications: generateImplications(c.title, c.explanation),
				actionItems: generateActionItems(c.title, c.importance),
				importance: c.importance || 'medium'
			}));
		}
	} catch (e) {
		if (DEBUG) console.error('[ANALYZE:clauses] Error:', e);
	}

	// Combine and return
	return {
		summary: {
			documentType: summary.documentType,
			keyPoints: summary.keyPoints || [],
			benefits: summary.benefits || [],
			risks: summary.risks || [],
			importantDates: summary.importantDates || [],
			financialTerms: summary.financialTerms || [],
			overallRiskLevel: summary.overallRiskLevel || 'medium'
		},
		clauses: clauses
	};
}

// Add these helper functions to generate implications and action items
function generateImplications(title, explanation) {
    const implications = [];
    
    // Generate based on common clause types
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('liability') || titleLower.includes('limitation')) {
        implications.push('You may have limited recourse if issues arise');
    }
    if (titleLower.includes('termination') || titleLower.includes('cancellation')) {
        implications.push('Understand the notice period and penalties');
    }
    if (titleLower.includes('payment') || titleLower.includes('fee')) {
        implications.push('Budget for all stated costs and potential fees');
    }
    if (titleLower.includes('confidential')) {
        implications.push('Information sharing may be restricted');
    }
    if (titleLower.includes('dispute') || titleLower.includes('arbitration')) {
        implications.push('Legal options may be limited to specific venues');
    }
    
    return implications.slice(0, 2);
}

function generateActionItems(title, importance) {
    const actions = [];
    const titleLower = title.toLowerCase();
    
    if (importance === 'high') {
        actions.push('Review this clause with extra attention');
    }
    
    if (titleLower.includes('payment') || titleLower.includes('fee')) {
        actions.push('Note all payment amounts and due dates');
    }
    if (titleLower.includes('termination') || titleLower.includes('notice')) {
        actions.push('Calendar important notice periods');
    }
    if (titleLower.includes('liability') || titleLower.includes('indemnity')) {
        actions.push('Consider if you need additional insurance');
    }
    if (titleLower.includes('confidential')) {
        actions.push('Identify what information is covered');
    }
    
    return actions.slice(0, 2);
}

// Add these helper functions for deterministic extraction
function extractDates(text) {
	const dates = [];
	const datePatterns = [
		/(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
		/(\d{4}-\d{2}-\d{2})/g,
		/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
		/(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi
	];
	
	const seen = new Set();
	for (const pattern of datePatterns) {
		const matches = text.match(pattern) || [];
		for (const match of matches) {
			if (!seen.has(match) && dates.length < 5) {
				seen.add(match);
				dates.push({ label: 'Date', value: match });
			}
		}
	}
	
	// Look for relative dates
	const relativePattern = /within\s+(\d+)\s+days?/gi;
	const relativeMatches = text.match(relativePattern) || [];
	for (const match of relativeMatches.slice(0, 2)) {
		dates.push({ label: 'Timeline', value: match });
	}
	
	return dates;
}

function extractMoney(text) {
	const money = [];
	const moneyPatterns = [
		/\$[\d,]+\.?\d*/g,
		/USD\s*[\d,]+\.?\d*/gi,
		/\d+\.?\d*\s*%/g,
		/\b\d+\s*percent\b/gi
	];
	
	const seen = new Set();
	for (const pattern of moneyPatterns) {
		const matches = text.match(pattern) || [];
		for (const match of matches) {
			if (!seen.has(match) && money.length < 5) {
				seen.add(match);
				const label = match.includes('%') || match.includes('percent') ? 'Rate' : 'Amount';
				money.push({ label, value: match });
			}
		}
	}
	
	return money;
}

async function analyzeChunk(chunk, docType, index, total) {
	const model = genAI.getGenerativeModel({
		model: MODEL_ID_CHUNK,
		systemInstruction: buildSystemInstruction(docType)
	});

	const prompt = [
		`You are analyzing part ${index} of ${total} of a legal document.`,
		'Extract: keyPoints, benefits, risks, importantDates (label,value), financialTerms (label,value), clauses[] (title, section, explanation, implications[], actionItems[], importance).',
		'Keep everything concise. No long quotes.',
		'Return only JSON.',
		'Text:',
		'"""',
		truncate(chunk, 60000),
		'"""'
	].join('\n');

	const result = await model.generateContent({
		contents: [{ role: 'user', parts: [{ text: prompt }] }],
		generationConfig: baseGenerationConfig(CHUNK_SCHEMA, 1400),
		safetySettings
	});

	return safeJson(getResponseText(result.response)) || {
		keyPoints: [],
		benefits: [],
		risks: [],
		importantDates: [],
		financialTerms: [],
		clauses: []
	};
}

async function mergePartials(partials, docType) {
	// Feed partials back to model to deduplicate and produce final schema
	const model = genAI.getGenerativeModel({
		model: MODEL_ID_SUMMARY,
		systemInstruction: buildSystemInstruction(docType)
	});

	// First get merged summary
	const summaryPrompt = [
		'Merge these partial analyses into a single summary.',
		'Return JSON with ONLY summary fields (no clauses).',
		`Limits: keyPoints <= 5, risks <= 6, benefits <= 4, financialTerms <= 5, importantDates <= 5`,
		'Deduplicate and keep most important items.',
		'Partials:',
		'"""',
		JSON.stringify(partials.map(p => ({
			keyPoints: p.keyPoints,
			benefits: p.benefits,
			risks: p.risks,
			importantDates: p.importantDates,
			financialTerms: p.financialTerms
		}))).slice(0, 100000),
		'"""'
	].join('\n');

	let summary = null;
	try {
		const result = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
			generationConfig: baseGenerationConfig(SUMMARY_ONLY_SCHEMA, 1000),
			safetySettings
		});
		summary = safeJson(getResponseText(result.response));
	} catch (e) {
		if (DEBUG) console.error('[MERGE:summary] Error:', e);
	}

	if (!summary) {
		summary = {
			documentType: docType || 'Auto-detected',
			keyPoints: [],
			benefits: [],
			risks: [],
			importantDates: [],
			financialTerms: [],
			overallRiskLevel: 'medium'
		};
	}

	// Then get merged clauses
	const clausesPrompt = [
		'Merge these partial clause analyses.',
		'Return JSON with ONLY "clauses" array.',
		'Keep up to 6 most important clauses. Deduplicate.',
		'Each clause: title, explanation (max 30 words), importance',
		'Partials:',
		'"""',
		JSON.stringify(partials.map(p => ({ clauses: p.clauses }))).slice(0, 100000),
		'"""'
	].join('\n');

	let clauses = [];
	try {
		const result = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: clausesPrompt }] }],
			generationConfig: baseGenerationConfig(CLAUSES_ONLY_SCHEMA, 1200),
			safetySettings
		});
		const data = safeJson(getResponseText(result.response));
		if (data && Array.isArray(data.clauses)) {
			clauses = data.clauses;
		}
	} catch (e) {
		if (DEBUG) console.error('[MERGE:clauses] Error:', e);
	}

	return normalizeFinal({ summary, clauses }, docType);
}

function buildSystemInstruction(docType) {
	const base = `You are a helpful assistant that explains legal documents in clear, plain English.
- Be concise, neutral, and practical.
- Identify risky clauses and explain why in simple terms.
- Include brief actionable suggestions where appropriate.
- Use short labels for dates and financial terms.
- Do not provide legal advice; include no disclaimers in the JSON.`;

	const typed = docType ? `\nDocument type hint: ${docType}.` : '';
	return base + typed;
}

function truncate(str, n) {
	if (!str) return '';
	return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function safeJson(txt) {
	try {
		return JSON.parse(txt);
	} catch {
		// Try to extract first JSON object from text (handles ```json ... ``` etc.)
		const extracted = extractFirstJson(txt);
		if (extracted) return extracted;
		return null;
	}
}

function extractFirstJson(s) {
	if (!s) return null;
	// Greedy scan for outermost braces
	const start = s.indexOf('{');
	const end = s.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) return null;
	const candidate = s.slice(start, end + 1);
	try {
		return JSON.parse(candidate);
	} catch {
		return null;
	}
}

function normalizeFinal(out, docType) {
	const normalized = {
		summary: {
			documentType: out.summary?.documentType || docType || 'Auto-detected',
			keyPoints: (out.summary?.keyPoints || []).slice(0, 5),
			benefits: (out.summary?.benefits || []).slice(0, 4),
			risks: (out.summary?.risks || []).slice(0, 6),
			importantDates: (out.summary?.importantDates || []).slice(0, 5),
			financialTerms: (out.summary?.financialTerms || []).slice(0, 5),
			overallRiskLevel: ['low', 'medium', 'high'].includes(out.summary?.overallRiskLevel)
				? out.summary.overallRiskLevel : 'medium'
		},
		clauses: (Array.isArray(out.clauses) ? out.clauses : [])
			.slice(0, 8)
			.map((c, i) => ({
				id: c.id || `c${i + 1}`,
				title: c.title || `Clause ${i + 1}`,
				section: c.section || '',
				originalText: '', // Empty to avoid recitation issues
				explanation: (c.explanation || '').split(/\s+/).slice(0, 40).join(' '),
				implications: (Array.isArray(c.implications) ? c.implications : []).slice(0, 2),
				actionItems: (Array.isArray(c.actionItems) ? c.actionItems : []).slice(0, 2),
				importance: ['low', 'medium', 'high'].includes(c.importance) ? c.importance : 'medium'
			}))
	};

	return normalized;
}