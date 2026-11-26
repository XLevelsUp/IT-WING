import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  Phone,
  User,
  MapPin,
  Calendar,
  FileSpreadsheet,
  FileText,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  Inbox,
  Send,
  Save,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';
import ComplaintImageThumbnail from '../../components/common/ComplaintImageThumbnail';
import BeforeAfterComparison from '../../components/common/BeforeAfterComparison';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import {
  getBeforeImageUrl,
  getAfterImageUrl,
  getActionDescription,
  getWardSecretaryRemarks,
  getCompletedDate,
  getAssignedSecretaryName,
} from '../../utils/imageUtils';

export const ComplaintsReportedPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({
    totalComplaints: 0,
    newComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter States initialized from URL params
  const urlStatus = searchParams.get('status') || 'All';
  const urlWard = searchParams.get('ward') || searchParams.get('wardNumber') || searchParams.get('wardId') || 'All';
  const urlCategory = searchParams.get('category') || 'All';
  const urlDept = searchParams.get('department') || searchParams.get('assignedDepartment') || 'All';
  const urlDate = searchParams.get('dateFilter') || 'All';

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(urlStatus);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedDepartment, setSelectedDepartment] = useState(urlDept);
  const [selectedWard, setSelectedWard] = useState(urlWard);
  const [dateFilter, setDateFilter] = useState(urlDate);

  const [wards, setWards] = useState([]);

  // Detail Drawer / Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Zoomable Image Preview Modal State
  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    imageUrl: null,
    title: '',
    ticketId: '',
    type: 'BEFORE',
  });

  const openZoom = (imageUrl, title, ticketId, type = 'BEFORE') => {
    setZoomModal({
      isOpen: true,
      imageUrl,
      title: title || `${type === 'AFTER' ? 'After Resolution' : 'Before Work'} Proof`,
      ticketId: ticketId || '',
      type,
    });
  };

  const closeZoom = () => {
    setZoomModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Admin status update state
  const [adminStatusInput, setAdminStatusInput] = useState('New');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Ward Secretary Assignment state
  const [wardSecretaries, setWardSecretaries] = useState([]);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Quick Ward click handler
  const handleSelectWard = (wardNum) => {
    const val = String(wardNum);
    setSelectedWard((prev) => (prev === val ? 'All' : val));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Clear all active filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatus('All');
    setSelectedCategory('All');
    setSelectedDepartment('All');
    setSelectedWard('All');
    setDateFilter('All');
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedStatus !== 'All' ||
    selectedCategory !== 'All' ||
    selectedDepartment !== 'All' ||
    selectedWard !== 'All' ||
    dateFilter !== 'All';

  // Fetch Ward Options & Ward Secretaries
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [wardsRes, secRes] = await Promise.all([
          api.get('/districts/wards'),
          api.get('/issues/ward-secretaries').catch(() => ({ data: { success: false, data: [] } })),
        ]);
        if (wardsRes.data.success) {
          setWards(wardsRes.data.data);
        }
        if (secRes.data.success) {
          setWardSecretaries(secRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const isFetchingRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Store current filters in ref so the 30s background poller always uses the latest filter criteria
  const filterStateRef = useRef({
    search,
    selectedStatus,
    selectedCategory,
    selectedDepartment,
    selectedWard,
    dateFilter,
    page: pagination.page,
  });

  useEffect(() => {
    filterStateRef.current = {
      search,
      selectedStatus,
      selectedCategory,
      selectedDepartment,
      selectedWard,
      dateFilter,
      page: pagination.page,
    };
  }, [search, selectedStatus, selectedCategory, selectedDepartment, selectedWard, dateFilter, pagination.page]);

  // Fetch Complaints from Real MySQL DB
  const fetchComplaints = async (page = 1, isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isBackground) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }

    try {
      const curFilters = filterStateRef.current;
      const params = { page, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };

      if (curFilters.search.trim()) params.search = curFilters.search.trim();
      if (curFilters.selectedStatus !== 'All') params.status = curFilters.selectedStatus;
      if (curFilters.selectedCategory !== 'All') params.category = curFilters.selectedCategory;
      if (curFilters.selectedDepartment !== 'All') params.assignedDepartment = curFilters.selectedDepartment;
      if (curFilters.selectedWard !== 'All') params.ward = curFilters.selectedWard;
      if (curFilters.dateFilter !== 'All') params.dateFilter = curFilters.dateFilter;

      const res = await api.get('/issues', { params });
      if (res.data.success) {
        setComplaints(res.data.data);
        setPagination({
          page: res.data.meta.page,
          limit: res.data.meta.limit,
          total: res.data.meta.total,
          totalPages: res.data.meta.totalPages,
        });

        // Summary Statistics from Real DB
        const s = res.data.summary || {};
        setSummary({
          totalComplaints: s.totalIssues || res.data.meta.total || 0,
          newComplaints: s.newIssues || 0,
          resolvedComplaints: s.closedIssues || 0,
          inProgressComplaints: s.inProgressIssues || 0,
          pendingComplaints: s.pendingIssues || 0,
        });
        setLastSynced(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
      if (!isBackground) {
        notifyError('Failed to load complaints reported from database');
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchComplaints(1, false);

    // Sync active filters to URL search params
    const nextParams = new URLSearchParams();
    if (selectedStatus !== 'All') nextParams.set('status', selectedStatus);
    if (selectedWard !== 'All') nextParams.set('ward', selectedWard);
    if (selectedCategory !== 'All') nextParams.set('category', selectedCategory);
    if (selectedDepartment !== 'All') nextParams.set('department', selectedDepartment);
    if (dateFilter !== 'All') nextParams.set('dateFilter', dateFilter);
    if (search.trim()) nextParams.set('search', search.trim());
    setSearchParams(nextParams, { replace: true });
  }, [search, selectedStatus, selectedCategory, selectedDepartment, selectedWard, dateFilter]);

  // 30-Second Automatic Complaint Polling
  useEffect(() => {
    const syncInterval = setInterval(() => {
      fetchComplaints(filterStateRef.current.page, true);
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  // Handle Excel Download
  const handleDownloadExcel = async () => {
    try {
      // Fetch all matching records without pagination limit
      const params = { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedDepartment !== 'All') params.assignedDepartment = selectedDepartment;
      if (selectedWard !== 'All') params.ward = selectedWard;
      if (dateFilter !== 'All') params.dateFilter = dateFilter;

      const res = await api.get('/issues', { params });
      const records = res.data?.success && res.data.data ? res.data.data : complaints;

      const excelRows = records.map((c, index) => {
        const regDateObj = c.createdAt ? new Date(c.createdAt) : null;
        const startObj = c.workStartedAt ? new Date(c.workStartedAt) : null;
        const resolvedObj = c.resolvedAt || c.resolutionDetails?.resolvedDate ? new Date(c.resolvedAt || c.resolutionDetails.resolvedDate) : null;

        return {
          'S.No': index + 1,
          'Complaint ID': c.issueCode || '-',
          'Registered Date': regDateObj ? regDateObj.toLocaleDateString() : '-',
          'Registered Time': regDateObj ? regDateObj.toLocaleTimeString() : '-',
          'Citizen Name': c.citizenName || '-',
          'Phone Number': c.citizenMobile || '-',
          'Complaint Details': c.description || '-',
          'Category': c.category || '-',
          'Location': c.location || c.citizenAddress || 'Coimbatore',
          'Ward': c.wardId ? (typeof c.wardId === 'object' ? `Ward ${c.wardId.wardNumber} - ${c.wardId.wardName}` : c.wardId) : '-',
          'Before Photo URL': c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl) || 'No Photo Uploaded',
          'Starting Date': startObj ? startObj.toLocaleDateString() : 'Work Not Started',
          'Starting Time': startObj ? startObj.toLocaleTimeString() : 'Work Not Started',
          'Assigned Officer': c.assignedOfficerId?.officerName || c.assignedOfficer || 'Unassigned',
          'Current Status': c.status || 'Pending',
          'After Photo URL': c.afterPhoto || 'No Photo Uploaded',
          'Final Report': c.finalReport || c.resolutionDetails?.resolutionNotes || (c.status === 'Resolved' ? 'Resolved successfully' : 'Awaiting Final Report'),
          'Resolved Date': resolvedObj ? resolvedObj.toLocaleString() : 'Not Yet Resolved',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Complaints Reported');
      XLSX.writeFile(workbook, 'TVK_Complaints_Reported.xlsx');
      notifySuccess('TVK_Complaints_Reported.xlsx exported successfully!');
    } catch (err) {
      notifyError('Failed to download Complaints Reported Excel');
    }
  };

  const openDrawer = (complaint) => {
    setSelectedComplaint(complaint);
    setAdminStatusInput(complaint.status || 'New');
    setAdminRemarksInput(complaint.adminRemarks || '');
    const currentSecId = complaint.assignedWardSecretaryId
      ? (typeof complaint.assignedWardSecretaryId === 'object'
          ? (complaint.assignedWardSecretaryId.id || complaint.assignedWardSecretaryId._id)
          : complaint.assignedWardSecretaryId)
      : '';
    setSelectedSecretaryId(currentSecId ? String(currentSecId) : '');
    setAssignRemarks('');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedComplaint(null);
  };

  const handleAssignSecretary = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;
    if (!selectedSecretaryId) {
      notifyError('Please select a Ward Secretary to assign');
      return;
    }

    try {
      setIsAssigning(true);
      const targetId = selectedComplaint.id || selectedComplaint._id;
      const res = await api.put(`/issues/${targetId}/assign`, {
        assignedWardSecretaryId: selectedSecretaryId,
        remarks: assignRemarks.trim(),
      });
      if (res.data.success) {
        notifySuccess(res.data.message || 'Complaint forwarded to Ward Secretary successfully!');
        setSelectedComplaint(res.data.data);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to forward complaint to Ward Secretary');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;
    try {
      setIsUpdatingStatus(true);
      const res = await api.put(`/issues/${selectedComplaint._id}`, {
        status: adminStatusInput,
        adminRemarks: adminRemarksInput,
      });
      if (res.data.success) {
        notifySuccess(`Complaint ${selectedComplaint.issueCode} updated to ${adminStatusInput}!`);
        setSelectedComplaint(res.data.data);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update complaint status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header Banner */}
      <AdminPageHeader
        badge={t('complaintsReported.headerBadge', 'Citizen Grievance Redressal')}
        badgeIcon={AlertCircle}
        title={t('complaintsReported.title', 'Complaints Reported')}
        tamilTitle="????? ??????????? ?????????"
        subtitle={t('complaintsReported.subtitle', 'View, Monitor and Track All Registered Citizen Complaints across Coimbatore District.')}
        actions={
          <div className="flex items-center space-x-2.5">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-black/25 border border-white/20 rounded-xl text-[11px] font-semibold text-white/90">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-[#FFD32A]'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Auto-Sync 30s'}</span>
            </div>
            <button
              onClick={() => fetchComplaints(pagination.page, true)}
              className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 text-[#FFD32A] border border-[#FFD32A]/30 transition cursor-pointer shadow-xs"
              title={t('complaintsReported.refreshTooltip', 'Refresh Complaints')}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownloadExcel}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/95 hover:bg-white text-[#850000] text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t('complaintsReported.downloadExcel', 'Download Excel')}</span>
            </button>
          </div>
        }
      />

      {/* 5 Summary Counters using Real Database Counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'New' ? 'All' : 'New')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
            selectedStatus === 'New'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-red-100 text-[#850000] flex items-center justify-center font-bold flex-shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">{t('complaintsReported.cardNew', 'New Complaints')}</p>
            <h3 className="text-2xl font-extrabold text-[#850000]">{summary.newComplaints}</h3>
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('All')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
            selectedStatus === 'All'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('complaintsReported.cardTotal', 'Total Complaints')}</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{summary.totalComplaints}</h3>
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Pending' ? 'All' : 'Pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
            selectedStatus === 'Pending'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('complaintsReported.cardPending', 'Pending')}</p>
            <h3 className="text-2xl font-extrabold text-amber-700">{summary.pendingComplaints}</h3>
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'In Progress' ? 'All' : 'In Progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
            selectedStatus === 'In Progress'
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('complaintsReported.cardInProgress', 'In Progress')}</p>
            <h3 className="text-2xl font-extrabold text-blue-700">{summary.inProgressComplaints}</h3>
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Resolved' ? 'All' : 'Resolved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 col-span-2 md:col-span-1 ${
            selectedStatus === 'Resolved'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('complaintsReported.cardResolved', 'Resolved')}</p>
            <h3 className="text-2xl font-extrabold text-emerald-700">{summary.resolvedComplaints}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        {/* Header with Title, Active Filter Count, and Clear Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#850000] flex items-center justify-center font-bold">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t('complaintsReported.filterTitle', 'Complaint Filters & Search')}
              </h3>
              <p className="text-[11px] text-slate-400">
                Filter citizen complaints across Coimbatore municipal wards, departments, categories, and statuses
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#850000] text-xs font-bold transition border border-red-200 cursor-pointer"
                title="Reset all filters to default"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('complaintsReported.clearFilters', 'Clear All Filters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 6-Filter Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="complaintSearchInput"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('complaintsReported.searchPlaceholder', 'Search ID, Citizen, Mobile...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-700"
            />
          </div>

          {/* 2. Filter Ward */}
          <div>
            <select
              id="wardFilter"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700 font-medium"
            >
              <option value="All">{t('complaintsReported.allWards', 'All Wards')}</option>
              {wards.map((w) => (
                <option key={w.id || w._id} value={String(w.wardNumber)}>
                  {t('district.wardLabel', 'Ward')} {w.wardNumber} - {w.wardName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Status */}
          <div>
            <select
              id="statusFilter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
            >
              <option value="All">{t('complaintsReported.allStatus', 'All Statuses')}</option>
              <option value="New">{t('status.New', 'New')}</option>
              <option value="Pending">{t('status.Pending', 'Pending')}</option>
              <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
              <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
              <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
              <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
              <option value="Closed">{t('status.Closed', 'Closed')}</option>
            </select>
          </div>

          {/* 4. Filter Department */}
          <div>
            <select
              id="departmentFilter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
            >
              <option value="All">{t('complaintsReported.allDepartments', 'All Departments')}</option>
              <option value="Corporation / Municipal Admin">Corporation / Municipal Admin</option>
              <option value="TWAD Board (Water Supply)">TWAD Board (Water Supply)</option>
              <option value="Public Health & Sanitation">Public Health & Sanitation</option>
              <option value="Highways & Road Infrastructure">Highways & Road Infrastructure</option>
              <option value="TANGEDCO (Electricity)">TANGEDCO (Electricity)</option>
              <option value="Police & Traffic Management">Police & Traffic Management</option>
            </select>
          </div>

          {/* 5. Filter Category */}
          <div>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
            >
              <option value="All">{t('complaintsReported.allCategories', 'All Categories')}</option>
              <option value="Drinking Water">Drinking Water</option>
              <option value="Street Lighting">Street Lighting</option>
              <option value="Road Infrastructure">Road Infrastructure</option>
              <option value="Sanitation / Drainage">Sanitation / Drainage</option>
              <option value="Public Transport">Public Transport</option>
              <option value="Electricity / TANGEDCO">Electricity</option>
              <option value="Public Health">Public Health</option>
              <option value="Drainage & Sewage">Drainage & Sewage</option>
            </select>
          </div>

          {/* 6. Filter Date */}
          <div>
            <select
              id="dateFilter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
            >
              <option value="All">{t('complaintsReported.allDates', 'All Dates')}</option>
              <option value="today">{t('complaintsReported.today', 'Today')}</option>
              <option value="thisWeek">{t('complaintsReported.thisWeek', 'This Week')}</option>
              <option value="thisMonth">{t('complaintsReported.thisMonth', 'This Month')}</option>
            </select>
          </div>
        </div>

        {/* Quick Ward Filter Bar */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#850000]" />
            <span>Ward:</span>
          </span>
          <button
            type="button"
            onClick={() => handleSelectWard('All')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              selectedWard === 'All'
                ? 'bg-[#850000] text-white border-[#850000] shadow-xs'
                : 'bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200'
            }`}
          >
            All Wards
          </button>
          {wards.map((w) => {
            const isSelected = selectedWard === String(w.wardNumber);
            return (
              <button
                key={w.id || w._id}
                type="button"
                onClick={() => handleSelectWard(w.wardNumber)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#850000] text-white border-[#850000] shadow-xs'
                    : 'bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200'
                }`}
                title={`Filter Ward ${w.wardNumber} - ${w.wardName}`}
              >
                Ward {w.wardNumber}
              </button>
            );
          })}
        </div>

        {/* Active Filter Pills Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {selectedWard !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-50 text-red-800 text-[11px] font-semibold border border-red-200">
                <span>Ward: {selectedWard}</span>
                <button
                  type="button"
                  onClick={() => setSelectedWard('All')}
                  className="hover:text-red-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStatus !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                <span>Status: {selectedStatus}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('All')}
                  className="hover:text-slate-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDepartment !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
                <span>Dept: {selectedDepartment}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('All')}
                  className="hover:text-blue-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                <span>Category: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="hover:text-amber-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFilter !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                <span>Date: {dateFilter}</span>
                <button
                  type="button"
                  onClick={() => setDateFilter('All')}
                  className="hover:text-emerald-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.trim() !== '' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-200">
                <span>Search: "{search.trim()}"</span>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="hover:text-purple-950 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Responsive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5 text-center">S.No.</th>
                <th className="py-3 px-3.5">{t('complaintsReported.colComplaintId', 'Complaint ID')}</th>
                <th className="py-3 px-3.5">{t('complaintsReported.colDate', 'Date & Time')}</th>
                <th className="py-3 px-3.5">{t('issueDetail.petitionerName', 'Complainant Name')}</th>
                <th className="py-3 px-3.5">{t('issueDetail.contactMobile', 'Mobile Number')}</th>
                <th className="py-3 px-3.5">{t('issues.colCategory', 'Category')}</th>
                <th className="py-3 px-3.5">{t('issues.issueTitleRequired', 'Subject')}</th>
                <th className="py-3 px-3.5 min-w-[200px]">{t('complaintsReported.descriptionTitle', 'Description')}</th>
                <th className="py-3 px-3.5">{t('issueDetail.wardZone', 'Ward & Paguthi')}</th>
                <th className="py-3 px-3.5">{t('complaintsReported.colAssignedSecretary', 'Assigned Ward Secretary')}</th>
                <th className="py-3 px-3.5 text-center">Before Images</th>
                <th className="py-3 px-3.5 text-center">After Images</th>
                <th className="py-3 px-3.5">{t('complaintsReported.colStatus', 'Status')}</th>
                <th className="py-3 px-3.5 min-w-[150px]">{t('complaintsReported.adminRemarksLabel', 'Admin Remarks')}</th>
                <th className="py-3 px-3.5 text-center">{t('complaintsReported.colActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <LoadingSpinner text={t('complaintsReported.loadingText', 'Loading Complaints Reported...')} />
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#850000] flex items-center justify-center mb-1">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedWard !== 'All'
                          ? `No complaints found for Ward ${selectedWard}`
                          : t('common.noRecords', 'No citizen complaints found matching the criteria.')}
                      </p>
                      <p className="text-xs text-slate-400 text-center">
                        {selectedWard !== 'All'
                          ? `There are currently no citizen grievance records registered under Ward ${selectedWard}.`
                          : 'Try adjusting your search keywords, status, category, or ward filters.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#850000] text-xs font-bold transition border border-red-200 cursor-pointer shadow-2xs"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                complaints.map((c, index) => {
                  const sNo = (pagination.page - 1) * pagination.limit + index + 1;
                  const regDate = c.createdAt ? new Date(c.createdAt) : null;
                  const beforeImg = c.beforeImage || c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl);
                  const afterImg = c.afterImage || c.afterPhoto;
                  const assignedSec = c.assignedWardSecretaryId;

                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => openDrawer(c)}
                    >
                      {/* 1. S.No. */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-500 font-semibold">
                        {sNo}
                      </td>

                      {/* 2. Complaint ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          {c.issueCode || 'GRI-2026-X'}
                        </span>
                      </td>

                      {/* 3. Date & Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {regDate ? (
                          <div>
                            <span className="block font-medium">{regDate.toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">{regDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* 4. Complainant Name */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800">
                        {c.citizenName || '-'}
                      </td>

                      {/* 5. Mobile Number */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        <a
                          href={`tel:${c.citizenMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-red-700 hover:underline"
                        >
                          {c.citizenMobile || '-'}
                        </a>
                      </td>

                      {/* 6. Category */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {c.category}
                        </span>
                      </td>

                      {/* 7. Subject */}
                      <td className="py-3 px-3.5 text-slate-800 font-semibold max-w-[160px] truncate" title={c.title}>
                        {c.title || '-'}
                      </td>

                      {/* 8. Description */}
                      <td className="py-3 px-3.5 text-slate-600">
                        <p className="line-clamp-2 max-w-xs text-xs" title={c.description}>
                          {c.description || '-'}
                        </p>
                      </td>

                      {/* 9. Ward & Paguthi */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {(() => {
                          const wardNum = c.wardId && typeof c.wardId === 'object'
                            ? c.wardId.wardNumber
                            : (c.wardNumber || (typeof c.wardId === 'number' ? c.wardId : null));
                          const wardLabel = wardNum ? `Ward ${wardNum}` : (typeof c.wardId === 'string' ? c.wardId : '-');
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (wardNum) handleSelectWard(wardNum);
                              }}
                              className="font-semibold block text-slate-800 hover:text-red-700 hover:underline cursor-pointer text-left transition"
                              title={wardNum ? `Click to filter complaints strictly for Ward ${wardNum}` : undefined}
                            >
                              {wardLabel}
                            </button>
                          );
                        })()}
                        <span className="text-[10px] text-slate-400 block">
                          {c.paguthi || (c.constituencyId?.name || '')}
                        </span>
                      </td>

                      {/* 10. Assigned Ward Secretary */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {assignedSec ? (
                          <span className="font-bold text-slate-800 block text-xs">
                            {assignedSec.name || assignedSec.username}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 11. Before Images (Citizen Evidence) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <ComplaintImageThumbnail
                            imageUrl={getBeforeImageUrl(c)}
                            type="BEFORE"
                            ticketId={c.issueCode || c.complaintId}
                            title={`Before Resolution - ${c.issueCode || c.complaintId}`}
                            onZoomClick={openZoom}
                          />
                        </div>
                      </td>

                      {/* 12. After Images (Ward Secretary Proof) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <ComplaintImageThumbnail
                            imageUrl={getAfterImageUrl(c)}
                            type="AFTER"
                            ticketId={c.issueCode || c.complaintId}
                            title={`After Resolution - ${c.issueCode || c.complaintId}`}
                            onZoomClick={openZoom}
                          />
                        </div>
                      </td>

                      {/* 12. Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* 12. Admin Remarks */}
                      <td className="py-3 px-3.5 text-slate-700 max-w-[150px]">
                        {c.adminRemarks ? (
                          <span className="text-xs text-slate-800 font-medium truncate block" title={c.adminRemarks}>
                            {c.adminRemarks}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No remarks</span>
                        )}
                      </td>

                      {/* 13. Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openDrawer(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-xs transition"
                        >
                          {t('complaintsReported.viewManageBtn', 'View Details')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('dataTable.showingEntries', {
              start: complaints.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0,
              end: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total,
              defaultValue: `Showing ${complaints.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} complaints`
            })}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchComplaints(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              {t('dataTable.pageOf', {
                current: pagination.page,
                total: pagination.totalPages || 1,
                defaultValue: `Page ${pagination.page} of ${pagination.totalPages || 1}`
              })}
            </span>
            <button
              onClick={() => fetchComplaints(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* COMPLAINT DETAILS RIGHT DRAWER / MODAL */}
      {isDrawerOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-sm font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-md">
                  {selectedComplaint.issueCode}
                </span>
                <StatusBadge status={selectedComplaint.status} />
                <PriorityBadge priority={selectedComplaint.priority} />
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-6 flex-1">
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedComplaint.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Category: <strong className="text-slate-700">{selectedComplaint.category}</strong>
                </p>
              </div>

              {/* Citizen Details Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('complaintsReported.citizenDetailsTitle', 'Citizen Information')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">{t('members.fullNameEn', 'Name')}:</span> <strong className="text-slate-800">{selectedComplaint.citizenName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('members.colMobile', 'Phone')}:</span> <strong className="text-slate-800 font-mono">{selectedComplaint.citizenMobile}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">{t('issueDetail.locationAddress', 'Location')}:</span> <strong className="text-slate-800">{selectedComplaint.location || selectedComplaint.citizenAddress || 'Coimbatore'}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('complaintsReported.descriptionTitle', 'Full Complaint Description')}
                </h4>
                <p className="text-xs text-slate-700 bg-amber-50/50 p-4 rounded-xl border border-amber-100 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* ASSIGN TO WARD SECRETARY PANEL (Admin Capability) */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl p-4 sm:p-5 border-2 border-amber-300/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-amber-800" />
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      {t('complaintsReported.assignSecretaryTitle', 'Assign to Ward Secretary')}
                    </h4>
                  </div>
                  {selectedComplaint.assignedWardSecretaryId ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Currently Assigned: {selectedComplaint.assignedWardSecretaryId.name || selectedComplaint.assignedWardSecretaryId.username}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      {t('officers.unassigned', 'Awaiting Assignment')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('complaintsReported.selectSecretary', 'Select Ward Secretary')}: *
                    </label>
                    <select
                      value={selectedSecretaryId}
                      onChange={(e) => setSelectedSecretaryId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-700"
                    >
                      <option value="">-- {t('complaintsReported.selectSecretary', 'Choose Ward Secretary')} --</option>
                      {wardSecretaries.map((sec) => (
                        <option key={sec.id || sec._id} value={String(sec.id || sec._id)}>
                          {sec.name} ({sec.assignedWard || t('members.officeBearerBadge', 'Ward Secretary')}, {sec.constituency || 'Coimbatore'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('complaintsReported.assignRemarksLabel', 'Assignment Notes / Instructions')}:
                    </label>
                    <input
                      type="text"
                      value={assignRemarks}
                      onChange={(e) => setAssignRemarks(e.target.value)}
                      placeholder={t('complaintsReported.assignRemarksPlaceholder', 'e.g. Inspect site immediately and patch pipeline')}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAssignSecretary}
                    disabled={isAssigning || !selectedSecretaryId}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FFD32A]" />
                    <span>{isAssigning ? t('complaintsReported.assigningBtn', 'Assigning...') : t('complaintsReported.assignBtn', 'Assign to Ward Secretary')}</span>
                  </button>
                </div>
              </div>

              {/* ADMINISTRATIVE STATUS UPDATE & REMARKS PANEL */}
              <div className="bg-gradient-to-br from-red-50/70 to-amber-50/50 rounded-2xl p-4 sm:p-5 border-2 border-red-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-[#850000]" />
                    <h4 className="text-xs font-bold text-[#850000] uppercase tracking-wider">
                      {t('complaintsReported.updateStatusTitle', 'Admin Status & Remarks Management')}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    MongoDB Atlas Sync
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('issueDetail.grievanceStatus', 'Update Complaint Status')}:
                    </label>
                    <select
                      value={adminStatusInput}
                      onChange={(e) => setAdminStatusInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-700"
                    >
                      <option value="New">{t('status.New', 'New')}</option>
                      <option value="Assigned">{t('status.Assigned', 'Assigned')}</option>
                      <option value="Pending">{t('status.Pending', 'Pending')}</option>
                      <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
                      <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
                      <option value="Completed">{t('status.Completed', 'Completed')}</option>
                      <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
                      <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
                      <option value="Closed">{t('status.Closed', 'Closed')}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('complaintsReported.adminRemarksLabel', 'Admin Remarks / Field Instructions')}:
                    </label>
                    <textarea
                      rows={3}
                      value={adminRemarksInput}
                      onChange={(e) => setAdminRemarksInput(e.target.value)}
                      placeholder={t('complaintsReported.adminRemarksPlaceholder', 'Enter official administrative remarks, follow-up instructions, or action summary...')}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Last update timestamp will be saved to status history.
                  </span>
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#850000] hover:bg-[#A00000] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFD32A]" />
                    <span>{isUpdatingStatus ? t('complaintsReported.updatingStatusBtn', 'Saving Update...') : t('complaintsReported.updateStatusBtn', 'Save Status & Remarks')}</span>
                  </button>
                </div>
              </div>

              {/* Status History & Audit Timeline */}
              {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
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
                            {h.updatedByName || h.updatedBy || 'Administrator'}
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

              {/* Timestamps & Officer Assignment Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Complaint Registered</span>
                  <span className="font-semibold text-slate-800">
                    {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Work Starting Time</span>
                  <span className="font-semibold text-blue-700">
                    {selectedComplaint.workStartedAt ? new Date(selectedComplaint.workStartedAt).toLocaleString() : 'Work Not Started'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Officer</span>
                  <span className="font-semibold text-slate-800">
                    {selectedComplaint.assignedOfficerId?.officerName || selectedComplaint.assignedOfficer || 'Unassigned'}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Department: {selectedComplaint.assignedDepartment || selectedComplaint.assignedOfficerId?.department || 'Municipal Administration'}
                  </span>
                </div>
              </div>

              {/* BEFORE & AFTER IMAGE COMPARISON VIEW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>{t('complaintsReported.photoEvidenceTitle', 'Before / After Ground Verification')}</span>
                  </h4>
                  {selectedComplaint.status === 'Completed' || selectedComplaint.status === 'Resolved' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {t('issueDetail.verifiedTitle', 'Work Completed & Verified')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      {t('status.In Progress', 'Resolution In Progress')}
                    </span>
                  )}
                </div>

                {/* Reusable Side-by-Side Comparison */}
                <BeforeAfterComparison
                  complaint={selectedComplaint}
                  onImageClick={openZoom}
                  height="h-48"
                />
              </div>

              {/* ACTION TAKEN & RESOLUTION REPORT */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {t('issueDetail.verifiedTitle', 'Action Taken & Ground Resolution')}
                  </h4>
                  {selectedComplaint.completedAt && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Completed: {new Date(selectedComplaint.completedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-200 whitespace-pre-wrap">
                  {selectedComplaint.actionTaken || selectedComplaint.finalReport || (
                    <span className="italic text-slate-500">Awaiting Action Taken report from Ward Secretary</span>
                  )}
                </p>
                {selectedComplaint.wardSecretaryRemarks && (
                  <div className="pt-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-600 block">Ward Secretary Remarks:</span>
                    <p className="text-slate-800 italic bg-white/60 p-2 rounded-lg border border-slate-200 mt-0.5">
                      "{selectedComplaint.wardSecretaryRemarks}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">TVK Coimbatore Grievance Portal</span>
              <button
                onClick={closeDrawer}
                className="px-4 py-2 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('common.close', 'Close Drawer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOMABLE IMAGE PREVIEW MODAL */}
      <ImagePreviewModal
        isOpen={zoomModal.isOpen}
        onClose={closeZoom}
        imageUrl={zoomModal.imageUrl}
        title={zoomModal.title}
        ticketId={zoomModal.ticketId}
        type={zoomModal.type}
      />
    </div>
  );
};

export default ComplaintsReportedPage;
