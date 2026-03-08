import express from 'express';
import dotenv from 'dotenv';
import {
  confidenceFromChunks,
  formatRagReferences,
  getRagDocument,
  retrieveTopChunks
} from '../services/ragStore.js';
import { generateStructuredAnswer } from '../services/llm.js';

dotenv.config();

const router = express.Router();
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
      suggestedQuestions: { type: 'array', items: { type: 'string' } },
      nextActions: { type: 'array', items: { type: 'string' } }
    },
    required: ['answer']
  }
};

router.post('/', async (req, res) => {
  try {
    const { message, documentContext, conversationHistory = [], ragDocId, responseLanguage = 'english' } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Missing message' });
    }

    const resolvedRagDocId = ragDocId || documentContext?.ragDocId;
    const ragDoc = getRagDocument(resolvedRagDocId);
    const topChunks = ragDoc ? retrieveTopChunks(resolvedRagDocId, message, 5) : [];

    const normalizedLanguage = normalizeLanguage(responseLanguage);
    const systemInstruction = buildSystemInstruction(documentContext, ragDoc?.documentName, normalizedLanguage);
    const history = toGeminiHistory(conversationHistory);

    const fallback = buildNarrowContext(message, documentContext);
    const contextPacket = topChunks.length
      ? buildRagContextPacket(topChunks)
      : buildFallbackPacket(fallback);

    const deterministic = buildDeterministicAnswer({
      message,
      documentContext,
      topChunks,
      fallback,
      responseLanguage: normalizedLanguage
    });

    let text = '';
    try {
      text = await generateStructuredAnswer({
        systemInstruction,
        history,
        contextPacket,
        message,
        generationConfig,
        modelId: MODEL_ID
      });
    } catch (llmErr) {
      console.error('[chat] llm generation failed:', llmErr?.message || llmErr);
      text = JSON.stringify({
        answer: deterministic.answer,
        references: deterministic.references,
        confidence: deterministic.confidence,
        suggestedQuestions: defaultSuggestions(),
        nextActions: defaultNextActions()
      });
    }

    let parsed;
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
    const fallbackRefs = fallbackContextReferences(fallback);
    const payload = {
      answer: improveAnswerIfGeneric(parsed.answer || text, deterministic.answer),
      references: Array.isArray(parsed.references) && parsed.references.length
        ? parsed.references
        : (ragRefs.length ? ragRefs : fallbackRefs),
      confidence: parsed.confidence || deterministic.confidence || confidenceFromChunks(topChunks),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : defaultSuggestions(),
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 3) : defaultNextActions()
    };

    payload.answer = await localizeAnswer(payload.answer, normalizedLanguage);

    return res.json(payload);
  } catch (err) {
    console.error('Chat error:', err?.response || err);
    return res.status(500).json({
      message: err?.message || 'Failed to generate grounded response.'
    });
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

function buildSystemInstruction(documentContext, documentName, responseLanguage = 'english') {
  const header = `You are an AI assistant that explains legal documents in plain language.
- Be concise, neutral, and practical.
- Do not invent facts not found in provided context.
- Prefer direct citations to clause ids/sections when possible.
- This is not legal advice.
- Respond in ${responseLanguage}.`;

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
    text: compactText(c.text, 240)
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
  const text = normalize([clause.title, clause.section, clause.originalText, clause.explanation].join(' '));

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

function buildFallbackAnswer(message, topChunks = [], responseLanguage = 'English') {
  const intro = {
    English: 'The model is temporarily unavailable, so here are the most relevant extracted clauses:',
    Hindi: 'Model abhi temporary unavailable hai, isliye yeh sabse relevant clauses hain:',
    Marathi: 'Model sadhya temporary unavailable aahe, mhanun he sarvat relevant clauses aahet:',
    Spanish: 'El modelo no esta disponible temporalmente; aqui estan las clausulas mas relevantes:'
  };
  const outro = {
    English: 'Try again in a few seconds for a full natural-language answer.',
    Hindi: 'Kuch seconds baad dobara try karein.',
    Marathi: 'Kahi seconds nantar punha prayatna kara.',
    Spanish: 'Intenta nuevamente en unos segundos para obtener una respuesta completa.'
  };
  if (!topChunks.length) {
    return `I could not retrieve enough context for: "${message}". Please try rephrasing or upload a clearer document scan.`;
  }
  const lines = topChunks.slice(0, 3).map((c, i) => {
    const label = [c.section, c.title].filter(Boolean).join(' - ') || `Chunk ${c.id}`;
    const excerpt = (c.text || '').replace(/\s+/g, ' ').slice(0, 180);
    return `${i + 1}. ${label}: ${excerpt}...`;
  });
  return [
    intro[responseLanguage] || intro.English,
    ...lines,
    outro[responseLanguage] || outro.English
  ].join('\n');
}

function normalizeLanguage(language) {
  const raw = String(language || '').trim().toLowerCase();
  if (raw === 'hindi') return 'Hindi';
  if (raw === 'marathi') return 'Marathi';
  if (raw === 'spanish') return 'Spanish';
  return 'English';
}

function compactText(text, maxLen = 240) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 3)}...`;
}

function improveAnswerIfGeneric(answer, deterministicAnswer) {
  const text = String(answer || '').trim();
  if (!text) return deterministicAnswer;
  if (/could not retrieve enough context|temporarily unavailable|try again/i.test(text)) {
    return deterministicAnswer;
  }
  return text;
}

function fallbackContextReferences(fallback) {
  const clauses = Array.isArray(fallback?.clauses) ? fallback.clauses : [];
  return clauses.slice(0, 4).map((c) => ({
    clauseId: c.id || null,
    section: c.section || c.id || 'Clause',
    title: c.title || 'Document clause'
  }));
}

function buildDeterministicAnswer({ message, documentContext, topChunks = [], fallback = {}, responseLanguage = 'English' }) {
  const intent = detectIntent(message);
  const summary = documentContext?.summary || {};
  const clauses = Array.isArray(documentContext?.clauses) ? documentContext.clauses : [];
  const narrowed = Array.isArray(fallback?.clauses) ? fallback.clauses : [];
  const references = topChunks.length ? formatRagReferences(topChunks) : fallbackContextReferences(fallback);
  const lang = String(responseLanguage || 'English');

  const risks = Array.isArray(summary?.risks) ? summary.risks : [];
  const benefits = Array.isArray(summary?.benefits) ? summary.benefits : [];
  const dates = Array.isArray(summary?.importantDates) ? summary.importantDates : [];
  const money = Array.isArray(summary?.financialTerms) ? summary.financialTerms : [];
  const highMedClauses = clauses.filter((c) => c?.importance === 'high' || c?.importance === 'medium').slice(0, 5);

  let answer = '';
  if (intent === 'risk') {
    answer = [
      'Main risks in this document:',
      ...(risks.slice(0, 4).map((r, i) => `${i + 1}. ${toSimple(r)}`)),
      risks.length === 0 ? '1. Payment and obligation terms should be reviewed carefully before signing.' : '',
      '',
      'Top clauses to review first:',
      ...(highMedClauses.slice(0, 3).map((c, i) => `${i + 1}. ${c.title || 'Important clause'} - ${toSimple(c.explanation || c.originalText)}`))
    ].filter(Boolean).join('\n');
  } else if (intent === 'negotiate') {
    answer = [
      'Start negotiation with these points:',
      ...(highMedClauses.slice(0, 4).map((c, i) => `${i + 1}. ${c.title || 'Clause'}: ${toSimple(c.actionItems?.[0] || c.explanation || 'Request clearer and balanced wording.')}`)),
      highMedClauses.length === 0 ? '1. Ask for clear payment timelines and lower penalty exposure.' : '',
      '',
      'Practical ask:',
      '- Limit penalties and late charges.',
      '- Add clear cure/notice period before termination.',
      '- Cap liability/indemnity where possible.'
    ].join('\n');
  } else if (intent === 'deadline') {
    answer = [
      'Important deadlines/timelines found:',
      ...(dates.slice(0, 6).map((d, i) => `${i + 1}. ${d.label || 'Date'}: ${d.value}`)),
      dates.length === 0 ? 'No explicit deadline was extracted. Check notice and payment clauses manually.' : ''
    ].filter(Boolean).join('\n');
  } else if (intent === 'money') {
    answer = [
      'Financial terms found in this document:',
      ...(money.slice(0, 6).map((m, i) => `${i + 1}. ${m.label || 'Amount'}: ${m.value}`)),
      money.length === 0 ? 'No clear financial amount extracted. Verify payment section in the contract text.' : ''
    ].filter(Boolean).join('\n');
  } else if (intent === 'obligation') {
    const obligationClauses = highMedClauses.filter((c) => /obligation|payment|termination|notice|confidential/i.test(`${c?.title} ${c?.explanation}`)).slice(0, 4);
    answer = [
      'Your main obligations appear to be:',
      ...(obligationClauses.map((c, i) => `${i + 1}. ${toSimple(c.explanation || c.originalText)}`)),
      obligationClauses.length === 0 ? '1. Follow payment timeline and notice requirements mentioned in the agreement.' : ''
    ].join('\n');
  } else {
    answer = [
      'Quick summary in simple language:',
      `- Document type: ${summary?.documentType || 'Legal Document'}`,
      `- Overall risk: ${String(summary?.overallRiskLevel || 'medium').toUpperCase()}`,
      ...(risks.slice(0, 2).map((r) => `- Risk: ${toSimple(r)}`)),
      ...(benefits.slice(0, 2).map((b) => `- Benefit: ${toSimple(b)}`)),
      narrowed[0] ? `- Key clause: ${narrowed[0].title || 'Clause'} - ${toSimple(narrowed[0].explanation || narrowed[0].originalText)}` : ''
    ].filter(Boolean).join('\n');
  }

  if (lang !== 'English') {
    answer = `${answer}\n\n(You selected ${lang}. Ask: "Explain this in ${lang}" for translated response.)`;
  }

  return {
    answer,
    references,
    confidence: references.length ? 'medium' : 'low'
  };
}

function detectIntent(message = '') {
  const q = String(message || '').toLowerCase();
  if (/risk|danger|legal risk|top risk/.test(q)) return 'risk';
  if (/negotiat|negotiation|what can i negotiate|renegotiate/.test(q)) return 'negotiate';
  if (/deadline|date|due|timeline|notice period/.test(q)) return 'deadline';
  if (/payment|money|fee|amount|penalty|cost|rent|deposit/.test(q)) return 'money';
  if (/obligation|must|shall|required|responsibil/.test(q)) return 'obligation';
  return 'general';
}

function toSimple(text = '') {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const words = s.split(' ');
  if (words.length <= 22) return s;
  return `${words.slice(0, 22).join(' ')}...`;
}

async function localizeAnswer(answer, language) {
  const target = String(language || 'English');
  const raw = String(answer || '').trim();
  if (!raw) return raw;
  if (target === 'English') return raw;

  const prompt = [
    `Translate the following legal explanation into ${target}.`,
    'Rules:',
    '- Preserve bullet/numbered structure.',
    '- Keep legal meaning accurate.',
    '- Keep it simple for non-legal users.',
    '- Return plain text only.',
    '',
    raw
  ].join('\n');

  const viaOllama = await translateWithOllama(prompt);
  if (viaOllama) return viaOllama;

  const viaGemini = await translateWithGemini(prompt);
  if (viaGemini) return viaGemini;

  return raw;
}

async function translateWithOllama(prompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b';
  try {
    const resp = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a translation assistant. Return translated plain text only.' },
          { role: 'user', content: prompt }
        ],
        options: { temperature: 0.1 }
      })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const out = String(data?.message?.content || '').trim();
    return out || null;
  } catch {
    return null;
  }
}

async function translateWithGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
    });
    const result = await model.generateContent(prompt);
    const out = String(result?.response?.text?.() || '').trim();
    return out || null;
  } catch {
    return null;
  }
}
