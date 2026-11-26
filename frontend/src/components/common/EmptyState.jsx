import React from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Plus } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { t } = useTranslation();
  const displayTitle = title || t('emptyState.noDataFound', 'No Data Found');
  const displayDesc = description || t('emptyState.noRecordsAvailable', 'There are no records currently available in this section.');

  return (
    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-700">{displayTitle}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">{displayDesc}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl text-white bg-red-700 hover:bg-red-800 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
