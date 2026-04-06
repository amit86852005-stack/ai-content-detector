import React, { useState, useRef } from 'react';
import { Upload, FileVideo, FileImage, Loader2, AlertCircle, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeMedia } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Detector() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (selectedFile: File) => {
    setError(null);
    setResult(null);

    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError(`Unsupported file type. Please upload an image or video.`);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    try {
      const isImage = file.type.startsWith('image/');
      const analysis = await analyzeMedia(preview, file.type, isImage);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const parseResult = (text: string) => {
    const verdictMatch = text.match(/Result:\s*(.*)/i);
    const confidenceMatch = text.match(/Confidence:\s*(\d+)%/i);
    const reasonsMatch = text.match(/Reasons:\s*([\s\S]*)/i);
    
    const verdict = verdictMatch ? verdictMatch[1].trim() : 'Unknown';
    const confidence = confidenceMatch ? confidenceMatch[1] : '0';
    const reasons = reasonsMatch 
      ? reasonsMatch[1].split('\n').filter(l => l.trim().startsWith('•') || l.trim().startsWith('-')).map(l => l.replace(/^[•-]\s*/, '').trim())
      : [];

    return { verdict, confidence, reasons };
  };

  const resultData = result ? parseResult(result) : null;
  const isAI = resultData?.verdict.toLowerCase().includes('ai generated');

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[12px] shadow-sm border border-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center border-b border-zinc-50">
          <h1 className="text-2xl font-bold text-zinc-950">AI Content Detector</h1>
          <p className="text-sm text-zinc-500 mt-1">Verify if media is real or AI-generated</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Upload / Preview Section */}
          <div 
            className={cn(
              "relative rounded-[12px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center bg-zinc-50 border-zinc-200 min-h-[300px]",
              isDragging && "bg-blue-50 border-blue-500",
              file && "border-solid bg-white p-4"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept="image/*,video/*" className="hidden" />
            
            <AnimatePresence mode="wait">
              {!preview ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                  <Upload className="w-10 h-10 text-zinc-400 mx-auto" />
                  <div className="text-zinc-900 font-medium text-sm text-center">Click or drag image/video here</div>
                  <div className="text-zinc-500 text-xs">Max size: 20MB</div>
                </motion.div>
              ) : (
                <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full relative">
                  {file?.type.startsWith('video/') ? (
                    <div className="flex flex-col items-center gap-3">
                      <video src={preview} className="max-h-64 rounded-lg shadow-sm w-full object-contain" controls />
                      <p className="text-[10px] font-mono text-zinc-400 truncate max-w-full">{file.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <img src={preview} className="max-h-64 rounded-lg shadow-sm w-full object-contain" />
                      <p className="text-[10px] font-mono text-zinc-400 truncate max-w-full">{file.name}</p>
                    </div>
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-xs font-bold text-blue-600 mt-2 uppercase tracking-widest">Analyzing...</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Simple Result Section */}
          <AnimatePresence>
            {resultData && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="space-y-6 pt-6 border-t border-zinc-100"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium">Result:</span>
                    <span className={cn(
                      "text-xl font-black uppercase flex items-center gap-1.5",
                      isAI ? "text-[#ef4444]" : "text-[#22c55e]"
                    )}>
                      {resultData.verdict}
                      {isAI ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </span>
                  </div>
                  <div className="text-zinc-900 font-bold text-lg">Confidence: {resultData.confidence}%</div>
                </div>

                <div className="bg-zinc-50 rounded-lg p-5">
                  <h3 className="font-bold text-zinc-900 text-sm mb-3">Reasons:</h3>
                  <ul className="space-y-2">
                    {resultData.reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-zinc-600">
                        <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                        {reason}
                      </li>
                    ))}
                    {resultData.reasons.length === 0 && (
                      <li className="text-sm text-zinc-400 italic">No specific reasons provided by AI.</li>
                    )}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              disabled={!file || loading}
              onClick={handleAnalyze}
              className={cn(
                "flex-1 py-3 px-6 rounded-[12px] font-bold transition-all text-sm uppercase tracking-wide",
                !file || loading 
                  ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-100" 
                  : "bg-[#2563eb] text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:translate-y-0.5"
              )}
            >
              Run Analysis
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 rounded-[12px] font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all text-sm uppercase tracking-wide"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
