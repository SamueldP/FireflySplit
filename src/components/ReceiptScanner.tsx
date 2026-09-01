import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  RotateCw,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  X,
  FileText,
  Check,
  Store,
  Layers
} from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/samples';
import { ParsedReceipt, SampleReceipt } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ReceiptScannerProps {
  onParsed: (data: ParsedReceipt, imagePreview: string | null) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  currentImage: string | null;
  setCurrentImage: (img: string | null) => void;
  categories?: string[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onParsed,
  isProcessing,
  setIsProcessing,
  currentImage,
  setCurrentImage,
  categories = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setErrorMsg(null);
    setSelectedSampleId(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setCurrentImage(b64);
      setRotation(0);
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (sample: SampleReceipt) => {
    setSelectedSampleId(sample.id);
    setCurrentImage(sample.image_url);
    setErrorMsg(null);
    setRotation(0);
    setZoom(1);
    // Instant parse for pre-configured sample
    onParsed(sample.sample_data, sample.image_url);
  };

  const handleScanWithAI = async () => {
    if (!currentImage && !additionalContext.trim()) {
      setErrorMsg('Please provide an image or text context to scan.');
      return;
    }

    // If it's a known preloaded sample, we can either re-run AI or instant populate
    if (selectedSampleId && currentImage) {
      const sample = SAMPLE_RECEIPTS.find((s) => s.id === selectedSampleId);
      if (sample && !additionalContext.trim()) {
        onParsed(sample.sample_data, currentImage);
        return;
      }
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: currentImage,
          additional_context: additionalContext,
          categories: categories,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to analyze receipt.');
      }

      onParsed(data, currentImage);
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg(err.message || 'Failed to process receipt image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentImage(null);
    setSelectedSampleId(null);
    setErrorMsg(null);
    setRotation(0);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Quick Sample Selector */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Quick Test Samples (Split Demos)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Click any preset to test split logic</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                selectedSampleId === sample.id
                  ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                    <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {sample.store}
                  </span>
                  <span className="text-xs font-mono font-semibold text-blue-700 shrink-0">
                    R{sample.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {sample.sample_data.splits.length} splits
                </span>
                <span className="text-blue-600 font-medium flex items-center gap-1">
                  {selectedSampleId === sample.id ? (
                    <>
                      <Check className="w-3 h-3" /> Selected
                    </>
                  ) : (
                    'Load Sample →'
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone / Live Receipt Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Receipt Input
            </h2>
          </div>

          {currentImage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1"
                title="Rotate 90 deg"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setHighContrast((c) => !c)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                  highContrast
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title="Toggle High-Contrast OCR Filter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">OCR Filter</span>
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs"
                title="Clear image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Drop Zone */}
        {!currentImage ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <p className="text-base font-semibold text-slate-700">
                  Drop your receipt photo here, or <span className="text-blue-600">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, WEBP receipts &bull; Thermal print friendly
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCamera(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 transition"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Take Photo with Camera</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Preview Container */
          <div className="relative bg-slate-100 border border-slate-200 rounded-xl overflow-hidden min-h-[300px] max-h-[460px] flex items-center justify-center">
            <div
              className="transition-transform duration-200 w-full h-full flex items-center justify-center p-4"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
              }}
            >
              <img
                src={currentImage}
                alt="Receipt scan"
                className={`max-h-[420px] max-w-full object-contain rounded-lg shadow-sm transition-all ${
                  highContrast ? 'contrast-200 grayscale brightness-90' : ''
                }`}
              />
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Gemini AI OCR &amp; Categorization...
                  </p>
                  <p className="text-xs text-slate-500">
                    Extracting vendor, line items, and intelligent split classifications
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Context Input */}
        <div className="pt-2">
          <label htmlFor="context-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Additional Info (Optional)
          </label>
          <textarea
            id="context-input"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Lost the receipt? Type what you bought, store name, or any details to help AI categorize it."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px]"
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${currentImage ? 'bg-blue-500' : (additionalContext.trim() ? 'bg-amber-500' : 'bg-slate-300')}`}></span>
            <span>{currentImage ? 'Image loaded and ready for Gemini Vision OCR' : (additionalContext.trim() ? 'Text context ready for Gemini OCR' : 'Provide an image or text to begin')}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentImage && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            )}

            <button
              type="button"
              id="btn-scan-receipt"
              onClick={handleScanWithAI}
              disabled={isProcessing || (!currentImage && !additionalContext.trim())}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>{isProcessing ? 'Analyzing...' : 'Extract & Split with AI'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(b64) => {
          setCurrentImage(b64);
          setSelectedSampleId(null);
        }}
      />
    </div>
  );
};
