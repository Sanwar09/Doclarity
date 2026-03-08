import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractEntitiesWithSpacy } from './spacyExtractor.js';
import { validateLegalDashboardSchema } from './structuredSchema.js';

const CLAUSE_DEFINITIONS = [
  {
    type: 'termination clause',
    importance: 'high',
    severityWeight: 3,
    patterns: [/\bterminat(e|ion|ed|ing)\b/i, /\bcancel(lation|led)?\b/i, /\bdefault\b/i, /\bbreach\b/i, /\bnotice period\b/i],
    explanation: 'Defines when and how the agreement can be ended, including default triggers and notice obligations.'
  },
  {
    type: 'liability clause',
    importance: 'high',
    severityWeight: 3,
    patterns: [/\bliabilit(y|ies)\b/i, /\bindemn(if|it)\w*\b/i, /\blimitation of liability\b/i, /\bdamages\b/i],
    explanation: 'Allocates legal and financial responsibility when losses, claims, or damages occur.'
  },
  {
    type: 'payment clause',
    importance: 'medium',
    severityWeight: 2,
    patterns: [/\bpayment\b/i, /\bfee(s)?\b/i, /\bdeposit\b/i, /\brent\b/i, /\bconsideration\b/i, /\binterest\b/i],
    explanation: 'States what must be paid, when payment is due, and how late or partial payments are handled.'
  },
  {
    type: 'confidentiality clause',
    importance: 'medium',
    severityWeight: 2,
    patterns: [/\bconfidential\b/i, /\bnon-disclosure\b/i, /\bprivacy\b/i, /\bpersonal data\b/i, /\bdata protection\b/i],
    explanation: 'Restricts sharing of protected business or personal information and may impose compliance duties.'
  },
  {
    type: 'penalty clause',
    importance: 'high',
    severityWeight: 3,
    patterns: [/\bpenalt(y|ies)\b/i, /\blate fee\b/i, /\bliquidated damages\b/i, /\bforfeit\w*\b/i],
    explanation: 'Imposes additional costs or consequences for delay, non-performance, or breach.'
  },
  {
    type: 'obligation clause',
    importance: 'medium',
    severityWeight: 2,
    patterns: [/\bshall\b/i, /\bmust\b/i, /\bis required to\b/i, /\bagrees to\b/i, /\bobligated to\b/i],
    explanation: 'Specifies mandatory actions and responsibilities that parties must perform.'
  }
];

const SYSTEM_PROMPT = [
  'You are a legal AI analyst.',
  'Extract structured insights from the contract and return JSON only.',
  'Do not summarize broadly.',
  'Use only evidence from provided chunks.',
  'Return exactly this JSON shape and no markdown: ',
  '{',
  '  "document_type": "",',
  '  "risk_level": "low|medium|high",',
  '  "risk_score": 0,',
  '  "risk_signals": [],',
  '  "deadlines": [],',
  '  "money_terms": [],',
  '  "priority_clauses": [',
  '    {"clause_type":"", "importance":"low|medium|high", "evidence":"", "explanation":""}',
  '  ],',
  '  "key_benefits": [],',
  '  "important_dates": [],',
  '  "key_points": []',
  '}'
].join('\n');

export async function analyzeWithDocumentIntelligence({ text, docTypeHint, pageEstimate = 1, fileKind = 'unknown' }) {
  const cleanText = normalizeText(text);
  const chunks = chunkByTokens(cleanText, 1200, 180);

  const regexEntities = extractRegexEntities(cleanText);
  const spacyEntities = await extractEntitiesWithSpacy(cleanText.slice(0, 220000));
  const entities = mergeEntities(regexEntities, spacyEntities);

  const ruleClauses = detectPriorityClauses(chunks);
  const retrievalChunks = await selectChunksForReasoning(chunks, pageEstimate, entities);

  const llmStructured = await runReasoningLLM({
    chunks: retrievalChunks,
    entities,
    docTypeHint,
    pageEstimate,
    fileKind
  });

  const ruleStructured = buildRuleStructuredOutput({
    docTypeHint,
    entities,
    clauses: ruleClauses,
    chunks
  });

  const structured = finalizeStructuredOutput(llmStructured, ruleStructured);
  const validated = validateLegalDashboardSchema(structured);

  const dashboard = mapToDashboardShape(structured);

  return {
    structured,
    dashboard,
    meta: {
      engine: llmStructured ? 'hybrid_llm_reasoning' : 'hybrid_rule_based',
      chunkCount: chunks.length,
      pageEstimate,
      schemaValid: validated.valid,
      schemaErrors: validated.errors,
      entitySource: entities.source,
      clauseCount: structured.priority_clauses.length
    }
  };
}

