import React, { useState } from 'react';
import axios from 'axios';
import { Scale, AlertTriangle, CalendarClock, Wallet } from 'lucide-react';

const Compare = () => {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const runCompare = async () => {
    if (!fileA || !fileB) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('fileA', fileA);
      form.append('fileB', fileB);

      const { data } = await axios.post('/api/compare', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to compare documents.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Compare Two Documents</h1>
          </div>
          <p className="text-slate-600 mb-6">Upload two agreements and get risk, deadline, and financial term differences.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document A</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFileA(e.target.files?.[0] || null)}
                className="block w-full text-sm border border-gray-300 rounded-lg p-2 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document B</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFileB(e.target.files?.[0] || null)}
                className="block w-full text-sm border border-gray-300 rounded-lg p-2 bg-slate-50"
              />
            </div>
          </div>

          <button
            onClick={runCompare}
            disabled={!fileA || !fileB || loading}
            className="mt-4 px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:bg-slate-300"
          >
            {loading ? 'Comparing...' : 'Compare Documents'}
          </button>

          {error && <p className="mt-4 text-danger-700">{error}</p>}
        </div>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-slate-800">{result.documentA.name}</h3>
                <p className="text-sm text-slate-600">Risk: {result.comparison.riskLevelA}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-slate-800">{result.documentB.name}</h3>
                <p className="text-sm text-slate-600">Risk: {result.comparison.riskLevelB}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
                <h3 className="font-semibold text-slate-800">Risk Differences</h3>
              </div>
              <p className="text-sm text-slate-700 mb-2">High-risk clause delta (B - A): {result.comparison.highRiskClauseDelta}</p>
              <p className="text-sm font-medium text-slate-700">Added Risks in B:</p>
              <ul className="list-disc pl-5 text-sm text-slate-700 mb-2">
                {(result.comparison.addedRisks || []).length
                  ? result.comparison.addedRisks.map((r, i) => <li key={i}>{r}</li>)
                  : <li>No additional risks detected.</li>}
              </ul>
              <p className="text-sm font-medium text-slate-700">Removed Risks from A:</p>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {(result.comparison.removedRisks || []).length
                  ? result.comparison.removedRisks.map((r, i) => <li key={i}>{r}</li>)
                  : <li>No risk removals detected.</li>}
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-slate-800">Financial Changes</h3>
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(result.comparison.changedFinancialTerms || []).length
                    ? result.comparison.changedFinancialTerms.map((x, i) => <li key={i}>{x}</li>)
                    : <li>No major financial term changes found.</li>}
                </ul>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-slate-800">Deadline Changes</h3>
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(result.comparison.changedDeadlines || []).length
                    ? result.comparison.changedDeadlines.map((x, i) => <li key={i}>{x}</li>)
                    : <li>No deadline changes found.</li>}
                </ul>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-semibold text-primary-800 mb-1">Recommendation</h3>
              <p className="text-primary-700 text-sm">{result.comparison.recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compare;
