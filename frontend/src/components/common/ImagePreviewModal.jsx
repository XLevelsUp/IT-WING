import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Camera,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ImagePreviewModal = ({
  isOpen,
  onClose,
  src,
  alt = 'Inspection Photo',
  title = 'Image Inspection',
  type = 'general', // 'before' | 'after' | 'general'
  ticketCode = '',
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setHasError(false);
    }
  }, [isOpen, src]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBefore = type === 'before';
  const isAfter = type === 'after';

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between text-white ${
            isBefore
              ? 'bg-gradient-to-r from-[#850000] to-[#A00000] border-b-2 border-red-300'
              : isAfter
              ? 'bg-gradient-to-r from-teal-900 to-emerald-900 border-b-2 border-emerald-400'
              : 'bg-slate-900 border-b-2 border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            {isBefore ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-[#850000] font-black text-xs tracking-wider uppercase flex items-center space-x-1">
                <Camera className="w-3.5 h-3.5 text-[#850000]" />
                <span>BEFORE IMAGE</span>
              </span>
            ) : isAfter ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs tracking-wider uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>AFTER IMAGE</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-bold text-xs">
                PHOTO VERIFICATION
              </span>
            )}

            <div>
              <h3 className="text-sm sm:text-base font-extrabold flex items-center space-x-2">
                <span>{title || (isBefore ? 'Before Work Ground Evidence' : isAfter ? 'After Completion Ground Proof' : 'Photo Evidence')}</span>
                {ticketCode && (
                  <span className="font-mono text-xs text-[#FFD32A] bg-black/30 px-2 py-0.5 rounded font-black">
                    {ticketCode}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center space-x-1 bg-black/30 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:bg-white/20 rounded text-white transition"
                title="Zoom In (+25%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:bg-white/20 rounded text-white transition"
                title="Zoom Out (-25%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1 hover:bg-white/20 rounded text-white transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {(scale !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white/20 hover:bg-white/30 rounded text-white transition"
                  title="Reset Zoom & Rotation"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full text-white transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content Viewport */}
        <div className="p-4 sm:p-6 bg-slate-950/95 flex items-center justify-center flex-1 min-h-[350px] max-h-[75vh] overflow-hidden select-none">
          {hasError || !src ? (
            <div className="text-center p-8 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">
                  {isBefore ? 'Before Image Unavailable' : isAfter ? 'After Image Not Yet Uploaded' : 'Image Preview Unavailable'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {isAfter
                    ? 'Work is either pending or in progress on the ground. The Ward Secretary will upload completion proof upon finishing field work.'
                    : 'The image file could not be loaded from storage or no photograph was provided.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden flex items-center justify-center w-full h-full">
              <img
                src={src}
                alt={alt}
                onError={() => setHasError(true)}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium text-slate-500">
            {isBefore ? (
              <strong className="text-red-700">Before Work Ground Evidence</strong>
            ) : isAfter ? (
              <strong className="text-emerald-700">After Work Ground Resolution Proof</strong>
            ) : (
              <span>Inspection Evidence Proof</span>
            )}
            {ticketCode && ` • ${ticketCode}`}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Zoom: {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
