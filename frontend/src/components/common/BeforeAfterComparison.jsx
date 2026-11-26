import React, { useState } from 'react';
import { Camera, CheckCircle2, ImageOff, ZoomIn, Eye } from 'lucide-react';
import { getBeforeImageUrl, getAfterImageUrl } from '../../utils/imageUtils';

export const BeforeAfterComparison = ({
  complaint,
  beforeImage: propBefore,
  afterImage: propAfter,
  onImageClick, // (url, type, title) => void
  ticketCode = '',
  height = 'h-44',
  compact = false,
}) => {
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);

  const beforeSrc = propBefore || getBeforeImageUrl(complaint);
  const afterSrc = propAfter || getAfterImageUrl(complaint);
  const code = ticketCode || complaint?.issueCode || '';

  const handleBeforeClick = () => {
    if (beforeSrc && !beforeError && onImageClick) {
      onImageClick(beforeSrc, 'before', `Before Work Ground Evidence: ${code}`);
    }
  };

  const handleAfterClick = () => {
    if (afterSrc && !afterError && onImageClick) {
      onImageClick(afterSrc, 'after', `After Work Ground Resolution Proof: ${code}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 1. BEFORE IMAGE CARD */}
      <div className="border border-red-200/80 rounded-2xl p-3.5 bg-gradient-to-b from-red-50/40 to-white shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-red-100">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[11px] font-black tracking-wider uppercase text-red-800 flex items-center space-x-1">
              <Camera className="w-3.5 h-3.5 text-red-700" />
              <span>BEFORE IMAGE</span>
            </span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400">Citizen Evidence</span>
        </div>

        {beforeSrc && !beforeError ? (
          <div
            onClick={handleBeforeClick}
            className={`group relative ${height} w-full rounded-xl overflow-hidden cursor-pointer border border-red-200 bg-slate-900`}
            title="Click to view full-size Before Image with zoom"
          >
            <img
              src={beforeSrc}
              alt={`Before Evidence ${code}`}
              onError={() => setBeforeError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-white text-xs font-bold backdrop-blur-2xs">
              <ZoomIn className="w-4 h-4 text-[#FFD32A]" />
              <span>Click to Zoom</span>
            </div>
            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-red-900/80 text-white text-[9px] font-bold tracking-wider uppercase backdrop-blur-xs">
              Before Work
            </span>
          </div>
        ) : (
          <div className={`${height} w-full bg-slate-50 border border-dashed border-red-200 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400 space-y-1`}>
            <Camera className="w-6 h-6 text-red-300" />
            <span className="text-xs font-bold text-slate-600">No Before Photo Uploaded</span>
            <span className="text-[10px] text-slate-400">Grievance submitted without initial photograph</span>
          </div>
        )}
      </div>

      {/* 2. AFTER IMAGE CARD */}
      <div className="border border-emerald-200/80 rounded-2xl p-3.5 bg-gradient-to-b from-emerald-50/40 to-white shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-[11px] font-black tracking-wider uppercase text-emerald-900 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>AFTER IMAGE</span>
            </span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400">Ward Secretary Proof</span>
        </div>

        {afterSrc && !afterError ? (
          <div
            onClick={handleAfterClick}
            className={`group relative ${height} w-full rounded-xl overflow-hidden cursor-pointer border border-emerald-300 bg-slate-900`}
            title="Click to view full-size After Image with zoom"
          >
            <img
              src={afterSrc}
              alt={`After Resolution Proof ${code}`}
              onError={() => setAfterError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-white text-xs font-bold backdrop-blur-2xs">
              <ZoomIn className="w-4 h-4 text-[#FFD32A]" />
              <span>Click to Zoom</span>
            </div>
            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-900/80 text-white text-[9px] font-bold tracking-wider uppercase backdrop-blur-xs">
              After Resolution
            </span>
          </div>
        ) : (
          <div className={`${height} w-full bg-slate-50 border border-dashed border-emerald-200 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400 space-y-1`}>
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            <span className="text-xs font-bold text-slate-600">Awaiting Completion Photo</span>
            <span className="text-[10px] text-slate-400">Ward Secretary will upload proof upon field completion</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterComparison;
