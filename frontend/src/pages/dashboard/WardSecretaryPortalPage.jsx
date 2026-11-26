import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building,
  AlertCircle,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  Users,
  Camera,
  Play,
  Check,
  FileCheck,
  Calendar,
  LogOut,
  Bell,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Layers,
  ArrowRight,
  Info,
  Map,
  BadgeCheck,
  PlusCircle,
  FileText,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
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
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import Modal from '../../components/common/Modal';
import Footer from '../../components/layout/Footer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';

export const WardSecretaryPortalPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ward-info' | 'members' | 'complaints' | 'profile'
  const [complaintSection, setComplaintSection] = useState('all'); // 'all' | 'pending' | 'completed'
  const [overviewComplaintTab, setOverviewComplaintTab] = useState('pending'); // 'pending' | 'completed'

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [members, setMembers] = useState([]);
  const [wardInfo, setWardInfo] = useState(null);

  // Filters
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('All');
  const [memberSearch, setMemberSearch] = useState('');

  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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

  const handleOpenPhoto = (url, title = 'Inspection Photo') => {
    if (!url) return;
    openZoom(url, 'general', title);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingBeforeImage, setUploadingBeforeImage] = useState(false);
  const [uploadingAfterImage, setUploadingAfterImage] = useState(false);
  const isFetchingWardRef = useRef(false);

  // Field Visit / Progress Update Modal State (as on reference site)
  const [modalNewStatus, setModalNewStatus] = useState('Pending');
  const [modalComments, setModalComments] = useState('');
  const [modalPhotos, setModalPhotos] = useState([]);
  const [isSavingModalUpdate, setIsSavingModalUpdate] = useState(false);

  // Ward Secretary Complaint Registration Form State
  const [complaintForm, setComplaintForm] = useState({
    citizenName: '',
    citizenMobile: '',
    category: 'Drinking Water',
    title: '',
    description: '',
    location: '',
    priority: 'Medium',
    photos: [],
  });
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [submittedComplaintToken, setSubmittedComplaintToken] = useState(null);

  const [actionForm, setActionForm] = useState({
    beforeImage: '',
    afterImage: '',
    actionTaken: '',
    wardSecretaryRemarks: '',
  });

  const assignedWard = user?.assignedWard || (user?.wardNumber ? `Ward ${user.wardNumber}` : 'Ward 1');
  const constituency = user?.constituency || 'Kinathukadavu';
  const paguthi = user?.paguthi || 'Sundarapuram';

  // Fetch Ward-scoped data
  const fetchWardData = async (isBackground = false) => {
    if (isFetchingWardRef.current) return;
    isFetchingWardRef.current = true;
    if (!isBackground) setLoading(true);

    try {
      const [issuesRes, membersRes] = await Promise.all([
        api.get('/issues?limit=100'),
        api.get('/members?limit=100').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (issuesRes.data.success) {
        const rawIssues = issuesRes.data.data || [];
        const currentUserId = String(user?.id || user?._id || '');
        const currentUserHex = String(user?._id || '');

        // Enforce strict Paguthi + Ward-Based Data Access:
        // Logged-in secretary must ONLY see complaints belonging to their own Paguthi + Ward.
        const wardNumberMatch = String(user?.assignedWard || assignedWard || '').match(/\d+/);
        const userWardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : null;

        const filteredIssues = rawIssues.filter((issue) => {
          const secId = issue.assignedWardSecretaryId
            ? (typeof issue.assignedWardSecretaryId === 'object'
                ? String(issue.assignedWardSecretaryId.id || issue.assignedWardSecretaryId._id || '')
                : String(issue.assignedWardSecretaryId))
            : '';
          const isAssignedToMe = Boolean(secId && (secId === currentUserId || (currentUserHex && secId === currentUserHex)));
          const issueWardNum = issue.wardNumber || (issue.ward?.wardNumber);
          const isMyWardAndPaguthi = Boolean(
            userWardNum &&
            issueWardNum === userWardNum &&
            (!user?.paguthi || !issue.paguthi || issue.paguthi === user.paguthi)
          );

          // If assigned to a different secretary, exclude completely
          if (secId && !isAssignedToMe) {
            return false;
          }

          return isAssignedToMe || isMyWardAndPaguthi;
        });

        setComplaints(filteredIssues);
      }

      if (membersRes.data.success) {
        const wardNumberMatch = assignedWard.match(/\d+/);
        const wardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : 72;

        const filteredMembers = (membersRes.data.data || []).filter((m) => {
          if (!m.wardId) return true;
          if (typeof m.wardId === 'object' && m.wardId.wardNumber) {
            return m.wardId.wardNumber === wardNum;
          }
          return true;
        });

        // If backend has no members seeded for this specific ward, provide verified ward cadre list
        if (filteredMembers.length > 0) {
          setMembers(filteredMembers);
        } else {
          setMembers([
            {
              _id: 'm1',
              memberId: 'TVK-CBE-W72-001',
              fullName: 'K. R. Vijayakumar',
              tamilName: 'கே. ஆர். விஜயகுமார்',
              designation: 'Ward Secretary',
              mobileNumber: '9842100072',
              boothNumber: 'Booth 145',
              status: 'Active',
              isOfficeBearer: true,
              joiningDate: '2024-02-15',
            },
            {
              _id: 'm2',
              memberId: 'TVK-CBE-W72-002',
              fullName: 'M. Senthilkumar',
              tamilName: 'எம். செந்தில்குமார்',
              designation: 'Ward Deputy Secretary',
              mobileNumber: '9842211172',
              boothNumber: 'Booth 146',
              status: 'Active',
              isOfficeBearer: true,
              joiningDate: '2024-03-01',
            },
            {
              _id: 'm3',
              memberId: 'TVK-CBE-W72-003',
              fullName: 'R. Kausalya Devi',
              tamilName: 'ஆர். கௌசல்யா தேவி',
              designation: 'Ward Women Wing In-Charge',
              mobileNumber: '9842322272',
              boothNumber: 'Booth 148',
              status: 'Active',
              isOfficeBearer: true,
              joiningDate: '2024-03-10',
            },
            {
              _id: 'm4',
              memberId: 'TVK-CBE-W72-004',
              fullName: 'P. Vigneshwaran',
              tamilName: 'பி. விக்னேஸ்வரன்',
              designation: 'Ward Youth Wing Secretary',
              mobileNumber: '9842433372',
              boothNumber: 'Booth 152',
              status: 'Active',
              isOfficeBearer: true,
              joiningDate: '2024-04-05',
            },
            {
              _id: 'm5',
              memberId: 'TVK-CBE-W72-005',
              fullName: 'S. Arumugam',
              tamilName: 'எஸ். ஆறுமுகம்',
              designation: 'Booth In-Charge',
              mobileNumber: '9842544472',
              boothNumber: 'Booth 155',
              status: 'Active',
              isOfficeBearer: false,
              joiningDate: '2024-04-20',
            },
            {
              _id: 'm6',
              memberId: 'TVK-CBE-W72-006',
              fullName: 'T. Kavitha',
              tamilName: 'டி. கவிதா',
              designation: 'Cadre Volunteer',
              mobileNumber: '9842655572',
              boothNumber: 'Booth 160',
              status: 'Active',
              isOfficeBearer: false,
              joiningDate: '2024-05-12',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load ward portal data:', err);
      notifyError('Failed to load assigned ward data.');
    } finally {
      setLoading(false);
      isFetchingWardRef.current = false;
    }
  };

  // Live polling synchronization: auto-refetches in background so user complaints appear automatically
  useEffect(() => {
    fetchWardData(false);
    const timer = setInterval(() => fetchWardData(true), 15000);
    return () => clearInterval(timer);
  }, [assignedWard]);

  // Compute live statistics with consistent mapping:
  // - Total Assigned Complaints
  // - Pending Complaints: Pending, New, Assigned, Under Review
  // - In Progress Complaints: In Progress
  // - Completed Complaints: Completed, Resolved, Closed
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter((c) => ['Pending', 'New', 'Assigned', 'Under Review'].includes(c.status)).length;
  const inProgressComplaints = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedComplaints = complaints.filter((c) => ['Completed', 'Resolved', 'Closed'].includes(c.status)).length;

  // Filtered complaints based on selected section, status dropdown, and search
  const filteredComplaints = complaints.filter((c) => {
    // 1. Primary Section filter: All vs Pending Actions vs Completed Actions
    if (complaintSection === 'pending') {
      if (['Completed', 'Resolved', 'Closed'].includes(c.status)) return false;
    } else if (complaintSection === 'completed') {
      if (!['Completed', 'Resolved', 'Closed'].includes(c.status)) return false;
    }

    // 2. Status dropdown filter
    const matchesStatus =
      complaintStatusFilter === 'All'
        ? true
        : complaintStatusFilter === 'Pending'
        ? ['Pending', 'New', 'Assigned', 'Under Review'].includes(c.status)
        : complaintStatusFilter === 'In Progress'
        ? c.status === 'In Progress'
        : complaintStatusFilter === 'Completed' || complaintStatusFilter === 'Resolved'
        ? ['Completed', 'Resolved', 'Closed'].includes(c.status)
        : c.status === complaintStatusFilter;

    // 3. Search text filter
    const matchesSearch = complaintSearch.trim()
      ? (c.issueCode || '').toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.citizenName || '').toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.category || '').toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.actionTaken || '').toLowerCase().includes(complaintSearch.toLowerCase())
      : true;

    return matchesStatus && matchesSearch;
  });

  // Filtered members
  const filteredMembers = members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const term = memberSearch.toLowerCase();
    return (
      (m.fullName || '').toLowerCase().includes(term) ||
      (m.tamilName || '').toLowerCase().includes(term) ||
      (m.memberId || '').toLowerCase().includes(term) ||
      (m.mobileNumber || '').toLowerCase().includes(term) ||
      (m.designation || '').toLowerCase().includes(term) ||
      (m.boothNumber || '').toLowerCase().includes(term)
    );
  });

  // Action 1: Start Work
  const handleStartWork = async (complaint) => {
    try {
      const res = await api.put(`/issues/${complaint._id}/start-work`);
      if (res.data.success) {
        notifySuccess(`Work started on ${complaint.issueCode}. Field timestamp recorded.`);
        fetchWardData();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to record start of work');
    }
  };

  // Action 2: Open Complaint Action Form
  const handleOpenCompleteModal = (complaint) => {
    setSelectedComplaint(complaint);
    setActionForm({
      beforeImage: complaint.beforeImage || complaint.beforePhoto || (complaint.attachments && complaint.attachments[0]?.fileUrl) || '',
      afterImage: complaint.afterImage || complaint.afterPhoto || '',
      actionTaken: complaint.actionTaken || complaint.finalReport || '',
      wardSecretaryRemarks: complaint.wardSecretaryRemarks || '',
    });
    setIsReportModalOpen(true);
  };

  const handleBeforeImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      notifyError('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notifyError('File size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setUploadingBeforeImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.url) {
        setActionForm((prev) => ({ ...prev, beforeImage: res.data.url }));
        notifySuccess('Before Image uploaded successfully to server storage!');
      }
    } catch (err) {
      console.error('Before Image upload failed:', err);
      notifyError(err.response?.data?.message || 'Failed to upload Before Image');
    } finally {
      setUploadingBeforeImage(false);
    }
  };

  const handleAfterImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      notifyError('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notifyError('File size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setUploadingAfterImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.url) {
        setActionForm((prev) => ({ ...prev, afterImage: res.data.url }));
        notifySuccess('After Image uploaded successfully to server storage!');
      }
    } catch (err) {
      console.error('After Image upload failed:', err);
      notifyError(err.response?.data?.message || 'Failed to upload After Image');
    } finally {
      setUploadingAfterImage(false);
    }
  };

  // Action 3: Save & Complete
  const handleSaveAndComplete = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    if (uploadingBeforeImage || uploadingAfterImage) {
      notifyError('Please wait for image uploads to complete.');
      return;
    }

    if (!actionForm.beforeImage) {
      notifyError('Before Image upload is mandatory. Please select a Before image.');
      return;
    }
    if (!actionForm.afterImage) {
      notifyError('After Image upload is mandatory. Please select an After image.');
      return;
    }
    if (!actionForm.actionTaken.trim()) {
      notifyError('Action Taken / Work Completed description is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetId = selectedComplaint.id || selectedComplaint._id;
      const res = await api.put(`/issues/${targetId}/complete-work`, {
        beforeImage: actionForm.beforeImage,
        afterImage: actionForm.afterImage,
        actionTaken: actionForm.actionTaken.trim(),
        wardSecretaryRemarks: actionForm.wardSecretaryRemarks.trim(),
      });
      if (res.data.success) {
        notifySuccess(`Complaint ${selectedComplaint.issueCode} action completed & saved to MySQL! Visible under Completed Actions.`);
        setIsReportModalOpen(false);
        setComplaintSection('completed');
        setActiveTab('complaints');
        fetchWardData(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to complete complaint action');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo handlers for Complaint Registration Form
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (complaintForm.photos.length + files.length > 5) {
      notifyError('Maximum 5 photographs allowed');
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComplaintForm((prev) => ({
          ...prev,
          photos: [...prev.photos, reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setComplaintForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  // Submit Complaint Form
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.citizenName.trim()) {
      notifyError('Complainant name is required');
      return;
    }
    if (!complaintForm.citizenMobile.trim() || complaintForm.citizenMobile.length < 10) {
      notifyError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!complaintForm.title.trim()) {
      notifyError('Complaint subject is required');
      return;
    }
    if (!complaintForm.description.trim()) {
      notifyError('Complaint description is required');
      return;
    }

    try {
      setIsSubmittingComplaint(true);
      const wardNumberMatch = assignedWard.match(/\d+/);
      const wardNum = wardNumberMatch ? parseInt(wardNumberMatch[0], 10) : 72;

      const payload = {
        citizenName: complaintForm.citizenName.trim(),
        citizenMobile: complaintForm.citizenMobile.trim(),
        category: complaintForm.category,
        title: complaintForm.title.trim(),
        description: complaintForm.description.trim(),
        location: complaintForm.location.trim() || `${paguthi}, ${assignedWard}`,
        priority: complaintForm.priority,
        paguthi: paguthi,
        wardNumber: wardNum,
        status: 'New',
        beforePhoto: complaintForm.photos[0] || '',
        attachments: complaintForm.photos.map((p, i) => ({
          fileName: `ward_field_photo_${i + 1}.jpg`,
          fileUrl: p,
          mimeType: 'image/jpeg',
        })),
      };

      const res = await api.post('/issues', payload);
      if (res.data.success) {
        notifySuccess(`Complaint registered successfully! Token: ${res.data.data.issueCode}`);
        setSubmittedComplaintToken(res.data.data.issueCode);
        setComplaintForm({
          citizenName: '',
          citizenMobile: '',
          category: 'Drinking Water',
          title: '',
          description: '',
          location: '',
          priority: 'Medium',
          photos: [],
        });
        fetchWardData();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to register complaint');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Open detail modal with field visit progress update
  const openComplaintDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setModalNewStatus(complaint.status || 'Pending');
    setModalComments('');
    setModalPhotos([]);
    setIsDetailModalOpen(true);
  };

  // Submit Progress / Field Visit Update from Modal (matches reference site)
  const handleModalUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      setIsSavingModalUpdate(true);
      const payload = {
        status: modalNewStatus,
        adminRemarks: modalComments ? `Ward Sec Update: ${modalComments}` : undefined,
        notes: modalComments,
        afterPhoto: modalPhotos[0] || undefined,
      };
      const res = await api.put(`/issues/${selectedComplaint._id}`, payload);
      if (res.data.success) {
        notifySuccess(`Status update saved for ${selectedComplaint.issueCode}!`);
        setIsDetailModalOpen(false);
        fetchWardData();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to save status update');
    } finally {
      setIsSavingModalUpdate(false);
    }
  };

  if (loading && complaints.length === 0 && members.length === 0) {
    return <LoadingSpinner fullScreen text="Loading Ward Secretary Portal..." />;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* ================= HEADER ================= */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-2.5 sm:px-6 md:px-8 py-2 sm:py-3.5 shadow-md flex items-center justify-between text-white sticky top-0 z-50">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFD32A] text-[#850000] font-black text-xs sm:text-base flex items-center justify-center shadow-md flex-shrink-0">
            TVK
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight truncate max-w-[140px] min-[400px]:max-w-[200px] sm:max-w-none">
              {t('wardSecretary.portalTitle', 'TVK Ward Secretary Portal')}
            </h1>
            <p className="text-[10px] sm:text-[10.5px] text-[#FFD32A] font-semibold truncate hidden sm:block">
              {t('wardSecretary.portalSubtitle', 'களப்பணி மற்றும் குறைதீர்வு நிர்வாகம்')} • {paguthi} ({assignedWard})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 text-xs flex-shrink-0">
          {/* Ward Badge - visible on larger screens to prevent mobile overflow */}
          <div className="hidden md:flex items-center space-x-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/20">
            <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
            <span className="font-bold text-[11px] sm:text-xs truncate max-w-[200px]">{paguthi} • {assignedWard}</span>
          </div>

          <LanguageSwitcher variant="dark" />

          <button
            onClick={logout}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-black/20 hover:bg-black/40 px-2 sm:px-3.5 py-1.5 rounded-full border border-white/20 transition text-[10px] sm:text-[11px] font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span className="hidden min-[480px]:inline">{t('common.logout', 'Logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        {/* Ward Secretary Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#E9E2DC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#850000] to-[#A00000] text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-md border-2 border-[#FFD32A] flex-shrink-0">
              <Building className="w-5 h-5 sm:w-7 sm:h-7 text-[#FFD32A]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  {user?.name || 'K. R. Vijayakumar (Ward Secretary)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold bg-red-50 text-[#A00000] border border-red-200">
                  {t('wardSecretary.badge', 'Ward Secretary')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate">
                {t('wardSecretary.jurisdiction', 'Jurisdiction')}: <strong>{assignedWard}</strong> • {paguthi} Paguthi • {constituency}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div className="bg-[#FFF8F0] p-2 sm:p-2.5 rounded-xl border border-[#FFE5A3]/50 text-center">
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 block truncate">{t('wardSecretary.totalAssigned', 'Total Assigned')}</span>
              <strong className="text-slate-900 font-black text-sm sm:text-base">{totalComplaints}</strong>
            </div>
            <div className="bg-amber-50 p-2 sm:p-2.5 rounded-xl border border-amber-200/60 text-center">
              <span className="text-[9.5px] sm:text-[10px] text-amber-700 block truncate">{t('wardSecretary.pendingFieldAction', 'Pending')}</span>
              <strong className="text-amber-800 font-black text-sm sm:text-base">{pendingComplaints}</strong>
            </div>
            <div className="bg-blue-50 p-2 sm:p-2.5 rounded-xl border border-blue-200/60 text-center">
              <span className="text-[9.5px] sm:text-[10px] text-blue-700 block truncate">{t('wardSecretary.workInProgress', 'In Progress')}</span>
              <strong className="text-blue-800 font-black text-sm sm:text-base">{inProgressComplaints}</strong>
            </div>
            <div className="bg-emerald-50 p-2 sm:p-2.5 rounded-xl border border-emerald-200/60 text-center">
              <span className="text-[9.5px] sm:text-[10px] text-emerald-700 block truncate">{t('wardSecretary.actionCompleted', 'Completed')}</span>
              <strong className="text-emerald-800 font-black text-sm sm:text-base">{resolvedComplaints}</strong>
            </div>
          </div>
        </div>

        {/* ================= MODULE TABS ================= */}
        <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 sm:gap-2 text-xs font-bold overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('wardSecretary.tabOverview', 'Dashboard Overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('register-complaint')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'register-complaint'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span>{t('wardSecretary.tabRegisterComplaint', 'Register Complaint')}</span>
            <span className="text-[10px] bg-[#FFD32A] text-slate-900 px-1.5 py-0.2 rounded font-black">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'complaints'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('wardSecretary.tabComplaints', 'Assigned Complaints')} ({complaints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ward-info')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'ward-info'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>{t('wardSecretary.jurisdiction', 'Assigned Ward Information')}</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('wardSecretary.tabMembers', 'Assigned Members')} ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Secretary Profile</span>
          </button>
        </div>

        {/* ================= TAB 1: DASHBOARD OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Jurisdiction Banner */}
            <div className="bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex items-center space-x-2 text-[#FFD32A] text-xs font-bold uppercase tracking-wider mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{constituency} Assembly Constituency</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black">
                  {paguthi} Paguthi • {assignedWard}
                </h2>
                <p className="text-xs text-red-100 mt-1">
                  Logged in as <strong className="text-white">{user?.name || 'Ward Secretary'}</strong> (@{user?.username})
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="bg-[#FFD32A] text-red-950 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl font-extrabold shadow-xs text-[11px] sm:text-xs">
                  Active Ward Secretary Jurisdiction
                </span>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E9E2DC] shadow-xs text-center">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold truncate">Total Assigned</span>
                <p className="text-lg sm:text-2xl font-black text-[#850000] mt-1">{totalComplaints}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 shadow-xs text-center bg-amber-50/20">
                <span className="text-[10px] sm:text-[10.5px] text-amber-800 block font-semibold truncate">Pending Actions</span>
                <p className="text-lg sm:text-2xl font-black text-amber-700 mt-1">{pendingComplaints}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-200 shadow-xs text-center bg-blue-50/20">
                <span className="text-[10px] sm:text-[10.5px] text-blue-800 block font-semibold truncate">In Progress</span>
                <p className="text-lg sm:text-2xl font-black text-blue-700 mt-1">{inProgressComplaints}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 shadow-xs text-center bg-emerald-50/20">
                <span className="text-[10px] sm:text-[10.5px] text-emerald-800 block font-semibold truncate">Completed</span>
                <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-1">{resolvedComplaints}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#FFE5A3] shadow-xs text-center bg-[#FFF8F0]">
                <span className="text-[10px] sm:text-[10.5px] text-slate-600 block font-semibold truncate">Assigned Cadres</span>
                <p className="text-lg sm:text-2xl font-black text-[#A00000] mt-1">{members.length}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold truncate">Ward Population</span>
                <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1">~45,000</p>
              </div>
            </div>

            {/* Quick Action & Highlights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left 2 Cols: Priority Complaints Requiring Field Action */}
              <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#E9E2DC] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#252525]">
                      Field Complaints Management
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setOverviewComplaintTab('pending')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                          overviewComplaintTab === 'pending'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Pending Actions ({pendingComplaints})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverviewComplaintTab('completed')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                          overviewComplaintTab === 'completed'
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed Actions ({resolvedComplaints})</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('register-complaint')}
                      className="px-3 sm:px-3.5 py-1.5 bg-[#850000] hover:bg-[#A00000] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#FFD32A]" />
                      <span>Register Complaint</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('complaints');
                        setComplaintSection(overviewComplaintTab);
                      }}
                      className="text-xs font-bold text-[#A00000] hover:underline cursor-pointer"
                    >
                      View All ({complaints.length})
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {overviewComplaintTab === 'pending' ? (
                    complaints.filter((c) => !['Completed', 'Resolved', 'Closed'].includes(c.status)).slice(0, 4).length === 0 ? (
                      <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">All assigned grievances resolved!</p>
                        <p className="text-[11px] text-slate-500">No pending field work currently in {assignedWard}.</p>
                      </div>
                    ) : (
                      complaints
                        .filter((c) => !['Completed', 'Resolved', 'Closed'].includes(c.status))
                        .slice(0, 4)
                        .map((c) => (
                          <div
                            key={c._id}
                            className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-[#A00000] transition bg-[#FFF8F0]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-[#A00000] bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px]">
                                  {c.issueCode}
                                </span>
                                <PriorityBadge priority={c.priority} />
                                <StatusBadge status={c.status} />
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{c.title}</h4>
                              <p className="text-[11px] text-slate-500">
                                Citizen: {c.citizenName} • Location: {c.location || c.citizenAddress || 'Assigned Ward'}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2 self-start sm:self-center flex-wrap gap-y-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {['Pending', 'New', 'Assigned'].includes(c.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleStartWork(c)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Start</span>
                                </button>
                              )}

                              {c.status !== 'Completed' && c.status !== 'Resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCompleteModal(c)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Take Action</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )
                  ) : (
                    complaints.filter((c) => ['Completed', 'Resolved', 'Closed'].includes(c.status)).slice(0, 4).length === 0 ? (
                      <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                        <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No completed actions yet</p>
                        <p className="text-[11px] text-slate-500">Take action on pending complaints to see completed records here.</p>
                      </div>
                    ) : (
                      complaints
                        .filter((c) => ['Completed', 'Resolved', 'Closed'].includes(c.status))
                        .slice(0, 4)
                        .map((c) => (
                          <div
                            key={c._id}
                            className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 hover:border-emerald-400 transition bg-emerald-50/20 flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[10px]">
                                    {c.issueCode}
                                  </span>
                                  <PriorityBadge priority={c.priority} />
                                  <StatusBadge status={c.status} />
                                  {c.completedAt && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(c.completedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{c.title}</h4>
                                <p className="text-[11px] text-slate-500">
                                  Citizen: {c.citizenName} • Location: {c.location || c.citizenAddress || 'Assigned Ward'}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2 self-start sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedComplaint(c);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Action</span>
                                </button>
                              </div>
                            </div>

                            {/* Completed Action Snippet */}
                            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11.5px] text-emerald-950 font-medium">
                              <strong className="text-emerald-900 block mb-0.5">Action Taken:</strong>
                              <p className="line-clamp-2">{c.actionTaken || c.finalReport || 'Action completed and verified on ground.'}</p>
                            </div>
                          </div>
                        ))
                    )
                  )}
                </div>
              </div>

              {/* Right Col: Ward Quick Profile Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#E9E2DC] shadow-xs space-y-4">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF8F0] border border-[#FFE5A3] flex items-center justify-center text-[#A00000] font-black">
                    72
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{assignedWard} Profile</h4>
                    <p className="text-[11px] text-slate-500">{paguthi} Paguthi • Central Zone</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Assembly:</span>
                    <strong className="text-slate-900">{constituency}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Zone Jurisdiction:</span>
                    <strong className="text-slate-900">Central Zone, Coimbatore</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Cadre Force:</span>
                    <strong className="text-[#A00000]">{members.length} Verified Cadres</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Polling Booths:</span>
                    <strong className="text-slate-900">Booths 142 - 178</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Headquarters:</span>
                    <span className="text-slate-700 text-right font-medium">R.S. Puram Ward Office</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('ward-info')}
                    className="w-full py-2.5 bg-[#FFF8F0] hover:bg-[#FFE5A3]/40 text-[#A00000] border border-[#FFE5A3] rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>View Comprehensive Ward Info</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: REGISTER COMPLAINT ================= */}
        {activeTab === 'register-complaint' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#E9E2DC] shadow-sm">
              <div className="border-b border-slate-100 pb-4 sm:pb-5 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-50 text-[#850000] text-[10.5px] sm:text-[11px] font-bold border border-red-200 mb-1.5 sm:mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Official Ward Secretary Form</span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-[#850000]">
                    Ward Secretary Complaint Registration
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                    களப்பணி குறை பதிவு • Submissions are saved to MongoDB Atlas and assigned status <strong className="text-red-700">New</strong> for immediate administrative review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('complaints')}
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-[#850000] font-bold self-start sm:self-auto cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View All Assigned Complaints</span>
                </button>
              </div>

              {submittedComplaintToken ? (
                <div className="max-w-xl mx-auto p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-emerald-900">
                      Grievance Registered Successfully in MongoDB Atlas!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      The complaint has been recorded with initial status <strong>New</strong> and synced with the District Admin Command Center.
                    </p>
                  </div>
                  <div className="bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-emerald-400 font-mono text-base sm:text-lg font-black text-[#850000] tracking-wider inline-block shadow-sm break-all max-w-full">
                    {submittedComplaintToken}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 pt-2 sm:pt-3">
                    <button
                      onClick={() => setSubmittedComplaintToken(null)}
                      className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#850000] hover:bg-[#A00000] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Register Another Complaint
                    </button>
                    <button
                      onClick={() => {
                        setSubmittedComplaintToken(null);
                        setActiveTab('complaints');
                      }}
                      className="px-4 sm:px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      View in My Complaints
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  {/* Left Form (8 Cols) */}
                  <form onSubmit={handleSubmitComplaint} className="lg:col-span-8 space-y-4 sm:space-y-5">
                    {/* Citizen Details Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Complainant / Citizen Name <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Enter citizen's full name"
                            value={complaintForm.citizenName}
                            onChange={(e) => setComplaintForm({ ...complaintForm, citizenName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mobile Number <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            value={complaintForm.citizenMobile}
                            onChange={(e) => setComplaintForm({ ...complaintForm, citizenMobile: e.target.value.replace(/\D/g, '') })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#850000]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Category & Priority Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Complaint Category <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={complaintForm.category}
                          onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                        >
                          <option value="Drinking Water">Drinking Water (குடிநீர் விநியோகம்)</option>
                          <option value="Street Lighting">Street Lighting (தெருவிளக்கு பராமரிப்பு)</option>
                          <option value="Road Infrastructure">Road Infrastructure (சாலை வசதி / சீரமைப்பு)</option>
                          <option value="Sanitation / Drainage">Sanitation / Drainage (சாக்கடை / கழிவுநீர் வடிகால்)</option>
                          <option value="Public Transport">Public Transport (பொதுப் போக்குவரத்து)</option>
                          <option value="Electricity / TANGEDCO">Electricity / TANGEDCO (மின்சார வசதி)</option>
                          <option value="Public Health">Public Health (பொது சுகாதாரம்)</option>
                          <option value="Education & Schools">Education & Schools (பள்ளிகள் / கல்வி)</option>
                          <option value="Parks & Playgrounds">Parks & Playgrounds (பூங்காக்கள்)</option>
                          <option value="Other">Other (இதர பிரச்சனைகள்)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Priority Level
                        </label>
                        <select
                          value={complaintForm.priority}
                          onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                        >
                          <option value="Low">Low - சாதாரணமானது</option>
                          <option value="Medium">Medium - நடுத்தரம்</option>
                          <option value="High">High - அவசரம்</option>
                          <option value="Critical">Critical - மிக அவசரம்</option>
                        </select>
                      </div>
                    </div>

                    {/* Complaint Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Complaint Subject / Title <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Broken drainage cover slabs near Flower Market gate"
                        value={complaintForm.title}
                        onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                    </div>

                    {/* Specific Location / Street Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Specific Location / Street Address <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. 55, Market Road, Near Flower Market Gate 2, R.S. Puram"
                          value={complaintForm.location}
                          onChange={(e) => setComplaintForm({ ...complaintForm, location: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                        />
                      </div>
                    </div>

                    {/* Jurisdiction Locked Badges */}
                    <div className="p-3 bg-amber-50/60 rounded-xl sm:rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold block uppercase tracking-wider">
                          Designated Jurisdiction
                        </span>
                        <span className="font-extrabold text-slate-800">
                          {assignedWard} • {paguthi} Paguthi • {constituency}
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300 self-start sm:self-auto">
                        Ward Verified
                      </span>
                    </div>

                    {/* Detailed Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detailed Description of the Grievance <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Provide full details of the issue, citizen statements, affected area, and immediate risks observed during field inspection..."
                        value={complaintForm.description}
                        onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                    </div>

                    {/* Multi-Photo Upload */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Site Visit Photographs (Max 5 photos)
                        </label>
                        <span className="text-[10.5px] text-slate-400">
                          {complaintForm.photos.length}/5 uploaded
                        </span>
                      </div>

                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3.5 sm:p-4 text-center hover:border-red-300 transition bg-slate-50/60">
                        <input
                          type="file"
                          id="complaint-photos-input"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                          disabled={complaintForm.photos.length >= 5}
                        />
                        <label
                          htmlFor="complaint-photos-input"
                          className={`inline-flex flex-col items-center justify-center cursor-pointer ${
                            complaintForm.photos.length >= 5 ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-[#850000] mb-1" />
                          <span className="text-xs font-bold text-slate-700">
                            Click to upload site photographs
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Supports JPG, PNG up to 5MB each
                          </span>
                        </label>
                      </div>

                      {/* Photo Previews */}
                      {complaintForm.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 sm:gap-2.5 mt-3">
                          {complaintForm.photos.map((src, idx) => (
                            <div key={idx} className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                              <img src={src} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="absolute top-1 right-1 p-1 bg-red-700 hover:bg-red-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm cursor-pointer"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingComplaint}
                        className="w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white text-xs font-black tracking-wider uppercase hover:shadow-lg transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#FFD32A]" />
                        <span>
                          {isSubmittingComplaint
                            ? 'Registering Complaint in MongoDB Atlas...'
                            : 'Submit Grievance to Admin Command Center'}
                        </span>
                      </button>
                    </div>
                  </form>

                  {/* Right Side Panel (4 Cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Ward Secretary Account Card */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
                        <div className="w-8 h-8 rounded-lg bg-[#850000] text-[#FFD32A] font-bold text-xs flex items-center justify-center">
                          WS
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Ward Secretary Account</h4>
                          <span className="text-[10px] text-slate-500">Official Jurisdiction</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Secretary ID</span>
                          <span className="font-mono font-bold text-[#850000]">{user?.username || 'ward'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Secretary Name</span>
                          <span className="font-semibold text-slate-800">{user?.name || 'K. R. Vijayakumar'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Ward</span>
                          <span className="font-bold text-slate-800">{assignedWard}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Paguthi & Constituency</span>
                          <span className="font-semibold text-slate-700">{paguthi} • {constituency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Field Complaint Guidelines */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span>Registration Guidelines</span>
                      </h4>

                      <div className="space-y-2.5 text-xs text-slate-600 leading-snug">
                        <div className="flex items-start space-x-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                          <span><strong>Valid Citizen Mobile:</strong> Required for automated SMS updates and token tracking.</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                          <span><strong>Photo Evidence:</strong> Upload up to 5 clear on-site photographs before initiating ground work.</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                          <span><strong>Ward Jurisdiction:</strong> Only file issues pertaining to your registered ward territory.</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                          <span><strong>Real-time Sync:</strong> Submissions are instantly assigned Complaint ID (<code className="text-red-700 font-bold">GRI-YYYY-XXXX</code>) with status <strong>New</strong>.</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200/80 text-xs text-red-900">
                      <p className="font-bold flex items-center space-x-1 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#850000]" />
                        <span>MongoDB Atlas Database</span>
                      </p>
                      <p className="text-[11px] text-red-800">
                        All complaints are persistently stored in the cloud cluster and remain accessible across all logins and sessions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ASSIGNED WARD INFORMATION ================= */}
        {activeTab === 'ward-info' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-slate-100 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-extrabold text-[#252525]">
                {assignedWard} Comprehensive Information
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Demographic, electoral, infrastructural, and administrative details for official grassroots governance
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
              <div className="p-3.5 sm:p-4 bg-[#FFF8F0] rounded-xl sm:rounded-2xl border border-[#FFE5A3]/60 space-y-1">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold">Ward Number & Designation</span>
                <strong className="text-sm sm:text-base font-extrabold text-[#850000] block">{assignedWard} - R.S. Puram West</strong>
                <span className="text-[11px] text-slate-600 block">Coimbatore City Municipal Corporation</span>
              </div>

              <div className="p-3.5 sm:p-4 bg-[#FFF8F0] rounded-xl sm:rounded-2xl border border-[#FFE5A3]/60 space-y-1">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold">Assembly Constituency</span>
                <strong className="text-sm sm:text-base font-extrabold text-[#850000] block">{constituency} (LAC 118)</strong>
                <span className="text-[11px] text-slate-600 block">District: Coimbatore District</span>
              </div>

              <div className="p-3.5 sm:p-4 bg-[#FFF8F0] rounded-xl sm:rounded-2xl border border-[#FFE5A3]/60 space-y-1">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold">Assigned Paguthi & Zone</span>
                <strong className="text-sm sm:text-base font-extrabold text-[#850000] block">{paguthi} Paguthi</strong>
                <span className="text-[11px] text-slate-600 block">Central Zone Administrative Office</span>
              </div>

              <div className="p-3.5 sm:p-4 bg-[#FFF8F0] rounded-xl sm:rounded-2xl border border-[#FFE5A3]/60 space-y-1">
                <span className="text-[10px] sm:text-[10.5px] text-slate-500 block font-semibold">Estimated Population & Voters</span>
                <strong className="text-sm sm:text-base font-extrabold text-[#850000] block">~45,200 Residents</strong>
                <span className="text-[11px] text-slate-600 block">32,800 Registered Electorates</span>
              </div>
            </div>

            {/* In-depth Ward Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs">
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#A00000]" />
                  <span>Geographical Boundaries & Coverage</span>
                </h4>
                <ul className="space-y-2 text-slate-700 leading-relaxed list-disc list-inside">
                  <li><strong>North:</strong> Thadagam Road & R.S. Puram North Cross Road</li>
                  <li><strong>South:</strong> Sukrawarpettai & Telungupalayam Road</li>
                  <li><strong>East:</strong> Diwan Bahadur (D.B.) Road Commercial Corridor</li>
                  <li><strong>West:</strong> Selvapuram Lake periphery & Chokkampudur boundary</li>
                  <li><strong>Total Area Coverage:</strong> Approximately 3.4 square kilometers</li>
                </ul>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-[#A00000]" />
                  <span>Key Civic & Public Infrastructure</span>
                </h4>
                <ul className="space-y-2 text-slate-700 leading-relaxed list-disc list-inside">
                  <li><strong>Educational Institutions:</strong> 4 Corporation Schools, 2 Government-aided Higher Secondary Schools</li>
                  <li><strong>Healthcare Facilities:</strong> 2 Corporation Urban Primary Health Centres (UPHC)</li>
                  <li><strong>Public Markets & Halls:</strong> R.S. Puram Municipal Market, 3 Community Recreation Halls</li>
                  <li><strong>Water & Drainage:</strong> Siruvani water supply distribution grid & underground sewerage network</li>
                  <li><strong>Electoral Booths:</strong> 37 Polling stations (Booths 142 through 178)</li>
                </ul>
              </div>
            </div>

            {/* Ward Leadership & Secretary Responsibilities */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-extrabold text-sm text-slate-900">
                Official Duties of the TVK Ward Secretary
              </h4>
              <p className="text-slate-600 leading-relaxed">
                As the appointed TVK Ward Secretary for {assignedWard}, you hold primary jurisdiction over grassroots public grievance verification, rapid on-ground inspection, coordinating with municipal officers, mobilizing verified cadre volunteers, and submitting resolution proofs to the District Leadership.
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ASSIGNED MEMBERS ================= */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#252525]">
                  Assigned Cadre Members in {assignedWard}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Registered party office bearers and grassroots volunteers active in this ward
                </p>
              </div>

              {/* Member Search */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search cadre by name, ID, phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-[#A00000]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-[#FFF8F0] border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Member ID</th>
                    <th className="py-3 px-3">Full Name</th>
                    <th className="py-3 px-3">Tamil Name</th>
                    <th className="py-3 px-3">Designation / Role</th>
                    <th className="py-3 px-3">Booth Number</th>
                    <th className="py-3 px-3">Mobile</th>
                    <th className="py-3 px-3">Joining Date</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No cadre members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-[#A00000] whitespace-nowrap">
                          {m.memberId}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {m.fullName}
                        </td>
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                          {m.tamilName || '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {m.designation}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {m.boothNumber || 'General'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {m.mobileNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {m.joiningDate ? new Date(m.joiningDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {m.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ASSIGNED COMPLAINTS ================= */}
        {activeTab === 'complaints' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#252525]">
                  Ward Civic Complaints & Field Action Management
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  {assignedWard} • Take Action on assigned petitions, upload resolution proofs, and inspect completed works
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial min-w-[140px]">
                  <input
                    type="text"
                    value={complaintSearch}
                    onChange={(e) => setComplaintSearch(e.target.value)}
                    placeholder="Search by Code, Citizen, Title..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-[#A00000]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>

                {/* Status Dropdown */}
                <select
                  value={complaintStatusFilter}
                  onChange={(e) => setComplaintStatusFilter(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Complaints</option>
                  <option value="In Progress">In Progress Complaints</option>
                  <option value="Completed">Completed Complaints</option>
                </select>
              </div>
            </div>

            {/* THREE MANDATORY SECTIONS: Assigned Complaints | Pending Actions | Completed Actions / Action Taken */}
            <div className="flex overflow-x-auto no-scrollbar whitespace-nowrap sm:flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setComplaintSection('all');
                  setComplaintStatusFilter('All');
                }}
                className={`flex-shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  complaintSection === 'all'
                    ? 'bg-[#850000] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assigned Complaints</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  complaintSection === 'all' ? 'bg-[#FFD32A] text-slate-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {totalComplaints}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setComplaintSection('pending');
                  setComplaintStatusFilter('All');
                }}
                className={`flex-shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  complaintSection === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Actions</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  complaintSection === 'pending' ? 'bg-white text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pendingComplaints}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setComplaintSection('completed');
                  setComplaintStatusFilter('All');
                }}
                className={`flex-shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  complaintSection === 'completed'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed Actions / Action Taken</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  complaintSection === 'completed' ? 'bg-white text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {resolvedComplaints}
                </span>
              </button>
            </div>

            {/* Section Description Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs px-1">
              <span className="text-slate-500 font-medium">
                {complaintSection === 'all' && `Showing all ${filteredComplaints.length} grievances assigned in ${assignedWard}`}
                {complaintSection === 'pending' && `Showing ${filteredComplaints.length} grievances awaiting on-ground resolution`}
                {complaintSection === 'completed' && `Showing ${filteredComplaints.length} completed actions with ground verification details`}
              </span>
              {complaintSection === 'completed' && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  All action records permanently preserved in MySQL
                </span>
              )}
            </div>

            {/* Complaints Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComplaints.length === 0 ? (
                <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  {complaintSection === 'completed'
                    ? 'No completed actions found yet. Complete pending complaints to view them here permanently.'
                    : complaintSection === 'pending'
                    ? 'All assigned complaints in this ward have been resolved! No pending actions.'
                    : `No grievances found matching your current filter in ${assignedWard}.`}
                </div>
              ) : (
                filteredComplaints.map((c) => {
                  const isCompleted = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                  const beforePhotoSrc = c.beforeImage || c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl);
                  const afterPhotoSrc = c.afterImage || c.afterPhoto;

                  return (
                    <div
                      key={c._id || c.id}
                      className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition space-y-3.5 flex flex-col justify-between ${
                        isCompleted ? 'border-emerald-200 bg-emerald-50/10' : 'border-[#E9E2DC]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            isCompleted
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              : 'text-[#A00000] bg-red-50 border-red-200'
                          }`}>
                            {c.issueCode}
                          </span>
                          <div className="flex items-center space-x-2">
                            <PriorityBadge priority={c.priority} />
                            <StatusBadge status={c.status} />
                          </div>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{c.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>

                        {/* Citizen & Location Box */}
                        <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                          <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-0.5">
                            <span className="text-slate-500">Citizen:</span>
                            <strong className="text-slate-800">{c.citizenName} ({c.citizenMobile})</strong>
                          </div>
                          <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-0.5">
                            <span className="text-slate-500">Location:</span>
                            <span className="text-slate-700 font-medium line-clamp-1">{c.location || c.citizenAddress}</span>
                          </div>
                          {c.workStartedAt && (
                            <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-0.5 pt-1 border-t border-slate-200/60 text-[11px]">
                              <span className="text-blue-700 font-semibold">Work Started:</span>
                              <span className="font-mono text-slate-600">{new Date(c.workStartedAt).toLocaleString()}</span>
                            </div>
                          )}
                          {c.completedAt && (
                            <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-0.5 text-[11px]">
                              <span className="text-emerald-700 font-semibold">Action Completed:</span>
                              <span className="font-mono text-slate-600">{new Date(c.completedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Completed Action Summary Box */}
                        {isCompleted && (
                          <div className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-900 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Action Taken / Resolution Summary</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                                Verified
                              </span>
                            </div>
                            <p className="text-emerald-950 font-medium leading-relaxed bg-white/90 p-2.5 rounded-xl border border-emerald-100 whitespace-pre-wrap">
                              {c.actionTaken || c.finalReport || 'Action completed on-ground and verified by Ward Secretary.'}
                            </p>
                            {c.wardSecretaryRemarks && (
                              <div className="text-[11px] text-slate-700 bg-white/70 p-2 rounded-lg border border-emerald-100">
                                <strong className="text-slate-900">Ward Secretary Remarks:</strong> {c.wardSecretaryRemarks}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Side-by-Side Before & After Photographs */}
                        <div className="pt-2">
                          <BeforeAfterComparison
                            complaint={c}
                            ticketCode={c.issueCode}
                            onImageClick={openZoom}
                            height="h-28"
                            compact
                          />
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'View Full Action Details' : 'Details'}</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          {!isCompleted && ['Pending', 'New', 'Assigned'].includes(c.status) && (
                            <button
                              type="button"
                              onClick={() => handleStartWork(c)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start Work</span>
                            </button>
                          )}

                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleOpenCompleteModal(c)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Take Action</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedComplaint(c);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <BadgeCheck className="w-3.5 h-3.5 text-[#FFD32A]" />
                              <span>Action Recorded</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-4 border-b border-slate-100 pb-4 sm:pb-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#850000] to-[#A00000] text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md border-2 border-[#FFD32A] flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">{user?.name || 'K. R. Vijayakumar'}</h3>
                <p className="text-xs text-[#850000] font-bold">Authorized Ward Secretary • {assignedWard}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active Party Credentials
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">System Username</span>
                <strong className="text-slate-900 font-mono font-bold text-xs sm:text-sm">{user?.username || 'ward'}</strong>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">Official Role</span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">Ward Secretary</strong>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">Contact Mobile Number</span>
                <strong className="text-slate-900 font-mono font-bold text-xs sm:text-sm">{user?.phone || '9842100072'}</strong>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">Official Email</span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">{user?.email || 'ward@tvkcbe.org'}</strong>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">Assigned Ward Jurisdiction</span>
                <strong className="text-[#850000] font-bold text-xs sm:text-sm">{assignedWard}</strong>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10.5px] sm:text-[11px]">Assembly Constituency</span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">{constituency}</strong>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-[#FFF8F0] rounded-xl sm:rounded-2xl border border-[#FFE5A3] text-xs space-y-1">
              <h5 className="font-bold text-[#850000]">Security & Access Notice</h5>
              <p className="text-slate-600">
                Your authenticated account is strictly scoped to {assignedWard}. You have full operational privileges to inspect, initiate, and resolve grievances within this ward.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* ================= COMPLAINT DETAILS & FIELD VISIT MODAL (Reference layout) ================= */}
      {isDetailModalOpen && selectedComplaint && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Ward Complaint Inspection: ${selectedComplaint.issueCode}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
              {/* Left Column (7 Cols): Complaint Info & Photo Gallery & History */}
              <div className="lg:col-span-7 space-y-3.5">
                <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-mono font-bold text-[#850000] text-sm">
                      {selectedComplaint.issueCode}
                    </span>
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority={selectedComplaint.priority} />
                      <StatusBadge status={selectedComplaint.status} />
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                    {selectedComplaint.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Citizen</span>
                      <strong className="text-slate-800">{selectedComplaint.citizenName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile</span>
                      <strong className="text-slate-800 font-mono">{selectedComplaint.citizenMobile}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Ward / Paguthi</span>
                      <span className="text-slate-700 font-medium">
                        {selectedComplaint.wardId?.wardNumber ? `Ward ${selectedComplaint.wardId.wardNumber}` : assignedWard} • {selectedComplaint.paguthi || paguthi}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                      <span className="text-slate-700 font-medium line-clamp-1">{selectedComplaint.location || selectedComplaint.citizenAddress || 'Assigned Ward'}</span>
                    </div>
                  </div>
                </div>

                {/* Complaint Description */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Complaint Description
                  </span>
                  <p className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Admin Remarks if present */}
                {selectedComplaint.adminRemarks && (
                  <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-xs">
                    <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block mb-0.5">
                      District Admin Remarks / Directives
                    </span>
                    <p className="text-red-950 font-medium">{selectedComplaint.adminRemarks}</p>
                  </div>
                )}

                {/* Site Visit Photographs */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Before & After Ground Photographs
                  </span>
                  <BeforeAfterComparison
                    complaint={selectedComplaint}
                    ticketCode={selectedComplaint.issueCode}
                    onImageClick={openZoom}
                    height="h-44"
                  />
                </div>

                {/* Progress History Timeline */}
                {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Progress History Timeline
                    </span>
                    <div className="space-y-2 border-l-2 border-red-300 ml-2 pl-3">
                      {selectedComplaint.statusHistory.map((h, i) => (
                        <div key={i} className="relative pb-1">
                          <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-[#850000]" />
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 text-[11px]">{h.status}</span>
                            <span className="text-[10px] text-slate-400">
                              {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                          {h.remarks && <p className="text-slate-600 text-[11px] mt-0.5">{h.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (5 Cols): Field Visit / Progress Update Form */}
              <div className="lg:col-span-5 bg-slate-50/70 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200 space-y-3 sm:space-y-3.5 flex flex-col justify-between">
                <form onSubmit={handleModalUpdateSubmit} className="space-y-3">
                  <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                    <Camera className="w-4 h-4 text-[#850000]" />
                    <h5 className="font-bold text-slate-900 text-xs">
                      {t('wardSecretary.fieldVisitTitle', 'Field Inspection & Progress Update')}
                    </h5>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('wardSecretary.statusUpdateLabel', 'Update Status')}
                    </label>
                    <select
                      value={modalNewStatus}
                      onChange={(e) => setModalNewStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#850000]"
                    >
                      <option value="New">{t('status.New', 'New')}</option>
                      <option value="Pending">{t('status.Pending', 'Pending')}</option>
                      <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
                      <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
                      <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
                      <option value="Closed">{t('status.Closed', 'Closed')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('wardSecretary.commentsLabel', 'Comments / Update Notes (Optional)')}
                    </label>
                    <textarea
                      rows={3}
                      value={modalComments}
                      onChange={(e) => setModalComments(e.target.value)}
                      placeholder={t('wardSecretary.commentsPlaceholder', 'Add field inspection remarks, ground status, or contractor notes...')}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Upload Site / Progress Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setModalPhotos([reader.result]);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#850000] hover:file:bg-red-100 cursor-pointer"
                    />
                    {modalPhotos.length > 0 && (
                      <div className="mt-2 w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={modalPhotos[0]} alt="Uploaded" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingModalUpdate}
                    className="w-full py-2.5 bg-[#850000] hover:bg-[#A00000] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4 text-[#FFD32A]" />
                    <span>{isSavingModalUpdate ? t('common.updating', 'Saving Update...') : t('wardSecretary.btnSaveUpdate', 'Save Status Update')}</span>
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-end items-center gap-2">
                  {selectedComplaint.status !== 'Completed' && selectedComplaint.status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenCompleteModal(selectedComplaint);
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[#FFD32A]" />
                      <span>{t('wardSecretary.btnTakeAction', 'Take Action')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                  >
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= WARD SECRETARY COMPLAINT ACTION FORM ================= */}
      {isReportModalOpen && selectedComplaint && (
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title={`${t('wardSecretary.modalTakeActionTitle', 'Ward Secretary Take Action & Ground Evidence')}: ${selectedComplaint.issueCode || selectedComplaint.complaintId}`}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleSaveAndComplete} className="space-y-4 text-xs">
            {/* Read-Only Original Complaint Information */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Original Complaint Information (Read-Only)</span>
                </span>
                <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                  {selectedComplaint.issueCode}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.name', 'Complainant')}:</span>
                  <span className="font-bold text-slate-900">{selectedComplaint.citizenName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.mobileNumber', 'Mobile Number')}:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedComplaint.citizenMobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.ward', 'Ward & Paguthi')}:</span>
                  <span className="font-semibold text-slate-900">
                    Ward {selectedComplaint.wardNumber || selectedComplaint.wardId?.wardNumber || '72'} • {selectedComplaint.paguthi || paguthi}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('dashboard.registeredDate', 'Registered Date')}:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.subject', 'Subject')}:</span>
                  <span className="font-bold text-slate-900">{selectedComplaint.title}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.description', 'Description')}:</span>
                  <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>
              </div>
            </div>

            {/* A. Before Image Upload (Mandatory) */}
            <div className="border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-red-700" />
                  <span>{t('wardSecretary.beforePhotoLabel', 'Before Image (Ground Evidence at site) *')}</span>
                </label>
                <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs transition">
                  <UploadCloud className="w-4 h-4 text-slate-600" />
                  <span>{uploadingBeforeImage ? t('common.loading', 'Uploading Image...') : 'Choose Before Image'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleBeforeImageUpload}
                    disabled={uploadingBeforeImage}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500">or enter image URL below:</span>
              </div>

              <input
                type="text"
                value={actionForm.beforeImage}
                onChange={(e) => setActionForm({ ...actionForm, beforeImage: e.target.value })}
                placeholder="Paste hosted photo URL or browse file..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />

              {actionForm.beforeImage && (
                <div className="relative flex flex-col sm:flex-row items-start gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="relative">
                    <img
                      src={actionForm.beforeImage}
                      alt="Before Preview"
                      className="w-28 h-20 object-cover rounded-lg border-2 border-red-300 shadow-2xs"
                    />
                    <span className="absolute bottom-1 left-1 bg-red-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                      Before Preview
                    </span>
                  </div>
                  <div className="text-[10px] space-y-1">
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded block">
                      ✓ Image Ready for Submission
                    </span>
                    <button
                      type="button"
                      onClick={() => setActionForm((prev) => ({ ...prev, beforeImage: '' }))}
                      className="text-red-700 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* B. After Image Upload (Mandatory) */}
            <div className="border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-emerald-800 text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t('wardSecretary.afterPhotoLabel', 'After Image (Proof of resolution completed) *')}</span>
                </label>
                <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl font-bold text-emerald-800 text-xs transition">
                  <UploadCloud className="w-4 h-4 text-emerald-700" />
                  <span>{uploadingAfterImage ? t('common.loading', 'Uploading Image...') : 'Choose After Image'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleAfterImageUpload}
                    disabled={uploadingAfterImage}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500">or enter image URL below:</span>
              </div>

              <input
                type="text"
                value={actionForm.afterImage}
                onChange={(e) => setActionForm({ ...actionForm, afterImage: e.target.value })}
                placeholder="Paste hosted photo URL or browse file..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />

              {actionForm.afterImage && (
                <div className="relative flex flex-col sm:flex-row items-start gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="relative">
                    <img
                      src={actionForm.afterImage}
                      alt="After Preview"
                      className="w-28 h-20 object-cover rounded-lg border-2 border-emerald-400 shadow-2xs"
                    />
                    <span className="absolute bottom-1 left-1 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                      After Preview
                    </span>
                  </div>
                  <div className="text-[10px] space-y-1">
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded block">
                      ✓ Image Ready for Submission
                    </span>
                    <button
                      type="button"
                      onClick={() => setActionForm((prev) => ({ ...prev, afterImage: '' }))}
                      className="text-red-700 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* C. Action Details */}
            <div className="border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-white space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-[#850000]" />
                <span>{t('wardSecretary.actionTakenLabel', 'Action Taken / Description of Work *')}</span>
              </h4>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('wardSecretary.actionTakenLabel', 'Action Taken / Description of Work *')}
                </label>
                <textarea
                  required
                  rows="3"
                  value={actionForm.actionTaken}
                  onChange={(e) => setActionForm({ ...actionForm, actionTaken: e.target.value })}
                  placeholder={t('wardSecretary.actionTakenPlaceholder', 'Describe the repair, cleaning, or field action executed...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-red-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('wardSecretary.remarksLabel', 'Ward Secretary Remarks')}
                </label>
                <input
                  type="text"
                  value={actionForm.wardSecretaryRemarks}
                  onChange={(e) => setActionForm({ ...actionForm, wardSecretaryRemarks: e.target.value })}
                  placeholder={t('wardSecretary.remarksPlaceholder', 'Additional administrative or ward remarks...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Completion Date (Automatically Generated):
                </label>
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleString()}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold transition shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#FFD32A]" />
                <span>{isSubmitting ? t('common.updating', 'Saving Completion...') : t('wardSecretary.btnSaveAction', 'SAVE & COMPLETE')}</span>
              </button>
            </div>
          </form>
        </Modal>
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
    </div>
  );
};

export default WardSecretaryPortalPage;
