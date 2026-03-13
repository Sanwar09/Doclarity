import React, { useState } from 'react';
import { Camera, Clipboard, Image as ImageIcon, Loader2 } from 'lucide-react';
import ImageAcquire from '../components/ImageAcquire';
import { api } from '../services/api';

const QuickAnalyze = ({ onResult, navigateToAnalysis, compact = false }) => {
  const [mode, setMode] = useState('image');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgFile, setImgFile] = useState(null);

  const compressImage = (file, maxW = 1600, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('Compression failed'));
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleSelectFile = async (file) => {
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleSelectUrl = async (url) => {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Could not load image URL');
      const blob = await resp.blob();
      const file = new File([blob], 'remote.jpg', { type: blob.type || 'image/jpeg' });
      await handleSelectFile(file);
    } catch {
      alert('Could not load image URL');
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      if (mode === 'paste') {
        const { data } = await api.post('/analyze/text', { text });
        onResult?.(data);
        navigateToAnalysis?.(data);
      } else {
        if (!imgFile) return alert('Please select an image first');
        const compressed = await compressImage(imgFile);
        const form = new FormData();
        form.append('image', compressed);
        const { data } = await api.post('/analyze/image', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onResult?.(data);
        navigateToAnalysis?.(data);
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Quick analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === 'paste' ? text.trim().length >= 30 : Boolean(imgFile);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${compact ? 'p-4' : 'p-5'}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-slate-900`}>Quick analysis</h3>

        <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('paste')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm transition-all
              ${mode === 'paste'
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <Clipboard className="w-4 h-4" />
            Paste text
          </button>
          <button
            onClick={() => setMode('image')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm transition-all
              ${mode === 'image'
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <Camera className="w-4 h-4" />
            Scan image
          </button>
        </div>
      </div>

      {mode === 'paste' ? (
        <div>
          <textarea
            rows={compact ? 4 : 6}
            placeholder="Paste copied contract text here (at least ~30 characters)..."
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {!compact && <p className="text-xs text-slate-500 mt-2">Tip: Use Ctrl/Cmd+V to paste quickly.</p>}
        </div>
      ) : (
        <div>
          <ImageAcquire
            onSelectFile={handleSelectFile}
            onSelectUrl={handleSelectUrl}
            accept="image/*"
            capture="environment"
          />

          {imgPreview && (
            <div className={compact ? 'mt-2' : 'mt-3'}>
              <img
                src={imgPreview}
                alt="Preview"
                className={`${compact ? 'max-h-44' : 'max-h-64'} rounded-md border border-slate-200`}
              />
              {!compact && (
                <p className="text-xs text-slate-500 mt-2">
                  Keep the image sharp and well-lit. We run OCR with Tesseract (on server).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${compact ? 'mt-3' : 'mt-4'} flex items-center justify-end gap-3`}>
        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          Analyze
        </button>
      </div>

      {!compact && (
        <p className="text-[11px] text-slate-500 mt-3">
          By using quick analysis, you agree that pasted text or images will be processed securely for analysis.
        </p>
      )}
    </div>
  );
};

export default QuickAnalyze;
