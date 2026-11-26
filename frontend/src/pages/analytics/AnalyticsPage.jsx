import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Building,
  Users,
  Check,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Download,
  MapPin,
  Activity,
  Award,
  XCircle,
  FileText,
  ChevronRight,
  Sparkles,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AdminPageHeader from '../../components/common/AdminPageHeader';

// Custom Modern Tooltip Component for Recharts
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200/80 text-xs space-y-1.5 min-w-[150px] animate-in fade-in duration-150">
        <p className="font-extrabold text-slate-800 pb-1 border-b border-slate-100 text-[11px] tracking-wide">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between space-x-3 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-slate-600 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-extrabold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Pie Chart Tooltip
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-xl border border-slate-200/80 text-xs space-y-1 animate-in fade-in duration-150">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.fill || data.color }} />
          <p className="font-bold text-slate-800">{data.name}</p>
        </div>
        <div className="flex items-center justify-between space-x-4 pt-1 border-t border-slate-100 font-mono text-[11px]">
          <span className="text-slate-500">Volume:</span>
          <span className="font-extrabold text-slate-900">{data.value} petitions</span>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { period };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }

      const res = await api.get('/analytics', { params });
      if (res.data.success) {
        setAnalyticsData(res.data.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load executive analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  // Color theme palette aligned with TVK Digital Governance branding
  const COLORS = [
    '#850000', // TVK Crimson
    '#d97706', // Warm Amber
    '#2563eb', // Royal Blue
    '#059669', // Emerald Green
    '#7c3aed', // Violet Purple
    '#db2777', // Rose Pink
    '#0891b2', // Cyan Teal
    '#4b5563', // Slate Neutral
    '#ea580c', // Bright Orange
    '#4f46e5', // Deep Indigo
  ];

  const summary = analyticsData?.summary || {};
  const categoryStats = analyticsData?.categoryStats || [];
  const departmentStats = analyticsData?.departmentStats || [];
  const constituencyStats = analyticsData?.constituencyStats || [];
  const wardStats = analyticsData?.wardStats || [];
  const monthlyTrends = analyticsData?.monthlyTrends || [];

  // Derived calculations for executive highlights
  const totalGrievances = summary.totalGrievances || 0;
  const resolvedGrievances = summary.resolvedGrievances || 0;
  const inProgressGrievances = summary.inProgressGrievances || 0;
  const pendingGrievances = summary.pendingGrievances || 0;
  const rejectedGrievances = summary.rejectedGrievances || 0;
  const resolutionRate = summary.resolutionRate ?? (totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 100) : 0);

  const getPeriodLabel = (p) => {
    switch (p) {
      case 'today':
        return t('analytics.periodToday', 'Today');
      case 'this_week':
        return t('analytics.periodThisWeek', 'This Week');
      case 'this_month':
        return t('analytics.periodThisMonth', 'This Month');
      case 'this_year':
        return t('analytics.periodThisYear', 'This Year');
      case 'custom':
        return t('analytics.periodCustom', 'Custom Range');
      default:
        return p.replace('_', ' ');
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (!analyticsData) return;
    const headers = ['Category', 'Total Reported', 'Resolved', 'Pending', 'Resolution Rate (%)'];
    const rows = (categoryStats || []).map((c) => [
      `"${c.name}"`,
      c.total,
      c.resolved,
      c.pending,
      `${c.rate}%`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `TVK Digital Governance CRM - Analytics Export (${getPeriodLabel(period)})`,
        `Exported On: ${new Date().toLocaleString()}`,
        `Total Petitions: ${totalGrievances}, Resolved: ${resolvedGrievances}, Pending: ${pendingGrievances}`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tvk_governance_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !analyticsData) {
    return <LoadingSpinner fullScreen text={t('analytics.loadingText', 'Crunching Coimbatore District Analytics...')} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-10">
      {/* ================= 1. PAGE HEADER & EXECUTIVE FILTER BAR ================= */}
      <AdminPageHeader
        badge={t('analytics.headerBadge', 'District Intelligence & Metrics')}
        badgeIcon={BarChart3}
        title={t('analytics.title', 'Executive Analytics Dashboard')}
        tamilTitle="நிர்வாக பகுப்பாய்வு கட்டுப்பாட்டு மையம்"
        subtitle={t('analytics.subtitle', 'Real-time multi-dimensional assessment of Coimbatore grievance resolution, cadre density and ward capacity.')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Period Buttons */}
            <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/15 backdrop-blur-xs overflow-x-auto max-w-full">
              {['today', 'this_week', 'this_month', 'this_year', 'custom'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    period === p
                      ? 'bg-[#FFD32A] text-[#850000] shadow-sm font-black'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {getPeriodLabel(p)}
                </button>
              ))}
            </div>

            {/* Refresh Action */}
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-black/30 hover:bg-black/50 text-white border border-white/20 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FFD32A] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export CSV Action */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FFD32A] hover:bg-[#ffe066] text-[#850000] rounded-2xl text-xs font-black transition shadow-sm cursor-pointer"
              title="Export analytics summary to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Custom Date Range Picker Drawer */}
      {period === 'custom' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center space-x-2 text-slate-700 font-bold mb-1 sm:mb-0">
              <Calendar className="w-4 h-4 text-[#850000]" />
              <span>Select Custom Range:</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                {t('analytics.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#850000]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                {t('analytics.endDate', 'End Date')}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#850000]"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAnalytics}
              disabled={!customStart || !customEnd || loading}
              className="px-4 py-2 bg-[#850000] hover:bg-[#A00000] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {t('analytics.applyFilter', 'Apply Filter')}
            </button>
            <button
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
                setPeriod('this_month');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Sync Timestamp & Live Status Pill */}
      <div className="flex flex-wrap items-center justify-between text-xs px-1 text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Live Database Synchronized</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Active Filter: <strong className="text-slate-700 capitalize">{getPeriodLabel(period)}</strong>
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Last Synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* ================= 2. EXECUTIVE SUMMARY KPI CARDS (6 CARDS GRID) ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Petitions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              {t('analytics.statTotal', 'Total Grievances')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#850000] border border-red-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalGrievances}</p>
            <p className="text-[10.5px] text-slate-500 mt-1 font-medium truncate">
              {t('analytics.statTotalSub', 'Reported in period')}
            </p>
          </div>
        </div>

        {/* Card 2: Resolved Petitions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-emerald-50/15 group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">
              {t('analytics.statResolved', 'Resolved Cases')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{resolvedGrievances}</p>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black font-mono">
                {resolutionRate}%
              </span>
              <span className="text-[10.5px] text-emerald-700 font-medium truncate">Closure rate</span>
            </div>
          </div>
        </div>

        {/* Card 3: In Progress Field Work */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-blue-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-blue-50/15 group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider">
              {t('analytics.statInProgress', 'In Progress')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">{inProgressGrievances}</p>
            <p className="text-[10.5px] text-blue-700 mt-1 font-medium truncate">
              {t('analytics.statInProgressSub', 'Active on ground')}
            </p>
          </div>
        </div>

        {/* Card 4: Pending Action */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-amber-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-amber-50/15 group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider">
              {t('analytics.statPending', 'Pending Action')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">{pendingGrievances}</p>
            <p className="text-[10.5px] text-amber-800 mt-1 font-medium truncate">
              {t('analytics.statPendingSub', 'Awaiting officer review')}
            </p>
          </div>
        </div>

        {/* Card 5: Resolution Efficiency */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-[#FFE5A3] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-[#FFF8F0] group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-[#850000] uppercase tracking-wider">
              Resolution Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFD32A] text-[#850000] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <p className="text-2xl sm:text-3xl font-black text-[#850000] tracking-tight">{resolutionRate}%</p>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#850000] to-[#059669] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, resolutionRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 6: Issue Domains */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-purple-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-purple-50/15 group">
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] font-bold text-purple-800 uppercase tracking-wider">
              Active Domains
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-purple-900 tracking-tight">
              {categoryStats.length || 8}
            </p>
            <p className="text-[10.5px] text-purple-700 mt-1 font-medium truncate">
              {departmentStats.length} Civic Authorities
            </p>
          </div>
        </div>
      </div>

      {/* ================= 3. GRIEVANCE RESOLUTION STATUS PIPELINE ================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#850000]" />
              <span>Grievance Redressal Pipeline Distribution</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Live status breakdown of all {totalGrievances} reported citizen petitions for the active interval
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#850000] bg-red-50 border border-red-200 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            {totalGrievances} Total Petitions Logged
          </span>
        </div>

        {/* Segmented Pipeline Bar */}
        <div className="w-full bg-slate-100 h-3 sm:h-3.5 rounded-full overflow-hidden flex shadow-inner">
          {totalGrievances > 0 ? (
            <>
              <div
                style={{ width: `${(resolvedGrievances / totalGrievances) * 100}%` }}
                className="bg-emerald-600 h-full transition-all duration-500 hover:opacity-90"
                title={`Resolved: ${resolvedGrievances} (${Math.round((resolvedGrievances / totalGrievances) * 100)}%)`}
              />
              <div
                style={{ width: `${(inProgressGrievances / totalGrievances) * 100}%` }}
                className="bg-blue-600 h-full transition-all duration-500 hover:opacity-90"
                title={`In Progress: ${inProgressGrievances} (${Math.round((inProgressGrievances / totalGrievances) * 100)}%)`}
              />
              <div
                style={{ width: `${(pendingGrievances / totalGrievances) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90"
                title={`Pending: ${pendingGrievances} (${Math.round((pendingGrievances / totalGrievances) * 100)}%)`}
              />
              <div
                style={{
                  width: `${Math.max(
                    0,
                    100 -
                      ((resolvedGrievances + inProgressGrievances + pendingGrievances) / totalGrievances) * 100
                  )}%`,
                }}
                className="bg-[#850000] h-full transition-all duration-500 hover:opacity-90"
                title={`New / Unactioned: ${Math.max(0, totalGrievances - resolvedGrievances - inProgressGrievances - pendingGrievances)}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200 h-full rounded-full" />
          )}
        </div>

        {/* Pipeline Segment Legend Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="flex items-center space-x-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Resolved</span>
              <strong className="text-emerald-900 font-bold">{resolvedGrievances}</strong>{' '}
              <span className="text-[10px] text-emerald-700">({totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-blue-50/70 p-2 rounded-xl border border-blue-100">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">In Progress</span>
              <strong className="text-blue-900 font-bold">{inProgressGrievances}</strong>{' '}
              <span className="text-[10px] text-blue-700">({totalGrievances > 0 ? Math.round((inProgressGrievances / totalGrievances) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50/70 p-2 rounded-xl border border-amber-100">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Pending Review</span>
              <strong className="text-amber-900 font-bold">{pendingGrievances}</strong>{' '}
              <span className="text-[10px] text-amber-700">({totalGrievances > 0 ? Math.round((pendingGrievances / totalGrievances) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-red-50/70 p-2 rounded-xl border border-red-100">
            <span className="w-2.5 h-2.5 rounded-full bg-[#850000] flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">New / Registered</span>
              <strong className="text-red-950 font-bold">
                {Math.max(0, totalGrievances - resolvedGrievances - inProgressGrievances - pendingGrievances)}
              </strong>{' '}
              <span className="text-[10px] text-red-800">
                ({totalGrievances > 0 ? Math.round((Math.max(0, totalGrievances - resolvedGrievances - inProgressGrievances - pendingGrievances) / totalGrievances) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. PRIMARY CHARTS: TRENDS & CATEGORY DONUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Monthly Trend Area Chart (8 Cols on Desktop) */}
        <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#850000]" />
                <span>{t('analytics.chartMonthlyTrend', 'Grievance Inflow & Resolution Velocity')}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t('analytics.chartMonthlyTrendSub', 'Monthly reported petitions vs completed ground resolutions')}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="inline-flex items-center space-x-1 font-semibold text-[#850000]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#850000]"></span>
                <span>Reported</span>
              </span>
              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Resolved</span>
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvkReportedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#850000" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#850000" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="tvkResolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="reported"
                  name={t('analytics.reportedComplaints', 'Reported Petitions')}
                  stroke="#850000"
                  strokeWidth={2.5}
                  fill="url(#tvkReportedGradient)"
                  dot={{ r: 4, fill: '#850000', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#850000' }}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name={t('analytics.resolvedPetitions', 'Resolved Petitions')}
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#tvkResolvedGradient)"
                  dot={{ r: 4, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Donut Chart (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                <PieIcon className="w-4 h-4 text-[#850000]" />
                <span>{t('analytics.chartCategoryShare', 'Domain Share')}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t('analytics.chartCategoryShareSub', 'Classification breakdown by issue domain')}
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {categoryStats.length} Domains
            </span>
          </div>

          {/* Donut Chart with Center KPI */}
          <div className="relative h-48 sm:h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Domain</span>
              <strong className="text-xs font-black text-slate-900 max-w-[85px] truncate text-center">
                {categoryStats[0]?.name || 'Grievances'}
              </strong>
              <span className="text-[10px] font-mono font-bold text-[#850000]">
                {categoryStats[0]?.total || 0} Cases
              </span>
            </div>
          </div>

          {/* Category Mini Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-3 border-t border-slate-100 max-h-36 overflow-y-auto no-scrollbar">
            {categoryStats.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-center space-x-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate text-slate-700 font-semibold flex-1" title={c.name}>
                  {c.name}
                </span>
                <span className="font-mono text-[10px] font-bold text-slate-900 flex-shrink-0">
                  {c.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= 5. SECONDARY CHARTS: WARD & DEPARTMENT PERFORMANCE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Ward Grievance Ranking Bar Chart */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#850000]" />
                <span>{t('analytics.chartWardRank', 'Ward Grievance Load & Capacity')}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t('analytics.chartWardRankSub', 'Reported petitions vs resolved count by municipal ward')}
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#850000] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full self-start sm:self-auto">
              Top Active Wards
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {wardStats && wardStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardStats} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="wardName"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="totalIssues"
                    name={t('analytics.totalIssuesBar', 'Total Petitions')}
                    fill="#850000"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="resolved"
                    name={t('analytics.resolvedBar', 'Resolved Cases')}
                    fill="#059669"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Ward Mapping Synchronized</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                  Ward-wise load distribution automatically aggregates as citizen petitions are assigned to municipal ward boundaries.
                </p>
                <div className="mt-3 flex items-center space-x-2 text-[10px] font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>100 Wards Registered across 3 Zones</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Department Redressal Allocation Bar Chart */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#850000]" />
                <span>{t('analytics.chartDeptAllocation', 'Civic Department Redressal Allocation')}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t('analytics.chartDeptAllocationSub', 'Complaints referred to TWAD, TANGEDCO, Highways, and Corporation')}
              </p>
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full self-start sm:self-auto">
              {departmentStats.length} Authorities
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentStats}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  width={130}
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="total"
                  name={t('analytics.totalAssignedBar', 'Total Assigned')}
                  fill="#2563eb"
                  radius={[0, 5, 5, 0]}
                />
                <Bar
                  dataKey="resolved"
                  name={t('analytics.resolvedBar', 'Resolved Cases')}
                  fill="#059669"
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ================= 6. DETAILED CATEGORY PERFORMANCE BREAKDOWN TABLE ================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-[#850000]" />
              <span>Grievance Domain Performance & Efficiency Matrix</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Detailed tracking of petition volume, ground resolutions, and closure efficiency across municipal sectors
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="text-xs font-bold text-[#850000] hover:text-[#A00000] hover:underline flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Domain Report (CSV)</span>
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-3.5">Domain / Category</th>
                <th className="py-3 px-3 text-center">Total Reported</th>
                <th className="py-3 px-3 text-center">Resolved</th>
                <th className="py-3 px-3 text-center">Pending</th>
                <th className="py-3 px-4">Resolution Progress</th>
                <th className="py-3 px-3 text-right">Efficiency Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {categoryStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No grievance records reported in this time period.
                  </td>
                </tr>
              ) : (
                categoryStats.map((cat, idx) => {
                  const rateVal = cat.rate || (cat.total > 0 ? Math.round((cat.resolved / cat.total) * 100) : 0);
                  const isHigh = rateVal >= 75;
                  const isModerate = rateVal >= 40 && rateVal < 75;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                        {cat.total}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {cat.resolved}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {cat.pending}
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="flex items-center space-x-2.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${rateVal}%`,
                                backgroundColor: isHigh ? '#059669' : isModerate ? '#d97706' : '#850000',
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-700 w-9 text-right">
                            {rateVal}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isHigh
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isModerate
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isHigh ? 'High Efficiency' : isModerate ? 'In Redressal' : 'Active Intake'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 7. ADMINISTRATIVE FOOTER BADGE ================= */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#850000]" />
          <span>
            TVK Digital Governance CRM • Coimbatore District Executive Administration
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span>Automated MySQL Aggregation</span>
          <span>•</span>
          <span>Kinathukadavu & Coimbatore Assemblies</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
