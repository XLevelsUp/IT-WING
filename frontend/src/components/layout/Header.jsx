import React, { useState } from 'react';
import { Menu, Search, Bell, User, LogOut, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from './Breadcrumbs';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';

export const Header = ({ setIsMobileOpen, isCollapsed }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, title: 'Critical Grievance Logged', time: '10m ago', text: 'Siruvani water pipe burst reported in Ward 72', unread: true },
    { id: 2, title: 'Project Status Updated', time: '1h ago', text: 'Solar LED installation in Gandhipuram reached 100%', unread: true },
    { id: 3, title: 'New TVK Cadre Enrolled', time: '3h ago', text: '15 new active members registered in Peelamedu', unread: false },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/issues?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hamburger & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 transition"
            />
          </form>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 relative focus:outline-none transition"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            </button>

            {showNotifications && (
              <div className="fixed inset-x-3 sm:inset-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">{t('header.notifications', 'Notifications')}</h4>
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    2 {t('header.new', 'New')}
                  </span>
                </div>
                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition cursor-pointer">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.text}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/admin/issues');
                    }}
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    {t('header.viewAllGrievances', 'View All Grievances')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center space-x-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 focus:outline-none transition"
            >
              <div className="w-8 h-8 rounded-full bg-red-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400 font-medium">K.Vignesh</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                    {user?.role ? user.role.replace('_', ' ') : t('header.adminRole', 'Administrator')}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin/settings');
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Settings className="w-4 h-4 mr-2.5 text-slate-400" />
                    {t('header.systemSettings')}
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin/district');
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2.5 text-slate-400" />
                    {t('header.districtOverview')}
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4 mr-2.5" />
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* [ LANGUAGE SWITCHER ] */}
          <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
            <LanguageSwitcher variant="light" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
