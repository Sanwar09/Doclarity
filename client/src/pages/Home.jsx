import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  UploadCloud,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { Sparkles, Search, MessageSquare, Upload, FileText, Clock, ArrowRight } from 'lucide-react';
import QuickAnalyze from '../components/QuickAnalyze';
import FAQ from "../components/FAQ";

const features = [
  {
    title: 'At a Glance Summary',
    description:
      'Get a plain-language overview with key risks, important dates, and money terms so you can decide faster.',
    icon: Sparkles,
    bullets: [
      'Overall risk level',
      'Important dates & deadlines',
      'Fees, penalties, and amounts',
    ],
  },
  {
    title: 'Interactive Clause Explorer',
    description:
      'Drill into clauses, see plain-English explanations, and understand implications.',
    icon: Search,
    bullets: ['Search & filter clauses', 'Plain-English explanations', 'Actionable suggestions'],
  },
  {
    title: 'AI-Powered Q&A Chat',
    description:
      'Ask natural questions about the document and get answers with clause references.',
    icon: MessageSquare,
    bullets: ['Context-aware answers', 'Clause citations', 'Follow-up suggestions'],
  },
];

const steps = [
  {
    title: 'Upload your document',
    description: 'PDF or DOCX. We extract text and keep your data private.',
    icon: UploadCloud,
  },
  {
    title: 'AI analyzes it',
    description:
      'Identifies key terms, risky clauses, financials, and deadlines.',
    icon: FileText,
  },
  {
    title: 'Understand in minutes',
    description:
      'Read the summary, explore clauses, and chat with the AI for clarity.',
    icon: Clock,
  },
];

const Home = () => {
    const navigate = useNavigate();
  return (
    <div className="bg-slate-50">
      {/* Hero */}
      {/* <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent-200/40 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
            <div className="w-full lg:w-7/12">
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
                <Shield className="w-4 h-4" />
                Private, safe, and supportive
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
                Demystify legal documents with AI
              </h1>

              <p className="mt-4 text-slate-600 text-base sm:text-lg">
                Upload contracts, leases, or terms of service and get a clear summary,
                explore clauses interactively, and ask questions in plain English.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/upload"
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-3 text-white font-medium hover:bg-primary-700 transition-colors"
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
                  Upload a document
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-slate-800 font-medium border border-gray-300 hover:bg-slate-50 transition-colors"
                >
                  See features
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-slate-600">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                  No setup required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                  Clear, plain English
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                  Free to try
                </div>
              </div>
            </div>

            <div className="w-full lg:w-5/12">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary-100 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">At a Glance Summary</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Get key risks, obligations, dates, and costs in one place.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-success-50 rounded-lg p-3">
                    <p className="font-medium text-success-700 mb-1">Benefits</p>
                    <ul className="text-success-700 space-y-1">
                      <li>• Favorable terms identified</li>
                      <li>• Negotiation points</li>
                    </ul>
                  </div>
                  <div className="bg-danger-50 rounded-lg p-3">
                    <p className="font-medium text-danger-700 mb-1">Risks</p>
                    <ul className="text-danger-800 space-y-1">
                      <li>• Penalties and fees</li>
                      <li>• Termination traps</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  Not legal advice. For informational purposes only.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-5 py-2 mb-8 hover:bg-indigo-100 transition-colors">
            <span className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full">AI-Powered</span>
            <span className="text-gray-700 text-sm font-medium">Legal Document Simplification</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-gray-900">Simplify </span>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">Complex Legal</span>
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text">Documents</span>
            <span className="text-gray-900"> in Minutes</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
            Save time and money by instantly understanding your legal documents.
          </p>
          <p className="text-lg text-gray-500 mb-10 max-w-3xl mx-auto">
            Our AI-powered platform helps small businesses and professionals decode complex legal language with confidence.
          </p>
          
          <div className="flex items-center justify-center gap-4">
              <Link
                to="/upload"
                className="inline-flex items-center justify-center rounded-lg text-white font-medium"
              >
              <button className="group bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/50 transition-all flex items-center gap-2 hover:scale-110 active:scale-95 transform">
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-lg text-slate-800 font-medium"
            >
              <button className="inline-flex flex-row items-center justify-center bg-gray-100 border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg transition-all hover:scale-105 active:scale-95 transform">
                  Learn More
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Quick Analyze */}
      <section id="#quick" className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Try quick analysis — paste text or scan an image
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              No file upload needed. Get a fast summary and risks in seconds.
            </p>
          </div>
          <QuickAnalyze
            navigateToAnalysis={(data) =>
              navigate('/analysis', {
                state: { analysisData: { ...data, documentName: 'Quick Analysis' } },
              })
            }
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Built to help you understand, not overwhelm
            </h2>
            <p className="text-xl text-gray-600">Three core tools to make any document clear and actionable.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <Sparkles className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">At a Glance Summary</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Get a plain-language overview with key risks, important dates, and money terms so you can decide faster.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Overall risk level</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Important dates & deadlines</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Fees, penalties, and amounts</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <Search className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">Interactive Clause Explorer</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Drill into clauses, see plain-English explanations, and understand implications.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Search & filter clauses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Plain-English explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Actionable suggestions</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <MessageSquare className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">AI-Powered Q&A Chat</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Ask natural questions about the document and get answers with clause references.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Context-aware answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Clause citations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1 font-bold">•</span>
                  <span>Follow-up suggestions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
                <Upload className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-indigo-600 font-semibold mb-3">Step 1</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload your document</h3>
              <p className="text-gray-600 leading-relaxed">
                PDF or DOCX. We extract text and keep your data private.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
                <FileText className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-indigo-600 font-semibold mb-3">Step 2</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI analyzes it</h3>
              <p className="text-gray-600 leading-relaxed">
                Identifies key terms, risky clauses, financials, and deadlines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-2xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
                <Clock className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-indigo-600 font-semibold mb-3">Step 3</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Understand in minutes</h3>
              <p className="text-gray-600 leading-relaxed">
                Read the summary, explore clauses, and chat with the AI for clarity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center shadow-2xl hover:shadow-3xl transition-all hover:scale-[1.02]">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to simplify your legal documents?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Join thousands of professionals who trust our AI-powered platform.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center rounded-lg text-white font-medium"
            >
              <button className="bg-white text-indigo-600 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 hover:shadow-2xl hover:shadow-white/30 transition-all hover:scale-110 active:scale-95 transform">
                Get Started Now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQ
            title="Questions"
            subtitle="Everything you need to know."
          />
        </div>
      </section>

    </div>
  );
};

export default Home;
