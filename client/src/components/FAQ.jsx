import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle } from 'lucide-react';

const defaultItems = [
  {
    q: 'What file types are supported?',
    a: 'PDF and DOCX. You can also use Quick Analyze to paste text or scan an image (OCR).',
  },
  {
    q: 'How fast is the analysis?',
    a: 'Usually 3–7 seconds for typical documents. OCR adds ~1–4 seconds depending on image quality.',
  },
  {
    q: 'Is this legal advice?',
    a: 'No. We provide plain‑English summaries and risk flags for information only. Consult a lawyer for legal advice.',
  },
  {
    q: 'How do you protect my privacy?',
    a: 'We paraphrase content (no long verbatim quotes) and process uploads securely. You can delete your data anytime.',
  },
  {
    q: 'Will it work with scanned PDFs?',
    a: 'Yes via OCR. Use Quick Analyze → Image URL or Take a Photo. Clear, well‑lit images work best.',
  },
  {
    q: 'Do I need an account to try it?',
    a: 'You can try Quick Analyze without a file. For upload history or saved reports, sign in with email or Google.',
  },
];

export default function FAQ({
  id = 'faq',
  title = 'Frequently asked questions',
  subtitle = 'Quick answers to common questions.',
  items = defaultItems,
  allowMultiple = true,
}) {
  const [openSet, setOpenSet] = useState(() => new Set());

  const toggle = (idx) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (allowMultiple) {
        next.has(idx) ? next.delete(idx) : next.add(idx);
      } else {
        next.clear();
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section id={id} className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-slate-600 mb-4">{subtitle}</p>}

      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item, idx) => {
          const isOpen = openSet.has(idx);
          const panelId = `faq-panel-${idx}`;
          const btnId = `faq-button-${idx}`;
          return (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                id={btnId}
                aria-controls={panelId}
                aria-expanded={isOpen}
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none"
              >
                <span className="font-medium text-slate-800">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                hidden={!isOpen}
                className="px-4 pb-4 pt-0 text-sm text-slate-700 border-t border-slate-100"
              >
                {typeof item.a === 'string' ? <p>{item.a}</p> : item.a}
              </div>
            </div>
          );
        })}
      </div>

		<div className="mt-4 text-sm text-slate-600">
		Need more help? Visit the{' '}
		<Link to="/help" className="text-primary-700 hover:underline">
			Help Center
		</Link>
		.
		</div>

    </section>
  );
}