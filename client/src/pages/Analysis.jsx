import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AtAGlanceSummary from '../components/Summary';
import ClauseExplorer from '../components/ClauseExplorer';
import AIChatBot from '../components/AIChatBot';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { generateAnalysisReport } from "../services/pdfGenerator";
import { Download, Share2, ArrowLeft } from 'lucide-react';

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedClauseId, setSelectedClauseId] = useState(null);

  useEffect(() => {
    // Get analysis data from location state or fetch from API
    if (location.state?.analysisData) {
      setAnalysisData(location.state.analysisData);
    } else {
      // Fetch from API if needed
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
        {/* Header */}
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Summary and Clauses */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="clauses">Clause Explorer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="mt-6">
                <AtAGlanceSummary summary={analysisData.summary} />
              </TabsContent>
              
              <TabsContent value="clauses" className="mt-6">
                <ClauseExplorer 
                  clauses={analysisData.clauses}
                  selectedClauseId={selectedClauseId}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - AI Chat */}
          <div className="lg:col-span-1">
            <AIChatBot 
              documentContext={analysisData}
              onClauseReference={handleClauseReference}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;