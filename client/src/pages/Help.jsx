import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clipboard, LifeBuoy, Link as LinkIcon, RefreshCw, Search, Shield, UploadCloud, Camera, Sparkles } from 'lucide-react';

const Section = ({ id, title, icon: Icon, children }) => (
  <section id={id} className="bg-white border border-slate-200 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      {Icon ? <Icon className="w-5 h-5 text-primary-600" /> : null}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    {children}
  </section>
);

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="font-medium text-slate-800">{q}</span>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-slate-700 text-sm border-t border-slate-100">
          {a}
        </div>
      )}
    </div>
  );
};

export default function Help() {
  const [diag, setDiag] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const now = useMemo(() => new Date().toISOString(), []);

  const runDiagnostics = async () => {
    const payload = {
      time: now,
      url: window.location.href,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine,
      screen: `${window.screen?.width}x${window.screen?.height}`,
      // App expectations
      vite: true,
      tailwind: 'v4',
    };
    setDiag(payload);
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
      alert('Diagnostics copied to clipboard.');
    } catch {
      alert('Copy failed. Select and copy manually.');
    }
  };

  const testAPI = async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      setApiStatus({ ok: true, data });
    } catch (e) {
      setApiStatus({ ok: false, error: e.message });
    }
  };

  const faq = [
    {
      q: 'How do I get a quick summary without uploading a file?',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Use Quick Analyze on the Home page: choose “Paste text” or “Scan image”.</li>
          <li>“Scan image” uses server-side Tesseract OCR; ensure the photo is sharp and well-lit.</li>
          <li>You’ll get an At‑a‑Glance summary, risks, and clauses in seconds.</li>
        </ul>
      ),
    },
    {
      q: 'Upload fails or file is too large',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Supported: PDF, DOCX. Try compressing large files.</li>
          <li>If you see “413 Payload Too Large”, your server may need a higher upload limit (nginx client_max_body_size).</li>
          <li>Scanned PDFs without a text layer may need the OCR route (scan image) instead.</li>
        </ul>
      ),
    },
    {
      q: 'Analysis returns empty or very short results',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure your document contains selectable text (not just images).</li>
          <li>For scans, use Quick Analyze → Scan Image (OCR) or re‑scan with better lighting.</li>
          <li>Very unusual formatting may reduce extraction quality; try a cleaner copy.</li>
        </ul>
      ),
    },
    {
      q: 'Google sign‑in or magic link didn’t work',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the same browser tab after clicking the email link.</li>
          <li>Check spam/junk for the magic link email.</li>
          <li>Ensure third‑party cookies or pop‑ups aren’t blocked for Google sign‑in.</li>
        </ul>
      ),
    },
    {
      q: 'How private is my data?',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Your files are processed securely. Memory storage or short‑lived storage is used by default in read‑only hosts.</li>
          <li>No long verbatim quotes are included in output; summaries are paraphrased.</li>
          <li>You can request deletion of uploads and analyses anytime.</li>
        </ul>
      ),
    },
    {
      q: 'AI “hallucinations”—how are they reduced?',
      a: (
        <ul className="list-disc pl-5 space-y-1">
          <li>We ground Q&A in extracted clauses and constrain outputs via JSON schemas.</li>
          <li>We split prompts (summary + clauses) to keep results compact and consistent.</li>
          <li>Still, treat outputs as informational—not legal advice.</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <LifeBuoy className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Help Center</h1>
          </div>
          <p className="text-slate-600 mt-2">
            Quick answers, troubleshooting, and tips for the best results.
          </p>

          {/* Anchor pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#guides" className="px-3 py-1.5 rounded-full text-sm bg-primary-50 text-primary-700">Guides</a>
            <a href="#faq" className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700">FAQ</a>
            <a href="#troubleshooting" className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700">Troubleshooting</a>
            <a href="#privacy" className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700">Privacy & Safety</a>
            <a href="#contact" className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700">Contact</a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Section id="guides" title="Quick Guides" icon={Sparkles}>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <UploadCloud className="w-4 h-4 text-primary-600" />
                Upload a document
              </div>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-slate-700">
                <li>Go to Upload → choose a PDF or DOCX.</li>
                <li>Click “Upload & Analyze”.</li>
                <li>Review summary, risks, and clauses.</li>
              </ol>
            </div>
            <div className="p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Search className="w-4 h-4 text-primary-600" />
                Quick Analyze (paste)
              </div>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-slate-700">
                <li>On Home, open Quick Analyze → “Paste text”.</li>
                <li>Paste copied terms/clauses (≥ 30 chars).</li>
                <li>Click Analyze for instant summary.</li>
              </ol>
            </div>
            <div className="p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Camera className="w-4 h-4 text-primary-600" />
                Quick Analyze (image/OCR)
              </div>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-slate-700">
                <li>Choose “Scan image” and select a clear photo.</li>
                <li>We run Tesseract OCR server‑side.</li>
                <li>Analyze → summary and clauses.</li>
              </ol>
            </div>
          </div>
        </Section>

        <Section id="faq" title="Frequently Asked Questions" icon={LifeBuoy}>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </Section>

        <Section id="troubleshooting" title="Troubleshooting & Diagnostics" icon={AlertCircle}>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900 mb-2">Run diagnostics</div>
              <p className="text-slate-700">Collect basic client info for support.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={runDiagnostics} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Generate
                </button>
                <button
                  onClick={copyDiagnostics}
                  disabled={!diag}
                  className="px-3 py-2 rounded-lg bg-primary-600 text-white disabled:bg-slate-300 flex items-center gap-2"
                >
                  <Clipboard className="w-4 h-4" /> Copy
                </button>
              </div>
              {diag && (
                <pre className="mt-3 bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-48">{JSON.stringify(diag, null, 2)}</pre>
              )}
            </div>

            <div className="p-4 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900 mb-2">Test API connectivity</div>
              <p className="text-slate-700">Checks /api/health (if enabled).</p>
              <div className="mt-3 flex gap-2">
                <button onClick={testAPI} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800">Run</button>
              </div>
              {apiStatus && (
                <div className="mt-3 text-sm">
                  {apiStatus.ok ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> API OK
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-danger-700">
                      <AlertCircle className="w-4 h-4" /> {apiStatus.error || 'API error'}
                    </div>
                  )}
                  <pre className="mt-2 bg-slate-50 rounded-lg p-3 text-xs overflow-auto max-h-40">
                    {JSON.stringify(apiStatus.data || apiStatus, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section id="privacy" title="Privacy & Safety" icon={Shield}>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>We paraphrase clauses; long verbatim quotes are avoided.</li>
            <li>Uploads are processed securely; short‑lived storage or memory is used by default in read‑only environments.</li>
            <li>You can delete your data; contact support if needed.</li>
            <li>Outputs are informational and not legal advice.</li>
          </ul>
        </Section>

        <Section id="contact" title="Contact & Support" icon={LinkIcon}>
          <div className="text-sm text-slate-700 space-y-2">
            <p>Still stuck? We’re here to help.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Email: <a className="text-primary-700 underline" href="mailto:support@doclarity.com">support@doclarity.com</a>
              </li>
              <li>
                Include screenshots and, if possible, paste “Diagnostics” from above.
              </li>
              <li>
                For account issues (login/Google/magic link), mention the email you used.
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}