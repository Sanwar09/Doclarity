import React, { useMemo } from 'react';
import { ShieldAlert, CalendarClock, Scale, Copy, Wand2, SlidersHorizontal } from 'lucide-react';

const ActionCenter = ({ analysisData, onAskAction }) => {
  const summary = analysisData?.summary || {};
  const clauses = Array.isArray(analysisData?.clauses) ? analysisData.clauses : [];
  const [simInput, setSimInput] = React.useState({
    noticeDays: 30,
    penaltyPercent: 5,
    curePeriodDays: 7,
    liabilityCapMonths: 0
  });

  const priorityClauses = useMemo(() => {
    return [...clauses]
      .filter((c) => c.importance === 'high' || c.importance === 'medium')
      .slice(0, 5);
  }, [clauses]);

  const deadlines = useMemo(() => {
    return Array.isArray(summary.importantDates) ? summary.importantDates.slice(0, 6) : [];
  }, [summary]);

  const legalBrief = useMemo(() => {
    const risks = (summary.risks || []).slice(0, 4).map((r) => `- ${r}`).join('\n');
    const priority = priorityClauses
      .slice(0, 4)
      .map((c, i) => `${i + 1}. ${c.title || 'Untitled clause'} (${c.section || 'No section'})`)
      .join('\n');

    return [
      `Document: ${analysisData?.documentName || 'Uploaded document'}`,
      `Type: ${summary.documentType || 'Legal Document'}`,
      `Risk Level: ${summary.overallRiskLevel || 'medium'}`,
      '',
      'Top Risks:',
      risks || '- Not enough risk data extracted.',
      '',
      'Clauses to Review First:',
      priority || '1. No priority clauses detected.',
      '',
      'Questions for Legal Counsel:',
      '- Which terms are one-sided and negotiable?',
      '- What legal/financial downside is the highest?',
      '- What specific wording should be changed before signing?'
    ].join('\n');
  }, [analysisData, priorityClauses, summary]);

  const negotiationPlan = useMemo(() => {
    const picks = priorityClauses.slice(0, 5).map((c, i) => {
      const title = String(c?.title || 'Important clause');
      const t = title.toLowerCase();
      let ask = 'Ask for clearer, balanced wording and explicit responsibilities for both parties.';
      if (t.includes('payment') || t.includes('fee')) ask = 'Negotiate longer due window and reduced late fee/penalty.';
      if (t.includes('termination') || t.includes('notice')) ask = 'Add a longer notice period and cure period before termination.';
      if (t.includes('liability') || t.includes('indemn')) ask = 'Cap liability and narrow indemnity scope to direct damages only.';
      if (t.includes('confidential')) ask = 'Define confidential data clearly and limit over-broad restrictions.';
      if (t.includes('penalty')) ask = 'Reduce penalty amount and add grace period before charges apply.';
      return {
        id: c?.id || `np-${i + 1}`,
        clause: title,
        ask
      };
    });

    return picks.length ? picks : [
      {
        id: 'np-1',
        clause: 'Payment and termination terms',
        ask: 'Negotiate clearer due dates, lower penalties, and a reasonable termination notice period.'
      }
    ];
  }, [priorityClauses]);

  const negotiationEmail = useMemo(() => {
    const points = negotiationPlan.slice(0, 4).map((p, i) => `${i + 1}) ${p.clause}: ${p.ask}`).join('\n');
    return [
      `Subject: Request to revise key clauses - ${analysisData?.documentName || 'Agreement'}`,
      '',
      'Hello,',
      '',
      'Thank you for sharing the agreement. Before signing, I would like to discuss the following points:',
      points,
      '',
      'Please share a revised draft incorporating these changes.',
      '',
      'Regards,',
      '[Your Name]'
    ].join('\n');
  }, [analysisData, negotiationPlan]);

  const baselineRisk = Number(summary?.riskScore || (summary?.overallRiskLevel === 'high' ? 75 : summary?.overallRiskLevel === 'low' ? 25 : 50));
  const simulation = useMemo(() => {
    let delta = 0;
    if (simInput.noticeDays < 30) delta += 10;
    if (simInput.noticeDays >= 60) delta -= 8;
    if (simInput.penaltyPercent > 3) delta += 8;
    if (simInput.penaltyPercent <= 1) delta -= 6;
    if (simInput.curePeriodDays < 7) delta += 6;
    if (simInput.curePeriodDays >= 15) delta -= 5;
    if (simInput.liabilityCapMonths === 0) delta += 12;
    if (simInput.liabilityCapMonths >= 6) delta -= 6;

    const score = Math.max(0, Math.min(100, Math.round(baselineRisk + delta)));
    const level = score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low';
    return { score, level, delta };
  }, [baselineRisk, simInput]);

  const copyBrief = () => {
    navigator.clipboard.writeText(legalBrief);
  };

  const copyNegotiationEmail = () => {
    navigator.clipboard.writeText(negotiationEmail);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Action Center</h2>
        <button
          onClick={copyBrief}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-slate-50"
        >
          <Copy className="w-4 h-4" />
          Copy Brief
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-danger-700" />
            <h3 className="font-semibold text-danger-800">Negotiate First</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {priorityClauses.length ? priorityClauses.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onAskAction?.(`How should I negotiate this clause: ${c.title || c.id}?`)}
                  className="text-left hover:underline"
                >
                  {c.title || 'Untitled clause'} {c.section ? `(${c.section})` : ''}
                </button>
              </li>
            )) : <li>No priority clauses available yet.</li>}
          </ul>
        </div>

        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-5 h-5 text-primary-700" />
            <h3 className="font-semibold text-primary-800">Deadline Tracker</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {deadlines.length ? deadlines.map((d, i) => (
              <li key={`${d.value}-${i}`}>{d.label || 'Date'}: {d.value}</li>
            )) : <li>No deadlines extracted.</li>}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">Lawyer Prep Questions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onAskAction?.('What is the biggest legal risk if I sign this as-is?')} className="px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm">
            Biggest legal risk
          </button>
          <button onClick={() => onAskAction?.('Which exact terms should I renegotiate first?')} className="px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm">
            Terms to renegotiate
          </button>
          <button onClick={() => onAskAction?.('Draft a short negotiation email based on this document.')} className="px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm">
            Draft negotiation email
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-700" />
            <h3 className="font-semibold text-indigo-900">Negotiation Copilot</h3>
          </div>
          <button
            onClick={copyNegotiationEmail}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-100 text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy Email Draft
          </button>
        </div>

        <ul className="space-y-2 text-sm text-slate-700">
          {negotiationPlan.map((item, idx) => (
            <li key={item.id}>
              <span className="font-medium">{idx + 1}. {item.clause}:</span> {item.ask}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-5 h-5 text-amber-700" />
          <h3 className="font-semibold text-amber-900">What-If Simulator</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <label className="space-y-1">
            <span className="text-slate-700">Termination notice (days)</span>
            <input type="number" min="0" max="180" value={simInput.noticeDays} onChange={(e) => setSimInput((p) => ({ ...p, noticeDays: Number(e.target.value || 0) }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-slate-700">Late penalty (%)</span>
            <input type="number" min="0" max="30" step="0.5" value={simInput.penaltyPercent} onChange={(e) => setSimInput((p) => ({ ...p, penaltyPercent: Number(e.target.value || 0) }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-slate-700">Cure period (days)</span>
            <input type="number" min="0" max="60" value={simInput.curePeriodDays} onChange={(e) => setSimInput((p) => ({ ...p, curePeriodDays: Number(e.target.value || 0) }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-slate-700">Liability cap (months of fees)</span>
            <input type="number" min="0" max="24" value={simInput.liabilityCapMonths} onChange={(e) => setSimInput((p) => ({ ...p, liabilityCapMonths: Number(e.target.value || 0) }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
        </div>

        <div className="mt-4 rounded-lg bg-white border border-amber-200 p-3 text-sm text-slate-800">
          <p>Baseline risk score: <span className="font-semibold">{baselineRisk}</span></p>
          <p>Simulated risk score: <span className="font-semibold">{simulation.score}</span> ({simulation.level.toUpperCase()})</p>
          <p>Change from baseline: <span className={`font-semibold ${simulation.delta > 0 ? 'text-danger-700' : simulation.delta < 0 ? 'text-success-700' : 'text-slate-700'}`}>{simulation.delta > 0 ? `+${simulation.delta}` : simulation.delta}</span></p>
        </div>
      </div>
    </div>
  );
};

export default ActionCenter;
