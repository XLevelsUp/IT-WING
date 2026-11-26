import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  MapPin,
  Users,
  AlertCircle,
  ClipboardList,
  BarChart3,
  Award,
  Briefcase,
  Sparkles,
  Bot,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { key: 'dashboard', name: t('sidebar.dashboard'), path: '/admin/dashboard', icon: LayoutDashboard },
    { key: 'district', name: t('sidebar.district'), path: '/admin/district', icon: MapPin },
    { key: 'members', name: t('sidebar.members'), path: '/admin/members', icon: Users },
    { key: 'issues', name: t('sidebar.issues'), path: '/admin/issues', icon: AlertCircle },
    // NEW SIDEBAR MENU: Complaints Reported placed immediately near Issues
    { key: 'complaintsReported', name: t('sidebar.complaintsReported') || 'Complaints Reported', path: '/admin/complaints-reported', icon: ClipboardList },
    { key: 'analytics', name: t('sidebar.analytics'), path: '/admin/analytics', icon: BarChart3 },
    { key: 'projects', name: t('sidebar.projects'), path: '/admin/projects', icon: Award },
    { key: 'officers', name: t('sidebar.officers'), path: '/admin/officers', icon: Briefcase },
    { key: 'aiContent', name: t('sidebar.aiContent'), path: '/admin/ai-content', icon: Sparkles },
    { key: 'tvkBot', name: t('sidebar.tvkBot'), path: '/admin/tvk-bot', icon: Bot },
    { key: 'reports', name: t('sidebar.reports'), path: '/admin/reports', icon: FileText },
    { key: 'settings', name: t('sidebar.settings'), path: '/admin/settings', icon: Settings },
  ];

  const handleNavClick = () => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111111] text-white border-r border-white/10 shadow-2xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#850000] to-[#B00000] flex items-center justify-center text-white shadow-md flex-shrink-0 border border-white/20">
            <span className="font-extrabold text-sm tracking-wider text-[#FFD32A]">TVK</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate leading-tight">
                {t('sidebar.crmName')}
              </span>
              <span className="text-[11px] font-medium text-[#FFD32A] tracking-wider truncate uppercase">
                {t('sidebar.crmSubtitle')}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Admin Profile Mini Card */}
      {!isCollapsed && user && (
        <div className="mx-3 my-3 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center space-x-3 shadow-inner">
          <div className="w-9 h-9 rounded-full bg-[#A00000] text-white font-bold flex items-center justify-center text-xs shadow-sm border border-white/20">
            {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-[#FFD32A] font-semibold uppercase tracking-wider truncate">
              {user.role ? user.role.replace('_', ' ') : t('dashboard.adminDesignation', 'District Admin')}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? 'bg-[#A00000] text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                } ${!isCollapsed ? 'mr-3' : ''}`}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Active Golden Yellow Indicator */}
              {isActive && (
                <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#FFD32A] shadow-xs"></span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={logout}
          title={isCollapsed ? t('common.logout') : undefined}
          className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className={`w-4 h-4 flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`} />
          {!isCollapsed && <span>{t('common.logout')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 max-w-[82vw] z-50 transition-transform duration-300 ease-in-out transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
