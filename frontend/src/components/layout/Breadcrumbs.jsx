import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap = {
    admin: t('breadcrumbs.crm', 'CRM'),
    dashboard: t('breadcrumbs.dashboard', 'Dashboard'),
    district: t('breadcrumbs.district', 'Coimbatore District'),
    constituencies: t('breadcrumbs.constituencies', 'Constituencies'),
    paguthi: t('breadcrumbs.paguthi', 'Paguthi'),
    wards: t('breadcrumbs.wards', 'Wards'),
    members: t('breadcrumbs.members', 'Members'),
    issues: t('breadcrumbs.issues', 'Issues Repository'),
    'complaints-reported': t('breadcrumbs.complaintsReported', 'Complaints Reported'),
    analytics: t('breadcrumbs.analytics', 'Analytics'),
    projects: t('breadcrumbs.projects', 'Achievements & Projects'),
    officers: t('breadcrumbs.officers', 'Department Officers'),
    'ai-content': t('breadcrumbs.aiContent', 'AI Content Generator'),
    'tvk-bot': t('breadcrumbs.tvkBot', 'TVK AI BOT'),
    reports: t('breadcrumbs.reports', 'Reports & Export'),
    settings: t('breadcrumbs.settings', 'Settings'),
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
      <Link to="/admin/dashboard" className="flex items-center hover:text-red-700 transition">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>{t('breadcrumbs.home', 'Home')}</span>
      </Link>

      {pathnames.slice(1).map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
        const isLast = index === pathnames.slice(1).length - 1;
        const displayName = routeNameMap[name] || decodeURIComponent(name);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="text-slate-800 font-semibold truncate max-w-[150px]">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-red-700 transition truncate max-w-[120px]">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
