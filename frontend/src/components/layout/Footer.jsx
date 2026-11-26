import React from 'react';
import './Footer.css';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const textContent = `© ${currentYear} All Rights Reserved  | Coimbatore South IT Wing`;

  // Repeat sequence in two identical halves to produce a seamless, infinite loop
  const repeatCount = 6;
  const items = Array.from({ length: repeatCount });

  return (
    <footer
      aria-label="Site Footer"
      className="w-full max-w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-t-2 border-[#FFD32A] shadow-[0_-4px_16px_rgba(133,0,0,0.18)] py-2 sm:py-2.5 overflow-hidden relative z-20 flex-shrink-0 select-none"
    >
      <div className="w-full overflow-hidden flex items-center">
        <div className="tvk-footer-track flex items-center">
          {/* First track */}
          <div className="flex items-center shrink-0">
            {items.map((_, index) => (
              <div key={`track1-${index}`} className="flex items-center shrink-0">
                <span className="text-white/95 font-semibold text-[11px] sm:text-xs md:text-sm tracking-wider drop-shadow-xs whitespace-nowrap">
                  {textContent}
                </span>
                <span
                  className="text-[#FFD32A] mx-4 sm:mx-6 text-xs sm:text-sm font-bold opacity-80 select-none"
                  aria-hidden="true"
                >
                  •
                </span>
              </div>
            ))}
          </div>

          {/* Second track (exact duplicate for seamless loop) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {items.map((_, index) => (
              <div key={`track2-${index}`} className="flex items-center shrink-0">
                <span className="text-white/95 font-semibold text-[11px] sm:text-xs md:text-sm tracking-wider drop-shadow-xs whitespace-nowrap">
                  {textContent}
                </span>
                <span
                  className="text-[#FFD32A] mx-4 sm:mx-6 text-xs sm:text-sm font-bold opacity-80 select-none"
                  aria-hidden="true"
                >
                  •
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