async function runReasoningLLM({ chunks, entities, docTypeHint, pageEstimate, fileKind }) {
  const context = {
    doc_type_hint: docTypeHint || 'auto',
    page_estimate: pageEstimate,
    file_kind: fileKind,
    entities,
    chunks: chunks.slice(0, 16).map((c, idx) => ({ id: idx + 1, text: c.text }))
  };

  const userPrompt = [
    'Analyze this legal contract context and produce strict JSON.',
    'Focus on clause classification, obligations, deadlines, monetary commitments, and legal risk signals.',
    'Do not include commentary. Return only valid JSON object.',
    '',
    JSON.stringify(context)
  ].join('\n');

  const ollamaOutput = await tryOllamaModels(userPrompt);
  if (ollamaOutput) return ollamaOutput;

  const geminiOutput = await tryGemini(userPrompt);
  return geminiOutput;
}

async function tryOllamaModels(userPrompt) {
  const useOllama = String(process.env.USE_OLLAMA_FOR_ANALYZE || 'true').toLowerCase() !== 'false';
  if (!useOllama) return null;

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const configured = String(process.env.REASONING_MODELS || 'qwen2.5:7b,deepseek-r1:8b,llama3.1:8b')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  for (const model of configured) {
    try {
      const result = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          options: { temperature: 0.1 },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!result.ok) continue;
      const data = await result.json();
      const parsed = safeJsonParse(data?.message?.content || '{}');
      if (parsed && validateLegalDashboardSchema(parsed).valid) {
        return parsed;
      }
    } catch {
      // try next model
    }
  }

  return null;
}

async function tryGemini(userPrompt) {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json'
      }
    });

    const txt = result.response?.text?.() || '';
    const parsed = safeJsonParse(txt);
    if (parsed && validateLegalDashboardSchema(parsed).valid) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function buildRuleStructuredOutput({ docTypeHint, entities, clauses, chunks }) {
  const riskSignals = buildRiskSignals(clauses, chunks);
  const riskScore = calculateRiskScore(clauses);
  const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

  const keyPoints = collectKeyPoints(chunks, entities);
  const keyBenefits = detectBenefits(chunks);

  return {
    document_type: detectDocumentType(chunks.map((c) => c.text).join(' '), docTypeHint),
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_signals: riskSignals.slice(0, 10),
    deadlines: entities.deadlines.slice(0, 10),
    money_terms: entities.money_terms.slice(0, 10),
    priority_clauses: clauses.slice(0, 10).map((c) => ({
      clause_type: c.clause_type,
      importance: c.importance,
      evidence: c.evidence,
      explanation: c.explanation
    })),
    key_benefits: keyBenefits.slice(0, 6),
    important_dates: entities.important_dates.slice(0, 10),
    key_points: keyPoints.slice(0, 10)
  };
}

function finalizeStructuredOutput(llmStructured, ruleStructured) {
  const base = llmStructured && validateLegalDashboardSchema(llmStructured).valid
    ? normalizeStructured(llmStructured)
    : normalizeStructured(ruleStructured);

  const fallback = normalizeStructured(ruleStructured);

  const merged = {
    document_type: base.document_type || fallback.document_type,
    risk_level: normalizeRiskLevel(base.risk_level || fallback.risk_level),
    risk_score: clampScore(Number.isFinite(base.risk_score) ? base.risk_score : fallback.risk_score),
    risk_signals: uniqueStrings([...base.risk_signals, ...fallback.risk_signals]).slice(0, 10),
    deadlines: uniqueStrings([...base.deadlines, ...fallback.deadlines]).slice(0, 10),
    money_terms: uniqueStrings([...base.money_terms, ...fallback.money_terms]).slice(0, 10),
    priority_clauses: mergePriorityClauses(base.priority_clauses, fallback.priority_clauses).slice(0, 10),
    key_benefits: uniqueStrings([...base.key_benefits, ...fallback.key_benefits]).slice(0, 6),
    important_dates: uniqueStrings([...base.important_dates, ...fallback.important_dates]).slice(0, 10),
    key_points: uniqueStrings([...base.key_points, ...fallback.key_points]).slice(0, 10)
  };

  if (!merged.priority_clauses.length) {
    merged.priority_clauses = fallback.priority_clauses.slice(0, 6);
  }

  const polished = polishForUser(merged);
  polished.risk_score = clampScore(calculateRiskScore(polished.priority_clauses));
  polished.risk_level = polished.risk_score >= 65 ? 'high' : polished.risk_score >= 35 ? 'medium' : 'low';

  return polished;
}

