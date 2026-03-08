import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Search,
  MessageSquare,
  UploadCloud,
  FileText,
  Clock3,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  Lock,
  Zap
} from 'lucide-react';
import QuickAnalyze from '../components/QuickAnalyze';
import FAQ from '../components/FAQ';

const features = [
  {
    title: 'At a Glance Summary',
    description: 'See risks, deadlines, costs, and obligations in one simple dashboard.',
    icon: Sparkles,
    bullets: ['Risk score and level', 'Important dates and timelines', 'Money terms and penalties']
  },
  {
    title: 'Clause Explorer',
    description: 'Open any clause and understand what it means in plain language.',
    icon: Search,
    bullets: ['Clause-level explanations', 'Priority markers', 'Actionable next steps']
  },
  {
    title: 'AI Legal Chat',
    description: 'Ask follow-up questions and get context-grounded answers fast.',
    icon: MessageSquare,
    bullets: ['Grounded responses', 'Negotiation-focused prompts', 'Multi-language support']
  }
];

const useCases = [
  {
    title: 'Tenants and Landlords',
    description: 'Understand rent terms, deposits, lock-in, notice periods, and penalties before signing.',
    icon: Building2
  },
  {
    title: 'Freelancers and Consultants',
    description: 'Review payment terms, ownership rights, confidentiality, and liability exposure quickly.',
    icon: Briefcase
  },
  {
    title: 'Small Teams and Startups',
    description: 'Save legal review time by identifying top risk clauses and negotiation points early.',
    icon: Users
  }
];

const steps = [
  {
    title: 'Upload document',
    description: 'Upload PDF or DOCX securely.',
    icon: UploadCloud
  },
  {
    title: 'AI analyzes clauses',
    description: 'Extracts key obligations, risks, dates, and money terms.',
    icon: FileText
  },
  {
    title: 'Decide with clarity',
    description: 'Use the dashboard and chat to understand what to do next.',
    icon: Clock3
  }
];

const Home = () => {
  const navigate = useNavigate();
  const reveal = (delay = 0) => ({
    animation: `fadeUp 700ms ease ${delay}ms both`
  });

  return (
    <div className="bg-slate-50">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-14" style={reveal(0)}>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div style={reveal(80)}>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 mb-6">
                <ShieldCheck className="w-4 h-4" />
                Legal clarity in plain language
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Understand legal documents
                <span className="block text-blue-700">before you sign</span>
              </h1>

              <p className="mt-5 text-lg text-slate-600 max-w-2xl">
                Doclarity turns complex contracts into clear risks, obligations, deadlines, and negotiation points so users can act with confidence.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Start Analysis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/compare"
                  className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-6 py-3 text-slate-800 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Compare Documents
                </Link>
              </div>

              <div className="mt-7 grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Fast clause insights
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Better negotiation prep
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Secure document handling
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-6" style={reveal(160)}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Why users like Doclarity</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Clear risk summary</p>
                  <p className="text-slate-600 mt-1">See what can go wrong and what to review first.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Actionable next steps</p>
                  <p className="text-slate-600 mt-1">Get practical guidance on negotiation and due dates.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Chat for follow-ups</p>
                  <p className="text-slate-600 mt-1">Ask document-specific questions instantly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="quick" className="py-6" style={reveal(60)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-slate-900">Try Quick Analysis</h2>
            <p className="text-slate-600 mt-1">Paste text or scan an image to preview analysis in seconds.</p>
          </div>
          <QuickAnalyze
            compact
            navigateToAnalysis={(data) =>
              navigate('/analysis', {
                state: { analysisData: { ...data, documentName: 'Quick Analysis' } }
              })
            }
          />
        </div>
      </section>

      <section id="features" className="py-16 bg-white border-y border-slate-200" style={reveal(90)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900">Built for clear decisions</h2>
            <p className="text-lg text-slate-600 mt-3">Everything is optimized for readability and action.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-6 hover:shadow-lg transition-shadow" style={reveal(140)}>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-2">{item.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <span className="text-blue-600">-</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-100 border-y border-slate-200" style={reveal(120)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900">See the difference instantly</h2>
            <p className="text-lg text-slate-600 mt-3">From dense legal text to clear, actionable output.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6" style={reveal(160)}>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">Before</p>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Raw legal language</h3>
              <p className="text-slate-700 leading-relaxed">
                \"The Licensee shall pay monthly compensation within five days, failing which penalty and default consequences may apply under this agreement.\"
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>- Hard to read quickly</li>
                <li>- Risk buried in legal wording</li>
                <li>- No clear action plan</li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6" style={reveal(220)}>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">After</p>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Doclarity output</h3>
              <ul className="space-y-2 text-slate-700">
                <li>- Payment due within 5 days each month</li>
                <li>- Late payment can trigger penalty/default risk</li>
                <li>- Negotiate grace period before penalty</li>
                <li>- Track due date in calendar immediately</li>
              </ul>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white border border-emerald-300 px-3 py-1 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Easy to understand and act on
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16" style={reveal(130)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900">Who this helps most</h2>
            <p className="text-lg text-slate-600 mt-3">Designed for real people handling legal documents every day.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="w-11 h-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-2">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-200" style={reveal(140)}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <div className="text-sm font-semibold text-blue-700 mb-3">Step {index + 1}</div>
                  <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="text-slate-600 mt-2">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16" style={reveal(160)}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900">Simple pricing</h2>
            <p className="text-lg text-slate-600 mt-3">Start free and upgrade when your team needs more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 mb-4">
                <Zap className="w-3 h-3" />
                Free Starter
              </div>
              <h3 className="text-2xl font-bold text-slate-900">For Individuals</h3>
              <p className="text-slate-600 mt-2">Perfect for occasional contract reviews.</p>
              <ul className="mt-6 space-y-2 text-slate-700">
                <li>- Upload and analyze documents</li>
                <li>- Risk summary and clause explorer</li>
                <li>- AI chat with grounded answers</li>
              </ul>
              <Link to="/upload" className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700">
                Start Free
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 mb-4">
                <Lock className="w-3 h-3" />
                Pro (Coming Soon)
              </div>
              <h3 className="text-2xl font-bold text-slate-900">For Teams</h3>
              <p className="text-slate-600 mt-2">Built for frequent contract operations and collaboration.</p>
              <ul className="mt-6 space-y-2 text-slate-700">
                <li>- Higher usage limits</li>
                <li>- Team workspaces and sharing</li>
                <li>- Export-ready legal briefs</li>
              </ul>
              <Link to="/help" className="mt-6 inline-flex items-center rounded-lg border border-blue-400 px-5 py-3 text-blue-700 font-semibold hover:bg-blue-100">
                Join Waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-900" style={reveal(180)}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white">Ready to decode your next legal document?</h2>
          <p className="text-slate-300 text-lg mt-4">Upload now and get a clear, decision-ready breakdown.</p>
          <Link
            to="/upload"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3 text-slate-900 font-semibold hover:bg-slate-100"
          >
            Analyze Document
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section id="faq" className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQ title="Questions" subtitle="Everything you need to know." />
        </div>
      </section>
    </div>
  );
};

export default Home;
