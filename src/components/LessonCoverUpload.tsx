import React, { useState } from 'react';
import { Sparkles, Upload, RefreshCw, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

interface LessonCoverUploadProps {
  title: string;
  category: string;
  description?: string;
  initialCoverUrl?: string;
  onCoverChange: (url: string, source: 'ai' | 'upload' | 'fallback') => void;
}

export function LessonCoverUpload({
  title,
  category,
  description,
  initialCoverUrl,
  onCoverChange,
}: LessonCoverUploadProps) {
  const [coverUrl, setCoverUrl] = useState<string>(initialCoverUrl || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');

  const handleGenerateAiCover = async () => {
    if (!title) {
      setErrorMessage('Please enter a lesson title first to generate a contextual cover.');
      return;
    }
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const result = await api.generateAndSaveLessonCover(title, category || 'General', description);
      setCoverUrl(result.coverUrl);
      onCoverChange(result.coverUrl, result.source);
    } catch (err: any) {
      console.error('Failed to generate cover:', err);
      setErrorMessage(err?.message || 'Could not generate cover image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const tempLessonId = `temp_${Date.now()}`;
      const downloadUrl = await api.uploadLessonCover(tempLessonId, file, (progress) => {
        setUploadProgress(progress);
      });
      setCoverUrl(downloadUrl);
      onCoverChange(downloadUrl, 'upload');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      setErrorMessage(err?.message || 'Failed to upload cover image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-zinc-400 uppercase">Lesson Cover Illustration</label>
        <div className="flex bg-zinc-100 p-0.5 rounded-lg text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'ai' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            ✨ AI Generated
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'upload' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            📁 Custom Upload
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preview Container (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center group shadow-xs">
        {coverUrl ? (
          <>
            <img 
              src={coverUrl} 
              alt="Lesson Cover Preview" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {activeTab === 'ai' ? (
                <button
                  type="button"
                  onClick={handleGenerateAiCover}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-white text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-100 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                  <span>Regenerate Cover</span>
                </button>
              ) : (
                <label className="px-4 py-2 bg-white text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-100 shadow-md flex items-center gap-1.5 cursor-pointer">
                  <Upload size={14} />
                  <span>Choose Another Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <ImageIcon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800">No cover image selected</p>
              <p className="text-[11px] text-zinc-400">
                {activeTab === 'ai' 
                  ? 'Generate a custom topic-matched vector illustration with AI' 
                  : 'Upload an image from your device (PNG, JPG, WebP < 8MB)'}
              </p>
            </div>
            {activeTab === 'ai' ? (
              <button
                type="button"
                onClick={handleGenerateAiCover}
                disabled={isGenerating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Sparkles size={14} />
                <span>{isGenerating ? 'Generating Illustration...' : '✨ Generate AI Cover'}</span>
              </button>
            ) : (
              <label className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} />
                <span>Upload From Computer</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {(isGenerating || isUploading) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-10">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-xs font-bold text-zinc-900">
                {isGenerating ? 'Synthesizing Educational Illustration...' : `Uploading Cover (${uploadProgress}%)...`}
              </p>
              {isUploading && (
                <div className="w-36 bg-zinc-200 rounded-full h-1.5 mt-2 overflow-hidden mx-auto">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
