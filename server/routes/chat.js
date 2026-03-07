import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  confidenceFromChunks,
  formatRagReferences,
  getRagDocument,
  retrieveTopChunks
} from '../services/ragStore.js';

dotenv.config();

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
  temperature: 0.2,
  topK: 32,
  topP: 0.9,
  maxOutputTokens: 900,
  responseMimeType: 'application/json',
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
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      suggestedQuestions: {
        type: 'array',
        items: { type: 'string' }
      },
      nextActions: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['answer']
  }
};

router.post('/', async (req, res) => {
  try {
    const { message, documentContext, conversationHistory = [], ragDocId } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Missing message' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY not set' });
    }

    const resolvedRagDocId = ragDocId || documentContext?.ragDocId;
    const ragDoc = getRagDocument(resolvedRagDocId);
    const topChunks = ragDoc ? retrieveTopChunks(resolvedRagDocId, message, 5) : [];

    const systemInstruction = buildSystemInstruction(documentContext, ragDoc?.documentName);
    const history = toGeminiHistory(conversationHistory);

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction
    });

    const chat = model.startChat({
      history,
      generationConfig
    });

    const fallback = buildNarrowContext(message, documentContext);
    const contextPacket = topChunks.length
      ? buildRagContextPacket(topChunks)
      : buildFallbackPacket(fallback);

    const result = await chat.sendMessage([
      {
        text: [
          'Use ONLY the provided context snippets.',
          'If context is insufficient, clearly say what is missing.',
          contextPacket
        ].join('\n\n')
      },
      { text: `Question: ${message}\nAnswer in plain English with short bullets when helpful.` }
    ]);

    const response = await result.response;
    const text = response.text();

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        answer: text,
        references: [],
        confidence: topChunks.length ? confidenceFromChunks(topChunks) : 'low',
        suggestedQuestions: defaultSuggestions(),
        nextActions: defaultNextActions()
      };
    }

    const ragRefs = formatRagReferences(topChunks);
    const references = Array.isArray(parsed.references) && parsed.references.length
      ? parsed.references
      : ragRefs;

    const payload = {
      answer: parsed.answer || text,
      references,
      confidence: parsed.confidence || confidenceFromChunks(topChunks),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions
        : defaultSuggestions(),
      nextActions: Array.isArray(parsed.nextActions)
        ? parsed.nextActions.slice(0, 3)
        : defaultNextActions()
    };

    return res.json(payload);
  } catch (err) {
    console.error('Chat error:', err?.response || err);
    return res.status(500).json({ message: 'Failed to get response from Gemini.' });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const { messageId, feedback, documentContext } = req.body;
    console.log('Feedback:', { messageId, feedback, documentContext });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Failed to record feedback' });
  }
});

export default router;

function defaultSuggestions() {
  return [
    'What are the main risks in this document?',
    'What can I negotiate first?',
    'Which clause has the highest legal risk?',
    'Are there hidden fees or penalties?',
    'What deadlines do I need to track?'
  ];
}

function defaultNextActions() {
  return [
    'Review the cited clauses in full before signing.',
    'List negotiation points with impact and priority.',
    'Consult a lawyer for final legal review.'
  ];
}

function buildSystemInstruction(documentContext, documentName) {
  const header = `You are an AI assistant that explains legal documents in plain English.
- Be concise, neutral, and practical.
- Do not invent facts not found in provided context.
- Prefer direct citations to clause ids/sections when possible.
- This is not legal advice.`;

  const details = [
    `documentName: ${documentName || documentContext?.documentName || 'Unknown'}`,
    `documentType: ${documentContext?.summary?.documentType || 'Unknown'}`,
    `overallRiskLevel: ${documentContext?.summary?.overallRiskLevel || 'Unknown'}`
  ].join('\n');

  return `${header}\n\nDocument Metadata:\n${details}`;
}

function buildRagContextPacket(chunks) {
  const compact = chunks.map((c, idx) => ({
    rank: idx + 1,
    chunkId: c.id,
    sourceType: c.sourceType,
    clauseId: c.clauseId,
    section: c.section,
    title: c.title,
    text: (c.text || '').slice(0, 900)
  }));

  return ['Retrieved Context:', JSON.stringify(compact)].join('\n');
}

function buildFallbackPacket(fallback) {
  return ['Fallback Context:', JSON.stringify(fallback)].join('\n');
}

function normalize(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9\s%$.-]/g, ' ');
}

function relevanceScore(q, clause) {
  const qn = normalize(q);
  const text = normalize(
    [clause.title, clause.section, clause.originalText, clause.explanation].join(' ')
  );

  const qTerms = qn.split(/\s+/).filter((t) => t.length > 2);
  let score = 0;
  for (const t of qTerms) if (text.includes(t)) score += 1;

  for (const k of RISK_KEYWORDS) if (text.includes(k)) score += 2;
  for (const k of FIN_KEYWORDS) if (text.includes(k)) score += 1;

  if (clause.importance === 'high') score += 2;
  if (clause.importance === 'medium') score += 1;

  return score;
}

function buildNarrowContext(question, documentContext) {
  const clauses = Array.isArray(documentContext?.clauses) ? documentContext.clauses : [];
  const top = clauses
    .map((c) => ({ c, s: relevanceScore(question, c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
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

function toGeminiHistory(history = []) {
  if (!Array.isArray(history)) return [];

  const firstUserIdx = history.findIndex((h) => h?.type === 'user');
  if (firstUserIdx === -1) return [];

  const MAX_TURNS = 6;
  const trimmed = history.slice(firstUserIdx).slice(-MAX_TURNS);

  const mapped = trimmed
    .filter((h) => typeof h?.content === 'string' && h.content.trim())
    .map((h) => ({
      role: h.type === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

  while (mapped.length && mapped[0].role !== 'user') {
    mapped.shift();
  }

  return mapped;
}
