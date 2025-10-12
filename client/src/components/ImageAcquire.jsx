import React, { useRef, useState } from 'react';
import { Camera, Link as LinkIcon, Image as ImageIcon, UploadCloud } from 'lucide-react';

export default function ImageAcquire({
  onSelectFile,      // (file: File) => void
  onSelectUrl,       // (url: string) => void
  accept = 'image/*',
  capture = 'environment',
}) {
  const [tab, setTab] = useState('photo'); // 'photo' | 'url'
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState('');
  const fileRef = useRef(null);

  const openFilePicker = () => fileRef.current?.click();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      alert('Please choose a valid image.');
      return;
    }
    onSelectFile?.(file);
  };

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      alert('Enter a valid image URL starting with http/https.');
      return;
    }
    onSelectUrl?.(trimmed);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setTab('photo')}
          className={`inline-flex items-center gap-2 text-sm px-1.5 py-1 rounded-md transition-colors
            ${tab === 'photo' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Camera className="w-4 h-4" />
          Take a photo
        </button>
        <span className="h-5 w-px bg-slate-200" />
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`inline-flex items-center gap-2 text-sm px-1.5 py-1 rounded-md transition-colors
            ${tab === 'url' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <LinkIcon className="w-4 h-4" />
          Image URL
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {tab === 'photo' ? (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative rounded-xl border-2 border-dashed aspect-[16/9] flex items-center justify-center
              ${isDragging ? 'border-primary-300 bg-primary-50/60' : 'border-primary-200 bg-primary-50/40'}`}
          >
            <div className="text-center p-6">
              <div className="mx-auto w-12 h-12 grid place-items-center rounded-md bg-primary-100 text-primary-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="mt-3 font-medium text-slate-800">Drop an image here</p>
              <p className="text-slate-500 text-xs mt-1">OR</p>
              <button
                type="button"
                onClick={openFilePicker}
                className="mt-1 inline-flex items-center gap-1 text-primary-700 hover:underline text-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Browse image file
              </button>
              <p className="mt-2 text-[11px] text-slate-500">
                Supported: JPG, PNG. Clear, well‑lit photos work best.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              capture={capture}
              onChange={onInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
            <label className="text-sm font-medium text-slate-800">Paste image URL</label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={submitUrl}
                className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                Use URL
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              We’ll fetch the image and analyze it. Ensure the URL is publicly accessible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}