import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Search,
  Check,
  X,
  RefreshCw,
  Filter,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  LogOut,
  AlertCircle,
  Image as ImageIcon,
  Inbox,
  Send,
  Save,
  ShieldCheck,
  Layers,
  Download,
  FileSpreadsheet,
  ArrowRight,
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
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Footer from '../../components/layout/Footer';
import api from '../../services/api';

export const SubadminDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  // Top-level Navigation Tab: 'complaints' | 'appointments'
  const [mainTab, setMainTab] = useState('complaints');

  // ==========================================
  // SECTION 1: GRIEVANCES & COMPLAINTS STATE
  // ==========================================
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [complaintsSummary, setComplaintsSummary] = useState({
    totalComplaints: 0,
    newComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
  });

  const [complaintsPagination, setComplaintsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Complaint Filters
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('All');
  const [complaintCategory, setComplaintCategory] = useState('All');
  const [complaintWard, setComplaintWard] = useState('All');

  const [wards, setWards] = useState([]);
  const [wardSecretaries, setWardSecretaries] = useState([]);

  // ==========================================
  // COMPLAINT AGEING OVERVIEW STATE & LOGIC
  // ==========================================
  const [openComplaints, setOpenComplaints] = useState([]);
  const [completedComplaints, setCompletedComplaints] = useState([]);
  const [selectedAgeingRange, setSelectedAgeingRange] = useState(null); // '0-7' | '8-14' | '15+' | 'completed'
  const [isAgeingModalOpen, setIsAgeingModalOpen] = useState(false);
  const [ageingSearch, setAgeingSearch] = useState('');
  const [ageingDeptFilter, setAgeingDeptFilter] = useState('All');
  const [ageingStatusFilter, setAgeingStatusFilter] = useState('All');

  // Ageing Calculation Logic (mutually exclusive elapsed calendar days from original registration createdAt)
  const calculateDaysPending = (createdAt) => {
    if (!createdAt) return 0;
    const createdDate = new Date(createdAt);
    const today = new Date();
    const utcCreated = Date.UTC(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.max(0, Math.floor((utcToday - utcCreated) / (1000 * 60 * 60 * 24)));
  };

  const complaints0To7 = openComplaints.filter((c) => {
    const days = calculateDaysPending(c.createdAt);
    return days >= 0 && days <= 7;
  });

  const complaints8To14 = openComplaints.filter((c) => {
    const days = calculateDaysPending(c.createdAt);
    return days >= 8 && days <= 14;
  });

  const complaints15Plus = openComplaints.filter((c) => {
    const days = calculateDaysPending(c.createdAt);
    return days >= 15;
  });

  // Automatic Priority Assignment based on complaint age (exact Admin logic):
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

  const handleAgeingCardClick = (range) => {
    setSelectedAgeingRange(range);
    setAgeingSearch('');
    setAgeingDeptFilter('All');
    setAgeingStatusFilter('All');
    setIsAgeingModalOpen(true);
  };

  const displayedAgeingComplaints =
    selectedAgeingRange === '0-7'
      ? complaints0To7
      : selectedAgeingRange === '8-14'
      ? complaints8To14
      : selectedAgeingRange === '15+'
      ? complaints15Plus
      : selectedAgeingRange === 'completed'
      ? completedComplaints
      : [];

  const availableAgeingDepts = Array.from(
    new Set(displayedAgeingComplaints.map((c) => c.assignedDepartment || c.category).filter(Boolean))
  );
  const availableAgeingStatuses = Array.from(
    new Set(displayedAgeingComplaints.map((c) => c.status).filter(Boolean))
  );

  const filteredAgeingComplaints = displayedAgeingComplaints.filter((c) => {
    const days = calculateDaysPending(c.createdAt);
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

  const fetchAgeingComplaints = async () => {
    try {
      const res = await api.get('/issues?limit=500');
      if (res.data.success) {
        const rawIssues = res.data.data || [];
        const openOnly = rawIssues.filter(
          (c) => !['Completed', 'Resolved', 'Closed'].includes(c.status)
        );
        const completedOnly = rawIssues.filter(
          (c) => ['Completed', 'Resolved', 'Closed'].includes(c.status)
        );
        setOpenComplaints(openOnly);
        setCompletedComplaints(completedOnly);
      }
    } catch (err) {
      console.error('Failed to load ageing complaints for subadmin:', err);
    }
  };

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

  // Status & Assignment update
  const [adminStatusInput, setAdminStatusInput] = useState('New');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [isSyncingComplaints, setIsSyncingComplaints] = useState(false);
  const [lastSyncedComplaints, setLastSyncedComplaints] = useState(new Date());
  const isFetchingComplaintsRef = useRef(false);

  // ==========================================
  // SECTION 2: APPOINTMENTS STATE
  // ==========================================
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [appointmentStats, setAppointmentStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    rescheduledAppointments: 0,
    rejectedAppointments: 0,
    completedAppointments: 0,
  });

  // Appointment Filters & Pagination
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('All');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentTotalPages, setAppointmentTotalPages] = useState(1);
  const [appointmentTotalRecords, setAppointmentTotalRecords] = useState(0);

  // Appointment Modals
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAppointmentDetailOpen, setIsAppointmentDetailOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);

  // Appointment Forms
  const [confirmForm, setConfirmForm] = useState({
    confirmedDate: '',
    confirmedTime: '10:00 AM - 11:30 AM',
    confirmedLocation: '',
    subadminRemarks: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    confirmedDate: '',
    confirmedTime: '10:00 AM - 11:30 AM',
    confirmedLocation: '',
    rescheduleReason: '',
    subadminRemarks: '',
  });

  const [rejectReason, setRejectReason] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');

  // ------------------------------------------
  // LOAD METADATA (Wards & Ward Secretaries)
  // ------------------------------------------
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

  // ------------------------------------------
  // FETCH COMPLAINTS FROM MYSQL
  // ------------------------------------------
  const fetchComplaints = async (page = 1, isBackground = false) => {
    if (isFetchingComplaintsRef.current) return;
    isFetchingComplaintsRef.current = true;
    if (!isBackground) setComplaintsLoading(true);
    else setIsSyncingComplaints(true);

    try {
      const params = { page, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
      if (complaintSearch.trim()) params.search = complaintSearch.trim();
      if (complaintStatus !== 'All') params.status = complaintStatus;
      if (complaintCategory !== 'All') params.category = complaintCategory;
      if (complaintWard !== 'All') params.wardId = complaintWard;

      const res = await api.get('/issues', { params });
      if (res.data.success) {
        setComplaints(res.data.data);
        setComplaintsPagination({
          page: res.data.meta.page,
          limit: res.data.meta.limit,
          total: res.data.meta.total,
          totalPages: res.data.meta.totalPages,
        });

        const s = res.data.summary || {};
        setComplaintsSummary({
          totalComplaints: s.totalIssues || res.data.meta.total || 0,
          newComplaints: s.newIssues || 0,
          resolvedComplaints: s.closedIssues || 0,
          inProgressComplaints: s.inProgressIssues || 0,
          pendingComplaints: s.pendingIssues || 0,
        });
        setLastSyncedComplaints(new Date());
        fetchAgeingComplaints();
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
      if (!isBackground) {
        notifyError('Failed to load complaints from MySQL database');
      }
    } finally {
      setComplaintsLoading(false);
      setIsSyncingComplaints(false);
      isFetchingComplaintsRef.current = false;
    }
  };

  useEffect(() => {
    if (mainTab === 'complaints') {
      fetchComplaints(1, false);
    }
  }, [mainTab, complaintSearch, complaintStatus, complaintCategory, complaintWard]);

  // Polling for complaints
  useEffect(() => {
    const interval = setInterval(() => {
      if (mainTab === 'complaints') {
        fetchComplaints(complaintsPagination.page, true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [mainTab, complaintsPagination.page]);

  // ------------------------------------------
  // FETCH APPOINTMENTS
  // ------------------------------------------
  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const params = new URLSearchParams();
      params.append('page', appointmentPage);
      params.append('limit', 10);
      if (appointmentSearch.trim()) params.append('search', appointmentSearch.trim());
      if (appointmentStatusFilter && appointmentStatusFilter !== 'All') params.append('status', appointmentStatusFilter);
      if (appointmentDateFilter) params.append('date', appointmentDateFilter);

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data.success) {
        setAppointments(res.data.data || []);
        if (res.data.stats) {
          setAppointmentStats(res.data.stats);
        }
        if (res.data.meta) {
          setAppointmentTotalPages(res.data.meta.totalPages || 1);
          setAppointmentTotalRecords(res.data.meta.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      notifyError('Failed to load appointment records.');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'appointments') {
      fetchAppointments();
    }
  }, [mainTab, appointmentPage, appointmentStatusFilter, appointmentDateFilter]);

  // ------------------------------------------
  // COMPLAINT DRAWER & ACTIONS
  // ------------------------------------------
  const openComplaintDrawer = (c) => {
    setSelectedComplaint(c);
    setAdminStatusInput(c.status || 'New');
    setAdminRemarksInput(c.adminRemarks || '');
    const secId = c.assignedWardSecretaryId ? (c.assignedWardSecretaryId.id || c.assignedWardSecretaryId._id || c.assignedWardSecretaryId) : '';
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
        notifySuccess(`Complaint ${selectedComplaint.issueCode} successfully assigned! Saved to MySQL.`);
        setSelectedComplaint(res.data.data);
        fetchComplaints(complaintsPagination.page, true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to assign Ward Secretary');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setIsUpdatingStatus(true);
      const targetId = selectedComplaint.id || selectedComplaint._id;
      const res = await api.put(`/issues/${targetId}`, {
        status: adminStatusInput,
        adminRemarks: adminRemarksInput.trim(),
      });
      if (res.data.success) {
        notifySuccess(`Complaint ${selectedComplaint.issueCode} status updated to ${adminStatusInput}! Saved in MySQL.`);
        setSelectedComplaint(res.data.data);
        fetchComplaints(complaintsPagination.page, true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Export Complaints Excel
  const handleExportComplaintsExcel = async () => {
    try {
      const params = { limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' };
      if (complaintSearch.trim()) params.search = complaintSearch.trim();
      if (complaintStatus !== 'All') params.status = complaintStatus;
      if (complaintCategory !== 'All') params.category = complaintCategory;
      if (complaintWard !== 'All') params.wardId = complaintWard;

      const res = await api.get('/issues', { params });
      const records = res.data?.success && res.data.data ? res.data.data : complaints;

      const excelRows = records.map((c, index) => {
        const regDateObj = c.createdAt ? new Date(c.createdAt) : null;
        const resolvedObj = c.resolvedAt || c.completedAt ? new Date(c.resolvedAt || c.completedAt) : null;

        return {
          'S.No': index + 1,
          'Complaint ID': c.issueCode || '-',
          'Registered Date': regDateObj ? regDateObj.toLocaleDateString() : '-',
          'Citizen Name': c.citizenName || '-',
          'Mobile Number': c.citizenMobile || '-',
          Category: c.category || '-',
          Subject: c.title || '-',
          Description: c.description || '-',
          Ward: c.wardId ? (typeof c.wardId === 'object' ? `Ward ${c.wardId.wardNumber} - ${c.wardId.wardName}` : c.wardId) : '-',
          'Assigned Ward Secretary': c.assignedWardSecretaryId ? (c.assignedWardSecretaryId.name || c.assignedWardSecretaryId.username) : 'Unassigned',
          'Before Photo URL': c.beforeImage || c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl) || 'No Photo',
          'After Photo URL': c.afterImage || c.afterPhoto || 'No Photo',
          Status: c.status || 'Pending',
          'Action Taken': c.actionTaken || c.finalReport || '-',
          'Resolved Date': resolvedObj ? resolvedObj.toLocaleString() : 'Pending',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Complaints');
      XLSX.writeFile(workbook, 'TVK_Complaints_Report.xlsx');
      notifySuccess('TVK_Complaints_Report.xlsx exported successfully!');
    } catch (err) {
      notifyError('Failed to export complaints Excel');
    }
  };

  // ------------------------------------------
  // APPOINTMENT HANDLERS
  // ------------------------------------------
  const handleOpenConfirm = (apt) => {
    setSelectedAppointment(apt);
    const dateFormatted = apt.requestedDate || apt.preferredDate
      ? new Date(apt.requestedDate || apt.preferredDate).toISOString().slice(0, 10)
      : '';
    setConfirmForm({
      confirmedDate: apt.confirmedDate ? new Date(apt.confirmedDate).toISOString().slice(0, 10) : dateFormatted,
      confirmedTime: apt.confirmedTime || apt.approvedTimeSlot || apt.requestedTime || apt.preferredTimeSlot || '10:00 AM - 11:30 AM',
      confirmedLocation:
        apt.confirmedLocation ||
        apt.approvedVenue ||
        'Coimbatore South District Party Headquarters, Race Course Road',
      subadminRemarks:
        apt.subadminRemarks ||
        apt.meetingInstructions ||
        'Appointment confirmed. Please arrive 15 minutes before the scheduled time with your grievance documents.',
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      setIsSubmittingAppointment(true);
      const targetId = selectedAppointment.id || selectedAppointment._id;
      const res = await api.put(`/appointments/${targetId}/confirm`, confirmForm);
      if (res.data.success) {
        notifySuccess(`Appointment confirmed successfully! Saved to MySQL.`);
        setIsConfirmModalOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to confirm appointment');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleOpenReschedule = (apt) => {
    setSelectedAppointment(apt);
    const dateFormatted = apt.confirmedDate || apt.requestedDate || apt.preferredDate
      ? new Date(apt.confirmedDate || apt.requestedDate || apt.preferredDate).toISOString().slice(0, 10)
      : '';
    setRescheduleForm({
      confirmedDate: dateFormatted,
      confirmedTime: apt.confirmedTime || apt.requestedTime || apt.preferredTimeSlot || '10:00 AM - 11:30 AM',
      confirmedLocation:
        apt.confirmedLocation ||
        apt.approvedVenue ||
        'Coimbatore South District Party Headquarters, Race Course Road',
      rescheduleReason: apt.rescheduleReason || '',
      subadminRemarks: apt.subadminRemarks || '',
    });
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if (!rescheduleForm.rescheduleReason.trim()) {
      notifyError('Please provide a reason for rescheduling.');
      return;
    }

    try {
      setIsSubmittingAppointment(true);
      const targetId = selectedAppointment.id || selectedAppointment._id;
      const res = await api.put(`/appointments/${targetId}/reschedule`, rescheduleForm);
      if (res.data.success) {
        notifySuccess(`Appointment rescheduled successfully!`);
        setIsRescheduleModalOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleOpenReject = (apt) => {
    setSelectedAppointment(apt);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if (!rejectReason.trim()) {
      notifyError('A rejection reason is mandatory.');
      return;
    }

    try {
      setIsSubmittingAppointment(true);
      const targetId = selectedAppointment.id || selectedAppointment._id;
      const res = await api.put(`/appointments/${targetId}/reject`, {
        rejectionReason: rejectReason,
      });
      if (res.data.success) {
        notifySuccess(`Appointment rejected.`);
        setIsRejectModalOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to reject appointment');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleOpenComplete = (apt) => {
    setSelectedAppointment(apt);
    setCompleteNotes('');
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      setIsSubmittingAppointment(true);
      const targetId = selectedAppointment.id || selectedAppointment._id;
      const res = await api.put(`/appointments/${targetId}/complete`, {
        completionNotes: completeNotes,
      });
      if (res.data.success) {
        notifySuccess(`Appointment marked as Completed.`);
        setIsCompleteModalOpen(false);
        fetchAppointments();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to complete appointment');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  if (complaintsLoading && complaints.length === 0) {
    return <LoadingSpinner fullScreen text="Loading Subadmin Governance Dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* ================= TOP HEADER ================= */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 shadow-md flex items-center justify-between text-white sticky top-0 z-50">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFD32A] text-[#850000] font-black text-sm sm:text-base flex items-center justify-center shadow-md flex-shrink-0">
            TVK
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight truncate">
              {t('subadmin.portalTitle', 'TVK Digital Governance CRM')}
            </h1>
            <p className="text-[9.5px] sm:text-[10.5px] text-[#FFD32A] font-semibold truncate">
              {t('subadmin.commandCenter', 'Subadmin Command Center')} • {user?.constituency || 'Coimbatore South'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 text-xs flex-shrink-0">
          <div className="hidden lg:flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full border border-white/20">
            <span className="w-2 h-2 rounded-full bg-[#FFD32A]"></span>
            <span>{t('subadmin.liveConnected', 'MySQL 8.0 Live Connected')}</span>
          </div>

          <LanguageSwitcher variant="dark" />

          <button
            onClick={logout}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-black/20 hover:bg-black/40 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/20 transition text-[10px] sm:text-[11px] font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span className="hidden min-[400px]:inline">{t('common.logout', 'Logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 md:p-8 space-y-5">
        {/* Subadmin Profile Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#E9E2DC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#850000] to-[#A00000] text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-[#FFD32A] flex-shrink-0">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#FFD32A]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  {user?.name || t('subadmin.badge', 'Subadmin')}
                </h2>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-red-50 text-[#A00000] border border-red-200">
                  {t('subadmin.badge', 'Subadmin')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {t('subadmin.fullAuthority', 'Full Grievance Authority')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                {t('subadmin.jurisdiction', 'Jurisdiction')}: <strong>{user?.constituency || 'Coimbatore South'}</strong> • {t('subadmin.synchronized', 'Synchronized with MySQL Database')}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">{t('subadmin.activeGrievances', 'Active Grievances')}</span>
              <strong className="text-amber-700 font-bold">{complaintsSummary.pendingComplaints + complaintsSummary.inProgressComplaints} {t('common.pending', 'Pending')}</strong>
            </div>
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">{t('subadmin.resolvedCases', 'Resolved Cases')}</span>
              <strong className="text-emerald-700 font-bold">{complaintsSummary.resolvedComplaints} {t('common.resolved', 'Closed')}</strong>
            </div>
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 block">{t('subadmin.appointments', 'Appointments')}</span>
              <strong className="text-[#850000] font-bold">{appointmentStats.totalAppointments} {t('subadmin.records', 'Records')}</strong>
            </div>
          </div>
        </div>

        {/* ================= PRIMARY NAVIGATION TABS ================= */}
        <div className="flex items-center space-x-3 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setMainTab('complaints')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-2 cursor-pointer ${
              mainTab === 'complaints'
                ? 'bg-gradient-to-r from-[#850000] to-[#A00000] text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-[#FFD32A]" />
            <span>{t('subadmin.tabGrievances', 'Grievances & Field Complaints')}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              mainTab === 'complaints' ? 'bg-[#FFD32A] text-slate-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {complaintsSummary.totalComplaints || complaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('appointments')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center space-x-2 cursor-pointer ${
              mainTab === 'appointments'
                ? 'bg-gradient-to-r from-[#850000] to-[#A00000] text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-[#FFD32A]" />
            <span>{t('subadmin.tabAppointments', 'Citizen Appointments')}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              mainTab === 'appointments' ? 'bg-[#FFD32A] text-slate-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointmentStats.totalAppointments}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: COMPLAINTS MANAGEMENT (MATCHES ADMIN COMPLAINTS) */}
        {/* ======================================================== */}
        {mainTab === 'complaints' && (
          <div className="space-y-5">
            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                onClick={() => setComplaintStatus(complaintStatus === 'New' ? 'All' : 'New')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
                  complaintStatus === 'New'
                    ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                    : 'bg-white border-slate-200 hover:border-red-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold flex-shrink-0">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">{t('subadmin.newComplaints', 'New Complaints')}</p>
                  <h3 className="text-2xl font-extrabold text-[#850000]">{complaintsSummary.newComplaints}</h3>
                </div>
              </div>

              <div
                onClick={() => setComplaintStatus('All')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
                  complaintStatus === 'All'
                    ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('subadmin.totalComplaints', 'Total Complaints')}</p>
                  <h3 className="text-2xl font-extrabold text-slate-800">{complaintsSummary.totalComplaints}</h3>
                </div>
              </div>

              <div
                onClick={() => setComplaintStatus(complaintStatus === 'Pending' ? 'All' : 'Pending')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
                  complaintStatus === 'Pending'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('subadmin.pending', 'Pending')}</p>
                  <h3 className="text-2xl font-extrabold text-amber-700">{complaintsSummary.pendingComplaints}</h3>
                </div>
              </div>

              <div
                onClick={() => setComplaintStatus(complaintStatus === 'In Progress' ? 'All' : 'In Progress')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 ${
                  complaintStatus === 'In Progress'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('subadmin.inProgress', 'In Progress')}</p>
                  <h3 className="text-2xl font-extrabold text-blue-700">{complaintsSummary.inProgressComplaints}</h3>
                </div>
              </div>

              <div
                onClick={() => setComplaintStatus(complaintStatus === 'Resolved' ? 'All' : 'Resolved')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3.5 col-span-2 md:col-span-1 ${
                  complaintStatus === 'Resolved'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('subadmin.resolved', 'Resolved')}</p>
                  <h3 className="text-2xl font-extrabold text-emerald-700">{complaintsSummary.resolvedComplaints}</h3>
                </div>
              </div>
            </div>

            {/* ================= COMPLAINT AGEING OVERVIEW SECTION ================= */}
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
                  onClick={() => handleAgeingCardClick('0-7')}
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
                    <span>{t('dashboard.viewComplaints', 'View complaints')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* CARD 2: 8–14 Days – IMPORTANT */}
                <div
                  onClick={() => handleAgeingCardClick('8-14')}
                  className={`bg-gradient-to-br from-amber-50/70 to-white border ${selectedAgeingRange === '8-14' && isAgeingModalOpen ? 'ring-2 ring-amber-500 border-amber-500' : 'border-amber-200/90 hover:border-amber-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          {t('dashboard.ageingRange8to14', '8–14 Days')}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs animate-pulse">
                          {t('dashboard.important', 'Important')}
                        </span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-amber-950 my-1">
                      {count8To14}
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCard8to14Title', '8–14 Days Important')}</h3>
                    <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{t('dashboard.ageingCard8to14Desc', 'Priority: Medium • Needs Attention')}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                    <span>{t('dashboard.viewComplaints', 'View complaints')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* CARD 3: 15+ Days – MORE IMPORTANT */}
                <div
                  onClick={() => handleAgeingCardClick('15+')}
                  className={`bg-gradient-to-br from-rose-50/70 to-white border ${selectedAgeingRange === '15+' && isAgeingModalOpen ? 'ring-2 ring-rose-500 border-rose-500' : 'border-rose-200/90 hover:border-rose-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                          {t('dashboard.ageingRange15Plus', '15+ Days')}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                          {t('dashboard.moreImportant', 'More Important')}
                        </span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-rose-950 my-1">
                      {count15Plus}
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCard15PlusTitle', '15+ Days More Important')}</h3>
                    <p className="text-[11px] text-rose-600 font-bold mt-0.5">{t('dashboard.ageingCard15PlusDesc', 'Priority: High • Overdue Action')}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-700 group-hover:text-rose-800">
                    <span>{t('dashboard.viewComplaints', 'View complaints')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* CARD 4: Completed Complaints */}
                <div
                  onClick={() => handleAgeingCardClick('completed')}
                  className={`bg-gradient-to-br from-teal-50/70 to-white border ${selectedAgeingRange === 'completed' && isAgeingModalOpen ? 'ring-2 ring-teal-500 border-teal-500' : 'border-teal-200/90 hover:border-teal-500'} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                          {t('dashboard.ageingCompleted', 'Completed')}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-600 text-white shadow-xs">
                          {t('dashboard.resolved', 'Resolved')}
                        </span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-teal-950 my-1">
                      {countCompleted}
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">{t('dashboard.ageingCardCompletedTitle', 'Completed Complaints')}</h3>
                    <p className="text-[11px] text-teal-700 font-semibold mt-0.5">{t('dashboard.ageingCardCompletedDesc', 'With Before & After Proofs')}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-800">
                    <span>{t('dashboard.viewCompletedHistory', 'View completed history')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={complaintSearch}
                      onChange={(e) => setComplaintSearch(e.target.value)}
                      placeholder={t('subadmin.searchPlaceholder', 'Search ID, Citizen, Phone, Subject...')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-700"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <select
                      value={complaintStatus}
                      onChange={(e) => setComplaintStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
                    >
                      <option value="All">{t('subadmin.allStatuses', 'All Statuses')}</option>
                      <option value="New">{t('status.New', 'New')}</option>
                      <option value="Pending">{t('status.Pending', 'Pending')}</option>
                      <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
                      <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
                      <option value="Completed">{t('status.Completed', 'Completed')}</option>
                      <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
                      <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
                      <option value="Closed">{t('status.Closed', 'Closed')}</option>
                    </select>
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
                    >
                      <option value="All">{t('subadmin.allCategories', 'All Categories')}</option>
                      <option value="Drinking Water">Drinking Water</option>
                      <option value="Street Lighting">Street Lighting</option>
                      <option value="Road Infrastructure">Road Infrastructure</option>
                      <option value="Sanitation / Drainage">Sanitation / Drainage</option>
                      <option value="Public Transport">Public Transport</option>
                      <option value="Electricity / TANGEDCO">Electricity</option>
                      <option value="Public Health">Public Health</option>
                    </select>
                  </div>

                  {/* Ward Dropdown */}
                  <div>
                    <select
                      value={complaintWard}
                      onChange={(e) => setComplaintWard(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-red-700"
                    >
                      <option value="All">{t('subadmin.allWards', 'All Wards')}</option>
                      {wards.map((w) => (
                        <option key={w._id || w.id} value={w.id || w._id}>
                          Ward {w.wardNumber} - {w.wardName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2 self-end lg:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchComplaints(complaintsPagination.page, false)}
                    disabled={isSyncingComplaints}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition flex items-center space-x-1 text-xs font-bold cursor-pointer"
                    title="Synchronize with MySQL database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingComplaints ? 'animate-spin text-red-700' : ''}`} />
                    <span className="hidden sm:inline">{t('subadmin.syncLive', 'Sync')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportComplaintsExcel}
                    className="px-3.5 py-2 bg-[#850000] hover:bg-[#A00000] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FFD32A]" />
                    <span>{t('subadmin.exportExcel', 'Export Excel')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Complaints Table (14 Columns) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3 px-3.5 text-center">{t('common.sNo', 'S.No.')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColTicket', 'Complaint ID')}</th>
                      <th className="py-3 px-3.5">{t('common.dateTime', 'Date & Time')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColCitizen', 'Complainant Name')}</th>
                      <th className="py-3 px-3.5">{t('common.mobileNumber', 'Mobile Number')}</th>
                      <th className="py-3 px-3.5">{t('common.category', 'Category')}</th>
                      <th className="py-3 px-3.5">{t('common.subject', 'Subject')}</th>
                      <th className="py-3 px-3.5 min-w-[200px]">{t('common.description', 'Description')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColWard', 'Ward & Paguthi')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColSecretary', 'Assigned Ward Secretary')}</th>
                      <th className="py-3 px-3.5 text-center">{t('subadmin.tableColBeforeImg', 'Before Images')}</th>
                      <th className="py-3 px-3.5 text-center">{t('subadmin.tableColAfterImg', 'After Images')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColStatus', 'Status')}</th>
                      <th className="py-3 px-3.5 min-w-[150px]">{t('subadmin.subadminRemarks', 'Admin Remarks')}</th>
                      <th className="py-3 px-3.5 text-center">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaintsLoading ? (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-400">
                          <LoadingSpinner text={t('common.loading', 'Loading Complaints from MySQL database...')} />
                        </td>
                      </tr>
                    ) : complaints.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-500">
                          {t('subadmin.noComplaintsFound', 'No citizen complaints found matching the criteria in MySQL database.')}
                        </td>
                      </tr>
                    ) : (
                      complaints.map((c, index) => {
                        const sNo = (complaintsPagination.page - 1) * complaintsPagination.limit + index + 1;
                        const regDate = c.createdAt ? new Date(c.createdAt) : null;
                        const beforeImg = c.beforeImage || c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl);
                        const afterImg = c.afterImage || c.afterPhoto;
                        const assignedSec = c.assignedWardSecretaryId;

                        return (
                          <tr
                            key={c._id || c.id}
                            className="hover:bg-slate-50/70 transition cursor-pointer"
                            onClick={() => openComplaintDrawer(c)}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-slate-500 font-semibold">
                              {sNo}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                {c.issueCode || 'GRI-2026-X'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                              {regDate ? (
                                <div>
                                  <span className="block font-medium">{regDate.toLocaleDateString()}</span>
                                  <span className="text-[10px] text-slate-400">{regDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800">
                              {c.citizenName || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                              <a
                                href={`tel:${c.citizenMobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-red-700 hover:underline"
                              >
                                {c.citizenMobile || '-'}
                              </a>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {c.category}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-800 font-semibold max-w-[160px] truncate" title={c.title}>
                              {c.title || '-'}
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              <p className="line-clamp-2 max-w-xs text-xs" title={c.description}>
                                {c.description || '-'}
                              </p>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                              <span className="font-semibold block">
                                {c.wardId ? (typeof c.wardId === 'object' ? `Ward ${c.wardId.wardNumber}` : c.wardId) : '-'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {c.paguthi || (c.constituencyId?.name || '')}
                              </span>
                            </td>
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

                            {/* DEDICATED BEFORE IMAGES COLUMN */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={getBeforeImageUrl(c)}
                                type="before"
                                onClick={() => openZoom(getBeforeImageUrl(c), 'before', `Before Work Ground Evidence: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>

                            {/* DEDICATED AFTER IMAGES COLUMN */}
                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <ComplaintImageThumbnail
                                src={getAfterImageUrl(c)}
                                type="after"
                                onClick={() => openZoom(getAfterImageUrl(c), 'after', `After Work Ground Resolution Proof: ${c.issueCode}`, c.issueCode)}
                              />
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <StatusBadge status={c.status} />
                            </td>

                            <td className="py-3 px-3.5 text-slate-700 max-w-[150px]">
                              {c.adminRemarks ? (
                                <span className="text-xs text-slate-800 font-medium truncate block" title={c.adminRemarks}>
                                  {c.adminRemarks}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No remarks</span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openComplaintDrawer(c)}
                                className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition font-semibold"
                                title="Inspect Complaint Details"
                              >
                                <Eye className="w-4 h-4" />
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
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <span>
                  Showing {complaints.length > 0 ? (complaintsPagination.page - 1) * complaintsPagination.limit + 1 : 0} to{' '}
                  {Math.min(complaintsPagination.page * complaintsPagination.limit, complaintsPagination.total)} of {complaintsPagination.total} Complaints
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={complaintsPagination.page <= 1}
                    onClick={() => fetchComplaints(complaintsPagination.page - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                    {complaintsPagination.page} / {complaintsPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={complaintsPagination.page >= complaintsPagination.totalPages}
                    onClick={() => fetchComplaints(complaintsPagination.page + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: APPOINTMENT MANAGEMENT (PRESERVED APPOINTMENTS) */}
        {/* ======================================================== */}
        {mainTab === 'appointments' && (
          <div className="space-y-5">
            {/* 6 Appointment KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-xs text-center hover:border-[#A00000] transition">
                <span className="text-[10px] sm:text-[11px] text-slate-500 block font-semibold truncate">{t('subadmin.totalAppointments', 'Total Appointments')}</span>
                <p className="text-lg sm:text-2xl font-black text-[#850000] mt-0.5 sm:mt-1">{appointmentStats.totalAppointments}</p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 shadow-xs text-center hover:border-amber-400 transition bg-amber-50/20">
                <span className="text-[10px] sm:text-[11px] text-amber-800 block font-semibold truncate">{t('subadmin.pendingRequests', 'Pending')}</span>
                <p className="text-lg sm:text-2xl font-black text-amber-700 mt-0.5 sm:mt-1">{appointmentStats.pendingAppointments}</p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 shadow-xs text-center hover:border-emerald-400 transition bg-emerald-50/20">
                <span className="text-[10px] sm:text-[11px] text-emerald-800 block font-semibold truncate">{t('subadmin.confirmed', 'Confirmed')}</span>
                <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1">{appointmentStats.confirmedAppointments}</p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-200 shadow-xs text-center hover:border-blue-400 transition bg-blue-50/20">
                <span className="text-[10px] sm:text-[11px] text-blue-800 block font-semibold truncate">{t('subadmin.rescheduled', 'Rescheduled')}</span>
                <p className="text-lg sm:text-2xl font-black text-blue-700 mt-0.5 sm:mt-1">{appointmentStats.rescheduledAppointments}</p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-200 shadow-xs text-center hover:border-red-400 transition bg-red-50/20">
                <span className="text-[10px] sm:text-[11px] text-red-800 block font-semibold truncate">{t('subadmin.cancelled', 'Rejected')}</span>
                <p className="text-lg sm:text-2xl font-black text-red-700 mt-0.5 sm:mt-1">{appointmentStats.rejectedAppointments}</p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-200 shadow-xs text-center hover:border-purple-400 transition bg-purple-50/20">
                <span className="text-[10px] sm:text-[11px] text-purple-800 block font-semibold truncate">{t('subadmin.completed', 'Completed')}</span>
                <p className="text-lg sm:text-2xl font-black text-purple-700 mt-0.5 sm:mt-1">{appointmentStats.completedAppointments}</p>
              </div>
            </div>

            {/* Filter and Search Bar for Appointments */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E9E2DC] shadow-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAppointmentPage(1);
                  fetchAppointments();
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center text-xs"
              >
                <div className="sm:col-span-2 lg:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder={t('subadmin.searchAppointmentsPlaceholder', 'Search by ID, Citizen, Mobile, or Purpose...')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-[#A00000]"
                  />
                </div>

                <div className="lg:col-span-3">
                  <select
                    value={appointmentStatusFilter}
                    onChange={(e) => {
                      setAppointmentStatusFilter(e.target.value);
                      setAppointmentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-[#A00000]"
                  >
                    <option value="All">{t('subadmin.allStatuses', 'All Statuses')}</option>
                    <option value="Pending">{t('status.Pending Approval', 'Pending Approval')}</option>
                    <option value="Confirmed">{t('status.Confirmed', 'Confirmed')}</option>
                    <option value="Rescheduled">{t('status.Rescheduled', 'Rescheduled')}</option>
                    <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
                    <option value="Completed">{t('status.Completed', 'Completed')}</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <input
                    type="date"
                    value={appointmentDateFilter}
                    onChange={(e) => {
                      setAppointmentDateFilter(e.target.value);
                      setAppointmentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-[#A00000]"
                  />
                </div>

                <div className="lg:col-span-2 flex items-center space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#850000] hover:bg-[#A00000] text-white py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('common.search', 'Search')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppointmentSearch('');
                      setAppointmentStatusFilter('All');
                      setAppointmentDateFilter('');
                      setAppointmentPage(1);
                    }}
                    className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    title={t('subadmin.resetFilters', 'Reset filters')}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3 px-3.5 text-center">{t('common.sNo', 'S.No.')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColTicket', 'Token ID')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColCitizen', 'Citizen Name')}</th>
                      <th className="py-3 px-3.5">{t('common.contact', 'Contact')}</th>
                      <th className="py-3 px-3.5">{t('common.categoryPurpose', 'Category & Purpose')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.preferredSchedule', 'Requested Date')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.confirmedSchedule', 'Confirmed Date/Venue')}</th>
                      <th className="py-3 px-3.5">{t('subadmin.tableColStatus', 'Status')}</th>
                      <th className="py-3 px-3.5 text-center">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointmentsLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <LoadingSpinner text={t('common.loading', 'Loading appointments from MySQL database...')} />
                        </td>
                      </tr>
                    ) : appointments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          No appointment records found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((apt, index) => {
                        const sNo = (appointmentPage - 1) * 10 + index + 1;
                        const reqDate = apt.preferredDate || apt.requestedDate;
                        const confDate = apt.confirmedDate || apt.approvedDate;

                        return (
                          <tr key={apt._id || apt.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3.5 text-center font-mono text-slate-500 font-semibold">{sNo}</td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-[#850000] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                {apt.tokenNumber || apt.appointmentId}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 font-bold text-slate-900">{apt.fullName || apt.citizenName}</td>
                            <td className="py-3 px-3.5 font-mono text-slate-600">{apt.phone || apt.mobileNumber}</td>
                            <td className="py-3 px-3.5">
                              <span className="font-semibold block text-slate-800">{apt.category}</span>
                              <span className="text-[10px] text-slate-500 line-clamp-1">{apt.purpose}</span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                              {reqDate ? new Date(reqDate).toLocaleDateString() : '-'}
                              <span className="block text-[10px] text-slate-400">{apt.preferredTimeSlot || apt.requestedTime || 'Morning'}</span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {confDate ? (
                                <div>
                                  <span className="font-bold text-emerald-800 block">{new Date(confDate).toLocaleDateString()}</span>
                                  <span className="text-[10px] text-slate-500 block">{apt.confirmedTime || apt.approvedTimeSlot}</span>
                                  <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={apt.confirmedLocation || apt.approvedVenue || 'Location not assigned'}>
                                    📍 {apt.confirmedLocation || apt.approvedVenue || 'Location not assigned'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Not Scheduled</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <StatusBadge status={apt.status} />
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    setIsAppointmentDetailOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition"
                                  title="View Full Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {apt.status === 'Pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenConfirm(apt)}
                                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                      title="Confirm / Approve Appointment"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReschedule(apt)}
                                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                      title="Reschedule"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReject(apt)}
                                      className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg transition"
                                      title="Reject"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {apt.status === 'Confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenComplete(apt)}
                                    className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1"
                                    title="Mark as Completed"
                                  >
                                    <CheckSquare className="w-3 h-3" />
                                    <span>Complete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Appointment Pagination */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <span>
                  Showing {appointments.length > 0 ? (appointmentPage - 1) * 10 + 1 : 0} to{' '}
                  {Math.min(appointmentPage * 10, appointmentTotalRecords)} of {appointmentTotalRecords} Appointments
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={appointmentPage <= 1}
                    onClick={() => setAppointmentPage((p) => p - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                    {appointmentPage} / {appointmentTotalPages || 1}
                  </span>
                  <button
                    disabled={appointmentPage >= appointmentTotalPages}
                    onClick={() => setAppointmentPage((p) => p + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* ======================================================== */}
      {/* COMPLAINTS DETAIL DRAWER / MODAL */}
      {/* ======================================================== */}
      {isDrawerOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#850000] to-[#A00000] text-white flex items-center justify-between sticky top-0 z-10 border-b-2 border-[#FFD32A]">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-black bg-[#FFD32A] text-[#850000] px-2.5 py-0.5 rounded-lg shadow-xs">
                  {selectedComplaint.issueCode}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base">Grievance Investigation & Resolution</h3>
              </div>
              <button
                type="button"
                onClick={closeComplaintDrawer}
                className="p-1.5 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 sm:p-6 space-y-5 text-xs">
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
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Ward & Constituency</span>
                  <strong className="text-slate-900 block">
                    {selectedComplaint.wardId ? (typeof selectedComplaint.wardId === 'object' ? `Ward ${selectedComplaint.wardId.wardNumber} - ${selectedComplaint.wardId.wardName}` : selectedComplaint.wardId) : '-'}
                  </strong>
                  <span className="text-slate-600 block">Location: {selectedComplaint.location || selectedComplaint.citizenAddress || '-'}</span>
                </div>
              </div>

              {/* WARD SECRETARY ASSIGNMENT PANEL */}
              <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-amber-700" />
                  <span>Assign Responsible Ward Secretary</span>
                </h4>
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
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FFD32A]" />
                    <span>{isAssigning ? 'Assigning...' : 'Assign to Ward Secretary'}</span>
                  </button>
                </div>
              </div>

              {/* ADMINISTRATIVE STATUS UPDATE FORM */}
              <div className="bg-red-50/70 rounded-2xl p-4 border-2 border-red-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#850000] uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#850000]" />
                    <span>Admin Status & Remarks Management (MySQL)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    Live Sync
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Update Status:</label>
                    <select
                      value={adminStatusInput}
                      onChange={(e) => setAdminStatusInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="New">New</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Remarks:</label>
                    <textarea
                      rows={2}
                      value={adminRemarksInput}
                      onChange={(e) => setAdminRemarksInput(e.target.value)}
                      placeholder="Enter official administrative remarks, follow-up instructions, or action summary..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-[#850000] hover:bg-[#A00000] text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FFD32A]" />
                    <span>{isUpdatingStatus ? 'Saving...' : 'Save Status & Remarks'}</span>
                  </button>
                </div>
              </div>

              {/* SEPARATE BEFORE EVIDENCE & AFTER RESOLUTION PROOFS */}
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
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Status History & Audit Trail (MySQL)</span>
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
            </div>
          </div>
        </div>
      )}

      {/* ================= PHOTO PREVIEW MODAL ================= */}
      <ImagePreviewModal
        isOpen={zoomModal.isOpen}
        onClose={() => setZoomModal((prev) => ({ ...prev, isOpen: false, src: '' }))}
        src={zoomModal.src}
        title={zoomModal.title}
        type={zoomModal.type}
        ticketCode={zoomModal.ticketCode}
      />

      {/* ================= APPOINTMENT DETAIL MODAL ================= */}
      {isAppointmentDetailOpen && selectedAppointment && (
        <Modal
          isOpen={isAppointmentDetailOpen}
          onClose={() => setIsAppointmentDetailOpen(false)}
          title={`Appointment Consultation Details: ${selectedAppointment.tokenNumber || selectedAppointment.appointmentId}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                Token: {selectedAppointment.tokenNumber}
              </span>
              <StatusBadge status={selectedAppointment.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Citizen Name</span>
                <strong className="text-slate-900">{selectedAppointment.fullName || selectedAppointment.citizenName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Number</span>
                <strong className="text-slate-900">{selectedAppointment.phone || selectedAppointment.mobileNumber}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assembly Constituency</span>
                <strong className="text-slate-900">{selectedAppointment.constituency}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <strong className="text-slate-900">{selectedAppointment.category}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Purpose of Appointment</span>
              <p className="text-slate-800 font-medium">{selectedAppointment.purpose}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Confirmed Meeting Schedule</span>
              <p className="text-slate-800">
                <strong>Date:</strong> {selectedAppointment.confirmedDate ? new Date(selectedAppointment.confirmedDate).toLocaleDateString() : 'Pending confirmation'} •{' '}
                <strong>Time:</strong> {selectedAppointment.confirmedTime || selectedAppointment.preferredTimeSlot || '10:00 AM - 11:30 AM'}
              </p>
              <p className="text-slate-600">
                <strong>Venue:</strong> {selectedAppointment.confirmedLocation || selectedAppointment.assignedVenue || 'Coimbatore South Party Headquarters'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CONFIRM APPOINTMENT ================= */}
      {isConfirmModalOpen && selectedAppointment && (
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title={`${t('subadmin.modalConfirmTitle', 'Confirm Citizen Appointment')}: ${selectedAppointment.appointmentId || selectedAppointment.tokenNumber}`}
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.confirmedDate', 'Confirmed Date')} *</label>
              <input
                type="date"
                required
                value={confirmForm.confirmedDate}
                onChange={(e) => setConfirmForm({ ...confirmForm, confirmedDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.confirmedTime', 'Confirmed Time Slot')} *</label>
              <select
                value={confirmForm.confirmedTime}
                onChange={(e) => setConfirmForm({ ...confirmForm, confirmedTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="10:00 AM - 11:30 AM">10:00 AM - 11:30 AM (Morning Slot)</option>
                <option value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM (Noon Slot)</option>
                <option value="03:00 PM - 04:30 PM">03:00 PM - 04:30 PM (Afternoon Slot)</option>
                <option value="04:30 PM - 06:00 PM">04:30 PM - 06:00 PM (Evening Slot)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.confirmedLocation', 'Confirmed Venue / Meeting Location')} *</label>
              <input
                type="text"
                required
                value={confirmForm.confirmedLocation}
                onChange={(e) => setConfirmForm({ ...confirmForm, confirmedLocation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.subadminRemarks', 'Instructions for Citizen')}</label>
              <textarea
                rows="3"
                value={confirmForm.subadminRemarks}
                onChange={(e) => setConfirmForm({ ...confirmForm, subadminRemarks: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppointment}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
              >
                {isSubmittingAppointment ? t('common.updating', 'Confirming...') : t('subadmin.btnSaveConfirm', 'Approve & Confirm')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: RESCHEDULE APPOINTMENT ================= */}
      {isRescheduleModalOpen && selectedAppointment && (
        <Modal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          title={`${t('subadmin.modalRescheduleTitle', 'Reschedule Appointment')}: ${selectedAppointment.appointmentId || selectedAppointment.tokenNumber}`}
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.confirmedDate', 'Proposed New Date')} *</label>
              <input
                type="date"
                required
                value={rescheduleForm.confirmedDate}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, confirmedDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.confirmedTime', 'Proposed Time Slot')} *</label>
              <select
                value={rescheduleForm.confirmedTime}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, confirmedTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="10:00 AM - 11:30 AM">10:00 AM - 11:30 AM</option>
                <option value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM</option>
                <option value="03:00 PM - 04:30 PM">03:00 PM - 04:30 PM</option>
                <option value="04:30 PM - 06:00 PM">04:30 PM - 06:00 PM</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.rescheduleReason', 'Reason for Rescheduling')} *</label>
              <textarea
                required
                rows="2"
                value={rescheduleForm.rescheduleReason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, rescheduleReason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppointment}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold"
              >
                {isSubmittingAppointment ? t('common.updating', 'Saving...') : t('subadmin.btnSaveReschedule', 'Confirm Reschedule')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: REJECT APPOINTMENT ================= */}
      {isRejectModalOpen && selectedAppointment && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`${t('subadmin.modalRejectTitle', 'Reject Appointment Request')}: ${selectedAppointment.appointmentId || selectedAppointment.tokenNumber}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.rejectionReason', 'Rejection Reason (Required)')} *</label>
              <textarea
                required
                rows="4"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State the official reason..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppointment}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold"
              >
                {isSubmittingAppointment ? t('common.updating', 'Rejecting...') : t('subadmin.btnSaveReject', 'Reject Appointment')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: COMPLETE APPOINTMENT ================= */}
      {isCompleteModalOpen && selectedAppointment && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title={`${t('subadmin.modalCompleteTitle', 'Mark Appointment as Completed')}: ${selectedAppointment.appointmentId || selectedAppointment.tokenNumber}`}
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('subadmin.completionNotes', 'Completion Notes / Summary (Optional)')}</label>
              <textarea
                rows="3"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Brief summary of discussion or outcomes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppointment}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold"
              >
                {isSubmittingAppointment ? t('common.updating', 'Updating...') : t('subadmin.btnSaveComplete', 'Mark as Completed')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= COMPLAINT AGEING FILTERED TABLE MODAL ================= */}
      {isAgeingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#850000] to-[#A00000] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAgeingModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  title="Back to Complaint Ageing Overview"
                >
                  <ChevronLeft className="w-4 h-4 text-[#FFD32A]" />
                  <span>{t('common.back', 'Back')}</span>
                </button>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-[#FFD32A]" />
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
                      <>
                        {t('common.showing', 'Showing')} {filteredAgeingComplaints.length} {t('common.of', 'of')} {displayedAgeingComplaints.length} {t('dashboard.showingCompletedComplaints', 'completed complaints • Ground Action & Proofs Verified')}
                      </>
                    ) : (
                      <>
                        {t('common.showing', 'Showing')} {filteredAgeingComplaints.length} {t('common.of', 'of')} {displayedAgeingComplaints.length} {t('dashboard.showingOpenComplaints', 'open complaints')} • {t('common.priority', 'Priority')}: <strong className="text-[#FFD32A]">{selectedAgeingRange === '0-7' ? 'Low' : selectedAgeingRange === '8-14' ? 'Medium' : 'High'}</strong>
                      </>
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
                  placeholder={t('dashboard.ageingSearchPlaceholder', 'Search Ticket, Citizen, Mobile, Area, Issue...')}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#850000]"
                />
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                <select
                  value={ageingDeptFilter}
                  onChange={(e) => setAgeingDeptFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                >
                  <option value="All">{t('common.all', 'All Departments')}</option>
                  {availableAgeingDepts.map((d, i) => (
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
                  <option value="All">All Statuses</option>
                  {availableAgeingStatuses.map((s, i) => (
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
                    className="px-2.5 py-2 text-xs font-bold text-red-700 hover:text-red-800 hover:underline cursor-pointer"
                  >
                    Reset
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
                    {selectedAgeingRange === 'completed'
                      ? 'No completed complaints found'
                      : 'No open complaints found in this ageing range'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {displayedAgeingComplaints.length > 0
                      ? 'No complaints match the search or filter criteria. Try resetting filters.'
                      : selectedAgeingRange === 'completed'
                      ? 'No complaints have been marked as completed yet.'
                      : 'All complaints in this category have either been resolved or moved to another range.'}
                  </p>
                  {displayedAgeingComplaints.length > 0 && (
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
                /* ================= COMPLETED COMPLAINTS TABLE VIEW (12 REQUIRED ITEMS) ================= */
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1250px]">
                    <thead className="bg-emerald-950 text-[#FFD32A] font-bold border-b border-emerald-900 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5">{t('common.ticketId', 'Ticket ID')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.complainant', 'Complainant')}</th>
                        <th className="py-3 px-3.5">{t('common.mobile', 'Mobile')}</th>
                        <th className="py-3 px-3.5">{t('common.ward', 'Ward & Location')}</th>
                        <th className="py-3 px-3.5 min-w-[180px]">{t('common.category', 'Subject & Category')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.registeredDate', 'Registered')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.workCompletedDate', 'Completed Date')}</th>
                        <th className="py-3 px-3.5">{t('dashboard.assignedSecretary', 'Assigned Ward Secretary')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.beforeImage', 'Before Image')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.afterImage', 'After Image')}</th>
                        <th className="py-3 px-3.5 min-w-[200px]">{t('dashboard.actionTaken', 'Action Description')}</th>
                        <th className="py-3 px-3.5 min-w-[160px]">{t('dashboard.secretaryRemarks', 'Ward Remarks')}</th>
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
                        const createdStr = c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A';
                        const completedDateVal = c.completedAt || c.resolvedAt || c.updatedAt;
                        const completedStr = completedDateVal
                          ? new Date(completedDateVal).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
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
                                className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Inspect Complaint Details & Evidence"
                              >
                                <Eye className="w-4 h-4" />
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
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1150px]">
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
                        <th className="py-3 px-3.5">{t('common.priority', 'Priority')}</th>
                        <th className="py-3 px-3.5">{t('common.created', 'Created')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.daysPending', 'Days Pending')}</th>
                        <th className="py-3 px-3.5">{t('common.department', 'Department')}</th>
                        <th className="py-3 px-3.5">{t('common.status', 'Status')}</th>
                        <th className="py-3 px-3.5 text-center">{t('dashboard.details', 'Details')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAgeingComplaints.map((c) => {
                        const days = calculateDaysPending(c.createdAt);
                        const autoPriority = getAutoPriority(days);
                        const wardText = c.ward?.wardName
                          ? `Ward ${c.ward.wardNumber} (${c.ward.wardName})`
                          : c.wardNumber
                          ? `Ward ${c.wardNumber}`
                          : 'Ward';
                        const createdStr = c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString('en-IN', {
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
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <PriorityBadge priority={autoPriority} />
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
                                className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Inspect Complaint Details"
                              >
                                <Eye className="w-4 h-4" />
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
                    Viewing <strong>{filteredAgeingComplaints.length}</strong> of <strong>{displayedAgeingComplaints.length}</strong> completed complaints
                  </>
                ) : (
                  <>
                    Viewing <strong>{filteredAgeingComplaints.length}</strong> of <strong>{displayedAgeingComplaints.length}</strong> open complaints in range ({selectedAgeingRange === '0-7' ? '0–7 Days' : selectedAgeingRange === '8-14' ? '8–14 Days' : '15+ Days'})
                  </>
                )}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAgeingModalOpen(false)}
                  className="px-4 py-2 bg-[#850000] hover:bg-[#A00000] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <ChevronLeft className="w-4 h-4 text-[#FFD32A]" />
                  <span>Back to Complaint Ageing Overview</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubadminDashboardPage;
