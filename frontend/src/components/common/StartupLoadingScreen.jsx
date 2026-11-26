import React, { useState, useEffect, useRef } from 'react';

/**
 * TVK Digital Governance CRM - Minimal Professional Loading Screen
 * Full-screen pure white background with a small, elegant circular spinner
 * (subtle grey track, smooth RED progress animation using official TVK #850000 / #A00000 design tokens),
 * live 0% to 100% progress counter, and a slim synchronized horizontal progress bar.
 * No images, logos, icons, or illustrations.
 */
export const StartupLoadingScreen = ({
  isReady = true,
  onComplete,
  text,
  minDisplayTime = 300,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const startTimeRef = useRef(Date.now());
  const watchdogTimerRef = useRef(null);
  const [forceComplete, setForceComplete] = useState(false);

  // Safety watchdog: ensure loader never remains stuck on slow or failed requests
  useEffect(() => {
    watchdogTimerRef.current = setTimeout(() => {
      setForceComplete(true);
    }, 7500);

    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Dynamic staged progression reflecting actual initialization / data fetch stages:
    // 0% -> 30%: Mounting & context initialization
    // 30% -> 60%: Request transmission & database processing
    // 60% -> 88%: Data receipt (held at 88% until isReady is true or watchdog triggers)
    // 88% -> 100%: Payload validation & final render ready
    const interval = setInterval(() => {
      setProgress((prev) => {
        const ceiling = isReady || forceComplete ? 100 : 88;

        if (prev < ceiling) {
          const remaining = ceiling - prev;
          // Smooth progressive acceleration: faster when far from ceiling, granular near ceiling
          const step = Math.max(1, Math.min(3, Math.ceil(remaining * 0.08)));
          const next = Math.min(ceiling, prev + step);
          return next;
        } else if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev;
      });
    }, 18);

    return () => clearInterval(interval);
  }, [isReady, forceComplete]);

  // Smooth exit transition once 100% is reached
  useEffect(() => {
    if (progress >= 100) {
      const elapsed = Date.now() - startTimeRef.current;
      const delay = Math.max(60, minDisplayTime - elapsed);

      const displayTimer = setTimeout(() => {
        setIsFading(true);
        const exitTimer = setTimeout(() => {
          if (onComplete) onComplete();
        }, 180);
        return () => clearTimeout(exitTimer);
      }, delay);

      return () => clearTimeout(displayTimer);
    }
  }, [progress, onComplete, minDisplayTime]);

  return (
    <div
      className={`fixed inset-0 bg-white z-[99999] flex flex-col items-center justify-center p-4 overflow-hidden select-none transition-opacity duration-200 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="w-full max-w-xs flex flex-col items-center justify-center text-center">
        {/* Small Elegant Circular Spinner with Subtle Grey Track & Smooth RED Progress Animation */}
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 mb-3.5">
          {/* Subtle Grey Circular Track */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
          {/* Smooth RED Progress Animation (TVK CRM Theme #850000 / #A00000) */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#850000] border-r-[#850000] animate-spin"></div>
        </div>

        {/* Live Loading Percentage (0% to 100%) */}
        <div className="flex items-baseline justify-center space-x-0.5 mb-2.5">
          <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono tracking-tight">
            {Math.round(progress)}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#850000] font-mono">
            %
          </span>
        </div>

        {/* Slim, Clean Horizontal Progress Bar in RED Theme (Synchronized with Percentage) */}
        <div className="w-40 sm:w-48 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-gradient-to-r from-[#850000] to-[#A00000] rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Optional Contextual Status Hint */}
        {text && (
          <p className="mt-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider max-w-xs truncate">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default StartupLoadingScreen;
