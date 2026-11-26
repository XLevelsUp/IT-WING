import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Building,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Phone,
  ShieldCheck,
  Search,
  Filter,
  FileText,
  LogOut,
  FolderTree,
  Calendar,
  Layers,
  Activity,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import image1 from '../../assets/image1.png';
import image2 from '../../assets/image2.png';
import image3 from '../../assets/image3.png';

export const PaguthiSeyalaalarDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isTa = i18n.language === 'ta';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // View state: 'card' (single card dashboard view) or 'detail' (deep-dive Paguthi details & ward directory)
  const [viewMode, setViewMode] = useState('card');
  const [selectedVillage, setSelectedVillage] = useState(null);

  // Selected ward for deep-dive complaint view
  const [selectedWardForComplaints, setSelectedWardForComplaints] = useState(null);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');
  const [wardSearchQuery, setWardSearchQuery] = useState('');

  // Translation helpers
  const formatLocation = (name) => {
    if (!name) return '';
    return t(`locations.${name}`, name);
  };

  const formatCategory = (cat) => {
    if (!cat) return t('complaintCategories.General', 'General');
    return t(`complaintCategories.${cat}`, cat);
  };

  const formatStatus = (st) => {
    if (['Completed', 'Resolved', 'Closed'].includes(st)) {
      return t('paguthiDashboard.statusResolved', 'Resolved');
    }
    if (st === 'In Progress') {
      return t('paguthiDashboard.statusInProgress', 'In Progress');
    }
    return t('paguthiDashboard.statusPending', 'Pending');
  };

  // Fetch live database dashboard data
  const fetchDashboardData = async (v = selectedVillage) => {
    try {
      setLoading(true);
      setError(null);
      const url = v
        ? `/paguthi-seyalaalar/dashboard?village=${encodeURIComponent(v)}`
        : '/paguthi-seyalaalar/dashboard';
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || t('paguthiDashboard.errorDesc', 'Failed to load dashboard data'));
      }
    } catch (err) {
      console.error('Failed to load Paguthi dashboard:', err);
      setError(err.response?.data?.message || err.message || t('paguthiDashboard.errorDesc', 'Error loading live database information'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVillage = (vName) => {
    setSelectedVillage(vName);
    setWardSearchQuery('');
    setComplaintStatusFilter('all');
    fetchDashboardData(vName);
  };

  const handleBackToVillages = () => {
    setSelectedVillage(null);
    setWardSearchQuery('');
    setComplaintStatusFilter('all');
    fetchDashboardData(null);
  };

  const handleBackToCard = () => {
    setViewMode('card');
    setSelectedVillage(null);
    setWardSearchQuery('');
    setComplaintStatusFilter('all');
    fetchDashboardData(null);
  };

  useEffect(() => {
    fetchDashboardData(selectedVillage);

    const handleWindowFocus = () => {
      fetchDashboardData(selectedVillage);
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [selectedVillage]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <LoadingSpinner text={t('paguthiDashboard.loadingText', 'Loading Live Paguthi Seyalaalar Database Dashboard...')} fullScreen />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-red-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#A00000] flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">{t('paguthiDashboard.errorTitle', 'Access Restricted / Error')}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error || t('paguthiDashboard.errorDesc', 'Unable to retrieve your Paguthi records.')}</p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-[#850000] text-white text-xs font-bold rounded-xl hover:bg-[#A00000] transition cursor-pointer"
            >
              {t('paguthiDashboard.retry', 'Retry')}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              {t('paguthiDashboard.logout', 'Logout')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { paguthi, stats, wards = [], allComplaints = [], hasVillages = false, villages = [] } = data;

  const getJurisdictionLabel = (isUpper = false) => {
    if (hasVillages) {
      return isUpper
        ? t('paguthiDashboard.ondriyamJurisdictionUpper', 'ONDRIYAM JURISDICTION')
        : t('paguthiDashboard.ondriyamJurisdiction', 'Ondriyam Jurisdiction');
    }
    if (paguthi.includes('Nagaram')) {
      return isUpper
        ? t('paguthiDashboard.nagaramJurisdictionUpper', 'NAGARAM JURISDICTION')
        : t('paguthiDashboard.nagaramJurisdiction', 'Nagaram Jurisdiction');
    }
    return isUpper
      ? t('paguthiDashboard.paguthiJurisdictionUpper', 'PAGUTHI JURISDICTION')
      : t('paguthiDashboard.paguthiJurisdiction', 'Paguthi Jurisdiction');
  };

  const getDivisionNoun = () => {
    if (hasVillages) return t('paguthiDashboard.ondriyam', 'Ondriyam');
    if (paguthi.includes('Nagaram')) return t('paguthiDashboard.nagaram', 'Nagaram');
    return t('paguthiDashboard.paguthi', 'Paguthi');
  };

  const getSeyalaalarTitle = () => {
    if (hasVillages) return t('paguthiDashboard.ondriyamSeyalaalar', 'Ondriyam Seyalaalar');
    if (paguthi.includes('Nagaram')) return t('paguthiDashboard.nagaramSeyalaalar', 'Nagaram Seyalaalar');
    return t('paguthiDashboard.paguthiSeyalaalar', 'Paguthi Seyalaalar');
  };

  const getAdminTitle = () => {
    if (hasVillages) return t('paguthiDashboard.ondriyamAdministration', 'Ondriyam Administration');
    if (paguthi.includes('Nagaram')) return t('paguthiDashboard.nagaramAdministration', 'Nagaram Administration');
    return t('paguthiDashboard.paguthiAdministration', 'Paguthi Administration');
  };

  const isMunicipalCleanWard = ['Pothanur', 'Podanur', 'Kurichi', 'Sundarapuram'].includes(paguthi);

  let displayWards = Array.isArray(wards) ? [...wards] : [];

  // Pothanur: Ensure only ONE Ward 95 card is displayed
  if (['Pothanur', 'Podanur'].includes(paguthi)) {
    const ward95List = displayWards.filter((w) => Number(w.wardNumber) === 95);
    if (ward95List.length > 1) {
      const pothanurWard95 = ward95List.find((w) => ['Pothanur', 'Podanur'].includes(w.paguthi)) || ward95List[0];
      const otherWard95 = ward95List.find((w) => w !== pothanurWard95);

      const mergedComplaints = (pothanurWard95.complaints && pothanurWard95.complaints.length > 0)
        ? pothanurWard95.complaints
        : (otherWard95?.complaints || []);

      const mergedWard95 = {
        ...pothanurWard95,
        wardSecretary: (pothanurWard95.wardSecretary && pothanurWard95.wardSecretary !== 'Not Assigned')
          ? pothanurWard95.wardSecretary
          : (otherWard95?.wardSecretary || pothanurWard95.wardSecretary || 'Not Assigned'),
        hasAssignedSecretary: Boolean(
          pothanurWard95.hasAssignedSecretary || otherWard95?.hasAssignedSecretary
        ),
        contactNumber: pothanurWard95.contactNumber || otherWard95?.contactNumber || null,
        stats: {
          totalComplaints: Math.max(Number(pothanurWard95.stats?.totalComplaints) || 0, Number(otherWard95?.stats?.totalComplaints) || 0),
          pendingComplaints: Math.max(Number(pothanurWard95.stats?.pendingComplaints) || 0, Number(otherWard95?.stats?.pendingComplaints) || 0),
          inProgressComplaints: Math.max(Number(pothanurWard95.stats?.inProgressComplaints) || 0, Number(otherWard95?.stats?.inProgressComplaints) || 0),
          resolvedComplaints: Math.max(Number(pothanurWard95.stats?.resolvedComplaints) || 0, Number(otherWard95?.stats?.resolvedComplaints) || 0),
        },
        complaints: mergedComplaints,
      };

      displayWards = displayWards.filter((w) => Number(w.wardNumber) !== 95);
      displayWards.push(mergedWard95);
    }
  }

  displayWards.sort((a, b) => (Number(a.wardNumber) || 0) - (Number(b.wardNumber) || 0));

  const totalWardsCount = stats?.totalWards ?? displayWards.length;

  // Filter wards by search query
  const filteredWards = displayWards.filter((w) => {
    if (!wardSearchQuery.trim()) return true;
    const q = wardSearchQuery.toLowerCase();
    return (
      String(w.wardNumber).includes(q) ||
      (w.wardName || '').toLowerCase().includes(q) ||
      (w.tamilName || '').toLowerCase().includes(q) ||
      (w.wardSecretary || '').toLowerCase().includes(q) ||
      (w.contactNumber || '').includes(q)
    );
  });

  // Filter complaints for modal/view by status
  const getFilteredWardComplaints = (wardComplaints = []) => {
    if (complaintStatusFilter === 'all') return wardComplaints;
    if (complaintStatusFilter === 'pending') {
      return wardComplaints.filter((c) => ['New', 'Pending', 'Assigned', 'Under Review'].includes(c.status));
    }
    if (complaintStatusFilter === 'in_progress') {
      return wardComplaints.filter((c) => c.status === 'In Progress');
    }
    if (complaintStatusFilter === 'resolved') {
      return wardComplaints.filter((c) => ['Completed', 'Resolved', 'Closed'].includes(c.status));
    }
    return wardComplaints;
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans text-slate-800">
      {/* ================= 1. INSTITUTIONAL TOP BAR ================= */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-md flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <img
            src={image3}
            alt="TVK Emblem"
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain drop-shadow-md brightness-105 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-white font-extrabold text-xs sm:text-sm lg:text-base tracking-tight leading-tight truncate">
                {t('header.systemTitle', 'TVK Digital Governance CRM')}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9.5px] lg:text-[10px] font-extrabold bg-[#FFD32A] text-[#850000] uppercase tracking-wider flex-shrink-0">
                {t('paguthiDashboard.jurisdictionTypeBadge', 'Paguthi / Ondriyam / Nagaram')}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#FFD32A] truncate">
              {formatLocation(paguthi)} • {t('paguthiDashboard.constituency', 'Kinathukadavu Assembly Constituency')}
            </p>
          </div>
        </div>

        {/* Right Action: Language + Refresh + User Profile + Logout */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => fetchDashboardData(selectedVillage)}
            disabled={loading}
            title={t('paguthiDashboard.refreshTooltip', 'Refresh live data from database')}
            className="px-2.5 sm:px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FFD32A] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('paguthiDashboard.refresh', 'Refresh')}</span>
          </button>

          <LanguageSwitcher />

          <div className="hidden md:flex items-center space-x-2 bg-black/25 px-2.5 py-1 rounded-xl border border-white/10 text-white text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFD32A] flex-shrink-0" />
            <div className="text-left leading-tight">
              <span className="font-bold block text-white text-[11px] truncate max-w-[120px]">
                {user?.name || `${formatLocation(paguthi)} ${getSeyalaalarTitle()}`}
              </span>
              <span className="text-[9px] text-red-200">@{user?.username}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={t('paguthiDashboard.logout', 'Logout')}
            className="px-2.5 sm:px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span className="hidden sm:inline">{t('paguthiDashboard.logout', 'Logout')}</span>
          </button>
        </div>
      </header>

      {/* ================= 2. MAIN CONTAINER ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 space-y-5 sm:space-y-6">
        {/* ================= VIEW MODE 1: SINGLE PAGUTHI CARD VIEW ================= */}
        {viewMode === 'card' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Page Header */}
            <div
              className="w-full relative bg-[#850000] pt-6 sm:pt-8 md:pt-10 pb-0 px-3 sm:px-6 lg:px-8 text-white overflow-hidden shadow-md rounded-2xl sm:rounded-3xl border border-[#E9E2DC]"
              style={{
                backgroundImage: `url(${coimbatoreCityBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(120, 0, 0, 0.95) 0%, rgba(133, 0, 0, 0.90) 50%, rgba(100, 0, 0, 0.96) 100%)',
                }}
              />

              {/* Top-Right Corner Image (image3.png) */}
              <div className="absolute top-2.5 sm:top-3.5 md:top-5 right-2.5 sm:right-4 md:right-6 lg:right-8 z-20 pointer-events-none">
                <img
                  src={image3}
                  alt="TVK Official Emblem"
                  className="w-10 h-10 min-[360px]:w-11 min-[360px]:h-11 min-[390px]:w-12 min-[390px]:h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 object-contain drop-shadow-xl filter brightness-105 select-none"
                />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto">
                {/* MOBILE VIEW (< md): Text at Top, Both Leadership Images Neatly Positioned at Bottom */}
                <div className="flex flex-col md:hidden items-center">
                  {/* Center Content: Heading, Tagline, Description */}
                  <div className="w-full text-center space-y-2 sm:space-y-2.5 pt-1 px-1">
                    <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                      <span className="text-[#FFD32A] font-bold">
                        {getJurisdictionLabel(false)}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-md text-white">
                      {t('paguthiDashboard.welcome', 'Welcome,')}{' '}
                      <span className="text-[#FFD32A]">{user?.name || `${formatLocation(paguthi)} ${getSeyalaalarTitle()}`}</span>
                    </h1>

                    <p className="text-xs sm:text-sm text-white/95 max-w-xl mx-auto font-medium leading-relaxed drop-shadow-xs">
                      {t('paguthiDashboard.heroDescription', 'You are authenticated to manage and monitor localized public grievances, cadre coordination, and municipal ward governance for {{paguthi}}. Click your designated card below to inspect live database counts, ward directories, and registered complaints.', { paguthi: formatLocation(paguthi) })}
                    </p>
                  </div>

                  {/* Mobile Leadership Portraits: Both Visible, Consistent Bottom Alignment, No Overlap */}
                  <div className="w-full flex items-end justify-center gap-4 min-[390px]:gap-6 sm:gap-10 mt-3 self-end">
                    <div className="flex justify-center items-end self-end">
                      <img
                        src={image1}
                        alt="TVK Leadership - Image 1"
                        className="h-28 min-[375px]:h-32 min-[410px]:h-36 sm:h-44 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] filter brightness-105"
                      />
                    </div>
                    <div className="flex justify-center items-end self-end">
                      <img
                        src={image2}
                        alt="TVK Leadership - Image 2"
                        className="h-28 min-[375px]:h-32 min-[410px]:h-36 sm:h-44 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] filter brightness-105"
                      />
                    </div>
                  </div>
                </div>

                {/* DESKTOP & TABLET VIEW (>= md): 3-Column Layout with Prominent Increased Sizing & Flush Bottom Alignment */}
                <div className="hidden md:flex flex-row items-end justify-between gap-4 lg:gap-8">
                  {/* Left Side: image1.png (Desktop / Tablet) - Prominent, Flush Bottom */}
                  <div className="flex-1 flex justify-start items-end self-end">
                    <img
                      src={image1}
                      alt="TVK Leadership - Image 1"
                      className="h-56 md:h-64 lg:h-76 xl:h-88 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] filter brightness-105 transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </div>

                  {/* Center Content: Heading, Tagline, Description */}
                  <div className="w-full md:w-auto md:max-w-xl lg:max-w-2xl text-center space-y-2.5 sm:space-y-3.5 my-auto py-6 lg:py-8">
                    <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                      <span className="text-[#FFD32A] font-bold">
                        {getJurisdictionLabel(false)}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-md text-white">
                      {t('paguthiDashboard.welcome', 'Welcome,')}{' '}
                      <span className="text-[#FFD32A]">{user?.name || `${formatLocation(paguthi)} ${getSeyalaalarTitle()}`}</span>
                    </h1>

                    <p className="text-xs sm:text-sm lg:text-base text-white/95 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-xs">
                      {t('paguthiDashboard.heroDescription', 'You are authenticated to manage and monitor localized public grievances, cadre coordination, and municipal ward governance for {{paguthi}}. Click your designated card below to inspect live database counts, ward directories, and registered complaints.', { paguthi: formatLocation(paguthi) })}
                    </p>
                  </div>

                  {/* Right Side: Image 2 (Desktop / Tablet) - Prominent, Flush Bottom */}
                  <div className="flex-1 flex justify-end items-end self-end">
                    <img
                      src={image2}
                      alt="TVK Leadership - Image 2"
                      className="h-56 md:h-64 lg:h-76 xl:h-88 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] filter brightness-105 transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: ONLY ONE PAGUTHI CARD DISPLAYED */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                    <FolderTree className="w-4 h-4 sm:w-5 sm:h-5 text-[#850000]" />
                    <span>{t('paguthiDashboard.assignedAdminTitle', 'Your Assigned Jurisdiction Administration')}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('paguthiDashboard.assignedAdminSub', 'Live dynamic database card scoped strictly to your account')}
                  </p>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-[#850000] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  {t('paguthiDashboard.oneAssignedJurisdiction', '1 Assigned Jurisdiction')}
                </span>
              </div>

              {/* The Single Card - Scoped Strictly to Authenticated User */}
              <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl border border-[#E9E2DC] shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-[#850000] transition-all duration-200 flex flex-col justify-between overflow-hidden relative group">
                  {/* Top Red-Gold Accent Bar */}
                  <div className="h-1.5 bg-gradient-to-r from-[#A00000] via-[#FFD32A] to-[#850000]" />

                  <div className="p-4 sm:p-6">
                    {/* Top Row: MapPin Icon + Badge */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FFF8F0] border border-[#FFE5A3] flex items-center justify-center text-[#850000] shadow-xs group-hover:scale-105 transition">
                        <MapPin className="w-5 h-5 text-[#850000]" />
                      </div>
                      <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-red-50 text-[#850000] border border-red-200">
                        {getJurisdictionLabel(true)}
                      </span>
                    </div>

                    {/* Paguthi / Ondriyam / Nagaram Title */}
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 sm:mt-4 group-hover:text-[#850000] transition tracking-tight">
                      {formatLocation(paguthi)}
                    </h3>

                    {/* Live Database Statistics Counts */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 text-xs">
                      {hasVillages ? (
                        <>
                          <div className="bg-[#FFF8F0] p-2.5 sm:p-3 rounded-xl border border-[#FFE5A3]/50">
                            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block uppercase tracking-wider">
                              {t('paguthiDashboard.totalVillages', 'Total Villages')}
                            </span>
                            <strong className="text-slate-900 font-black text-base sm:text-lg text-[#850000]">
                              {stats?.totalVillages ?? villages.length ?? 0}
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-xl border border-emerald-200/60">
                            <span className="text-[10px] sm:text-[10.5px] text-emerald-700 font-semibold block uppercase tracking-wider">
                              {t('paguthiDashboard.totalWards', 'Total Wards')}
                            </span>
                            <strong className="text-emerald-900 font-black text-base sm:text-lg">
                              {totalWardsCount}
                            </strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-[#FFF8F0] p-2.5 sm:p-3 rounded-xl border border-[#FFE5A3]/50">
                            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-semibold block uppercase tracking-wider">
                              {t('paguthiDashboard.totalWards', 'Total Wards')}
                            </span>
                            <strong className="text-slate-900 font-black text-base sm:text-lg text-[#850000]">
                              {totalWardsCount}
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-xl border border-emerald-200/60">
                            <span className="text-[10px] sm:text-[10.5px] text-emerald-700 font-semibold block uppercase tracking-wider">
                              {t('paguthiDashboard.registeredSecs', 'Registered Secs')}
                            </span>
                            <strong className="text-emerald-900 font-black text-base sm:text-lg">
                              {stats?.registeredSecretaries ?? stats?.totalWardSecretaries ?? 0}
                            </strong>
                          </div>
                        </>
                      )}

                      {/* Complaints Summary */}
                      <div className="col-span-2 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                            {t('paguthiDashboard.totalComplaintsColon', 'Total Complaints:')}
                          </span>
                          <span className="font-extrabold text-[#850000] text-sm">{stats?.totalComplaints ?? stats?.totalIssues ?? 0}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] sm:text-[10.5px] text-slate-500 pt-1.5 border-t border-slate-200">
                          <div className="truncate">
                            {t('paguthiDashboard.pendingColon', 'Pending:')} <strong className="text-amber-700 font-bold">{stats?.pendingComplaints ?? stats?.pendingIssues ?? 0}</strong>
                          </div>
                          <div className="text-center truncate">
                            {t('paguthiDashboard.inProgColon', 'In Prog:')} <strong className="text-sky-700 font-bold">{stats?.inProgressComplaints ?? stats?.inProgressIssues ?? 0}</strong>
                          </div>
                          <div className="text-right truncate">
                            {t('paguthiDashboard.doneColon', 'Done:')} <strong className="text-emerald-700 font-bold">{stats?.resolvedComplaints ?? stats?.resolvedIssues ?? 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Open Paguthi Action Button */}
                  <div className="p-4 sm:p-5 pt-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('detail')}
                      className="w-full py-2.5 px-3 sm:px-4 bg-[#850000] hover:bg-[#A00000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#850000]/40"
                    >
                      <span className="truncate">
                        {hasVillages ? t('paguthiDashboard.openOndriyamBtn', 'Open Ondriyam Details & Villages') : paguthi.includes('Nagaram') ? t('paguthiDashboard.openNagaramBtn', 'Open Nagaram Details & Ward Directory') : t('paguthiDashboard.openPaguthiBtn', 'Open Paguthi Details & Ward Directory')}
                      </span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW MODE 2: PAGUTHI DETAILS & WARD DIRECTORY ================= */}
        {viewMode === 'detail' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Breadcrumb Navigation & Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                <button
                  onClick={handleBackToCard}
                  className="hover:text-[#850000] transition cursor-pointer"
                >
                  {t('paguthiDashboard.dashboardBreadcrumb', 'Dashboard')}
                </button>
                <span>&gt;</span>
                {selectedVillage ? (
                  <>
                    <button
                      onClick={handleBackToVillages}
                      className="hover:text-[#850000] transition cursor-pointer"
                    >
                      {formatLocation(paguthi)}
                    </button>
                    <span>&gt;</span>
                    <span className="text-[#850000] font-bold">{formatLocation(selectedVillage)} {t('paguthiDashboard.village', 'Village')}</span>
                  </>
                ) : (
                  <span className="text-[#850000] font-bold">
                    {formatLocation(paguthi)} {getDivisionNoun()}
                  </span>
                )}
              </div>

              {selectedVillage ? (
                <button
                  type="button"
                  onClick={handleBackToVillages}
                  className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-[#850000] transition space-x-1.5 cursor-pointer bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('paguthiDashboard.backToVillages', 'Back to Villages')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBackToCard}
                  className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-[#850000] transition space-x-1.5 cursor-pointer bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('paguthiDashboard.backToCard', 'Back to Single Card View')}</span>
                </button>
              )}
            </div>

            {/* Hero Header Banner */}
            <div className="bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-md relative overflow-hidden border-b-4 border-[#FFD32A]">
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[#FFD32A] text-[10.5px] sm:text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="font-mono bg-black/40 px-2 py-0.5 rounded border border-[#FFD32A]/30">
                    {t('paguthiDashboard.southZone', 'KKD • SOUTH ZONE')}
                  </span>
                  <span>•</span>
                  <span>{t('paguthiDashboard.constituency', 'Kinathukadavu Assembly Constituency')}</span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                  {selectedVillage ? (
                    <>
                      {formatLocation(selectedVillage)} <span className="text-[#FFD32A]">{t('paguthiDashboard.villageAdministration', 'Village Administration')}</span>
                    </>
                  ) : (
                    <>
                      {formatLocation(paguthi)}{' '}
                      <span className="text-[#FFD32A]">
                        {getAdminTitle()}
                      </span>
                    </>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-red-100 max-w-2xl mt-1.5 leading-relaxed font-medium">
                  {selectedVillage
                    ? t('paguthiDashboard.villageBannerDesc', 'Live administrative hierarchy under {{paguthi}} covering {{count}} municipal wards, verified Ward Secretaries, localized citizen petitions, and ground-level resolution status.', { paguthi: formatLocation(paguthi), count: totalWardsCount })
                    : hasVillages
                    ? t('paguthiDashboard.ondriyamBannerDesc', 'Live administrative hierarchy covers all {{villageCount}} constituent villages, {{wardCount}} municipal wards, active cadres, and ground-level resolution status.', { villageCount: villages.length, wardCount: totalWardsCount })
                    : t('paguthiDashboard.paguthiBannerDesc', 'Live administrative hierarchy covers all {{count}} municipal wards, verified Ward Secretaries, localized citizen petitions, and ground-level resolution status.', { count: totalWardsCount })}
                </p>
              </div>

              <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#FFD32A]/10 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* ================= DYNAMIC SUMMARY METRICS CARDS ================= */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {/* Card 1: Total Villages or Total Wards */}
              {hasVillages && !selectedVillage ? (
                <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                      {t('paguthiDashboard.metricVillages', 'Villages')}
                    </span>
                    <FolderTree className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#850000] flex-shrink-0" />
                  </div>
                  <strong className="text-xl sm:text-2xl font-black text-slate-900 block">{stats?.totalVillages ?? villages.length ?? 0}</strong>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                    {t('paguthiDashboard.metricConstituentVillages', 'Constituent Villages')}
                  </span>
                </div>
              ) : (
                <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                      {t('paguthiDashboard.metricTotalWards', 'Total Wards')}
                    </span>
                    <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#850000] flex-shrink-0" />
                  </div>
                  <strong className="text-xl sm:text-2xl font-black text-slate-900 block">{totalWardsCount}</strong>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                    {t('paguthiDashboard.metricDatabaseWards', 'Database Wards')}
                  </span>
                </div>
              )}

              {/* Card 2: Total Ward Secretaries */}
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {t('paguthiDashboard.metricWardSecs', 'Ward Secs')}
                  </span>
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                </div>
                <strong className="text-xl sm:text-2xl font-black text-emerald-700 block">{stats?.registeredSecretaries ?? stats?.totalWardSecretaries ?? 0}</strong>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                  {t('paguthiDashboard.metricActiveCadres', 'Active Cadres')}
                </span>
              </div>

              {/* Card 3: Total Complaints */}
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {t('paguthiDashboard.metricTotalIssues', 'Total Issues')}
                  </span>
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#850000] flex-shrink-0" />
                </div>
                <strong className="text-xl sm:text-2xl font-black text-[#850000] block">{stats?.totalComplaints ?? stats?.totalIssues ?? 0}</strong>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                  {t('paguthiDashboard.metricRegistered', 'Registered')}
                </span>
              </div>

              {/* Card 4: Pending Complaints */}
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {t('paguthiDashboard.metricPending', 'Pending')}
                  </span>
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                </div>
                <strong className="text-xl sm:text-2xl font-black text-amber-700 block">{stats?.pendingComplaints ?? stats?.pendingIssues ?? 0}</strong>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                  {t('paguthiDashboard.metricNeedsAction', 'Needs Action')}
                </span>
              </div>

              {/* Card 5: In Progress */}
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {t('paguthiDashboard.metricInProgress', 'In Progress')}
                  </span>
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 flex-shrink-0" />
                </div>
                <strong className="text-xl sm:text-2xl font-black text-sky-700 block">{stats?.inProgressComplaints ?? stats?.inProgressIssues ?? 0}</strong>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                  {t('paguthiDashboard.metricWorkOngoing', 'Work Ongoing')}
                </span>
              </div>

              {/* Card 6: Resolved */}
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                    {t('paguthiDashboard.metricResolved', 'Resolved')}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                </div>
                <strong className="text-xl sm:text-2xl font-black text-emerald-700 block">{stats?.resolvedComplaints ?? stats?.resolvedIssues ?? 0}</strong>
                <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium">
                  {t('paguthiDashboard.metricCompleted', 'Completed')}
                </span>
              </div>
            </div>

            {/* ================= VILLAGE CARDS SECTION (WHEN ONDRIYAM HAS VILLAGES & NONE CURRENTLY SELECTED) ================= */}
            {hasVillages && !selectedVillage ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                      <FolderTree className="w-4 h-4 sm:w-5 sm:h-5 text-[#850000]" />
                      <span>{t('paguthiDashboard.villageDirectoryTitle', 'Constituent Village Directory ({{count}} Villages)', { count: villages.length })}</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t('paguthiDashboard.villageDirectorySub', 'Select any village to inspect municipal ward governance, assigned secretaries, and citizen grievance reports')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {villages.map((v) => (
                    <div
                      key={v.name}
                      className="bg-white rounded-2xl border border-[#E9E2DC] shadow-2xs hover:shadow-md hover:border-[#850000] transition flex flex-col justify-between overflow-hidden relative"
                    >
                      <div className="h-1 bg-gradient-to-r from-[#850000] via-[#FFD32A] to-[#850000]" />

                      <div className="p-3.5 sm:p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-red-50 text-[#850000] border border-red-200">
                            {t('paguthiDashboard.villageBadge', 'Village')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {v.totalWards === 1
                              ? t('paguthiDashboard.wardCountSingle', '1 Ward')
                              : t('paguthiDashboard.wardsCount', '{{count}} Wards', { count: v.totalWards })}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {formatLocation(v.name)}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {t('paguthiDashboard.partOf', 'Part of {{paguthi}}', { paguthi: formatLocation(paguthi) })}
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 text-[11px]">
                            <span className="text-slate-500 font-medium">{t('paguthiDashboard.secretaryLabel', 'Secretary:')}</span>
                            {v.wardSecretary && v.wardSecretary !== 'Not Assigned' ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10.5px] truncate max-w-[160px]">
                                {v.wardSecretary}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full text-[10.5px]">
                                {t('paguthiDashboard.notAssigned', 'Not Assigned')}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 text-[11px]">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" /> {t('paguthiDashboard.contactLabel', 'Contact:')}
                            </span>
                            <span className="font-semibold text-slate-700 font-mono text-[10.5px]">
                              {v.contactNumber || t('paguthiDashboard.notAvailable', 'Not Available')}
                            </span>
                          </div>
                        </div>

                        {/* Village Grievance stats */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                          <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200/60">
                            <span className="text-amber-800 block font-semibold truncate">{t('paguthiDashboard.pendingShort', 'Pending')}</span>
                            <strong className="text-amber-900 font-black text-xs">
                              {v.pendingComplaints}
                            </strong>
                          </div>
                          <div className="bg-sky-50 p-1.5 rounded-lg border border-sky-200/60">
                            <span className="text-sky-800 block font-semibold truncate">{t('paguthiDashboard.inProgShort', 'In Prog')}</span>
                            <strong className="text-sky-900 font-black text-xs">
                              {v.inProgressComplaints}
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200/60">
                            <span className="text-emerald-800 block font-semibold truncate">{t('paguthiDashboard.doneShort', 'Done')}</span>
                            <strong className="text-emerald-900 font-black text-xs">
                              {v.completedComplaints}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 pt-0">
                        <button
                          type="button"
                          onClick={() => handleSelectVillage(v.name)}
                          className="w-full py-2 px-3 bg-[#850000] hover:bg-[#A00000] text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <span>{t('paguthiDashboard.openVillageWardsBtn', 'Open Village Wards ({{count}})', { count: v.totalWards })}</span>
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ================= WARD DIRECTORY SECTION (WHEN VILLAGE SELECTED OR PAGUTHI HAS NO VILLAGES) ================= */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                      <Building className="w-4 h-4 sm:w-5 sm:h-5 text-[#850000]" />
                      <span>
                        {selectedVillage
                          ? t('paguthiDashboard.selectedVillageWardDirTitle', '{{village}} Village Ward Directory', { village: formatLocation(selectedVillage) })
                          : t('paguthiDashboard.wardDirectoryTitle', 'Municipal Ward Directory & Governance')}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t('paguthiDashboard.wardDirectorySub', 'Live directory of all {{count}} wards belonging to {{area}} with assigned secretaries and complaint status', { count: displayWards.length, area: formatLocation(selectedVillage || paguthi) })}
                    </p>
                  </div>

                  {/* Ward search filter */}
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={wardSearchQuery}
                      onChange={(e) => setWardSearchQuery(e.target.value)}
                      placeholder={t('paguthiDashboard.searchPlaceholder', 'Search ward number, name, secretary...')}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#850000]/20 focus:border-[#850000] transition"
                    />
                  </div>
                </div>

                {/* Grid of Wards */}
                {filteredWards.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center text-slate-500 text-xs">
                    {t('paguthiDashboard.noWardsFound', 'No wards found matching "{{query}}".', { query: wardSearchQuery })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                    {filteredWards.map((w) => (
                      <div
                        key={w.id}
                        className="bg-white rounded-2xl border border-[#E9E2DC] shadow-2xs hover:shadow-md hover:border-[#850000] transition flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Top Accent line */}
                        <div className="h-1 bg-gradient-to-r from-[#850000] via-[#FFD32A] to-[#850000]" />

                        <div className="p-3.5 sm:p-4 space-y-3">
                          {/* Ward Number & Zone Badge */}
                          <div className="flex items-start justify-between">
                            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-red-50 text-[#850000] border border-red-200">
                              {t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: w.wardNumber })}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {w.zone ? (isTa ? (w.zone.includes('South') ? t('paguthiDashboard.southZoneLabel', 'தெற்கு மண்டலம்') : w.zone) : w.zone) : t('paguthiDashboard.southZoneLabel', 'South Zone')}
                            </span>
                          </div>

                          {/* Ward Name */}
                          {isMunicipalCleanWard ? (
                            <div className="pb-1">
                              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                                {t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: w.wardNumber })}
                              </h3>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug break-words">
                                {isTa ? (w.tamilName || w.wardName) : (w.wardName || w.tamilName)}
                              </h3>
                              {!isTa && w.tamilName && (
                                <p className="text-[11px] text-slate-500 font-semibold mt-0.5 break-words">
                                  {w.tamilName}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Assigned Ward Secretary Info */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1.5 text-xs">
                            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 text-[11px]">
                              <span className="text-slate-500 font-medium">{t('paguthiDashboard.secretaryLabel', 'Secretary:')}</span>
                              {w.hasAssignedSecretary && w.wardSecretary && w.wardSecretary !== 'Not Assigned' ? (
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10.5px] truncate max-w-[160px]">
                                  {w.wardSecretary}
                                </span>
                              ) : (
                                <span className="font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full text-[10.5px]">
                                  {t('paguthiDashboard.notAssigned', 'Not Assigned')}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 text-[11px]">
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" /> {t('paguthiDashboard.contactLabel', 'Contact:')}
                              </span>
                              <span className="font-semibold text-slate-700 font-mono text-[10.5px]">
                                {w.contactNumber || t('paguthiDashboard.notAvailable', 'Not Available')}
                              </span>
                            </div>
                          </div>

                          {/* Ward Complaint Statistics */}
                          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                            <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200/60">
                              <span className="text-amber-800 block font-semibold truncate">{t('paguthiDashboard.pendingShort', 'Pending')}</span>
                              <strong className="text-amber-900 font-black text-xs">
                                {w.stats.pendingComplaints}
                              </strong>
                            </div>
                            <div className="bg-sky-50 p-1.5 rounded-lg border border-sky-200/60">
                              <span className="text-sky-800 block font-semibold truncate">{t('paguthiDashboard.inProgShort', 'In Prog')}</span>
                              <strong className="text-sky-900 font-black text-xs">
                                {w.stats.inProgressComplaints}
                              </strong>
                            </div>
                            <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200/60">
                              <span className="text-emerald-800 block font-semibold truncate">{t('paguthiDashboard.doneShort', 'Done')}</span>
                              <strong className="text-emerald-900 font-black text-xs">
                                {w.stats.resolvedComplaints}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Button: Click opens Ward Complaints */}
                        <div className="p-3.5 sm:p-4 pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWardForComplaints(w);
                              setComplaintStatusFilter('all');
                            }}
                            className="w-full py-2 px-3 bg-[#FFF8F0] hover:bg-[#850000] hover:text-white text-[#850000] border border-[#FFE5A3] hover:border-[#850000] text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <span>{t('paguthiDashboard.viewComplaintsBtn', 'View Complaints ({{count}})', { count: w.stats.totalComplaints })}</span>
                            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= ALL COMPLAINTS SECTION ================= */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#E9E2DC] shadow-xs space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#850000]" />
                    <span>
                      {t('paguthiDashboard.repoTitle', 'Complete Grievance Tracking Repository ({{area}})', {
                        area: selectedVillage
                          ? `${formatLocation(selectedVillage)} ${t('paguthiDashboard.village', 'Village')}`
                          : `${formatLocation(paguthi)} ${getDivisionNoun()}`,
                      })}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('paguthiDashboard.repoSub', 'Live grievance records received across {{area}} from citizen portal', {
                      area: selectedVillage
                        ? `${formatLocation(selectedVillage)} ${t('paguthiDashboard.villageWards', 'Village wards')}`
                        : t('paguthiDashboard.allWardsOf', 'all {{paguthi}} wards', { paguthi: formatLocation(paguthi) }),
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                  <button
                    onClick={() => setComplaintStatusFilter('all')}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                      complaintStatusFilter === 'all'
                        ? 'bg-white text-[#850000] shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('paguthiDashboard.filterAll', 'All ({{count}})', { count: allComplaints.length })}
                  </button>
                  <button
                    onClick={() => setComplaintStatusFilter('pending')}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                      complaintStatusFilter === 'pending'
                        ? 'bg-white text-amber-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('paguthiDashboard.filterPending', 'Pending ({{count}})', { count: stats.pendingComplaints })}
                  </button>
                  <button
                    onClick={() => setComplaintStatusFilter('in_progress')}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                      complaintStatusFilter === 'in_progress'
                        ? 'bg-white text-sky-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('paguthiDashboard.filterInProgress', 'In Progress ({{count}})', { count: stats.inProgressComplaints })}
                  </button>
                  <button
                    onClick={() => setComplaintStatusFilter('resolved')}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                      complaintStatusFilter === 'resolved'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('paguthiDashboard.filterResolved', 'Resolved ({{count}})', { count: stats.resolvedComplaints })}
                  </button>
                </div>
              </div>

              {/* Complaints List - Responsive Card View on Mobile, Full Table on Desktop */}
              {getFilteredWardComplaints(allComplaints).length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  {t('paguthiDashboard.noGrievancesMatch', 'No grievances found matching this status filter.')}
                </div>
              ) : (
                <>
                  {/* Mobile Cards (Viewports 320px - 767px) */}
                  <div className="block md:hidden space-y-3">
                    {getFilteredWardComplaints(allComplaints).map((c) => {
                      const isResolved = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                      const isInProgress = c.status === 'In Progress';

                      return (
                        <div
                          key={c.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#850000] text-xs">
                              {c.issueCode || `GRI-${c.id}`}
                            </span>
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> {t('paguthiDashboard.statusResolved', 'Resolved')}
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                                <Activity className="w-3 h-3" /> {t('paguthiDashboard.statusInProgress', 'In Progress')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> {formatStatus(c.status)}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="font-bold text-slate-900 block">{c.title}</span>
                            <span className="text-[11px] text-slate-500 block line-clamp-2 mt-0.5">{c.description}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] text-slate-500">
                            <div>
                              {t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: c.wardNumber })} •{' '}
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[9.5px]">
                                {formatCategory(c.category)}
                              </span>
                            </div>
                            <div>
                              {c.citizenName} • {c.createdAt ? new Date(c.createdAt).toLocaleDateString(isTa ? 'ta-IN' : 'en-GB') : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop / Tablet Table View (Viewports 768px - 1920px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10.5px] uppercase font-bold tracking-wider">
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colGrievanceId', 'Grievance ID')}</th>
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colWard', 'Ward')}</th>
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colSubject', 'Subject & Details')}</th>
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colCategory', 'Category')}</th>
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colCitizenInfo', 'Citizen Info')}</th>
                          <th className="py-2.5 px-3">{t('paguthiDashboard.colDate', 'Date')}</th>
                          <th className="py-2.5 px-3 text-right">{t('paguthiDashboard.colStatus', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getFilteredWardComplaints(allComplaints).map((c) => {
                          const isResolved = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                          const isInProgress = c.status === 'In Progress';

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-3 font-mono font-bold text-[#850000]">
                                {c.issueCode || `GRI-${c.id}`}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: c.wardNumber })}
                              </td>
                              <td className="py-3 px-3 max-w-xs">
                                <span className="font-bold text-slate-900 block truncate">{c.title}</span>
                                <span className="text-[11px] text-slate-500 block truncate">{c.description}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {formatCategory(c.category)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[11px]">
                                <span className="font-bold text-slate-800 block">{c.citizenName}</span>
                                <span className="text-slate-500 font-mono text-[10px]">{c.citizenMobile}</span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString(isTa ? 'ta-IN' : 'en-GB') : '—'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {isResolved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> {t('paguthiDashboard.statusResolved', 'Resolved')}
                                  </span>
                                ) : isInProgress ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                                    <Activity className="w-3 h-3" /> {t('paguthiDashboard.statusInProgress', 'In Progress')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3 h-3" /> {formatStatus(c.status)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= WARD COMPLAINTS DEEP-DIVE MODAL ================= */}
        {selectedWardForComplaints && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-[#850000] to-[#A00000] text-white flex items-start justify-between border-b-2 border-[#FFD32A]">
                <div className="min-w-0 pr-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-mono bg-black/40 px-2 py-0.5 rounded border border-[#FFD32A]/30 text-[#FFD32A]">
                      {selectedVillage ? `${formatLocation(selectedVillage)} • ` : ''}{formatLocation(paguthi)}
                    </span>
                    <span className="text-white/80">•</span>
                    <span className="text-white/90 font-semibold">
                      {selectedWardForComplaints.zone ? (isTa ? (selectedWardForComplaints.zone.includes('South') ? t('paguthiDashboard.southZoneLabel', 'தெற்கு மண்டலம்') : selectedWardForComplaints.zone) : selectedWardForComplaints.zone) : t('paguthiDashboard.southZoneLabel', 'South Zone')}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl lg:text-2xl font-black mt-1 break-words">
                    {t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: selectedWardForComplaints.wardNumber })}
                    {!isMunicipalCleanWard && selectedWardForComplaints.wardName ? ` - ${isTa ? (selectedWardForComplaints.tamilName || selectedWardForComplaints.wardName) : selectedWardForComplaints.wardName}` : ''}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-red-100">
                    <div>
                      {t('paguthiDashboard.secretaryLabel', 'Secretary:')}{' '}
                      <strong className="text-white">
                        {selectedWardForComplaints.wardSecretary && selectedWardForComplaints.wardSecretary !== 'Not Assigned'
                          ? selectedWardForComplaints.wardSecretary
                          : t('paguthiDashboard.notAssigned', 'Not Assigned')}
                      </strong>
                    </div>
                    <div>
                      {t('paguthiDashboard.contactLabel', 'Contact:')}{' '}
                      <strong className="text-[#FFD32A] font-mono">
                        {selectedWardForComplaints.contactNumber || t('paguthiDashboard.notAvailable', 'Not Available')}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedWardForComplaints(null)}
                  className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Tabs inside Modal */}
              <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  {t('paguthiDashboard.modalGrievancesCount', 'Grievances ({{count}})', { count: selectedWardForComplaints.complaints.length })}
                </span>

                <div className="flex flex-wrap gap-1 text-xs">
                  {['all', 'pending', 'in_progress', 'resolved'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setComplaintStatusFilter(st)}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer text-[10.5px] sm:text-[11px] ${
                        complaintStatusFilter === st
                          ? 'bg-[#850000] text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {st === 'all'
                        ? t('paguthiDashboard.tabAll', 'All')
                        : st === 'pending'
                        ? t('paguthiDashboard.tabPending', 'Pending')
                        : st === 'in_progress'
                        ? t('paguthiDashboard.tabInProgress', 'In Progress')
                        : t('paguthiDashboard.tabResolved', 'Resolved')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Body: Complaints List */}
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-3">
                {getFilteredWardComplaints(selectedWardForComplaints.complaints).length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">{t('paguthiDashboard.noComplaintsFound', 'No Complaints Found')}</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {t('paguthiDashboard.noComplaintsDesc', 'No citizen complaints found for Ward {{wardNumber}} in {{paguthi}}.', { wardNumber: selectedWardForComplaints.wardNumber, paguthi: formatLocation(paguthi) })}
                    </p>
                  </div>
                ) : (
                  getFilteredWardComplaints(selectedWardForComplaints.complaints).map((c) => {
                    const isResolved = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                    const isInProgress = c.status === 'In Progress';
                    const complaintId = c.issueCode || `CMP-${c.id}`;
                    const citizenName = c.citizenName || 'N/A';
                    const citizenMobile = c.citizenMobile || 'N/A';
                    const category = c.category || 'General';
                    const description = c.description || c.title || '-';
                    const regDate = c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString(isTa ? 'ta-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '-';
                    const assignedSec = selectedWardForComplaints.wardSecretary && selectedWardForComplaints.wardSecretary !== 'Not Assigned'
                      ? selectedWardForComplaints.wardSecretary
                      : t('paguthiDashboard.notAssigned', 'Not Assigned');

                    return (
                      <div
                        key={c.id}
                        className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-[#850000] shadow-2xs transition space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-mono font-bold text-[#850000] text-xs">
                              {complaintId}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {formatCategory(category)}
                            </span>
                            <span className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium">
                              {regDate}
                            </span>
                          </div>

                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> {t('paguthiDashboard.statusResolved', 'Resolved')}
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                              <Activity className="w-3 h-3" /> {t('paguthiDashboard.statusInProgress', 'In Progress')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> {formatStatus(c.status)}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{c.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed break-words">{description}</p>

                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[10.5px] sm:text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('paguthiDashboard.citizenAndMobile', 'Citizen & Mobile')}</span>
                            <strong className="text-slate-800">{citizenName}</strong> •{' '}
                            <span className="font-mono font-semibold text-slate-700">{citizenMobile}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('paguthiDashboard.jurisdictionAndWard', 'Jurisdiction & Ward')}</span>
                            <strong className="text-[#850000]">{formatLocation(selectedVillage || paguthi)}</strong> •{' '}
                            <span className="text-slate-700">{t('paguthiDashboard.wardNumber', 'Ward {{number}}', { number: selectedWardForComplaints.wardNumber })}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('paguthiDashboard.assignedSecretary', 'Assigned Secretary')}</span>
                            <span className={`font-bold ${assignedSec !== t('paguthiDashboard.notAssigned', 'Not Assigned') ? 'text-emerald-800' : 'text-slate-500'}`}>
                              {assignedSec}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedWardForComplaints(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {t('paguthiDashboard.closeBtn', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaguthiSeyalaalarDashboardPage;
