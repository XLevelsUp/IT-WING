import React, { useState } from 'react';
import { Camera, CheckCircle2, ImageOff, Eye } from 'lucide-react';

export const ComplaintImageThumbnail = ({
  src,
  imageUrl,
  alt = 'Inspection photo',
  type = 'before', // 'before' | 'after'
  onClick,
  onZoomClick,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = true,
  status,
  title,
  ticketId,
}) => {
  const [loadError, setLoadError] = useState(false);
  const actualSrc = src || imageUrl;
  const actualType = String(type || 'before').toLowerCase();
  const isBefore = actualType === 'before';
  const handleClick = onClick || onZoomClick;

  const sizeClasses = {
    sm: 'w-7 h-7 text-[9px]',
    md: 'w-10 h-10 text-[10px]',
    lg: 'w-16 h-12 text-xs',
  }[size] || 'w-10 h-10 text-[10px]';

  const hasValidImage = Boolean(actualSrc && !loadError);

  if (!hasValidImage) {
    if (isBefore) {
      return (
        <span
          className="inline-flex items-center space-x-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg italic select-none"
          title="No Before Photo Uploaded"
        >
          <Camera className="w-3 h-3 text-slate-300" />
          <span>No Before</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg select-none"
        title="Work Pending - After Photo Not Yet Available"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Pending Action</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (handleClick) handleClick(actualSrc, actualType, title, ticketId);
      }}
      className={`group relative inline-flex items-center space-x-1.5 p-1 rounded-xl border transition cursor-pointer shadow-2xs ${
        isBefore
          ? 'bg-red-50/70 hover:bg-red-100/90 border-red-200 text-red-700'
          : 'bg-emerald-50/70 hover:bg-emerald-100/90 border-emerald-300 text-emerald-800'
      } ${className}`}
      title={`Click to view full-size ${isBefore ? 'Before' : 'After'} photo with zoom`}
    >
      <div className={`relative overflow-hidden rounded-lg flex-shrink-0 ${sizeClasses}`}>
        <img
          src={actualSrc}
          alt={alt}
          onError={() => setLoadError(true)}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
          <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
        </div>
      </div>
      {showLabel && (
        <span className="font-bold whitespace-nowrap pr-1">
          {isBefore ? 'Before' : 'After'}
        </span>
      )}
    </button>
  );
};

export default ComplaintImageThumbnail;
