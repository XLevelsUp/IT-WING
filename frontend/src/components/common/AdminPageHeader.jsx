import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Shared Admin Page Header Component
 * Follows the TVK Digital Governance CRM visual design language:
 * - Deep Red Gradient (#850000 via #A00000 to #850000)
 * - Golden Yellow Highlights and Accent Line (#FFD32A)
 * - White / Cream Typography
 * - Subtle Shadow and Rounded 3xl Corners
 */
export const AdminPageHeader = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  tamilTitle,
  subtitle,
  stats,
  actions,
  children,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const isTa = i18n.language === 'ta';
  const displayTitle = isTa && tamilTitle ? tamilTitle : title;

  return (
    <div
      className={`bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-6 sm:p-7 md:p-8 rounded-3xl shadow-md relative overflow-hidden border-b-4 border-[#FFD32A] ${className}`}
    >
      {/* Golden subtle ambient glow in bottom-right corner */}
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#FFD32A]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          {/* Badge */}
          {badge && (
            <div className="inline-flex items-center space-x-2 text-[#FFD32A] text-xs font-bold uppercase tracking-wider mb-2 bg-black/30 backdrop-blur-xs px-3 py-1 rounded-full border border-[#FFD32A]/30">
              {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5 text-[#FFD32A]" />}
              <span>{badge}</span>
            </div>
          )}

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {displayTitle}
          </h1>

          {/* Subtitle / Description */}
          {subtitle && (
            <p className="text-xs sm:text-sm text-red-50/95 max-w-3xl mt-1.5 leading-relaxed font-medium">
              {subtitle}
            </p>
          )}

          {/* Stats Bar if array provided */}
          {Array.isArray(stats) && stats.length > 0 && (
            <div className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/20 w-full max-w-4xl">
              {stats.map((s, idx) => {
                const valStr =
                  typeof s.value === 'string' || typeof s.value === 'number'
                    ? String(s.value)
                    : '';
                const isExtraLong = valStr.length > 11;
                const isMediumLong = valStr.length > 8;

                const fontClass = isExtraLong
                  ? 'text-sm min-[540px]:text-base lg:text-lg'
                  : isMediumLong
                  ? 'text-base sm:text-lg lg:text-xl'
                  : 'text-lg sm:text-2xl';

                return (
                  <div
                    key={idx}
                    className="bg-black/20 backdrop-blur-xs p-2.5 sm:p-3.5 rounded-2xl border border-white/10 min-w-0 overflow-hidden flex flex-col justify-center"
                  >
                    <p
                      className="text-[10px] sm:text-[11px] text-red-100/80 font-medium truncate"
                      title={s.label}
                    >
                      {s.label}
                    </p>
                    <p
                      className={`${fontClass} font-black text-white mt-0.5 tracking-tight truncate leading-tight`}
                      title={valStr || undefined}
                    >
                      {s.highlight ? (
                        <span className="text-[#FFD32A]">{s.value}</span>
                      ) : (
                        s.value
                      )}
                    </p>
                    {s.subtext && (
                      <p
                        className="text-[9px] sm:text-[10px] text-red-200/70 mt-0.5 truncate"
                        title={s.subtext}
                      >
                        {s.subtext}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom stats element if passed */}
          {stats && !Array.isArray(stats) && (
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/20">
              {stats}
            </div>
          )}

          {/* Additional Children */}
          {children}
        </div>

        {/* Action Controls on Right */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start md:self-center flex-shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPageHeader;