function polishForUser(merged) {
  const compactClauses = compactPriorityClauses(merged.priority_clauses).slice(0, 6);
  return {
    ...merged,
    priority_clauses: compactClauses,
    risk_signals: makeUserFriendlyRiskSignals(compactClauses, merged.risk_signals).slice(0, 6),
    deadlines: sanitizeDateList(merged.deadlines).slice(0, 6),
    important_dates: sanitizeDateList(merged.important_dates).slice(0, 6),
    money_terms: sanitizeMoneyList(merged.money_terms).slice(0, 6),
    key_points: simplifyBulletList(merged.key_points, 6),
    key_benefits: simplifyBulletList(merged.key_benefits, 4)
  };
}

function compactPriorityClauses(items = []) {
  const grouped = new Map();
  for (const raw of items) {
    const clause = typeof raw === 'string'
      ? { clause_type: raw, importance: 'medium', evidence: raw, explanation: raw }
      : raw;
    const type = normalizeClauseType(clause?.clause_type);
    if (!type) continue;

    const candidate = {
      clause_type: type,
      importance: normalizeRiskLevel(clause?.importance),
      evidence: cleanEvidenceText(clause?.evidence || '') || defaultEvidenceForClause(type),
      explanation: toPlainLanguageExplanation(type, clause?.explanation)
    };

    const existing = grouped.get(type);
    if (!existing || scoreClauseCandidate(candidate) > scoreClauseCandidate(existing)) {
      grouped.set(type, candidate);
    }
  }

  return [...grouped.values()].sort((a, b) => importanceWeight(b.importance) - importanceWeight(a.importance));
}

function makeUserFriendlyRiskSignals(clauses = [], existing = []) {
  const clauseSignals = clauses.map((c) => {
    const type = normalizeClauseType(c?.clause_type);
    if (type === 'termination clause') return 'Ending conditions may expose you to sudden obligations or loss of rights.';
    if (type === 'liability clause') return 'Liability terms may shift legal or financial burden to your side.';
    if (type === 'payment clause') return 'Payment deadlines and late charges can increase total contract cost.';
    if (type === 'confidentiality clause') return 'Confidentiality obligations may restrict how information is shared or used.';
    if (type === 'penalty clause') return 'Penalty clauses can impose extra charges for delays or non-compliance.';
    return 'Important obligations exist and should be reviewed before signing.';
  });

  return uniqueStrings([
    ...clauseSignals,
    ...simplifyBulletList(existing, 6)
  ]);
}

function sanitizeDateList(items = []) {
  const dateRe = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}|within\s+\d+\s+days?|for\s+a\s+period\s+of\s+\d+\s+(?:days?|months?|years?)|term\s+of\s+\d+\s+(?:days?|months?|years?)|valid\s+for\s+\d+\s+(?:days?|months?|years?))$/i;
  return uniqueStrings(items)
    .map((x) => normalizeSpace(x))
    .filter((x) => dateRe.test(x))
    .filter((x) => x.length >= 6 && x.length <= 60);
}

