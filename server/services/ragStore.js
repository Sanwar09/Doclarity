import crypto from 'crypto';

const MAX_DOCS = 100;
const ragDocs = new Map();

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on',
  'for', 'with', 'by', 'or', 'as', 'at', 'from', 'that', 'this', 'it', 'its', 'if',
  'then', 'than', 'into', 'about', 'under', 'over', 'after', 'before', 'between',
  'not', 'no', 'you', 'your', 'we', 'our', 'they', 'their', 'them', 'he', 'she',
  'his', 'her', 'can', 'could', 'should', 'would', 'will', 'may', 'might', 'must'
]);

export function createRagDocument({
  rawText = '',
  analysis = null,
  documentName = 'Document',
  sourceDocId = null
} = {}) {
  const paragraphChunks = chunkText(rawText, 850, 120);
  const clauseChunks = chunkClauses(analysis?.clauses || []);
  const chunks = dedupeChunks([...paragraphChunks, ...clauseChunks]);

  const index = buildInvertedStats(chunks);
  const ragDocId = crypto.randomUUID();

  ragDocs.set(ragDocId, {
    ragDocId,
    sourceDocId,
    documentName,
    createdAt: Date.now(),
    chunks,
    ...index
  });

  evictOldestIfNeeded();

  return {
    ragDocId,
    chunkCount: chunks.length
  };
}

export function getRagDocument(ragDocId) {
  if (!ragDocId) return null;
  return ragDocs.get(ragDocId) || null;
}

export function retrieveTopChunks(ragDocId, query, topK = 5) {
  const doc = getRagDocument(ragDocId);
  if (!doc || !query) return [];

  const qTokens = tokenize(query);
  if (!qTokens.length) return [];

  const scored = doc.chunks.map((chunk) => {
    const lexical = bm25Score(qTokens, chunk, doc);
    const phraseBoost = phraseOverlapBoost(query, chunk.text);
    const termCoverage = coverageBoost(qTokens, chunk.tokens);
    const importanceBoost = chunk.importance === 'high' ? 1.2 : chunk.importance === 'medium' ? 0.5 : 0;
    const score = lexical + phraseBoost + termCoverage + importanceBoost;
    return { ...chunk, score };
  });

  return scored
    .filter((c) => c.score >= 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatRagReferences(chunks = []) {
  return chunks.map((chunk) => ({
    clauseId: chunk.clauseId || null,
    section: chunk.section || `Chunk ${chunk.id}`,
    title: chunk.title || 'Document excerpt',
    sourceType: chunk.sourceType,
    chunkId: chunk.id
  }));
}

export function confidenceFromChunks(chunks = []) {
  if (!chunks.length) return 'low';
  const maxScore = chunks[0].score || 0;
  if (maxScore >= 8) return 'high';
  if (maxScore >= 4) return 'medium';
  return 'low';
}

function chunkClauses(clauses) {
  return clauses
    .map((c, idx) => {
      const text = [c.originalText, c.explanation].filter(Boolean).join('\n').trim();
      if (!text) return null;
      return {
        id: `clause-${c.id || idx + 1}`,
        text: text.slice(0, 1600),
        tokens: tokenize(text),
        sourceType: 'clause',
        clauseId: c.id || null,
        title: c.title || null,
        section: c.section || null,
        importance: c.importance || 'medium'
      };
    })
    .filter(Boolean);
}

function chunkText(text, targetChars = 850, minChars = 120) {
  const paras = String(text || '')
    .split(/\n{2,}/g)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p && !isNoisyParagraph(p));

  const chunks = [];
  let buf = '';
  let n = 0;
  for (const p of paras) {
    const candidate = buf ? `${buf}\n${p}` : p;
    if (candidate.length >= targetChars && buf.length >= minChars) {
      n += 1;
      chunks.push({
        id: `p-${n}`,
        text: buf,
        tokens: tokenize(buf),
        sourceType: 'paragraph',
        clauseId: null,
        title: null,
        section: null,
        importance: 'medium'
      });
      buf = p;
      continue;
    }
    buf = candidate;
  }

  if (buf.length >= minChars) {
    n += 1;
    chunks.push({
      id: `p-${n}`,
      text: buf,
      tokens: tokenize(buf),
      sourceType: 'paragraph',
      clauseId: null,
      title: null,
      section: null,
      importance: 'medium'
    });
  }
  return chunks;
}

function dedupeChunks(chunks) {
  const seen = new Set();
  const out = [];
  for (const c of chunks) {
    const key = c.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function buildInvertedStats(chunks) {
  const df = new Map();
  let totalLen = 0;

  for (const c of chunks) {
    totalLen += c.tokens.length || 1;
    const unique = new Set(c.tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }

  return {
    documentCount: chunks.length,
    avgDocLength: chunks.length ? totalLen / chunks.length : 1,
    df
  };
}

function bm25Score(queryTokens, chunk, doc) {
  const tf = termFreq(chunk.tokens);
  const k1 = 1.5;
  const b = 0.75;
  const dl = chunk.tokens.length || 1;
  const avgdl = doc.avgDocLength || 1;
  let score = 0;

  for (const q of queryTokens) {
    const fq = tf.get(q) || 0;
    if (!fq) continue;
    const df = doc.df.get(q) || 0;
    const idf = Math.log(1 + (doc.documentCount - df + 0.5) / (df + 0.5));
    const denom = fq + k1 * (1 - b + b * (dl / avgdl));
    score += idf * ((fq * (k1 + 1)) / denom);
  }
  return score;
}

function phraseOverlapBoost(query, text) {
  const q = String(query || '').toLowerCase().trim();
  if (!q || q.length < 10) return 0;
  const t = String(text || '').toLowerCase();
  if (t.includes(q)) return 2.5;

  const phrases = q.split(/[,.?!;:]/).map((p) => p.trim()).filter((p) => p.length > 6);
  for (const p of phrases) {
    if (t.includes(p)) return 1.5;
  }
  return 0;
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function coverageBoost(queryTokens, chunkTokens) {
  const set = new Set(chunkTokens);
  const matched = queryTokens.filter((q) => set.has(q)).length;
  if (!queryTokens.length) return 0;
  const ratio = matched / queryTokens.length;
  return ratio >= 0.6 ? 1.2 : ratio >= 0.35 ? 0.6 : 0;
}

function isNoisyParagraph(text = '') {
  const s = String(text).trim();
  if (!s) return true;
  if (s.length < 80) return true;
  const digits = (s.match(/\d/g) || []).length;
  const letters = (s.match(/[a-z]/gi) || []).length;
  if (digits > 30 && letters < 40) return true;
  if (/Page\s+\d+\s+of\s+\d+/i.test(s)) return true;
  if (/GRN|Transaction Id|Stamp Duty|Registration Fee/i.test(s)) return true;
  return false;
}

function evictOldestIfNeeded() {
  if (ragDocs.size <= MAX_DOCS) return;
  const entries = [...ragDocs.values()].sort((a, b) => a.createdAt - b.createdAt);
  while (ragDocs.size > MAX_DOCS && entries.length) {
    const oldest = entries.shift();
    ragDocs.delete(oldest.ragDocId);
  }
}
