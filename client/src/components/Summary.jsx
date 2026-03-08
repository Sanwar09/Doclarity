import React from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Info,
  ShieldAlert,
  ListChecks,
  Gauge
} from 'lucide-react';

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const uniqueTop = (items = [], limit = 6) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const val = normalizeText(item);
    if (!val) continue;
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(val);
    if (out.length >= limit) break;
  }
  return out;
};

const AtAGlanceSummary = ({ summary, clauses = [] }) => {
  const {
    documentType,
    keyPoints,
    risks,
    benefits,
    importantDates,
    financialTerms,
    overallRiskLevel
  } = summary || {};

  const safeClauses = Array.isArray(clauses) ? clauses : [];
  const highRiskClauses = safeClauses.filter((c) => c?.importance === 'high');
  const mediumRiskClauses = safeClauses.filter((c) => c?.importance === 'medium');

  const obligations = safeClauses
    .flatMap((c) => (Array.isArray(c?.actionItems) ? c.actionItems : []))
    .filter(Boolean);

  const implicationSignals = safeClauses
    .flatMap((c) => (Array.isArray(c?.implications) ? c.implications : []))
    .filter(Boolean);

  const cleanObligations = uniqueTop(obligations, 5);
  const cleanImplicationSignals = uniqueTop(implicationSignals, 3);

  const dataGaps = [
    !Array.isArray(risks) || risks.length === 0 ? 'No risk insights extracted yet.' : null,
    !Array.isArray(importantDates) || importantDates.length === 0 ? 'No clear dates/deadlines found.' : null,
    !Array.isArray(financialTerms) || financialTerms.length === 0 ? 'No financial terms detected.' : null,
    safeClauses.length < 2 ? 'Very few clauses extracted; OCR quality may be low.' : null
  ].filter(Boolean);

  const riskCount = Array.isArray(risks) ? risks.length : 0;
  const datesCount = Array.isArray(importantDates) ? importantDates.length : 0;
  const moneyCount = Array.isArray(financialTerms) ? financialTerms.length : 0;

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low':
        return 'text-success-600 bg-success-50';
      case 'medium':
        return 'text-warning-600 bg-warning-50';
      case 'high':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">At a Glance Summary</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(overallRiskLevel)}`}>
          {String(overallRiskLevel || 'medium').toUpperCase()} RISK
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-slate-700">Document Type</h3>
        </div>
        <p className="text-slate-600 ml-7">{documentType || 'Legal Document'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-600">Risk Signals</p>
          <p className="text-lg font-semibold text-slate-800">{riskCount}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-600">Deadlines Found</p>
          <p className="text-lg font-semibold text-slate-800">{datesCount}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-600">Money Terms</p>
          <p className="text-lg font-semibold text-slate-800">{moneyCount}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-600">Priority Clauses</p>
          <p className="text-lg font-semibold text-slate-800">
            {highRiskClauses.length + mediumRiskClauses.length}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-success-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <h3 className="font-semibold text-success-700">Key Benefits</h3>
          </div>
          <ul className="space-y-2">
            {(Array.isArray(benefits) ? benefits : []).map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-success-600 mt-1">-</span>
                <span className="text-slate-700 text-sm">{benefit}</span>
              </li>
            ))}
            {(!Array.isArray(benefits) || benefits.length === 0) && (
              <li className="text-slate-600 text-sm">No clear benefits extracted yet.</li>
            )}
          </ul>
        </div>

        <div className="bg-danger-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <h3 className="font-semibold text-danger-800">Potential Risks</h3>
          </div>
          <ul className="space-y-2">
            {(Array.isArray(risks) ? risks : []).map((risk, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-danger-600 mt-1">-</span>
                <span className="text-slate-700 text-sm">{risk}</span>
              </li>
            ))}
            {(!Array.isArray(risks) || risks.length === 0) && (
              <li className="text-slate-600 text-sm">No explicit risks extracted yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-5 h-5 text-amber-700" />
            <h4 className="font-semibold text-amber-800">What You Should Do Now</h4>
          </div>
          <ul className="space-y-1 text-sm text-slate-700">
            {(cleanObligations.length ? cleanObligations : ['Review high-importance clauses before signing.']).map((item, index) => (
              <li key={index}>- {item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-danger-700" />
            <h4 className="font-semibold text-danger-800">Priority Legal Attention</h4>
          </div>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>- High importance clauses: {highRiskClauses.length}</li>
            <li>- Medium importance clauses: {mediumRiskClauses.length}</li>
            {cleanImplicationSignals.slice(0, 2).map((item, index) => (
              <li key={index}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {Array.isArray(importantDates) && importantDates.length > 0 && (
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h4 className="font-medium text-primary-800">Important Dates</h4>
            </div>
            <div className="space-y-1">
              {importantDates.map((date, index) => (
                <p key={index} className="text-sm text-slate-700">
                  <span className="font-medium">{date.label}:</span> {date.value}
                </p>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(financialTerms) && financialTerms.length > 0 && (
          <div className="bg-accent-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-accent-600" />
              <h4 className="font-medium text-accent-800">Financial Terms</h4>
            </div>
            <div className="space-y-1">
              {financialTerms.map((term, index) => (
                <p key={index} className="text-sm text-slate-700">
                  <span className="font-medium">{term.label}:</span> {term.value}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-slate-600" />
            <h4 className="font-medium text-slate-800">Key Points</h4>
          </div>
          <div className="space-y-1">
            {(Array.isArray(keyPoints) ? keyPoints : []).slice(0, 4).map((point, index) => (
              <p key={index} className="text-sm text-slate-700">- {point}</p>
            ))}
          </div>
        </div>
      </div>

      {dataGaps.length > 0 && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-slate-700" />
            <h4 className="font-medium text-slate-800">Extraction Quality Notes</h4>
          </div>
          <ul className="text-sm text-slate-700 space-y-1">
            {dataGaps.map((gap, i) => (
              <li key={i}>- {gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AtAGlanceSummary;

