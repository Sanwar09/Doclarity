import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Optional: choose model based on speed vs quality
const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash';

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

const generationConfig = {
  temperature: 0.3,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 1024,
  responseMimeType: 'application/json',
  // Strongly recommend using a response schema for structured output
  responseSchema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      references: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            clauseId: { type: 'string' },
            section: { type: 'string' },
            title: { type: 'string' }
          }
        }
      },
      suggestedQuestions: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['answer']
  }
};

function normalize(str='') {
    return str.toLowerCase().replace(/[^a-z0-9\s%$.-]/g, ' ');
  }
  
  function relevanceScore(q, clause) {
    const qn = normalize(q);
    const text = normalize(
      [clause.title, clause.section, clause.originalText, clause.explanation].join(' ')
    );
  
    // term overlap
    const qTerms = qn.split(/\s+/).filter(t => t.length > 2);
    let score = 0;
    for (const t of qTerms) if (text.includes(t)) score += 1;
  
    // keyword boosts
    for (const k of RISK_KEYWORDS) if (text.includes(k)) score += 2;
    for (const k of FIN_KEYWORDS) if (text.includes(k)) score += 1;
  
    // importance boost
    if (clause.importance === 'high') score += 2;
    if (clause.importance === 'medium') score += 1;
  
    return score;
  }
  
  function buildNarrowContext(question, documentContext) {
    const clauses = Array.isArray(documentContext?.clauses) ? documentContext.clauses : [];
    const top = clauses
      .map(c => ({ c, s: relevanceScore(question, c) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5) // pass only 3–5 clauses
      .map(({ c }) => ({
        id: c.id,
        title: c.title,
        section: c.section || '',
        originalText: (c.originalText || '').slice(0, 350),
        explanation: (c.explanation || '').slice(0, 350)
      }));
  
    const summary = documentContext?.summary
      ? {
          documentType: documentContext.summary.documentType,
          overallRiskLevel: documentContext.summary.overallRiskLevel
        }
      : undefined;
  
    return { summary, clauses: top };
  }

router.post('/', async (req, res) => {
  try {
    const { message, documentContext, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Missing message' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not set' });
    }

    // Build a compact system instruction + context for grounding
    const systemInstruction = buildSystemInstruction(documentContext);

    // Convert existing conversation history to Gemini format
    const history = toGeminiHistory(conversationHistory);

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction
    });

    const chat = model.startChat({
      history,
      generationConfig
    });

    const narrow = buildNarrowContext(message, documentContext);

    const ctxCard = [
    'Use ONLY this context to answer. If insufficient, say so.',
    'Context:',
    JSON.stringify(narrow, null, 0)
    ].join('\n');

    // Send as a single user message with context + question
    const result = await chat.sendMessage([
    { text: ctxCard },
    { text: `Question: ${message}\nAnswer briefly in plain English.` }
    ]);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON (due to responseMimeType: application/json)
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Fallback if model returned plain text
      parsed = { answer: text, references: [], suggestedQuestions: defaultSuggestions() };
    }

    // Ensure shape
    const payload = {
      answer: parsed.answer || text,
      references: Array.isArray(parsed.references) ? parsed.references : [],
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions
        : defaultSuggestions()
    };

    return res.json(payload);
  } catch (err) {
    console.error('Chat error:', err?.response || err);
    return res.status(500).json({
      message: 'Failed to get response from Gemini.'
    });
  }
});

// Optional: simple feedback endpoint
router.post('/feedback', async (req, res) => {
  try {
    const { messageId, feedback, documentContext } = req.body;
    console.log('Feedback:', { messageId, feedback, documentContext });
    // TODO: persist feedback
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to record feedback' });
  }
});

export default router;

/* ------------- Helpers ------------- */

function defaultSuggestions() {
  return [
    'What are the main risks in this document?',
    'Which clauses should I pay attention to?',
    'Explain the termination clause in simple terms.',
    'Are there hidden fees or penalties?',
    'What deadlines do I need to track?'
  ];
}

function buildSystemInstruction(documentContext) {
  // Keep instructions tight and safe; ground with document details for better citations
  const header = `You are an AI assistant that explains legal documents in plain English.
- Be concise, neutral, and practical.
- Reference relevant clauses with their clauseId when possible.
- If unsure, say you don’t know.
- This is not legal advice; include a brief disclaimer when appropriate.`;

  const grounded = serializeDocumentContext(documentContext);
  return `${header}\n\nDocument Context:\n${grounded}`;
}

function serializeDocumentContext(ctx) {
  if (!ctx) return 'No context provided.';
  const lines = [];
  try {
    const summary = ctx.summary || {};
    const clauses = Array.isArray(ctx.clauses) ? ctx.clauses : [];

    lines.push(`documentType: ${summary.documentType || 'Unknown'}`);
    if (summary.overallRiskLevel) lines.push(`overallRiskLevel: ${summary.overallRiskLevel}`);
    if (Array.isArray(summary.keyPoints)) {
      lines.push(`keyPoints: ${summary.keyPoints.slice(0, 6).join(' | ')}`);
    }

    // Include a limited number of clauses to keep prompt compact
    const MAX_CLAUSES = 20;
    const trimmed = clauses.slice(0, MAX_CLAUSES).map(c => ({
      id: c.id,
      title: c.title,
      section: c.section,
      importance: c.importance,
      explanation: truncate(c.explanation, 400),
      originalText: truncate(c.originalText, 350)
    }));

    lines.push('clauses:');
    trimmed.forEach(c => {
      lines.push(`- [${c.id}] ${c.section || ''} ${c.title || ''} (${c.importance || 'n/a'})`);
      if (c.explanation) lines.push(`  explanation: ${c.explanation}`);
      if (c.originalText) lines.push(`  original: ${c.originalText}`);
    });
  } catch (e) {
    lines.push('Error serializing context.');
  }
  return lines.join('\n');
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// Replace your toGeminiHistory with this:
function toGeminiHistory(history = []) {
    if (!Array.isArray(history)) return [];
  
    // Find the first user message
    const firstUserIdx = history.findIndex(h => h?.type === 'user');
    if (firstUserIdx === -1) {
      // No user messages yet; start a fresh chat without history
      return [];
    }
  
    // Keep from first user onward and cap total turns to avoid long prompts
    const MAX_TURNS = 6; // user+bot pairs
    const trimmed = history.slice(firstUserIdx).slice(-MAX_TURNS);
  
    // Map to Gemini format
    let mapped = trimmed
      .filter(h => typeof h?.content === 'string' && h.content.trim())
      .map(h => ({
        role: h.type === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));
  
    // Ensure first is user (drop any accidental leading model messages)
    while (mapped.length && mapped[0].role !== 'user') {
      mapped.shift();
    }
  
    return mapped;
  }