function sanitizeMoneyList(items = []) {
  const moneyRe = /(rs\.?\s*[\d,]+(?:\.\d+)?|inr\s*[\d,]+(?:\.\d+)?|\$\s*[\d,]+(?:\.\d+)?|usd\s*[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?\s*%)/i;
  return uniqueStrings(items)
    .map((x) => normalizeSpace(x))
    .filter((x) => moneyRe.test(x))
    .filter((x) => !/^rs\.?\s*,?$/i.test(x))
    .filter((x) => x.length <= 50);
}

function simplifyBulletList(items = [], maxItems = 6) {
  const out = [];
  for (const item of items || []) {
    const text = toSimpleSentence(item);
    if (!text) continue;
    out.push(text);
  }
  return uniqueStrings(out).slice(0, maxItems);
}

function toSimpleSentence(value) {
  const s = cleanEvidenceText(value);
  if (!s) return '';
  const normalized = s.replace(/^[a-z\s]+detected:\s*/i, '');
  const words = normalized.split(/\s+/);
  if (words.length > 24) return `${words.slice(0, 24).join(' ')}...`;
  return normalized;
}

function cleanEvidenceText(value) {
  const s = normalizeSpace(value);
  if (!s || isNoisyText(s)) return '';
  if (s.length < 15) return '';
  return s.length > 180 ? `${s.slice(0, 177)}...` : s;
}

function isNoisyText(value) {
  const s = String(value || '').trim();
  if (!s) return true;
  const digits = (s.match(/\d/g) || []).length;
  const letters = (s.match(/[a-z]/gi) || []).length;
  if (digits > 16 && letters < 18) return true;
  if (/document no\.?\s*\d+|page\s+\d+\s+of\s+\d+|stamp duty|transaction id|registration fee|grn/i.test(s)) return true;
  if (/flat no|road:|sector:|pan\s*:|residing at/i.test(s)) return true;
  if (/^[\d\s\/\-,.]+$/.test(s)) return true;
  return false;
}

function normalizeClauseType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('termination')) return 'termination clause';
  if (t.includes('liability') || t.includes('indemn')) return 'liability clause';
  if (t.includes('payment') || t.includes('fee') || t.includes('deposit')) return 'payment clause';
  if (t.includes('confidential')) return 'confidentiality clause';
  if (t.includes('penalty') || t.includes('late')) return 'penalty clause';
  if (t.includes('obligation') || t.includes('shall') || t.includes('must')) return 'obligation clause';
  return t ? `${t} clause` : '';
}

function toPlainLanguageExplanation(type, fallback) {
  const t = normalizeClauseType(type);
  if (t === 'termination clause') return 'This clause explains when the contract can end and what notice is needed.';
  if (t === 'liability clause') return 'This clause defines who is responsible for legal claims or losses.';
  if (t === 'payment clause') return 'This clause explains payment amount, due date, and late fee rules.';
  if (t === 'confidentiality clause') return 'This clause defines what information must be kept private.';
  if (t === 'penalty clause') return 'This clause adds extra costs when terms are not followed.';
  if (t === 'obligation clause') return 'This clause lists actions each party is required to perform.';
  return toSimpleSentence(fallback) || 'Review this clause carefully before signing.';
}

function defaultEvidenceForClause(type) {
  const t = normalizeClauseType(type);
  if (t === 'payment clause') return 'The contract sets payment amounts, due dates, and possible extra charges.';
  if (t === 'termination clause') return 'The contract includes conditions for ending the agreement.';
  if (t === 'liability clause') return 'The contract allocates legal and financial responsibility.';
  if (t === 'confidentiality clause') return 'The contract restricts sharing of private information.';
  if (t === 'penalty clause') return 'The contract includes penalties for delay or non-compliance.';
  return 'The contract includes mandatory obligations.';
}

function scoreClauseCandidate(clause) {
  return (importanceWeight(clause.importance) * 100) + (clause?.evidence?.length || 0);
}

