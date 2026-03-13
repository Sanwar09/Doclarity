import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AtAGlanceSummary from '../components/Summary';
import ClauseExplorer from '../components/ClauseExplorer';
import AIChatBot from '../components/AIChatBot';
import ActionCenter from '../components/ActionCenter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { generateAnalysisReport } from '../services/pdfGenerator';
import { Download, Share2, ArrowLeft, Bot, X } from 'lucide-react';

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (location.state?.analysisData) {
      setAnalysisData(location.state.analysisData);
    } else {
      fetchAnalysisData();
    }
  }, [location]);

  const fetchAnalysisData = async () => {
    // Implement API call to fetch analysis data
  };

  const handleClauseReference = (clauseId) => {
    setActiveTab('clauses');
    setSelectedClauseId(clauseId);
  };

  const handleAskClause = (clause) => {
    setActiveTab('clauses');
    setSelectedClauseId(clause?.id || null);
    setChatDraft(`Explain this clause and negotiation tips: ${clause?.title || 'Selected clause'}`);
    setIsChatOpen(true);
  };

  const handleAskAction = (prompt) => {
    setChatDraft(prompt);
    setIsChatOpen(true);
  };

  const handleDownloadReport = () => {
    if (analysisData) {
      generateAnalysisReport(analysisData, analysisData.documentName || 'Document');
    }
  };

  const handleShare = () => {
    // Implement sharing functionality
  };

  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Upload
          </button>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Document Analysis</h1>
              <p className="text-slate-600 mt-2">{analysisData.documentName}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="clauses">Clause Explorer</TabsTrigger>
            <TabsTrigger value="actions">Action Center</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <AtAGlanceSummary summary={analysisData.summary} clauses={analysisData.clauses} />
          </TabsContent>

          <TabsContent value="clauses" className="mt-6">
            <ClauseExplorer
              clauses={analysisData.clauses}
              selectedClauseId={selectedClauseId}
              onAskClause={handleAskClause}
            />
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <ActionCenter
              analysisData={analysisData}
              onAskAction={handleAskAction}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {!isChatOpen && (
          <div className="hidden sm:block rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-lg max-w-xs">
            <p className="text-sm font-medium">Need help understanding this document?</p>
            <p className="text-xs text-slate-300 mt-1">Ask the assistant in English, Hindi, Marathi, or Spanish.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="h-16 w-16 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label={isChatOpen ? 'Close legal assistant' : 'Open legal assistant'}
        >
          {isChatOpen ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
        </button>
      </div>

      {isChatOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] z-40"
            onClick={() => setIsChatOpen(false)}
            aria-label="Close assistant overlay"
          />
          <div className="fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[430px] lg:w-[460px]">
            <AIChatBot
              documentContext={analysisData}
              onClauseReference={handleClauseReference}
              externalPrompt={chatDraft}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Analysis;
