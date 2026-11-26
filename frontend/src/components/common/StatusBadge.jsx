import React from 'react';
import { useTranslation } from 'react-i18next';

export const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const rawStatus = (status || '').trim();
  const lowerStatus = rawStatus.toLowerCase();

  const styles = {
    'new': 'bg-red-50 text-red-700 border-red-200',
    'assigned': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'closed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'in progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'under review': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'rejected': 'bg-rose-50 text-rose-700 border-rose-200',
    'active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'inactive': 'bg-slate-100 text-slate-600 border-slate-200',
    'planned': 'bg-purple-50 text-purple-700 border-purple-200',
    'ongoing': 'bg-sky-50 text-sky-700 border-sky-200',
  };

  const current = styles[lowerStatus] || styles[rawStatus] || 'bg-slate-50 text-slate-700 border-slate-200';
  const label = rawStatus ? t(`status.${rawStatus}`, rawStatus) : t('common.unknown', 'Unknown');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {label}
    </span>
  );
};

export default StatusBadge;
