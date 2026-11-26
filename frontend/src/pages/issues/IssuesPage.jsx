import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hourglass,
  Search,
  Plus,
  Download,
  FileSpreadsheet,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  User,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';
import ComplaintImageThumbnail from '../../components/common/ComplaintImageThumbnail';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import {
  getBeforeImageUrl,
  getAfterImageUrl,
  getCompletedDate,
  getAssignedSecretaryName,
} from '../../utils/imageUtils';

export const IssuesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({
    totalIssues: 0,
    closedIssues: 0,
    inProgressIssues: 0,
    pendingIssues: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter States matching reference website
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'All Status');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWard, setSelectedWard] = useState(searchParams.get('wardId') || '');

  const [wards, setWards] = useState([]);
  const [officers, setOfficers] = useState([]);

  // Modal State for Add / Edit Grievance
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentIssueId, setCurrentIssueId] = useState(null);

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Drinking Water',
    subcategory: '',
    priority: 'Medium',
    status: 'Pending',
    citizenName: '',
    citizenMobile: '',
    citizenAddress: '',
    wardId: '',
    assignedDepartment: 'Corporation / Municipal Admin',
    assignedOfficerId: '',
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [wardsRes, officersRes] = await Promise.all([
          api.get('/districts/wards'),
          api.get('/officers'),
        ]);
        if (wardsRes.data.success) setWards(wardsRes.data.data);
        if (officersRes.data.success) setOfficers(officersRes.data.data);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchIssues = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };

      if (search) params.search = search;
      if (selectedPriority && selectedPriority !== 'All Priorities') params.priority = selectedPriority;
      if (selectedStatus && selectedStatus !== 'All Status') {
        params.status = selectedStatus === 'Closed' ? 'Resolved' : selectedStatus;
      }
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedWard) params.wardId = selectedWard;

      const res = await api.get('/issues', { params });
      if (res.data.success) {
        setIssues(res.data.data);
        setPagination(res.data.meta);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      notifyError('Failed to load grievances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(1);
  }, [search, selectedPriority, selectedStatus, selectedCategory, selectedWard]);

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const res = await api.post('/issues', formData);
        if (res.data.success) {
          notifySuccess('New citizen grievance registered successfully!');
        }
      } else {
        const res = await api.put(`/issues/${currentIssueId}`, formData);
        if (res.data.success) {
          notifySuccess('Grievance details updated successfully!');
        }
      }
      setIsModalOpen(false);
      resetForm();
      fetchIssues(pagination.page);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Error saving grievance');
    }
  };

  const handleEditClick = (issue, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentIssueId(issue._id);
    setFormData({
      title: issue.title || '',
      description: issue.description || '',
      category: issue.category || 'Drinking Water',
      subcategory: issue.subcategory || '',
      priority: issue.priority || 'Medium',
      status: issue.status || 'Pending',
      citizenName: issue.citizenName || '',
      citizenMobile: issue.citizenMobile || '',
      citizenAddress: issue.citizenAddress || '',
      wardId: issue.wardId?._id || issue.wardId || '',
      assignedDepartment: issue.assignedDepartment || 'Corporation / Municipal Admin',
      assignedOfficerId: issue.assignedOfficerId?._id || issue.assignedOfficerId || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (issueId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this grievance?')) return;
    try {
      const res = await api.delete(`/issues/${issueId}`);
      if (res.data.success) {
        notifySuccess('Grievance deleted successfully');
        fetchIssues(pagination.page);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to delete issue');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Drinking Water',
      subcategory: '',
      priority: 'Medium',
      status: 'Pending',
      citizenName: '',
      citizenMobile: '',
      citizenAddress: '',
      wardId: '',
      assignedDepartment: 'Corporation / Municipal Admin',
      assignedOfficerId: '',
    });
    setModalMode('create');
    setCurrentIssueId(null);
  };

  const handleDownloadIssuesExcel = async () => {
    try {
      const res = await api.get('/issues', { params: { limit: 1000 } });
      const issuesList = res.data?.success && res.data.data ? res.data.data : issues;

      const excelRows = issuesList.map((i) => ({
        'Issue ID': i.issueCode || '-',
        'Issue Title': i.title || '-',
        'Issue Description': i.description || '-',
        'Category': i.category || '-',
        'Citizen Name': i.citizenName || '-',
        'Contact Number': i.citizenMobile || '-',
        'District': 'Coimbatore',
        'Constituency': i.constituencyId ? (i.constituencyId.name || i.constituencyId) : 'Coimbatore South',
        'Ward': i.wardId ? (typeof i.wardId === 'object' ? `Ward ${i.wardId.wardNumber} - ${i.wardId.wardName}` : i.wardId) : '-',
        'Location': i.location || i.citizenAddress || '-',
        'Reported Date': i.createdAt ? new Date(i.createdAt).toLocaleString() : '-',
        'Assigned Department': i.assignedDepartment || '-',
        'Assigned Officer': i.assignedOfficerId?.officerName || i.assignedOfficer || 'Unassigned',
        'Priority': i.priority || 'Medium',
        'Status': i.status || 'Pending',
        'Resolution Details': i.finalReport || i.resolutionDetails?.resolutionNotes || (i.status === 'Resolved' ? 'Resolved' : 'Pending Resolution'),
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Issues Report');
      XLSX.writeFile(workbook, 'TVK_Issues_Report.xlsx');
      notifySuccess('TVK_Issues_Report.xlsx downloaded successfully!');
    } catch (err) {
      notifyError('Failed to generate Issues Excel report');
    }
  };

  // Table Columns with 13 key attributes including Before and After Image Thumbnails
  const columns = [
    {
      header: t('issues.colIssueId', 'Issue ID'),
      accessor: 'issueCode',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
          {row.issueCode}
        </span>
      ),
    },
    {
      header: t('issues.colCategory', 'Category / Subject'),
      accessor: 'category',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block leading-tight">{row.category}</span>
          <span className="text-[11px] text-slate-500 truncate max-w-[150px] block" title={row.title}>{row.title}</span>
        </div>
      ),
    },
    {
      header: t('issues.colCitizen', 'Citizen'),
      accessor: 'citizenName',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-900 text-xs block">{row.citizenName || '-'}</span>
          <span className="font-mono text-[11px] text-slate-500 block">{row.citizenMobile || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Ward / Location',
      render: (row) => {
        const wardNum = row.wardId && typeof row.wardId === 'object'
          ? row.wardId.wardNumber
          : (row.wardNumber || (typeof row.wardId === 'number' ? row.wardId : null));
        const loc = row.location || row.citizenAddress || '-';
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 block">
              {wardNum ? `Ward ${wardNum}` : '-'}
            </span>
            <span className="text-[11px] text-slate-500 truncate max-w-[130px] block" title={loc}>
              {loc}
            </span>
          </div>
        );
      },
    },
    {
      header: t('issues.colPriority', 'Priority'),
      accessor: 'priority',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: t('issues.colStatus', 'Status'),
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Assigned Secretary',
      render: (row) => {
        const secName = getAssignedSecretaryName(row);
        const officer = row.assignedOfficerId?.officerName || row.assignedDepartment;
        return (
          <div className="text-xs max-w-[130px]">
            {secName ? (
              <span className="font-bold text-slate-800 block truncate" title={secName}>
                {secName}
              </span>
            ) : officer ? (
              <span className="text-slate-600 block truncate" title={officer}>
                {officer}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Unassigned
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Before Image',
      className: 'text-center',
      render: (row) => {
        const beforeUrl = getBeforeImageUrl(row);
        return (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <ComplaintImageThumbnail
              imageUrl={beforeUrl}
              type="BEFORE"
              ticketId={row.issueCode}
              title={`Before Resolution - ${row.issueCode}`}
              onZoomClick={openZoom}
            />
          </div>
        );
      },
    },
    {
      header: 'After Image',
      className: 'text-center',
      render: (row) => {
        const afterUrl = getAfterImageUrl(row);
        return (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <ComplaintImageThumbnail
              imageUrl={afterUrl}
              type="AFTER"
              ticketId={row.issueCode}
              title={`After Resolution - ${row.issueCode}`}
              onZoomClick={openZoom}
            />
          </div>
        );
      },
    },
    {
      header: 'Date / Completed',
      render: (row) => {
        const compDate = getCompletedDate(row);
        return (
          <div className="text-xs">
            <span className="text-[11px] text-slate-600 block">
              {new Date(row.createdAt).toLocaleDateString()}
            </span>
            {compDate && (
              <span className="text-[10px] font-semibold text-emerald-700 block">
                Done: {new Date(compDate).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: t('issues.colActions', 'Actions'),
      render: (row) => (
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/issues/${row._id}`)}
            title="View Details"
            className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleEditClick(row, e)}
            title="Edit Issue"
            className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleDeleteClick(row._id, e)}
            title="Delete Issue"
            className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Matching Login Theme */}
      <AdminPageHeader
        badge={t('issues.headerBadge', 'TVK Digital Governance • Grievance Repository')}
        badgeIcon={AlertCircle}
        title={t('issues.title', 'Ward Issues Management')}
        tamilTitle="மக்கள் குறைதீர்ப்பு மேலாண்மை"
        subtitle={t('issues.subtitle', 'Public Complaints Redressal, Field Inspection & Department Allocation across Coimbatore District')}
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadIssuesExcel}
              className="inline-flex items-center px-4 py-2.5 bg-white/95 hover:bg-white text-[#850000] font-bold rounded-xl text-xs shadow-md transition cursor-pointer space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t('issues.downloadExcel', 'Download Excel')}</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-xl text-xs shadow-sm transition space-x-1.5 border border-[#FFD32A]/50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD32A]" />
              <span>{t('issues.logNewIssue', 'Register Grievance')}</span>
            </button>
          </div>
        }
      />

      {/* 4 Summary / KPI Cards Matching Reference Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('issues.statTotalIssues', 'Total Issues')}</p>
            <h4 className="text-2xl font-extrabold text-red-700">{summary.totalIssues}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('issues.statResolved', 'Closed')}</p>
            <h4 className="text-2xl font-extrabold text-emerald-700">{summary.closedIssues}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('issues.statInProgress', 'In Progress')}</p>
            <h4 className="text-2xl font-extrabold text-blue-700">{summary.inProgressIssues}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('issues.statPending', 'Pending')}</p>
            <h4 className="text-2xl font-extrabold text-amber-600">{summary.pendingIssues}</h4>
          </div>
        </div>
      </div>

      {/* Filter Controls Matching Reference Specs: Priority & Status Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('issues.searchPlaceholder', 'Search code, citizen, title...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-red-700 focus:outline-none"
            />
          </div>

          <div>
            <select
              id="priorityFilter"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-red-700 focus:outline-none"
            >
              <option value="All Priorities">{t('issues.allPriorities', 'All Priorities')}</option>
              <option value="Critical">{t('priority.Critical', 'Critical')}</option>
              <option value="High">{t('priority.High', 'High')}</option>
              <option value="Medium">{t('priority.Medium', 'Medium')}</option>
              <option value="Low">{t('priority.Low', 'Low')}</option>
            </select>
          </div>

          <div>
            <select
              id="statusFilter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-red-700 focus:outline-none"
            >
              <option value="All Status">{t('issues.allStatus', 'All Status')}</option>
              <option value="Pending">{t('status.Pending', 'Pending')}</option>
              <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
              <option value="Closed">{t('status.Closed', 'Closed')}</option>
              <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
            </select>
          </div>

          <div>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-red-700 focus:outline-none"
            >
              <option value="">{t('issues.allWards', 'All Wards')}</option>
              {wards.map((w) => (
                <option key={w._id} value={w._id}>
                  {t('district.wardLabel', 'Ward')} {w.wardNumber} - {w.wardName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={issues}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => fetchIssues(page)}
        onRowClick={(row) => navigate(`/admin/issues/${row._id}`)}
      />

      {/* Add / Edit Grievance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? t('issues.modalLogTitle', 'Register Citizen Grievance') : t('issues.modalEditTitle', 'Edit Grievance')}
        subtitle={t('issues.modalSubtitle', 'Log issue details for ward field-officer inspection and department assignment')}
      >
        <form onSubmit={handleSubmitIssue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.issueTitleRequired', 'Issue Title / Subject *')}</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Drinking Water Pipeline Burst on DB Road"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.categoryRequired', 'Category *')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="Drinking Water">Drinking Water</option>
                <option value="Street Lighting">Street Lighting</option>
                <option value="Road Infrastructure">Road Infrastructure</option>
                <option value="Sanitation / Drainage">Sanitation / Drainage</option>
                <option value="Public Transport">Public Transport</option>
                <option value="Electricity / TANGEDCO">Electricity / TANGEDCO</option>
                <option value="Public Health">Public Health</option>
                <option value="Parks & Playgrounds">Parks & Playgrounds</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('issues.colPriority', 'Priority')}
              </label>
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Auto-assigned by Complaint Ageing</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  Low (0–7 Days)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.statusRequired', 'Initial Status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="Pending">{t('status.Pending', 'Pending')}</option>
                <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
                <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
                <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.citizenNameRequired', 'Citizen Full Name *')}</label>
              <input
                type="text"
                required
                value={formData.citizenName}
                onChange={(e) => setFormData({ ...formData, citizenName: e.target.value })}
                placeholder="Full Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.citizenMobileRequired', 'Citizen Contact Number *')}</label>
              <input
                type="tel"
                required
                value={formData.citizenMobile}
                onChange={(e) => setFormData({ ...formData, citizenMobile: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.wardRequired', 'Ward Location *')}</label>
              <select
                value={formData.wardId}
                onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="">{t('issues.selectWard', 'Select Municipal Ward')}</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>
                    {t('district.wardLabel', 'Ward')} {w.wardNumber} - {w.wardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.assignedDepartmentLabel', 'Assigned Department')}</label>
              <select
                value={formData.assignedDepartment}
                onChange={(e) => setFormData({ ...formData, assignedDepartment: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="Corporation / Municipal Admin">Corporation / Municipal Admin</option>
                <option value="TWAD Board (Water Supply)">TWAD Board (Water Supply)</option>
                <option value="TANGEDCO (Electricity)">TANGEDCO (Electricity)</option>
                <option value="Highways & Road Infrastructure">Highways & Road Infrastructure</option>
                <option value="Public Health & Sanitation">Public Health & Sanitation</option>
                <option value="Police & Traffic Management">Police & Traffic Management</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('issues.descriptionRequired', 'Detailed Description *')}</label>
            <textarea
              rows="3"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe exact location, duration of problem, and impact on residents..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-red-700"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold"
            >
              {modalMode === 'create' ? t('issues.logNewIssue', 'Register Grievance') : t('common.save', 'Update Grievance')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Zoomable Image Preview Modal */}
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

export default IssuesPage;
