import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('auto'); // auto | lease | loan | tos | employment | other
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF or DOCX file.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // 1) Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);

      const uploadRes = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { docId, originalName } = uploadRes.data;

      // 2) Analyze document (synchronous for MVP)
      const analyzeRes = await axios.post('/api/analyze', {
        docId,
        docType: docType === 'auto' ? undefined : docType,
      });

      const analysisData = {
        id: docId,
        documentName: originalName || file.name,
        ...analyzeRes.data,
      };

      // 3) Navigate to analysis page with data
      navigate('/analysis', { state: { analysisData } });
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          'Upload or analysis failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary-100 p-2 rounded-lg">
            <UploadCloud className="w-5 h-5 text-primary-700" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Upload a document</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              File (PDF or DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-700 border border-gray-300 rounded-lg p-2 cursor-pointer bg-slate-50"
            />
          </div>

          {/* Document type (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Document type (optional)
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="auto">Auto (let AI detect)</option>
              <option value="lease">Lease / Rental</option>
              <option value="loan">Loan / Credit</option>
              <option value="tos">Terms of Service</option>
              <option value="employment">Employment</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded-lg p-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Preview */}
          {file && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText className="w-4 h-4" />
              {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-white font-medium hover:bg-primary-700 disabled:bg-slate-300 transition-colors"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="loader border-t-blue-600 w-4 h-4" />
                Analyzing...
              </span>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload & Analyze
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4">
          We process your file securely. Not legal advice.
        </p>
      </div>
    </div>
  );
};

export default Upload;