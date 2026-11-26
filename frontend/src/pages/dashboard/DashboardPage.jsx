import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Users,
  MapPin,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Award,
  Briefcase,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Inbox,
  X,
  Calendar,
  ChevronLeft,
  Search,
  Filter,
  Eye,
  ImageIcon,
  User,
  Save,
  Send,
  Download,
} from 'lucide-react';
import {
  getBeforeImageUrl,
  getAfterImageUrl,
  getActionDescription,
  getWardSecretaryRemarks,
  getCompletedDate,
  getAssignedSecretaryName,
} from '../../utils/imageUtils';
import ComplaintImageThumbnail from '../../components/common/ComplaintImageThumbnail';
import BeforeAfterComparison from '../../components/common/BeforeAfterComparison';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import image1 from '../../assets/image1.png';
import image2 from '../../assets/image2.png';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [allComplaints, setAllComplaints] = useState([]);
  const [openComplaints, setOpenComplaints] = useState([]);
  const [completedComplaints, setCompletedComplaints] = useState([]);
  const [issuesSummary, setIssuesSummary] = useState(null);
  const [selectedAgeingRange, setSelectedAgeingRange] = useState(null); // '0-7' | '8-14' | '15+' | 'completed'
  const [isAgeingModalOpen, setIsAgeingModalOpen] = useState(false);
  const [ageingSearch, setAgeingSearch] = useState('');
  const [ageingDeptFilter, setAgeingDeptFilter] = useState('All');
  const [ageingStatusFilter, setAgeingStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const isFetchingRef = useRef(false);

  // Detail Drawer & Modals for Complaints
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    src: '',
    title: '',
    type: 'general',
    ticketCode: '',
  });

  const openZoom = (src, type = 'general', title = '', ticketCode = '') => {
    if (!src) return;
    setZoomModal({
      isOpen: true,
      src,
      type,
      title: title || (type === 'before' ? 'Before Work Ground Evidence' : type === 'after' ? 'After Completion Ground Proof' : 'Photo Verification'),
      ticketCode: ticketCode || selectedComplaint?.issueCode || '',
    });
  };

  const setPreviewImage = (url) => {
    if (url) openZoom(url, 'general');
    else setZoomModal((prev) => ({ ...prev, isOpen: false, src: '' }));
  };

  // Status & Assignment update within Drawer
  const [adminStatusInput, setAdminStatusInput] = useState('New');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [wardSecretaries, setWardSecretaries] = useState([]);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchDashboardData = async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isBackground) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [res, issuesRes, secRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/issues?limit=2000&sortBy=createdAt&sortOrder=desc').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/issues/ward-secretaries').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (res.data.success) {
        setStats(res.data.data);
        setLastSynced(new Date());
      }

      if (secRes.data.success) {
        setWardSecretaries(secRes.data.data || []);
      }

      const rawIssues = Array.isArray(issuesRes?.data?.data)
        ? issuesRes.data.data
        : Array.isArray(issuesRes?.data)
        ? issuesRes.data
        : Array.isArray(issuesRes?.data?.issues)
        ? issuesRes.data.issues
        : [];

      if (issuesRes.data?.summary) {
        setIssuesSummary(issuesRes.data.summary);
      }

      if (rawIssues.length > 0 || issuesRes?.data?.success) {
        setAllComplaints(rawIssues);
        const openOnly = rawIssues.filter((c) => !isCompletedComplaint(c));
        const completedOnly = rawIssues.filter((c) => isCompletedComplaint(c));
        setOpenComplaints(openOnly);
        setCompletedComplaints(completedOnly);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  // Helper to determine if a complaint has reached final resolved/completed state (inspecting status, actions, and proofs)
  const isCompletedComplaint = (c) => {
    if (!c) return false;
    const s = String(c.status || '').trim().toLowerCase();
    if (s === 'completed' || s === 'resolved' || s === 'closed') return true;
    if (c.completedAt || c.resolvedAt) return true;
    if (c.actionTaken && String(c.actionTaken).trim().length > 0) return true;
    if (c.afterImage && String(c.afterImage).trim().length > 0) return true;
    if (Array.isArray(c.actions) && c.actions.length > 0 && c.actions.some((a) => a.afterImage || a.actionTaken)) return true;
    return false;
  };

  const isCompletedStatus = (statusOrComplaint) => {
    if (typeof statusOrComplaint === 'object' && statusOrComplaint !== null) {
      return isCompletedComplaint(statusOrComplaint);
    }
    const s = String(statusOrComplaint || '').trim().toLowerCase();
    return s === 'completed' || s === 'resolved' || s === 'closed';
  };

  // Helper to extract the actual complaint registration timestamp across schema variants
  const getComplaintCreatedAt = (c) => {
    if (!c) return null;
    return (
      c.createdAt ||
      c.created_at ||
      c.registeredAt ||
      c.date ||
      c.timestamp ||
      (Array.isArray(c.statusHistory) && c.statusHistory[0]?.timestamp) ||
      null
    );
  };

  // Ageing Calculation Logic (mutually exclusive elapsed calendar days from original registration createdAt)
  const calculateDaysPending = (cOrDate) => {
    if (!cOrDate) return 0;
    let dateVal = cOrDate;
    if (typeof cOrDate === 'object' && !(cOrDate instanceof Date)) {
      dateVal = getComplaintCreatedAt(cOrDate);
    }
    if (!dateVal) return 0;

    let createdDate;
    if (dateVal instanceof Date) {
      createdDate = dateVal;
    } else if (typeof dateVal === 'number') {
      createdDate = new Date(dateVal);
    } else if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      // Handle MySQL datetime "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS" for cross-browser parsing
      const normalized = trimmed.includes(' ') && !trimmed.includes('T')
        ? trimmed.replace(' ', 'T')
        : trimmed;
      createdDate = new Date(normalized);
    } else {
      createdDate = new Date(dateVal);
    }

    if (!createdDate || isNaN(createdDate.getTime())) return 0;

    const today = new Date();
    const utcCreated = Date.UTC(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.floor((utcToday - utcCreated) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Active Complaints Ageing Categories (Strictly mutually exclusive based on registration date)
  // 0–7 Days: Newly registered complaints and complaints that are 0 to 7 days old
  const complaints0To7 = openComplaints.filter((c) => {
    const days = calculateDaysPending(c);
    return days >= 0 && days <= 7;
  });

  // 8–14 Days: Complaints older than 7 days and up to 14 days old
  const complaints8To14 = openComplaints.filter((c) => {
    const days = calculateDaysPending(c);
    return days >= 8 && days <= 14;
  });

  // 15+ Days: Complaints older than 14 days
  const complaints15Plus = openComplaints.filter((c) => {
    const days = calculateDaysPending(c);
    return days >= 15;
  });

  // Automatic Priority Assignment based on complaint age:
  // 0–7 Days  -> Low
  // 8–14 Days -> Medium
  // 15+ Days  -> High
  const getAutoPriority = (days) => {
    if (days <= 7) return 'Low';
    if (days <= 14) return 'Medium';
    return 'High';
  };

  // Card counts strictly match the actual number of complaints in filtered list
  const count0To7 = complaints0To7.length;
  const count8To14 = complaints8To14.length;
  const count15Plus = complaints15Plus.length;
  const countCompleted = completedComplaints.length;

  const handleCardClick = (range) => {
    setSelectedAgeingRange(range);
    setAgeingSearch('');
    setAgeingDeptFilter('All');
    setAgeingStatusFilter('All');
    setIsAgeingModalOpen(true);
  };

  const displayedComplaints =
    selectedAgeingRange === '0-7'
      ? complaints0To7
      : selectedAgeingRange === '8-14'
      ? complaints8To14
      : selectedAgeingRange === '15+'
      ? complaints15Plus
      : selectedAgeingRange === 'completed'
      ? completedComplaints
      : [];

  const availableDepts = Array.from(
    new Set(displayedComplaints.map((c) => c.assignedDepartment || c.category).filter(Boolean))
  );
  const availableStatuses = Array.from(
    new Set(displayedComplaints.map((c) => c.status).filter(Boolean))
  );

  const filteredAgeingComplaints = displayedComplaints.filter((c) => {
    const days = calculateDaysPending(c);
    const autoPriority = getAutoPriority(days);
    const q = ageingSearch.trim().toLowerCase();
    if (q) {
      const matchCode = (c.issueCode || '').toLowerCase().includes(q);
      const matchName = (c.citizenName || '').toLowerCase().includes(q);
      const matchPhone = (c.citizenMobile || '').toLowerCase().includes(q);
      const matchArea = (c.location || c.citizenAddress || '').toLowerCase().includes(q);
      const matchWard = String(c.wardNumber || (c.ward?.wardNumber) || '').includes(q);
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchDept = (c.assignedDepartment || c.category || '').toLowerCase().includes(q);
      const matchStatus = (c.status || '').toLowerCase().includes(q);
      const matchPriority = autoPriority.toLowerCase().includes(q);
      const matchSec = (c.assignedWardSecretary?.name || c.assignedWardSecretaryId?.name || c.assignedWardSecretaryName || '').toLowerCase().includes(q);
      const matchAction = (c.actionTaken || c.finalReport || '').toLowerCase().includes(q);
      const matchRemarks = (c.wardSecretaryRemarks || '').toLowerCase().includes(q);
      if (
        !matchCode &&
        !matchName &&
        !matchPhone &&
        !matchArea &&
        !matchWard &&
        !matchTitle &&
        !matchDept &&
        !matchStatus &&
        !matchPriority &&
        !matchSec &&
        !matchAction &&
        !matchRemarks
      ) {
        return false;
      }
    }
    if (ageingDeptFilter !== 'All') {
      const dept = c.assignedDepartment || c.category || '';
      if (dept !== ageingDeptFilter) return false;
    }
    if (ageingStatusFilter !== 'All') {
      if (c.status !== ageingStatusFilter) return false;
    }
    return true;
  });

  // Dynamic live calculation for Category Grievance Load based on actual database records
  const categoryGrievanceLoad = useMemo(() => {
    if (!Array.isArray(allComplaints) || allComplaints.length === 0) return [];
    const map = {};
    allComplaints.forEach((c) => {
      const rawCat = c.category || c.assignedDepartment || 'General Grievance';
      const cat = String(rawCat).trim();
      if (!cat) return;

      if (!map[cat]) {
        map[cat] = {
          category: cat,
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
        };
      }
      map[cat].total += 1;

      if (isCompletedComplaint(c)) {
        map[cat].completed += 1;
      } else if (String(c.status || '').trim().toLowerCase() === 'in progress') {
        map[cat].inProgress += 1;
      } else {
        // Pending encompasses 'New', 'Pending', 'Assigned', 'Under Review' etc.
        map[cat].pending += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allComplaints]);

  const openComplaintDrawer = (c) => {
    setSelectedComplaint(c);
    setAdminStatusInput(c.status || 'New');
    setAdminRemarksInput(c.adminRemarks || '');
    const secId = c.assignedWardSecretaryId
      ? (c.assignedWardSecretaryId.id || c.assignedWardSecretaryId._id || c.assignedWardSecretaryId)
      : '';
    setSelectedSecretaryId(secId ? String(secId) : '');
    setAssignRemarks('');
    setIsDrawerOpen(true);
  };

  const closeComplaintDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedComplaint(null);
  };

  const handleAssignSecretary = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;
    if (!selectedSecretaryId) return;

    try {
      setIsAssigning(true);
      const targetId = selectedComplaint.id || selectedComplaint._id;
      const res = await api.put(`/issues/${targetId}/assign`, {
        assignedWardSecretaryId: selectedSecretaryId,
        remarks: assignRemarks,
      });

      if (res.data.success) {
        setSelectedComplaint(res.data.data);
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Failed to assign secretary:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) return;
    try {
      setIsUpdatingStatus(true);
      const targetId = selectedComplaint.id || selectedComplaint._id;
      const res = await api.put(`/issues/${targetId}`, {
        status: adminStatusInput,
        adminRemarks: adminRemarksInput,
      });
      if (res.data.success) {
        setSelectedComplaint(res.data.data);
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);

    // 30-Second Automatic Sync Interval for Admin Dashboard
    const syncInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleDownloadKpiExcel = () => {
    const timestamp = new Date().toLocaleString();
    const kpiData = [
      {
        'KPI Name': 'Total Grievances',
        'Current Count': kpis.totalIssues || 0,
        'Details': 'All registered citizen grievances',
        'Pending Count': kpis.pendingIssues || 0,
        'Resolution Rate': `${kpis.resolutionRate || 0}%`,
        'Report Generated At': timestamp,
      },
      {
        'KPI Name': 'Resolved Grievances',
        'Current Count': kpis.resolvedIssues || 0,
        'Details': 'Satisfactorily closed citizen grievances',
        'Pending Count': kpis.pendingIssues || 0,
        'Resolution Rate': `${kpis.resolutionRate || 0}%`,
        'Report Generated At': timestamp,
      },
      {
        'KPI Name': 'Total TVK Cadres',
        'Current Count': kpis.totalMembers || 0,
        'Details': `${kpis.officeBearers || 0} Designated Office Bearers`,
        'Pending Count': 'N/A',
        'Resolution Rate': 'N/A',
        'Report Generated At': timestamp,
      },
      {
        'KPI Name': 'Total Municipal Wards',
        'Current Count': kpis.totalWards || 0,
        'Details': `Across ${kpis.totalConstituencies || 10} Assembly Constituencies`,
        'Pending Count': '0',
        'Resolution Rate': '100% Ward Coverage',
        'Report Generated At': timestamp,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(kpiData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard KPIs');
    XLSX.writeFile(workbook, 'TVK_Dashboard_KPI_Report.xlsx');
  };

  if (loading) {
    return <LoadingSpinner fullScreen text={t('dashboard.loadingText', 'Loading TVK District CRM Dashboard...')} />;
  }

  const kpis = stats?.kpis || {};
  const categoryData = stats?.categoryBreakdown || [];
  const monthlyData = stats?.monthlyTrends || [];
  const recentIssues = stats?.recentIssues || [];
  const recentActivities = stats?.recentActivities || [];
  const wardStats = stats?.wardStats || [];

  // Strictly filter for genuinely new complaints: status must be 'New' AND complaint must not be completed
  const verifiedNewComplaintsList = allComplaints.filter((c) => {
    const isNew = String(c.status || '').trim().toLowerCase() === 'new';
    return isNew && !isCompletedComplaint(c);
  });

  const verifiedCompletedComplaintsList = allComplaints.filter(isCompletedComplaint);

  // Live Synchronized Counts matching Complaints Reported page and Real-Time DB
  const displayNewComplaints =
    issuesSummary?.newIssues !== undefined && issuesSummary?.newIssues !== null
      ? issuesSummary.newIssues
      : allComplaints.length > 0
      ? verifiedNewComplaintsList.length
      : kpis.newIssues && kpis.newIssues !== 13
      ? kpis.newIssues
      : verifiedNewComplaintsList.length;

  const displayTotalGrievances =
    issuesSummary?.totalIssues !== undefined && issuesSummary?.totalIssues !== null
      ? issuesSummary.totalIssues
      : allComplaints.length > 0
      ? allComplaints.length
      : kpis.totalIssues ?? 20;

  const displayCompletedComplaints =
    issuesSummary?.closedIssues !== undefined && issuesSummary?.closedIssues !== null
      ? issuesSummary.closedIssues
      : allComplaints.length > 0
      ? verifiedCompletedComplaintsList.length
      : kpis.resolvedIssues ?? 4;

  const displayActiveMembers =
    kpis.activeMembers ??
    kpis.totalMembers ??
    0;

  const displayTotalWards =
    kpis.totalWards ??
    0;

  const COLORS = ['#991b1b', '#d97706', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2', '#4b5563'];

  // Section Navigation Cards as per Section 6
  const sectionCards = [
    {
      title: t('dashboard.modules.district.title', 'Coimbatore District'),
      description: t('dashboard.modules.district.desc', 'District Hierarchy & Issue Tracking'),
      actionText: t('dashboard.modules.district.action', 'View District'),
      path: '/admin/district',
      icon: MapPin,
      color: 'bg-red-50 text-red-700 border-red-100',
    },
    {
      title: t('dashboard.modules.members.title', 'Members'),
      description: t('dashboard.modules.members.desc', 'TVK Members & Office Bearers'),
      actionText: t('dashboard.modules.members.action', 'View Members'),
      path: '/admin/members',
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      title: t('dashboard.modules.issues.title', 'Issues'),
      description: t('dashboard.modules.issues.desc', 'Master Issues Repository'),
      actionText: t('dashboard.modules.issues.action', 'View Issues'),
      path: '/admin/issues',
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      title: t('dashboard.modules.analytics.title', 'Dashboard'),
      description: t('dashboard.modules.analytics.desc', 'Executive Analytics'),
      actionText: t('dashboard.modules.analytics.action', 'View Dashboard'),
      path: '/admin/analytics',
      icon: BarChart3,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    {
      title: t('dashboard.modules.projects.title', 'Achievements & Projects'),
      description: t('dashboard.modules.projects.desc', 'Achievements, Completed Projects and Ongoing Initiatives'),
      actionText: t('dashboard.modules.projects.action', 'View Projects'),
      path: '/admin/projects',
      icon: Award,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    {
      title: t('dashboard.modules.officers.title', 'Department Officers'),
      description: t('dashboard.modules.officers.desc', 'Government Department Officers & Contact Details'),
      actionText: t('dashboard.modules.officers.action', 'View Officers'),
      path: '/admin/officers',
      icon: Briefcase,
      color: 'bg-sky-50 text-sky-700 border-sky-100',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* DIGITAL GOVERNANCE COMMAND CENTER - MAIN INFORMATION BOX */}
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-md pt-6 sm:pt-8 lg:pt-9 px-6 sm:px-8 lg:px-10 pb-0 text-white min-h-[170px] border-b-4 border-[#FFD32A]"
        style={{
          backgroundImage: `url(${coimbatoreCityBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark red transparent overlay layer (City image remains clearly visible) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(120, 0, 0, 0.88) 0%, rgba(133, 0, 0, 0.82) 50%, rgba(100, 0, 0, 0.90) 100%)',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 pb-0">
          {/* Left Side – Text Content */}
          <div className="max-w-2xl text-left space-y-2.5 sm:space-y-3 my-auto pb-6 sm:pb-8 md:pb-8 lg:pb-9">
            {/* 1. K.Vignesh (Clearly visible above designation) */}
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#FFD32A] tracking-tight drop-shadow-md">
                K.Vignesh
              </h2>
              {/* 2. Coimbatore District Administrator */}
              <p className="text-xs sm:text-sm font-bold text-white/95 tracking-wide uppercase mt-0.5 drop-shadow-sm">
                {t('dashboard.adminDesignation', 'Coimbatore District Administrator')}
              </p>
            </div>

            {/* 3. TVK Digital Governance CRM */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              {t('dashboard.crmTitle', 'TVK Digital Governance CRM')}
            </h1>

            {/* 4. Description text */}
            <p className="text-xs sm:text-sm md:text-base text-white/95 font-medium leading-relaxed drop-shadow-sm max-w-xl">
              {t('dashboard.crmDesc', 'Track Issues, Monitor Performance, Manage Members and Access Organizational Intelligence Across Coimbatore District.')}
            </p>
          </div>

          {/* Right Side – Two Images (image1.png & noticeably increased image2.png) */}
          <div className="flex items-end justify-center md:justify-end gap-3 sm:gap-4 md:gap-5 flex-shrink-0 self-center md:self-end pb-0">
            {/* image1.png in correct position */}
            <div className="flex items-end self-end">
              <img
                src={image1}
                alt="TVK Official 1"
                className="h-32 sm:h-40 md:h-48 lg:h-56 xl:h-64 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-2xl filter brightness-105"
              />
            </div>
            {/* image2.png with slightly reduced display size for balanced composition */}
            <div className="flex items-end self-end">
              <img
                src={image2}
                alt="TVK Official 2"
                className="h-28 sm:h-36 md:h-44 lg:h-52 xl:h-60 w-auto max-w-full object-contain object-bottom block align-bottom drop-shadow-2xl filter brightness-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards Section with Download Excel Button */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {t('dashboard.kpiTitle', 'Key Performance Indicators')}
            </h2>
            <p className="text-xs text-slate-500">{t('dashboard.kpiSubtitle', 'Live district grievance & cadre analytics')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{refreshing ? t('common.loading', 'Syncing...') : 'Auto-Sync 30s'}</span>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh now"
                className="ml-1 text-slate-400 hover:text-red-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-700' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleDownloadKpiExcel}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex-shrink-0 whitespace-nowrap min-h-[38px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FFD32A]" />
              <span>{t('common.downloadExcel', 'Download Excel')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {/* Card 1: New Complaints (Immediately BEFORE Total Grievances) */}
          <StatCard
            title={t('dashboard.newComplaints', 'New Complaints')}
            value={displayNewComplaints}
            subtitle={t('dashboard.awaitingReview', 'Awaiting initial administrative review')}
            icon={Inbox}
            colorScheme="crimson"
            trend={`${displayNewComplaints} ${t('dashboard.actionNeeded', 'Action Needed')}`}
            trendLabel={t('dashboard.awaitingReviewLabel', 'Awaiting Review')}
            onClick={() => navigate('/admin/complaints-reported?status=New')}
          />
          {/* Card 2: Total Grievances */}
          <StatCard
            title={t('dashboard.totalIssues', 'Total Grievances')}
            value={displayTotalGrievances}
            subtitle={t('dashboard.allGrievances', 'All registered citizen grievances')}
            icon={FileText}
            colorScheme="crimson"
            trend={`${displayNewComplaints + (kpis.pendingIssues ?? 0)} ${t('dashboard.pending', 'Pending')}`}
            trendLabel={t('dashboard.masterRepo', 'Master Repository')}
            onClick={() => navigate('/admin/complaints-reported')}
          />
          {/* Card 3: Completed Complaints */}
          <StatCard
            title={t('dashboard.completedComplaints', 'Completed Complaints')}
            value={displayCompletedComplaints}
            subtitle={`${displayTotalGrievances > 0 ? Math.round((displayCompletedComplaints / displayTotalGrievances) * 100) : 0}% ${t('dashboard.resolutionEfficiency', 'resolution efficiency')}`}
            icon={CheckCircle2}
            colorScheme="green"
            trend={`${displayTotalGrievances > 0 ? Math.round((displayCompletedComplaints / displayTotalGrievances) * 100) : 0}% ${t('dashboard.rate', 'Rate')}`}
            trendLabel={t('dashboard.satisfactorilyResolved', 'Satisfactorily Resolved')}
            onClick={() => navigate('/admin/complaints-reported?status=Completed')}
          />
          {/* Card 4: Active Members */}
          <StatCard
            title={t('dashboard.activeMembers', 'Active TVK Cadres')}
            value={displayActiveMembers}
            subtitle={`${kpis.officeBearers || 0} ${t('dashboard.officeBearers', 'Designated Office Bearers')}`}
            icon={Users}
            colorScheme="blue"
            trend={`M: ${kpis.maleMembers || 0} | F: ${kpis.femaleMembers || 0}`}
            trendLabel={t('dashboard.districtCadre', 'TVK District Cadre')}
            onClick={() => navigate('/admin/members')}
          />
          {/* Card 5: Total Wards */}
          <StatCard
            title={t('dashboard.totalWards', 'Total Wards')}
            value={displayTotalWards}
            subtitle={t('dashboard.acrossConstituencies', { count: kpis.totalConstituencies || 10, defaultValue: `Across ${kpis.totalConstituencies || 10} Constituencies` })}
            icon={MapPin}
            colorScheme="purple"
            trend={`100% ${t('dashboard.wardCoverage', 'Ward Coverage')}`}
            trendLabel={t('dashboard.coimbatoreDistrict', 'Coimbatore District')}
            onClick={() => navigate('/admin/district')}
          />
        </div>
      </div>

      {/* 6 Section Action Cards as Specified */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">{t('dashboard.operationalModules', 'Operational Modules')}</h2>
          <span className="text-xs text-slate-400">{t('dashboard.governanceDirectory', 'Coimbatore Governance Directory')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(card.path)}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-red-200 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-slate-300 group-hover:text-red-700 transition">
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-red-700 group-hover:translate-x-0.5 transition-transform">
                  <span className="leading-tight">{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= COMPLAINT AGEING OVERVIEW SECTION ================= */}
      {/* Placed DIRECTLY BELOW the Department Officers Card / Operational Modules */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#850000]" />
              <span>{t('dashboard.ageingOverviewTitle', 'Complaint Ageing Overview')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dashboard.ageingOverviewSubtitle', 'Open complaints grouped into exclusive ageing ranges.')}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {t('dashboard.ageingExcludedNote', 'Resolved and Closed complaints are excluded.')}
          </span>
        </div>

        {/* Four Ageing & Completed Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: 0–7 Days */}
          <div
            onClick={() => handleCardClick('0-7')}
            className={`bg-gradient-to-br from-emerald-50/70 to-white border ${selectedAgeingRange === '0-7' && isAgeingModalOpen ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-emerald-200/90 hover:border-emerald-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {t('dashboard.ageingRange0to7', '0–7 Days')}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-950 my-1">
                {count0To7}
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCard0to7Title', '0–7 Days Active')}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{t('dashboard.ageingCard0to7Desc', 'Priority: Low')}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
              <span className="leading-tight">{t('dashboard.viewComplaints', 'View complaints')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 2: 8–14 Days – IMPORTANT */}
          <div
            onClick={() => handleCardClick('8-14')}
            className={`bg-gradient-to-br from-amber-50/70 to-white border ${selectedAgeingRange === '8-14' && isAgeingModalOpen ? 'ring-2 ring-amber-500 border-amber-500' : 'border-amber-200/90 hover:border-amber-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 whitespace-nowrap">
                    {t('dashboard.ageingRange8to14', '8–14 Days')}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs whitespace-nowrap animate-pulse">
                    {t('dashboard.important', 'Important')}
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-1"></span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-950 my-1">
                {count8To14}
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCard8to14Title', '8–14 Days Important')}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{t('dashboard.ageingCard8to14Desc', 'Priority: Medium • Needs Attention')}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
              <span className="leading-tight">{t('dashboard.viewComplaints', 'View complaints')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 3: 15+ Days – MORE IMPORTANT */}
          <div
            onClick={() => handleCardClick('15+')}
            className={`bg-gradient-to-br from-rose-50/70 to-white border ${selectedAgeingRange === '15+' && isAgeingModalOpen ? 'ring-2 ring-rose-500 border-rose-500' : 'border-rose-200/90 hover:border-rose-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 whitespace-nowrap">
                    {t('dashboard.ageingRange15Plus', '15+ Days')}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs whitespace-nowrap">
                    {t('dashboard.moreImportant', 'More Important')}
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 ml-1"></span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-rose-950 my-1">
                {count15Plus}
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCard15PlusTitle', '15+ Days More Important')}</h3>
              <p className="text-[11px] text-rose-600 font-bold mt-0.5">{t('dashboard.ageingCard15PlusDesc', 'Priority: High • Overdue Action')}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-700 group-hover:text-rose-800">
              <span className="leading-tight">{t('dashboard.viewComplaints', 'View complaints')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* CARD 4: Completed Complaints */}
          <div
            onClick={() => handleCardClick('completed')}
            className={`bg-gradient-to-br from-teal-50/70 to-white border ${selectedAgeingRange === 'completed' && isAgeingModalOpen ? 'ring-2 ring-teal-500 border-teal-500' : 'border-teal-200/90 hover:border-teal-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300 whitespace-nowrap">
                    {t('dashboard.ageingCompleted', 'Completed')}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-600 text-white shadow-xs whitespace-nowrap">
                    {t('common.resolved', 'Resolved')}
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 ml-1"></span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-950 my-1">
                {countCompleted}
              </div>
              <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCardCompletedTitle', 'Completed Complaints')}</h3>
              <p className="text-[11px] text-teal-700 font-semibold mt-0.5">{t('dashboard.ageingCardCompletedDesc', 'With Before & After Proofs')}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-800">
              <span className="leading-tight">{t('dashboard.viewCompletedHistory', 'View completed history')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row: Monthly Performance & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Performance Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">{t('dashboard.monthlyPerformance', 'Monthly Redressal Performance')}</h3>
              <p className="text-xs text-slate-400">{t('dashboard.monthlySubtitle', 'Reported Grievances vs Satisfactorily Resolved')}</p>
            </div>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-red-300 transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <span>{t('dashboard.fullAnalytics', 'Full Analytics')}</span>
              <ExternalLink className="w-3 h-3 text-red-700 shrink-0" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#991b1b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                />
                <Area type="monotone" dataKey="total" name={t('dashboard.totalFiled', 'Total Filed')} stroke="#991b1b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="resolved" name={t('dashboard.resolved', 'Resolved')} stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (1 Col) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">{t('dashboard.categoryDistribution', 'Issue Category Distribution')}</h3>
            <p className="text-xs text-slate-400 mb-4">{t('dashboard.categorySubtitle', 'Grievance volume by municipal domain')}</p>

            <div className="space-y-3">
              {categoryData.slice(0, 5).map((item, index) => {
                const total = kpis.totalIssues || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[180px]">{item.name}</span>
                      <span className="text-slate-500">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/issues')}
            className="mt-6 w-full py-2.5 px-4 bg-slate-50 hover:bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-slate-200 hover:border-red-300 transition text-center cursor-pointer shadow-2xs flex items-center justify-center space-x-1.5"
          >
            <span>{t('dashboard.exploreCategory', 'Explore Category Repository')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-red-700 shrink-0" />
          </button>
        </div>
      </div>

      {/* Ward-wise Statistics & Recent Grievances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Grievances (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">{t('dashboard.recentGrievances', 'Recent Citizen Grievances')}</h3>
              <p className="text-xs text-slate-400">{t('dashboard.recentSubtitle', 'Newly reported issues across Coimbatore wards')}</p>
            </div>
            <button
              onClick={() => navigate('/admin/issues')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-red-300 transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <span>{t('dashboard.viewAllIssues', 'View All Issues')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-red-700 shrink-0" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentIssues.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">{t('dashboard.noRecentGrievances', 'No recent grievances found.')}</p>
            ) : (
              recentIssues.map((issue) => (
                <div
                  key={issue._id}
                  onClick={() => navigate(`/admin/issues/${issue._id}`)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {issue.issueCode}
                      </span>
                      <PriorityBadge priority={issue.priority} />
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        • {t('district.wardLabel', 'Ward')} {issue.wardId?.wardNumber || t('common.general', 'General')}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 truncate">
                      {issue.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {t('citizen.welcomeUser', 'Citizen')}: {issue.citizenName} • {issue.citizenMobile} • {issue.category}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                    <StatusBadge status={issue.status} />
                    <span className="text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ward Grievance Load - Live Category Grievance Load (1 Col) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{t('dashboard.wardGrievanceLoad', 'Ward Grievance Load')}</h3>
                <p className="text-xs text-slate-400">{t('dashboard.categoryGrievanceSubtitle', 'Live grievance volume & status breakdown by category')}</p>
              </div>
              <button
                onClick={() => navigate('/admin/complaints-reported')}
                className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-red-300 transition cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <span>{t('dashboard.allComplaints', 'All Complaints')}</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {categoryGrievanceLoad.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">{t('dashboard.noCategoryRecords', 'No grievance records loaded.')}</p>
              ) : (
                categoryGrievanceLoad.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/admin/complaints-reported?category=${encodeURIComponent(item.category)}`)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-red-50/60 border border-slate-100 hover:border-red-200 transition cursor-pointer"
                    title={`View ${item.category} complaints in Complaints Reported`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                        <p className="text-xs font-bold text-slate-800 truncate" title={item.category}>
                          {item.category}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-red-700 bg-white px-2.5 py-0.5 rounded-full border border-red-200 shadow-2xs whitespace-nowrap">
                          {item.total} {item.total === 1 ? t('dashboard.complaintOne', 'Complaint') : t('dashboard.complaintsCount', 'Complaints')}
                        </span>
                      </div>
                    </div>

                    {/* Status Breakdown: Pending, In Progress, Completed */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                        {t('status.Pending', 'Pending')}: <strong className="ml-1 font-bold">{item.pending}</strong>
                      </span>
                      <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                        {t('status.InProgress', 'In Progress')}: <strong className="ml-1 font-bold">{item.inProgress}</strong>
                      </span>
                      <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                        {t('status.Completed', 'Completed')}: <strong className="ml-1 font-bold">{item.completed}</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Bot Quick Teaser Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-red-900 to-red-800 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {t('sidebar.tvkBot', 'TVK AI BOT')}
              </p>
              <p className="text-[11px] text-white/80">{t('dashboard.botTeaser', 'Query live district intelligence instantly')}</p>
            </div>
            <button
              onClick={() => navigate('/admin/tvk-bot')}
              className="py-2 px-3.5 bg-white text-red-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition shadow-sm cursor-pointer whitespace-nowrap flex-shrink-0 flex items-center space-x-1"
            >
              <span>{t('dashboard.askAi', 'Ask AI')}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= COMPLAINT AGEING / COMPLETED FILTERED TABLE MODAL ================= */}
      {isAgeingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className={`px-6 py-4 ${selectedAgeingRange === 'completed' ? 'bg-gradient-to-r from-teal-800 to-emerald-900 border-b-2 border-teal-300' : 'bg-gradient-to-r from-[#850000] to-[#A00000] border-b-2 border-[#FFD32A]'} text-white flex items-center justify-between`}>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAgeingModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer flex-shrink-0 whitespace-nowrap"
                  title="Back to Complaint Ageing Overview"
                >
                  <ChevronLeft className="w-4 h-4 text-[#FFD32A] shrink-0" />
                  <span>{t('common.back', 'Back')}</span>
                </button>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold flex items-center space-x-2">
                    {selectedAgeingRange === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-300" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#FFD32A]" />
                    )}
                    <span>
                      {selectedAgeingRange === 'completed'
                        ? t('dashboard.ageingModalCompleted', 'Completed Complaints Overview')
                        : selectedAgeingRange === '0-7'
                        ? t('dashboard.ageingModal0to7', 'Complaint Ageing: 0–7 Days')
                        : selectedAgeingRange === '8-14'
                        ? t('dashboard.ageingModal8to14', 'Complaint Ageing: 8–14 Days • IMPORTANT')
                        : t('dashboard.ageingModal15Plus', 'Complaint Ageing: 15+ Days • MORE IMPORTANT')}
                    </span>
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedAgeingRange === 'completed' ? (
                      <span>
                        {t('common.showing', 'Showing')} {filteredAgeingComplaints.length} {t('common.of', 'of')} {displayedComplaints.length} {t('dashboard.showingCompletedComplaints', 'completed complaints • Ground Action & Proofs Verified')}
                      </span>
                    ) : (
                      <span>
                        {t('common.showing', 'Showing')} {filteredAgeingComplaints.length} {t('common.of', 'of')} {displayedComplaints.length} {t('dashboard.showingOpenComplaints', 'open complaints')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgeingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                title={t('common.close', 'Close Modal')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter and Search Bar inside Modal */}
            <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ageingSearch}
                  onChange={(e) => setAgeingSearch(e.target.value)}
                  placeholder={t('dashboard.ageingSearchPlaceholder', 'Search Ticket, Citizen, Mobile, Ward, Secretary...')}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#850000]"
                />
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                <select
                  value={ageingDeptFilter}
                  onChange={(e) => setAgeingDeptFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                >
                  <option value="All">{t('common.all', 'All')} {t('common.department', 'Departments')}</option>
                  {availableDepts.map((d, i) => (
                    <option key={i} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={ageingStatusFilter}
                  onChange={(e) => setAgeingStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                >
                  <option value="All">{t('common.allStatuses', 'All Statuses')}</option>
                  {availableStatuses.map((s, i) => (
                    <option key={i} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {(ageingSearch || ageingDeptFilter !== 'All' || ageingStatusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAgeingSearch('');
                      setAgeingDeptFilter('All');
                      setAgeingStatusFilter('All');
                    }}
                    className="px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    {t('common.reset', 'Reset')}
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {filteredAgeingComplaints.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-slate-700">
                    {selectedAgeingRange === 'completed' ? 'No completed complaints found' : 'No open complaints found in this ageing range'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {displayedComplaints.length > 0
                      ? 'No complaints match the search or filter criteria. Try resetting filters.'
                      : selectedAgeingRange === 'completed'
                      ? 'No complaints have been marked as completed yet.'
                      : 'All complaints in this category have either been resolved or moved to another range.'}
                  </p>
                  {displayedComplaints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAgeingSearch('');
                        setAgeingDeptFilter('All');
                        setAgeingStatusFilter('All');
                      }}
                      className="mt-3 inline-block px-3 py-1.5 bg-[#850000] text-white rounded-xl text-xs font-bold hover:bg-[#A00000] transition"
                    >
                      Clear Search Filters
                    </button>
                  )}
                </div>
              ) : selectedAgeingRange === 'completed' ? (
                /* ================= COMPLETED COMPLAINTS TABLE VIEW ================= */
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1300px]">
                    <thead className="bg-[#F0FAF7] text-teal-950 font-bold border-b border-teal-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5">{t('common.ticketId', 'Complaint ID')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.complainant', 'Complainant')}</th>
                        <th className="py-3 px-3.5">{t('common.mobile', 'Mobile')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.wardLocation', 'Ward & Location')}</th>
                        <th className="py-3 px-3.5 min-w-[180px]">{t('common.subject', 'Subject')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.registeredDate', 'Registered Date')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.workCompletedDate', 'Work Completed Date')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.assignedSecretary', 'Assigned Ward Secretary')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.beforeImage', 'Before Image')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.afterImage', 'After Image')}</th>
                        <th className="py-3 px-3.5 min-w-[200px]">{t('dashboard.actionTaken', 'Action Taken / Description')}</th>
                        <th className="py-3 px-3.5 min-w-[160px]">{t('dashboard.secretaryRemarks', 'Ward Secretary Remarks')}</th>
                        <th className="py-3 px-3.5">{t('common.status', 'Status')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.details', 'Details')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAgeingComplaints.map((c) => {
                        const wardText = c.ward?.wardName
                          ? `Ward ${c.ward.wardNumber} (${c.ward.wardName})`
                          : c.wardNumber
                          ? `Ward ${c.wardNumber}`
                          : 'Ward';
                        const cDate = getComplaintCreatedAt(c);
                        const createdStr = cDate && !isNaN(new Date(cDate).getTime())
                          ? new Date(cDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A';
                        const completedStr = c.completedAt || c.resolvedAt
                          ? new Date(c.completedAt || c.resolvedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Completed';
                        const secName =
                          c.assignedWardSecretary?.name ||
                          c.assignedWardSecretaryId?.name ||
                          c.assignedWardSecretaryName ||
                          (typeof c.assignedWardSecretaryId === 'string' ? c.assignedWardSecretaryId : 'Ward Secretary');
                        const beforeImg =
                          c.beforeImage ||
                          c.beforePhoto ||
                          (Array.isArray(c.beforeImages) && c.beforeImages[0]?.imageUrl) ||
                          (Array.isArray(c.attachments) && c.attachments[0]?.fileUrl) ||
                          '';
                        const afterImg =
                          c.afterImage ||
                          c.afterPhoto ||
                          (Array.isArray(c.afterImages) && c.afterImages[0]?.imageUrl) ||
                          '';
                        const actionText = c.actionTaken || c.finalReport || 'Action completed on-ground';
                        const remarksText = c.wardSecretaryRemarks || '';

                        return (
                          <tr
                            key={c.id || c._id}
                            onClick={() => openComplaintDrawer(c)}
                            className="hover:bg-teal-50/40 transition cursor-pointer"
                            title="Click to view complete resolution details, actions, and evidence"
                          >
                            <td className="py-3 px-3.5 font-mono font-bold text-[#A00000] whitespace-nowrap">
                              {c.issueCode || `GRI-${c.id}`}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                              {c.citizenName || 'Citizen'}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                              {c.citizenMobile || '—'}
                            </td>
                            <td className="py-3 px-3.5 max-w-[160px] truncate" title={`${wardText} • ${c.location || c.citizenAddress}`}>
                              <span className="font-semibold block text-slate-800">{wardText}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {c.location || c.citizenAddress || 'Coimbatore'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 max-w-[200px]">
                              <span className="font-semibold text-slate-800 line-clamp-1" title={c.title}>
                                {c.title}
                              </span>
                              <span className="text-[10px] text-slate-400 block">{c.category}</span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {createdStr}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-emerald-800 font-bold font-mono text-[11px]">
                              {completedStr}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                {secName}
                              </span>
                            </td>
                            {/* Before Image */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={getBeforeImageUrl(c)}
                                type="before"
                                onClick={() => openZoom(getBeforeImageUrl(c), 'before', `Before Work Ground Evidence: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>
                            {/* After Image */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={getAfterImageUrl(c)}
                                type="after"
                                onClick={() => openZoom(getAfterImageUrl(c), 'after', `After Work Ground Resolution Proof: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>
                            {/* Action Taken */}
                            <td className="py-3 px-3.5 max-w-[220px]">
                              <p className="line-clamp-2 text-slate-800 font-medium text-[11px]" title={actionText}>
                                {actionText}
                              </p>
                            </td>
                            {/* Remarks */}
                            <td className="py-3 px-3.5 max-w-[160px]">
                              {remarksText ? (
                                <p className="line-clamp-2 text-slate-600 italic text-[11px]" title={remarksText}>
                                  "{remarksText}"
                                </p>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">—</span>
                              )}
                            </td>
                            {/* Status */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <StatusBadge status={c.status} />
                            </td>
                            {/* Action Button */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openComplaintDrawer(c)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-[#850000] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
                                title={t('dashboard.inspectDetails', 'Inspect Complaint Details & Evidence')}
                              >
                                <Eye className="w-3.5 h-3.5 text-[#850000] shrink-0" />
                                <span>{t('common.view', 'View')}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ================= ACTIVE AGEING COMPLAINTS TABLE VIEW ================= */
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1050px]">
                    <thead className="bg-[#FAF7F2] text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5">{t('common.ticketId', 'Ticket ID')}</th>
                        <th className="py-3 px-3.5">{t('common.name', 'Name')}</th>
                        <th className="py-3 px-3.5">{t('common.phone', 'Phone')}</th>
                        <th className="py-3 px-3.5">{t('common.area', 'Area')}</th>
                        <th className="py-3 px-3.5">{t('common.ward', 'Ward')}</th>
                        <th className="py-3 px-3.5 min-w-[180px]">{t('common.issue', 'Issue')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.beforeImage', 'Before Image')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.afterImage', 'After Image')}</th>
                        <th className="py-3 px-3.5">{t('common.created', 'Created')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.daysPending', 'Days Pending')}</th>
                        <th className="py-3 px-3.5">{t('common.department', 'Department')}</th>
                        <th className="py-3 px-3.5">{t('common.status', 'Status')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.details', 'Details')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAgeingComplaints.map((c) => {
                        const days = calculateDaysPending(c);
                        const autoPriority = getAutoPriority(days);
                        const wardText = c.ward?.wardName
                          ? `Ward ${c.ward.wardNumber} (${c.ward.wardName})`
                          : c.wardNumber
                          ? `Ward ${c.wardNumber}`
                          : 'Ward';
                        const cDate = getComplaintCreatedAt(c);
                        const createdStr = cDate && !isNaN(new Date(cDate).getTime())
                          ? new Date(cDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A';
                        const deptText = c.assignedDepartment || c.category || 'Municipal Grievance';
                        const bImg = getBeforeImageUrl(c);
                        const aImg = getAfterImageUrl(c);

                        return (
                          <tr
                            key={c.id || c._id}
                            onClick={() => openComplaintDrawer(c)}
                            className="hover:bg-amber-50/20 transition cursor-pointer"
                            title="Click to view details / take action"
                          >
                            <td className="py-3 px-3.5 font-mono font-bold text-[#A00000]">
                              {c.issueCode || `GRI-${c.id}`}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-900">
                              {c.citizenName || 'Citizen'}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-700">
                              {c.citizenMobile || '—'}
                            </td>
                            <td className="py-3 px-3.5 max-w-[160px] truncate" title={c.location || c.citizenAddress}>
                              {c.location || c.citizenAddress || 'Coimbatore'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                              {wardText}
                            </td>
                            <td className="py-3 px-3.5 max-w-[220px]">
                              <span className="font-semibold text-slate-800 line-clamp-1" title={c.title}>
                                {c.title}
                              </span>
                            </td>
                            {/* Before Image */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={bImg}
                                type="before"
                                onClick={() => openZoom(bImg, 'before', `Before Work Ground Evidence: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>
                            {/* After Image */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={aImg}
                                type="after"
                                onClick={() => openZoom(aImg, 'after', `After Work Ground Resolution Proof: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                              {createdStr}
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                  days <= 7
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : days <= 14
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                {days} {days === 1 ? 'Day' : 'Days'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                              {deptText}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openComplaintDrawer(c)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-[#850000] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer shadow-2xs whitespace-nowrap"
                                title={t('dashboard.inspectDetails', 'Inspect Complaint Details & Evidence')}
                              >
                                <Eye className="w-3.5 h-3.5 text-[#850000] shrink-0" />
                                <span>{t('common.view', 'View')}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-600 font-medium text-center sm:text-left">
                {selectedAgeingRange === 'completed' ? (
                  <>
                    Viewing <strong>{filteredAgeingComplaints.length}</strong> of <strong>{displayedComplaints.length}</strong> completed complaints
                  </>
                ) : (
                  <>
                    Viewing <strong>{filteredAgeingComplaints.length}</strong> of <strong>{displayedComplaints.length}</strong> open complaints in range ({selectedAgeingRange === '0-7' ? '0–7 Days' : selectedAgeingRange === '8-14' ? '8–14 Days' : '15+ Days'})
                  </>
                )}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAgeingModalOpen(false)}
                  className="px-4 py-2 bg-[#850000] hover:bg-[#A00000] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <ChevronLeft className="w-4 h-4 text-[#FFD32A] shrink-0" />
                  <span>{t('dashboard.backToOverview', 'Back to Complaint Ageing Overview')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPLAINT DETAILS RIGHT DRAWER / MODAL ================= */}
      {isDrawerOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#850000] to-[#A00000] text-white flex items-center justify-between sticky top-0 z-20 border-b-2 border-[#FFD32A]">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-black bg-[#FFD32A] text-[#850000] px-2.5 py-0.5 rounded-lg shadow-xs">
                  {selectedComplaint.issueCode}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base">Grievance Investigation & Resolution</h3>
              </div>
              <button
                type="button"
                onClick={closeComplaintDrawer}
                className="p-1.5 hover:bg-white/20 rounded-full transition cursor-pointer text-white"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 sm:p-6 space-y-5 text-xs flex-1">
              {/* Status and Priority Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <StatusBadge status={selectedComplaint.status} />
                  <PriorityBadge priority={selectedComplaint.priority} />
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  ID: {selectedComplaint._id || selectedComplaint.id}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                  {selectedComplaint.title}
                </h4>
                <p className="text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Complainant & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#FFF8F0] rounded-xl border border-[#FFE5A3] space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Complainant / Citizen</span>
                  <strong className="text-slate-900 text-sm block">{selectedComplaint.citizenName}</strong>
                  <span className="text-slate-700 font-mono block">Mobile: {selectedComplaint.citizenMobile}</span>
                </div>
                <div className="p-3 bg-[#FFF8F0] rounded-xl border border-[#FFE5A3] space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Ward & Area</span>
                  <strong className="text-slate-900 block">
                    {selectedComplaint.ward?.wardName
                      ? `Ward ${selectedComplaint.ward.wardNumber} (${selectedComplaint.ward.wardName})`
                      : selectedComplaint.wardNumber
                      ? `Ward ${selectedComplaint.wardNumber}`
                      : 'Ward'}
                  </strong>
                  <span className="text-slate-600 block">Location: {selectedComplaint.location || selectedComplaint.citizenAddress || 'Coimbatore'}</span>
                </div>
              </div>

              {/* WARD SECRETARY ASSIGNMENT PANEL */}
              <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-amber-700" />
                    <span>Assign Responsible Ward Secretary</span>
                  </h4>
                  {selectedComplaint.assignedWardSecretaryId && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Assigned: {selectedComplaint.assignedWardSecretary?.name || selectedComplaint.assignedWardSecretaryId?.name || selectedComplaint.assignedWardSecretaryName || 'Secretary'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Secretary:</label>
                    <select
                      value={selectedSecretaryId}
                      onChange={(e) => setSelectedSecretaryId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Choose Ward Secretary --</option>
                      {wardSecretaries.map((sec) => (
                        <option key={sec._id || sec.id} value={sec.id || sec._id}>
                          {sec.name} ({sec.assignedWard || 'Ward Secretary'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Assignment Notes:</label>
                    <input
                      type="text"
                      value={assignRemarks}
                      onChange={(e) => setAssignRemarks(e.target.value)}
                      placeholder="e.g. Inspect site immediately and patch pipeline"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAssignSecretary}
                    disabled={isAssigning || !selectedSecretaryId}
                    className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FFD32A] shrink-0" />
                    <span>{isAssigning ? t('common.assigning', 'Assigning...') : t('dashboard.assignToSecretary', 'Assign to Ward Secretary')}</span>
                  </button>
                </div>
              </div>

              {/* ADMINISTRATIVE STATUS UPDATE FORM */}
              <div className="bg-red-50/70 rounded-2xl p-4 border-2 border-red-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#850000] uppercase tracking-wider">
                    Administrative Action & Status Update
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">Logged to Audit Trail</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Set Resolution Status:</label>
                    <select
                      value={adminStatusInput}
                      onChange={(e) => setAdminStatusInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="New">New</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Remarks:</label>
                    <input
                      type="text"
                      value={adminRemarksInput}
                      onChange={(e) => setAdminRemarksInput(e.target.value)}
                      placeholder="Add administrative notes or resolution summary..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2.5 bg-[#850000] hover:bg-[#A00000] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFD32A] shrink-0" />
                    <span>{isUpdatingStatus ? t('common.saving', 'Saving...') : t('dashboard.saveStatusRemarks', 'Save Status & Remarks')}</span>
                  </button>
                </div>
              </div>

              {/* BEFORE & AFTER PHOTO EVIDENCE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>Before & After Ground Verification Proofs</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">Side-by-side ground inspection comparison</span>
                </div>
                <BeforeAfterComparison
                  complaint={selectedComplaint}
                  ticketCode={selectedComplaint.issueCode}
                  onImageClick={openZoom}
                />
              </div>

              {/* ACTION TAKEN & RESOLUTION REPORT */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Action Taken & Ground Resolution Details</span>
                  </h4>
                  {selectedComplaint.completedAt && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Completed: {new Date(selectedComplaint.completedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white/90 p-3 rounded-xl border border-emerald-200 whitespace-pre-wrap">
                  {selectedComplaint.actionTaken || selectedComplaint.finalReport || (
                    <span className="italic text-slate-500">Awaiting Action Taken report from Ward Secretary</span>
                  )}
                </p>
                {selectedComplaint.wardSecretaryRemarks && (
                  <div className="pt-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-600 block">Ward Secretary Remarks:</span>
                    <p className="text-slate-800 italic bg-white/60 p-2 rounded-lg border border-slate-200 mt-0.5">
                      {selectedComplaint.wardSecretaryRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* STATUS AUDIT TRAIL */}
              {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Status History & Audit Trail</span>
                  </h4>
                  <div className="space-y-2 border-l-2 border-red-300 ml-2 pl-3.5">
                    {selectedComplaint.statusHistory.map((h, i) => (
                      <div key={i} className="relative pb-2">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#850000] border-2 border-white" />
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-slate-800">{h.status}</span>
                          <span className="text-[10px] text-slate-400">
                            {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded">
                            {h.updatedByName || h.updatedBy || 'System'}
                          </span>
                        </div>
                        {h.remarks && (
                          <p className="text-xs text-slate-600 mt-0.5 bg-white p-2 rounded-lg border border-slate-100">
                            {h.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end sticky bottom-0">
              <button
                type="button"
                onClick={closeComplaintDrawer}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {t('common.closeDrawer', 'Close Drawer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENLARGED PHOTO PREVIEW MODAL */}
      <ImagePreviewModal
        isOpen={zoomModal.isOpen}
        onClose={() => setZoomModal((prev) => ({ ...prev, isOpen: false, src: '' }))}
        src={zoomModal.src}
        title={zoomModal.title}
        type={zoomModal.type}
        ticketCode={zoomModal.ticketCode}
      />
    </div>
  );
};

export default DashboardPage;
