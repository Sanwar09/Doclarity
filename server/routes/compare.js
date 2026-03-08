import express from 'express';
import multer from 'multer';
import { extractTextFromBuffer } from '../services/documentParser.js';
import { analyzeDocumentLocally } from '../services/localAnalyze.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.post(
  '/',
  upload.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const fileA = req.files?.fileA?.[0];
      const fileB = req.files?.fileB?.[0];

      if (!fileA || !fileB) {
        return res.status(400).json({ message: 'Both fileA and fileB are required.' });
      }

      const [{ text: textA }, { text: textB }] = await Promise.all([
        extractTextFromBuffer(fileA.buffer),
        extractTextFromBuffer(fileB.buffer)
      ]);

      if (!textA || !textB) {
        return res.status(400).json({ message: 'Could not extract readable text from one or both files.' });
      }

      const [analysisA, analysisB] = await Promise.all([
        Promise.resolve(analyzeDocumentLocally(textA, 'auto')),
        Promise.resolve(analyzeDocumentLocally(textB, 'auto'))
      ]);

      const comparison = compareAnalyses(analysisA, analysisB);

      return res.json({
        documentA: {
          name: fileA.originalname,
          ...analysisA
        },
        documentB: {
          name: fileB.originalname,
          ...analysisB
        },
        comparison
      });
    } catch (e) {
      console.error('[compare] error:', e);
      return res.status(500).json({ message: 'Failed to compare documents.' });
    }
  }
);

export default router;

function compareAnalyses(a, b) {
  const risksA = new Set((a.summary?.risks || []).map(normalize));
  const risksB = new Set((b.summary?.risks || []).map(normalize));

  const addedRisks = [...risksB].filter((r) => !risksA.has(r));
  const removedRisks = [...risksA].filter((r) => !risksB.has(r));

  const highA = (a.clauses || []).filter((c) => c.importance === 'high').length;
  const highB = (b.clauses || []).filter((c) => c.importance === 'high').length;

  const finA = (a.summary?.financialTerms || []).map((x) => `${x.label}: ${x.value}`);
  const finB = (b.summary?.financialTerms || []).map((x) => `${x.label}: ${x.value}`);

  const changedFinancialTerms = symmetricDiff(finA, finB);

  const deadlinesA = (a.summary?.importantDates || []).map((x) => `${x.label}: ${x.value}`);
  const deadlinesB = (b.summary?.importantDates || []).map((x) => `${x.label}: ${x.value}`);
  const changedDeadlines = symmetricDiff(deadlinesA, deadlinesB);

  return {
    riskLevelA: a.summary?.overallRiskLevel || 'medium',
    riskLevelB: b.summary?.overallRiskLevel || 'medium',
    highRiskClauseDelta: highB - highA,
    addedRisks,
    removedRisks,
    changedFinancialTerms,
    changedDeadlines,
    recommendation: buildRecommendation({
      riskA: a.summary?.overallRiskLevel,
      riskB: b.summary?.overallRiskLevel,
      highA,
      highB,
      addedRiskCount: addedRisks.length
    })
  };
}

function buildRecommendation({ riskA, riskB, highA, highB, addedRiskCount }) {
  if (riskB === 'high' && riskA !== 'high') {
    return 'Document B appears riskier overall. Negotiate high-risk clauses before signing.';
  }
  if (highB > highA || addedRiskCount > 0) {
    return 'Document B introduces additional risk signals. Review penalties, termination, and liability terms carefully.';
  }
  if (highA > highB) {
    return 'Document B may be comparatively safer on major clauses, but still review deadlines and costs.';
  }
  return 'Both documents have similar risk profile. Compare payment terms and termination wording before final decision.';
}

function symmetricDiff(arrA, arrB) {
  const a = new Set(arrA.map(normalize));
  const b = new Set(arrB.map(normalize));
  return [...a, ...b].filter((x) => !(a.has(x) && b.has(x)));
}

function normalize(v) {
  return String(v || '').trim().toLowerCase();
}
