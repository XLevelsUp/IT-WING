import React from 'react';
import StartupLoadingScreen from './StartupLoadingScreen';

/**
 * TVK Digital Governance CRM - Loading Spinner Component
 * Reuses the minimal professional red-themed design.
 * - When fullScreen={true}: Displays the full-screen pure white loading screen
 *   with circular spinner, live 0%-100% progress counter, and slim progress bar.
 * - When fullScreen={false}: Displays a compact inline red spinner suitable for
 *   cards, tables, and modal actions without taking over the full page.
 */
export const LoadingSpinner = ({
  text = 'Loading data...',
  fullScreen = false,
  isReady = true,
  onComplete,
}) => {
  if (fullScreen) {
    return (
      <StartupLoadingScreen
        text={text}
        isReady={isReady}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      {/* Small Red Circular Loader with Subtle Grey Track */}
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#850000] border-r-[#850000] animate-spin"></div>
      </div>
      {text && (
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
