function normalizeText(text = '') {
  return String(text).replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const RISK_PATTERNS = [
  [/indemn|liabil|limitation of liability/i, 'Liability and indemnity obligations may be one-sided.'],
  [/termination|cancel|default|breach/i, 'Termination/default terms can create sudden legal or financial exposure.'],
  [/arbitration|dispute|jurisdiction|governing law/i, 'Dispute resolution venue and law may limit your options.'],
  [/late fee|penalty|interest|liquidated damages/i, 'Penalties or late fees can increase total payment obligations.'],
  [/confidential|privacy|data protection|personal data/i, 'Data/privacy obligations may require strict compliance controls.'],
  [/auto-renew|renewal/i, 'Auto-renewal may lock you in unless cancelled on time.']
];

const BENEFIT_PATTERNS = [
  [/termination for convenience|without cause/i, 'Includes flexibility to end agreement in some scenarios.'],
  [/cure period|notice period/i, 'Provides a notice/cure period before strict enforcement.'],
  [/cap on liability|maximum liability/i, 'Contains at least some liability limitation language.'],
  [/service level|warranty|support/i, 'Specifies service/warranty commitments.']
];

export function analyzeDocumentLocally(text, docTypeHint) {
  const clean = normalizeText(text);
  const summary = {
    documentType: detectDocumentType(clean, docTypeHint),
    keyPoints: buildKeyPoints(clean),
    benefits: buildBenefits(clean),
    risks: buildRisks(clean),
    importantDates: extractDates(clean).slice(0, 5),
    financialTerms: extractMoney(clean).slice(0, 5),
    overallRiskLevel: 'medium'
  };

  const clauses = extractClauses(clean);
  summary.overallRiskLevel = computeOverallRisk(summary.risks.length, clauses);

  return { summary, clauses };
}

function detectDocumentType(text, hint) {
  if (hint && hint !== 'auto') return hint;
  const t = text.toLowerCase();
  if (/lease|tenant|landlord|rent/i.test(t)) return 'Lease / Rental Agreement';
  if (/employment|employee|employer|salary/i.test(t)) return 'Employment Agreement';
  if (/loan|interest|principal|borrower|lender/i.test(t)) return 'Loan / Credit Agreement';
  if (/terms of service|terms and conditions|acceptable use/i.test(t)) return 'Terms of Service';
  return 'Legal Document';
}

function buildKeyPoints(text) {
  const s = splitSentences(text).filter((x) => x.length > 40);
  return uniqueStrings(s.slice(0, 5).map((x) => shorten(x, 110))).slice(0, 5);
}

function buildRisks(text) {
  const risks = [];
  for (const [re, msg] of RISK_PATTERNS) {
    if (re.test(text)) risks.push(msg);
  }
  if (!risks.length) risks.push('Review obligations, payment terms, and termination conditions carefully.');
  return risks.slice(0, 6);
}

function buildBenefits(text) {
  const benefits = [];
  for (const [re, msg] of BENEFIT_PATTERNS) {
    if (re.test(text)) benefits.push(msg);
  }
  if (!benefits.length) benefits.push('Document includes defined terms that can be reviewed and negotiated.');
  return benefits.slice(0, 4);
}

function extractClauses(text) {
  const chunks = splitSections(text);
  return chunks.slice(0, 8).map((chunk, i) => {
    const importance = classifyImportance(chunk.body);
    const title = chunk.heading ? shorten(chunk.heading, 70) : `Clause ${i + 1}`;
    return {
      id: `c${i + 1}`,
      title,
      section: chunk.heading || '',
      originalText: shorten(chunk.body, 500),
      explanation: buildExplanation(chunk.body),
      implications: buildImplications(chunk.body),
      actionItems: buildActionItems(chunk.body, importance),
      importance
    };
  });
}

function splitSections(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = { heading: 'Preamble', body: '' };
  const headingRe = /^(section\s+\d+(?:\.\d+)*|article\s+[ivxlcdm\d]+|\d+(?:\.\d+)+\s+.+)$/i;

  for (const line of lines) {
    if (headingRe.test(line) && current.body.length > 80) {
      sections.push(current);
      current = { heading: line, body: '' };
    } else {
      current.body += (current.body ? ' ' : '') + line;
    }
  }
  if (current.body) sections.push(current);

  return sections
    .filter((s) => s.body.length > 80)
    .sort((a, b) => b.body.length - a.body.length);
}

function classifyImportance(text) {
  if (/indemn|liabil|termination|arbitration|jurisdiction|penalty|default/i.test(text)) return 'high';
  if (/notice|payment|confidential|data|warranty|renewal/i.test(text)) return 'medium';
  return 'low';
}

function buildExplanation(body) {
  const sentence = splitSentences(body)[0] || 'Review this clause carefully before signing.';
  return shorten(sentence, 150);
}

function buildImplications(body) {
  const out = [];
  if (/payment|fee|interest|penalty/i.test(body)) out.push('This section may increase your financial obligations.');
  if (/termination|default|breach/i.test(body)) out.push('Non-compliance here can trigger termination consequences.');
  if (/arbitration|jurisdiction|governing law/i.test(body)) out.push('This can affect how and where disputes are resolved.');
  if (!out.length) out.push('This clause defines rights and obligations that should be reviewed closely.');
  return out.slice(0, 2);
}

function buildActionItems(body, importance) {
  const out = [];
  if (importance === 'high') out.push('Discuss this clause with legal counsel before signing.');
  if (/payment|fee|interest|penalty/i.test(body)) out.push('Confirm all payment amounts, dates, and penalties.');
  if (/termination|renewal|notice/i.test(body)) out.push('Track notice and renewal deadlines in your calendar.');
  if (!out.length) out.push('Check whether this clause can be negotiated.');
  return out.slice(0, 2);
}

function extractDates(text) {
  const out = [];
  const seen = new Set();
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /(within\s+\d+\s+days?)/gi
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      const value = String(m).trim();
      if (seen.has(value)) continue;
      seen.add(value);
      out.push({ label: /within\s+\d+/i.test(value) ? 'Timeline' : 'Date', value });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function extractMoney(text) {
  const out = [];
  const seen = new Set();
  const patterns = [/\$[\d,]+\.?\d*/g, /\d+\.?\d*\s*%/g, /USD\s*[\d,]+\.?\d*/gi];
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      const value = String(m).trim();
      if (seen.has(value)) continue;
      seen.add(value);
      out.push({ label: value.includes('%') ? 'Rate' : 'Amount', value });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function computeOverallRisk(riskCount, clauses) {
  const high = clauses.filter((c) => c.importance === 'high').length;
  if (high >= 3 || riskCount >= 5) return 'high';
  if (high >= 1 || riskCount >= 2) return 'medium';
  return 'low';
}

function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shorten(s, max) {
  if (!s) return '';
  return s.length <= max ? s : `${s.slice(0, max - 1)}...`;
}

function uniqueStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
