import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  colorScheme = 'crimson', // 'crimson', 'blue', 'green', 'orange', 'purple'
  onClick,
}) => {
  const schemeStyles = {
    crimson: {
      bg: 'bg-red-50 text-red-700',
      border: 'hover:border-red-200',
      text: 'text-red-700',
      pill: 'bg-red-100 text-red-800',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-700',
      border: 'hover:border-blue-200',
      text: 'text-blue-700',
      pill: 'bg-blue-100 text-blue-800',
    },
    green: {
      bg: 'bg-emerald-50 text-emerald-700',
      border: 'hover:border-emerald-200',
      text: 'text-emerald-700',
      pill: 'bg-emerald-100 text-emerald-800',
    },
    orange: {
      bg: 'bg-amber-50 text-amber-700',
      border: 'hover:border-amber-200',
      text: 'text-amber-700',
      pill: 'bg-amber-100 text-amber-800',
    },
    purple: {
      bg: 'bg-indigo-50 text-indigo-700',
      border: 'hover:border-indigo-200',
      text: 'text-indigo-700',
      pill: 'bg-indigo-100 text-indigo-800',
    },
  };

  const currentScheme = schemeStyles[colorScheme] || schemeStyles.crimson;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate" title={title}>{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight">
            {value !== undefined && value !== null ? value : '-'}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={subtitle}>{subtitle}</p>}
        </div>

        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${currentScheme.bg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap text-xs">
          {trend !== undefined && (
            <span className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${currentScheme.pill}`}>
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-slate-400 truncate max-w-[150px] text-right" title={trendLabel}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
