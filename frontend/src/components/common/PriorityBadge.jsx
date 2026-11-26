import React from 'react';
import { useTranslation } from 'react-i18next';

export const PriorityBadge = ({ priority }) => {
  const { t } = useTranslation();
  const styles = {
    'Critical': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    'High': 'bg-orange-50 text-orange-700 border-orange-200 font-semibold',
    'Medium': 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    'Low': 'bg-slate-100 text-slate-600 border-slate-200 font-normal',
  };

  const current = styles[priority] || 'bg-slate-50 text-slate-700 border-slate-200';
  const label = priority ? t(`priority.${priority}`, priority) : t('priority.Normal', 'Normal');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${current}`}>
      {priority === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1 animate-pulse"></span>}
      {label}
    </span>
  );
};

export default PriorityBadge;