function importanceWeight(level) {
  const v = normalizeRiskLevel(level);
  if (v === 'high') return 3;
  if (v === 'medium') return 2;
  return 1;
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeStructured(input) {
  const data = input || {};
  return {
    document_type: String(data.document_type || 'Legal Document').trim(),
    risk_level: normalizeRiskLevel(data.risk_level),
    risk_score: clampScore(Number(data.risk_score || 0)),
    risk_signals: arrayToStrings(data.risk_signals),
    deadlines: arrayToStrings(data.deadlines),
    money_terms: arrayToStrings(data.money_terms),
    priority_clauses: Array.isArray(data.priority_clauses) ? data.priority_clauses : [],
    key_benefits: arrayToStrings(data.key_benefits),
    important_dates: arrayToStrings(data.important_dates),
    key_points: arrayToStrings(data.key_points)
  };
}

function mapToDashboardShape(structured) {
  const clauses = structured.priority_clauses.map((c, i) => {
    const obj = typeof c === 'string'
      ? { clause_type: c, importance: 'medium', evidence: c, explanation: c }
      : c;

    return {
      id: `pc-${i + 1}`,
      title: toTitle(normalizeClauseType(obj.clause_type) || `Priority Clause ${i + 1}`),
      section: '',
      originalText: cleanEvidenceText(obj.evidence) || '',
      explanation: toPlainLanguageExplanation(obj.clause_type, obj.explanation || obj.evidence),
      implications: [buildImplicationFromType(obj.clause_type)],
      actionItems: [buildActionFromType(obj.clause_type)],
      importance: normalizeRiskLevel(obj.importance)
    };
  });

  return {
    summary: {
      documentType: structured.document_type,
      overallRiskLevel: structured.risk_level,
      riskScore: structured.risk_score,
      risks: structured.risk_signals,
      importantDates: structured.important_dates.map((d) => ({ label: 'Date', value: d })),
      financialTerms: structured.money_terms.map((m) => ({ label: inferMoneyLabel(m), value: m })),
      benefits: structured.key_benefits,
      keyPoints: structured.key_points
    },
    clauses
  };
}

function detectPriorityClauses(chunks) {
  const candidates = [];

  for (const chunk of chunks) {
    const sentences = splitSentences(chunk.text);
    for (const sentence of sentences) {
      for (const def of CLAUSE_DEFINITIONS) {
        const matched = def.patterns.some((p) => p.test(sentence));
        if (!matched) continue;
        if (isNoisyText(sentence)) continue;
        candidates.push({
          clause_type: def.type,
          importance: def.importance,
          evidence: trimSentence(sentence, 240),
          explanation: def.explanation,
          severity_weight: def.severityWeight
        });
      }
    }
  }

  const uniq = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = `${c.clause_type}::${c.evidence.slice(0, 110).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(c);
  }

  return uniq;
}

function extractRegexEntities(text) {
  const dates = extractMatches(text, [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /(within\s+\d+\s+days?)/gi,
    /(for\s+a\s+period\s+of\s+\d+\s+(days?|months?|years?))/gi
  ]);

  const money = extractMatches(text, [
    /(Rs\.?\s*[\d,]+\.?\d*)/gi,
    /(INR\s*[\d,]+\.?\d*)/gi,
    /(\$\s*[\d,]+\.?\d*)/g,
    /(USD\s*[\d,]+\.?\d*)/gi,
    /(\d+\.?\d*\s*%)/g
  ]);

  const durations = extractMatches(text, [
    /(term\s+of\s+\d+\s+(days?|months?|years?))/gi,
    /(valid\s+for\s+\d+\s+(days?|months?|years?))/gi,
    /(lease\s+period\s+\d+\s+(days?|months?|years?))/gi
  ]);

  const obligations = extractMatches(text, [
    /(shall\s+[^.\n]{0,140})/gi,
    /(must\s+[^.\n]{0,140})/gi,
    /(is\s+required\s+to\s+[^.\n]{0,140})/gi,
    /(agrees\s+to\s+[^.\n]{0,140})/gi,
    /(obligated\s+to\s+[^.\n]{0,140})/gi
  ]);

  const organizations = extractMatches(text, [/(M\/?s\.?\s+[A-Z][A-Za-z&\s]{2,})/g]);

  return {
    source: 'regex',
    dates,
    organizations,
    monetary_values: money,
    obligations,
    durations,
    deadlines: uniqueStrings([...dates.filter((x) => /within|period|term|valid/i.test(x)), ...durations]),
    money_terms: money,
    important_dates: dates
  };
}

function mergeEntities(regexEntities, spacyEntities) {
  const dates = uniqueStrings([...(regexEntities?.dates || []), ...(spacyEntities?.dates || [])]);
  const orgs = uniqueStrings([...(regexEntities?.organizations || []), ...(spacyEntities?.organizations || [])]);
  const money = uniqueStrings([...(regexEntities?.monetary_values || []), ...(spacyEntities?.monetary_values || [])]);
  const obligations = uniqueStrings([...(regexEntities?.obligations || []), ...(spacyEntities?.obligations || [])]);

  return {
    source: spacyEntities?.source || regexEntities?.source || 'regex',
    dates,
    organizations: orgs,
    monetary_values: money,
    obligations,
    durations: regexEntities?.durations || [],
    deadlines: uniqueStrings([...(regexEntities?.deadlines || []), ...dates.filter((d) => /within|before|after|period|term/i.test(d))]),
    money_terms: money,
    important_dates: dates
  };
}

async function selectChunksForReasoning(chunks, pageEstimate, entities) {
  if (chunks.length <= 14) return chunks;

  const queries = [
    'termination liability payment confidentiality penalty obligation notice default breach',
    'dates deadlines term period due renewal',
    'money payment fees penalties rent deposit interest'
  ];

  const keywordRanked = rankChunksByKeywords(chunks, queries.join(' '));

  if (pageEstimate <= 10) {
    return keywordRanked.slice(0, 16);
  }

  const semantic = await semanticRankWithEmbeddings(chunks, queries);
  if (semantic.length) {
    return semantic.slice(0, 16);
  }

  return keywordRanked.slice(0, 16);
}

function rankChunksByKeywords(chunks, query) {
  const q = tokenize(query);
  return [...chunks]
    .map((chunk) => {
      const tokens = tokenize(chunk.text);
      const set = new Set(tokens);
      let score = 0;
      for (const t of q) if (set.has(t)) score += 1;
      return { ...chunk, _score: score };
    })
    .sort((a, b) => b._score - a._score);
}

async function semanticRankWithEmbeddings(chunks, queries) {
  const enabled = String(process.env.ENABLE_EMBEDDINGS_FOR_LONG_DOCS || 'true').toLowerCase() !== 'false';
  if (!enabled) return [];

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

  try {
    const capped = chunks.slice(0, 40);
    const embeddings = [];
    for (const chunk of capped) {
      const vector = await fetchEmbedding(baseUrl, model, chunk.text.slice(0, 2500));
      embeddings.push({ chunk, vector });
    }

    const queryVectors = [];
    for (const q of queries) {
      queryVectors.push(await fetchEmbedding(baseUrl, model, q));
    }

    const scored = embeddings.map((entry) => {
      const sim = queryVectors.reduce((acc, qVec) => acc + cosineSimilarity(entry.vector, qVec), 0);
      return { ...entry.chunk, _semantic: sim };
    });

    return scored.sort((a, b) => b._semantic - a._semantic);
  } catch {
    return [];
  }
}

async function fetchEmbedding(baseUrl, model, text) {
  const resp = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text })
  });

  if (!resp.ok) {
    throw new Error(`Embedding request failed: ${resp.status}`);
  }

  const data = await resp.json();
  const vec = data?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error('Invalid embedding vector');
  }

  return vec;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRiskScore(priorityClauses) {
  if (!Array.isArray(priorityClauses) || !priorityClauses.length) return 15;

  let weighted = 0;
  for (const clause of priorityClauses) {
    if (typeof clause === 'string') {
      weighted += 2;
      continue;
    }
    const imp = normalizeRiskLevel(clause.importance);
    const weight = imp === 'high' ? 3 : imp === 'medium' ? 2 : 1;
    weighted += weight;
  }

  const score = weighted * 8;
  return clampScore(score);
}

function buildRiskSignals(clauses, chunks) {
  const out = [];
  for (const clause of clauses.slice(0, 8)) {
    out.push(`${toTitle(clause.clause_type)} detected: ${trimSentence(clause.evidence, 120)}`);
  }

  if (!out.length) {
    const fallback = chunks
      .flatMap((c) => splitSentences(c.text))
      .filter((s) => /default|penalty|liability|termination|breach|indemn/i.test(s))
      .slice(0, 4)
      .map((s) => trimSentence(s, 140));
    return fallback;
  }

  return uniqueStrings(out);
}

function collectKeyPoints(chunks, entities) {
  const points = [];
  const obligationPoints = (entities.obligations || []).slice(0, 4).map((o) => trimSentence(o, 140));
  points.push(...obligationPoints);

  const clausePoints = chunks
    .flatMap((c) => splitSentences(c.text))
    .filter((s) => /shall|must|payment|liability|confidential|termination|notice/i.test(s))
    .slice(0, 8)
    .map((s) => trimSentence(s, 160));
  points.push(...clausePoints);

  return uniqueStrings(points);
}

function detectBenefits(chunks) {
  const benefits = [];
  for (const sentence of chunks.flatMap((c) => splitSentences(c.text))) {
    if (/cure period|notice period|mutual consent|grace period|cap on liability|renew by agreement/i.test(sentence)) {
      benefits.push(trimSentence(sentence, 150));
    }
  }

  if (!benefits.length) {
    benefits.push('Contract obligations and rights are explicitly documented, which supports negotiation and compliance checks.');
  }

  return uniqueStrings(benefits);
}

function buildImplicationFromType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('termination')) return 'Early exit, default triggers, and notice windows should be reviewed carefully.';
  if (t.includes('liability')) return 'Potential legal and financial exposure should be limited through negotiated terms.';
  if (t.includes('payment')) return 'Payment amounts, due dates, and late penalties can materially affect total cost.';
  if (t.includes('confidentiality')) return 'Data-handling obligations may require operational and compliance controls.';
  if (t.includes('penalty')) return 'Breach or delay may trigger direct monetary consequences.';
  return 'This clause defines enforceable obligations that should be reviewed before signing.';
}

function buildActionFromType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('termination')) return 'Confirm termination notice period and grounds for immediate termination.';
  if (t.includes('liability')) return 'Negotiate indemnity scope and liability caps in writing.';
  if (t.includes('payment')) return 'Create a payment calendar with due dates and penalties.';
  if (t.includes('confidentiality')) return 'Define what data is confidential and retention/deletion duties.';
  if (t.includes('penalty')) return 'Quantify penalty exposure and seek cap/reduction terms.';
  return 'Review this obligation with legal counsel before execution.';
}

function detectDocumentType(text, hint) {
  if (hint && hint !== 'auto') return hint;
  const t = String(text || '').toLowerCase();
  if (/leave and license|lease|landlord|tenant|rent/i.test(t)) return 'Lease / Rental Agreement';
  if (/employment|employee|employer|salary/i.test(t)) return 'Employment Agreement';
  if (/service agreement|master service|sla|statement of work/i.test(t)) return 'Service Agreement';
  if (/loan|borrower|lender|interest|principal/i.test(t)) return 'Loan / Credit Agreement';
  if (/nda|non-disclosure|confidentiality agreement/i.test(t)) return 'Confidentiality Agreement';
  return 'Legal Document';
}

function chunkByTokens(text, targetTokens = 1200, overlapTokens = 180) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/g)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 20);

  const chunks = [];
  let current = [];
  let tokenCount = 0;

  for (const p of paragraphs) {
    const pTokens = tokenize(p);
    if (tokenCount + pTokens.length > targetTokens && current.length > 0) {
      const textChunk = current.join('\n\n');
      chunks.push({ text: textChunk, tokenCount });

      const overlap = takeLastTokens(textChunk, overlapTokens);
      current = overlap ? [overlap, p] : [p];
      tokenCount = tokenize(current.join(' ')).length;
    } else {
      current.push(p);
      tokenCount += pTokens.length;
    }
  }

  if (current.length) {
    chunks.push({ text: current.join('\n\n'), tokenCount });
  }

  return chunks;
}

function takeLastTokens(text, n) {
  const tokens = String(text || '').split(/\s+/g).filter(Boolean);
  if (tokens.length <= n) return text;
  return tokens.slice(-n).join(' ');
}

function extractMatches(text, patterns) {
  const out = [];
  const seen = new Set();
  for (const re of patterns) {
    const matches = text.match(re) || [];
    for (const raw of matches) {
      const value = String(raw || '').replace(/\s+/g, ' ').trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/g).filter((x) => x.length > 1);
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeRiskLevel(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'high' || v === 'medium' || v === 'low') return v;
  return 'medium';
}

function mergePriorityClauses(primary = [], fallback = []) {
  const out = [];
  const seen = new Set();
  for (const item of [...primary, ...fallback]) {
    const obj = typeof item === 'string'
      ? { clause_type: item, importance: 'medium', evidence: item, explanation: item }
      : item;

    const type = String(obj?.clause_type || '').trim();
    const evidence = String(obj?.evidence || '').trim();
    if (!type && !evidence) continue;

    const key = `${type.toLowerCase()}::${evidence.slice(0, 80).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      clause_type: type || 'obligation clause',
      importance: normalizeRiskLevel(obj?.importance),
      evidence: evidence || type || 'See document clause text.',
      explanation: String(obj?.explanation || '').trim() || buildImplicationFromType(type)
    });
  }
  return out;
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function arrayToStrings(value) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map((v) => String(v || '').trim()).filter(Boolean));
}

function uniqueStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const val = String(item || '').replace(/\s+/g, ' ').trim();
    if (!val) continue;
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(val);
  }
  return out;
}

function trimSentence(s, maxLen = 200) {
  const value = String(s || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 3)}...`;
}

function toTitle(v) {
  return String(v || '')
    .split(' ')
    .map((x) => x ? x[0].toUpperCase() + x.slice(1) : x)
    .join(' ');
}

function inferMoneyLabel(value) {
  return /%|percent/i.test(value) ? 'Rate' : 'Amount';
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = String(text || '').indexOf('{');
    const end = String(text || '').lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(String(text).slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
