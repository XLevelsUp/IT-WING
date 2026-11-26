import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CalendarCheck,
  Search,
  ShieldCheck,
  ArrowRight,
  Phone,
  HelpCircle,
  LogOut,
  User,
  Heart,
  Bell,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Menu,
  RotateCcw,
  XCircle,
  CheckSquare,
  Eye,
  PlusCircle,
  RefreshCw,
  Twitter,
  Instagram,
  ExternalLink,
  Sparkles,
  IdCard,
  CreditCard,
  Users,
  LandPlot,
  Accessibility,
  Download,
  Loader2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  downloadComplaintPdf,
  downloadTamilComplaintPdf,
  downloadEnglishComplaintPdf,
} from '../../utils/complaintPdfGenerator';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import Modal from '../../components/common/Modal';
import Footer from '../../components/layout/Footer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { getSafeImageUrl } from '../../utils/imageUtils';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import image1 from '../../assets/image1.png';
import image2 from '../../assets/image2.png';
import image3 from '../../assets/image3.png';

export const CitizenPortalPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  // Fresh profile loaded directly from MySQL database
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active section tab: 'overview' | 'book-appointment' | 'my-appointments' | 'my-complaints'
  const [activeSection, setActiveSection] = useState('overview');

  // Active user entity (prioritizing freshly fetched database record over cached localStorage)
  const currentUser = profile || user;
  const assignedWardDisplay = currentUser?.assignedWard?.trim() || 'Not Assigned';
  const paguthiDisplay = currentUser?.paguthi?.trim() || 'Not Assigned';
  const villageDisplay = currentUser?.village?.trim() || '';
  const constituencyDisplay = currentUser?.constituency?.trim() || 'Not Assigned';

  // Appointment Form state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');
  const [newBookedId, setNewBookedId] = useState('');
  const [appointmentForm, setAppointmentForm] = useState({
    fullName: currentUser?.name || '',
    mobileNumber: currentUser?.phone || '',
    email: currentUser?.email || '',
    subject: '',
    description: '',
    preferredDate: '',
    preferredTime: '10:00 AM - 11:30 AM',
    additionalInfo: '',
  });

  // Appointment details modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);

  // Complaints filter search state
  const [complaintSearch, setComplaintSearch] = useState('');

  // Fetch authenticated citizen profile and portal data
  // isInitial = true triggers full-screen loading on first mount only; background sync is completely silent
  const fetchCitizenData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const [profileRes, issuesRes, apptRes, notifRes, projectsRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/issues?limit=50').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/appointments/my').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/notifications').catch(() => ({ data: { success: false, data: [], unreadCount: 0 } })),
        api.get('/projects').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (profileRes?.data?.success && profileRes.data.data) {
        setProfile(profileRes.data.data);
        if (updateUser) {
          updateUser(profileRes.data.data);
        }
      }
      if (issuesRes?.data?.success) {
        setComplaints(issuesRes.data.data || []);
      }
      if (apptRes?.data?.success) {
        setAppointments(apptRes.data.data || []);
      }
      if (notifRes?.data?.success) {
        setNotifications(notifRes.data.data || []);
        setUnreadCount(notifRes.data.unreadCount || 0);
      }
      if (projectsRes?.data?.success) {
        setProjects(projectsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error loading citizen portal data:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // Initial load once on component mount; silent background updates without flashing or full-page reload
  useEffect(() => {
    fetchCitizenData(true);

    const timer = setInterval(() => {
      // Background poll only when document is active/visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCitizenData(false);
      }
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  // Route protection for unauthenticated visits without full-page hard refresh
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Update default form values when user changes
  useEffect(() => {
    if (currentUser) {
      setAppointmentForm((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.name || '',
        mobileNumber: prev.mobileNumber || currentUser.phone || '',
        email: prev.email || currentUser.email || '',
      }));
    }
  }, [currentUser]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Compute live citizen statistics with consistent mapping:
  // - Pending: Pending, New, Assigned, Under Review
  // - In Progress: In Progress
  // - Completed: Completed, Resolved, Closed
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter((c) => ['Pending', 'New', 'Assigned', 'Under Review'].includes(c.status)).length;
  const inProgressComplaints = complaints.filter((c) => c.status === 'In Progress').length;
  const completedComplaints = complaints.filter((c) => ['Completed', 'Resolved', 'Closed'].includes(c.status)).length;
  const resolvedComplaints = completedComplaints;

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter((a) => ['Pending', 'Pending Approval', 'Requested'].includes(a.status)).length;
  const confirmedAppointments = appointments.filter((a) => ['Confirmed', 'Approved'].includes(a.status)).length;

  const citizenId = `TVK-CIT-${user?._id ? user._id.slice(-4).toUpperCase() : '7201'}`;

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Appointment Booking
  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.fullName.trim() || !appointmentForm.mobileNumber.trim() || !appointmentForm.subject.trim() || !appointmentForm.preferredDate) {
      notifyError('Please fill out all required fields: Full Name, Mobile, Subject, and Preferred Date.');
      return;
    }

    try {
      setBookingLoading(true);
      const payload = {
        fullName: appointmentForm.fullName.trim(),
        citizenName: appointmentForm.fullName.trim(),
        mobileNumber: appointmentForm.mobileNumber.trim(),
        email: appointmentForm.email.trim(),
        subject: appointmentForm.subject.trim(),
        purpose: appointmentForm.subject.trim(),
        description: appointmentForm.description.trim(),
        requestedDate: appointmentForm.preferredDate,
        preferredDate: appointmentForm.preferredDate,
        requestedTime: appointmentForm.preferredTime,
        preferredTimeSlot: appointmentForm.preferredTime,
        additionalInfo: appointmentForm.additionalInfo.trim(),
        constituency: user?.constituency || 'Not Assigned',
        ward: user?.assignedWard || 'Not Assigned',
      };

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        const booked = res.data.data;
        const aptId = booked.appointmentId || booked.tokenNumber;
        setNewBookedId(aptId);
        setBookingSuccessMsg(`Your appointment request has been submitted successfully with status Pending! Appointment ID: ${aptId}`);
        notifySuccess(`Appointment booked successfully! ID: ${aptId}`);

        // Reset fields except user details
        setAppointmentForm((prev) => ({
          ...prev,
          subject: '',
          description: '',
          preferredDate: '',
          preferredTime: '10:00 AM - 11:30 AM',
          additionalInfo: '',
        }));

        // Refresh appointments list
        fetchCitizenData();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to submit appointment request.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Download Complaint as PDF
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const handleDownloadComplaintPDF = async (complaint, lang = 'ta') => {
    if (!complaint) return;
    const complaintKey = `${complaint._id || complaint.id}_${lang}`;
    setDownloadingPdfId(complaintKey);

    try {
      // Fetch latest complaint record from database if possible
      let cData = complaint;
      try {
        const fetchId = complaint.id || complaint._id;
        if (fetchId) {
          const detailRes = await api.get(`/issues/${fetchId}`);
          if (detailRes.data?.success && detailRes.data?.data) {
            cData = detailRes.data.data.issue || detailRes.data.data;
          }
        }
      } catch (fetchErr) {
        console.warn('Could not fetch single issue detail, using in-memory complaint data:', fetchErr.message);
      }

      await downloadComplaintPdf(cData, currentUser, lang);
      if (lang === 'ta') {
        notifySuccess(`Downloaded complaint PDF (புகார் நகல் - தமிழ்): ${cData.issueCode || cData.complaintId || 'GRI'}`);
      } else {
        notifySuccess(`Downloaded complaint PDF (English): ${cData.issueCode || cData.complaintId || 'GRI'}`);
      }
    } catch (err) {
      console.error('Error generating complaint PDF:', err);
      notifyError(lang === 'ta' ? 'Failed to generate Tamil PDF. Please try again.' : 'Failed to generate English PDF. Please try again.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
      case 'Pending Approval':
      case 'Requested':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            {t(`status.${status}`, status)}
          </span>
        );
      case 'Confirmed':
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            {t(`status.${status}`, status)}
          </span>
        );
      case 'Rescheduled':
      case 'Changes Requested':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <RotateCcw className="w-3 h-3 mr-1 text-blue-600" />
            {t(`status.${status}`, status)}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1 text-red-600" />
            {t('status.Rejected', 'Rejected')}
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <CheckSquare className="w-3 h-3 mr-1 text-purple-600" />
            {t('status.Completed', 'Completed')}
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {t('status.Cancelled', 'Cancelled')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {t(`status.${status}`, status)}
          </span>
        );
    }
  };

  const services = [
    {
      id: 'register-complaint',
      title: t('citizen.registerComplaint', 'Register Complaint'),
      description: t('citizen.registerComplaintDesc', 'Report civic issues directly with photos, location, and priority assignment.'),
      icon: FileText,
      path: '/citizen/register-complaint',
      badge: t('citizen.complaintFormTitle', 'Civic Grievance'),
    },
    {
      id: 'my-complaints',
      title: t('citizen.myComplaints', 'My Complaints'),
      description: t('citizen.myComplaintsDesc', 'Track live inspection status, work start timestamp, and field resolution reports.'),
      icon: Clock,
      path: '/citizen/my-complaints',
      badge: t('citizen.liveStatusBadge', 'Live Status'),
    },
    {
      id: 'book-appointment',
      title: t('citizen.bookAppointment', 'Book Minister Appointment'),
      description: t('citizen.bookAppointmentDesc', 'Schedule an official consultation slot with the Minister at TVK District Headquarters.'),
      icon: CalendarCheck,
      action: () => setActiveSection('book-appointment'),
      badge: t('citizen.consultationBadge', 'Consultation'),
    },
    {
      id: 'my-appointments',
      title: t('citizen.myAppointments', 'My Appointments'),
      description: t('citizen.trackAppointmentDesc', 'Track official approval status, confirmed date/time, and subadmin remarks.'),
      icon: Search,
      action: () => setActiveSection('my-appointments'),
      badge: t('citizen.historyStatusBadge', 'History & Status'),
    },
  ];

  // Initial load only renders full-screen spinner if user profile is not yet available
  if (loading && !profile && !user) {
    return <LoadingSpinner fullScreen text="Loading TVK Citizen Portal..." />;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans overflow-x-hidden">
      {/* ================= 1. TOP NAVIGATION HEADER ================= */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 shadow-md flex items-center justify-between text-white sticky top-0 z-50">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFD32A] text-[#850000] font-black text-sm sm:text-base flex items-center justify-center shadow-md flex-shrink-0">
            TVK
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight truncate max-w-[130px] min-[400px]:max-w-[180px] sm:max-w-none">
              {t('citizen.portalTitle', 'TVK Citizen Service Portal')}
            </h1>
            <p className="text-[10px] sm:text-[10.5px] text-[#FFD32A] font-semibold truncate hidden sm:block">
              {t('citizen.portalTagline', 'Coimbatore Public Redressal Service • Coimbatore South')}
            </p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center space-x-4 text-xs font-bold text-white/90">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`py-1 cursor-pointer transition ${
              activeSection === 'overview' ? 'text-[#FFD32A] border-b-2 border-[#FFD32A]' : 'hover:text-[#FFD32A]'
            }`}
          >
            {t('header.dashboard', 'Dashboard')}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('book-appointment')}
            className={`py-1 cursor-pointer transition ${
              activeSection === 'book-appointment' ? 'text-[#FFD32A] border-b-2 border-[#FFD32A]' : 'hover:text-[#FFD32A]'
            }`}
          >
            {t('citizen.bookAppointment', 'Book Appointment')}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('my-appointments')}
            className={`py-1 cursor-pointer transition ${
              activeSection === 'my-appointments' ? 'text-[#FFD32A] border-b-2 border-[#FFD32A]' : 'hover:text-[#FFD32A]'
            }`}
          >
            {t('citizen.trackAppointment', 'My Appointments')} ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('my-complaints')}
            className={`py-1 cursor-pointer transition ${
              activeSection === 'my-complaints' ? 'text-[#FFD32A] border-b-2 border-[#FFD32A]' : 'hover:text-[#FFD32A]'
            }`}
          >
            {t('citizen.myComplaints', 'My Complaints')} ({complaints.length})
          </button>
          <Link to="/citizen/register-complaint" className="hover:text-[#FFD32A] transition py-1">
            + {t('citizen.registerComplaint', 'New Grievance')}
          </Link>
        </nav>

        {/* Right Section: Notifications, Language, Profile, Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/20 transition relative cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#FFD32A]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD32A] text-[#850000] font-black rounded-full text-[9px] flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden text-slate-800">
                <div className="p-3 bg-[#A00000] text-white flex items-center justify-between">
                  <span className="font-bold text-xs">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[#FFD32A] hover:underline font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-slate-400">No new notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className={`p-3 ${n.isRead ? 'bg-white' : 'bg-red-50/50'}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#A00000] text-xs">{n.title}</p>
                          {n.referenceId && (
                            <span className="font-mono text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.2 rounded">
                              {n.referenceId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-800 font-semibold mt-0.5">{n.message}</p>
                        {n.actionTaken && (
                          <p className="text-[10px] text-slate-600 mt-1 bg-white p-1.5 rounded border border-slate-200">
                            <strong>Action:</strong> {n.actionTaken}
                          </p>
                        )}
                        {(n.beforeImage || n.afterImage) && (
                          <div className="flex items-center space-x-2 mt-1.5">
                            {n.beforeImage && (
                              <img
                                src={getSafeImageUrl(n.beforeImage)}
                                alt="Before Action"
                                title="Before Action"
                                className="w-10 h-10 object-cover rounded border border-red-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {n.afterImage && (
                              <img
                                src={getSafeImageUrl(n.afterImage)}
                                alt="After Resolution"
                                title="After Resolution"
                                className="w-10 h-10 object-cover rounded border border-emerald-400"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Global Language Switcher */}
          <LanguageSwitcher variant="dark" />

          {/* User Profile Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-black/20 px-3 py-1.5 rounded-full border border-white/20">
            <User className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span className="text-white font-bold text-xs">{user?.name || 'Citizen'}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center space-x-1 bg-black/20 hover:bg-black/40 px-2.5 sm:px-3 py-1.5 rounded-full border border-white/20 transition text-[11px] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FFD32A]" />
            <span className="font-bold hidden min-[400px]:inline">{t('common.logout', 'Logout')}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-black/20 lg:hidden text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#850000] text-white px-4 py-3 border-b-2 border-[#FFD32A] space-y-2 text-xs font-bold shadow-lg animate-fadeIn">
          <button
            type="button"
            onClick={() => {
              setActiveSection('overview');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 border-b border-white/10"
          >
            {t('header.dashboard', 'Dashboard')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('book-appointment');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 border-b border-white/10"
          >
            {t('citizen.bookAppointment', 'Book Minister Appointment')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('my-appointments');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 border-b border-white/10"
          >
            {t('citizen.trackAppointment', 'My Appointments')} ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('my-complaints');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 border-b border-white/10"
          >
            {t('citizen.myComplaints', 'My Complaints')} ({complaints.length})
          </button>
          <Link
            to="/citizen/register-complaint"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[#FFD32A]"
          >
            + {t('citizen.registerComplaint', 'Register New Grievance')}
          </Link>
        </div>
      )}

      {/* ================= 2. HERO SECTION ================= */}
      <section
        className="w-full relative bg-[#850000] pt-6 sm:pt-8 md:pt-10 pb-0 px-3 sm:px-6 lg:px-8 text-white overflow-hidden shadow-inner"
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
            {/* Center Content: Heading, Tamil Tagline, Description */}
            <div className="w-full text-center space-y-2 sm:space-y-2.5 pt-1 px-1">
              <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                <span className="text-[#FFD32A] font-bold">மக்கள் சேவை செயலி</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-md text-white">
                TVK Citizen Public Service Portal
              </h2>

              <h3 className="text-sm sm:text-base font-bold text-[#FFD32A] drop-shadow-sm">
                உங்கள் குறை - எங்கள் பொறுப்பு
              </h3>

              <p className="text-xs sm:text-sm text-white/95 max-w-xl mx-auto font-medium leading-relaxed drop-shadow-xs">
                Directly connect with your local Ward Secretary, report community issues, and book ministerial consultations at TVK Coimbatore Headquarters.
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

            {/* Center Content: Heading, Tamil Tagline, Description */}
            <div className="w-full md:w-auto md:max-w-xl lg:max-w-2xl text-center space-y-2.5 sm:space-y-3.5 my-auto py-6 lg:py-8">
              <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                <span className="text-[#FFD32A] font-bold">மக்கள் சேவை செயலி</span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-md text-white">
                TVK Citizen Public Service Portal
              </h2>

              <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#FFD32A] drop-shadow-sm">
                உங்கள் குறை - எங்கள் பொறுப்பு
              </h3>

              <p className="text-xs sm:text-sm lg:text-base text-white/95 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-xs">
                Directly connect with your local Ward Secretary, report community issues, and book ministerial consultations at TVK Coimbatore Headquarters.
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
      </section>

      {/* ================= 3. USER PROFILE SUMMARY ================= */}
      <section className="max-w-6xl w-full mx-auto px-4 -mt-5 relative z-20">
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E9E2DC] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#850000] to-[#A00000] text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-[#FFD32A] flex-shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {currentUser?.name || 'Citizen'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-[#A00000] border border-red-200">
                  Verified Citizen
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Registered Mobile: <strong className="text-slate-800 font-mono">{currentUser?.phone || 'Not Assigned'}</strong>
              </p>
            </div>
          </div>

          {/* Profile Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">Citizen ID</span>
              <strong className="text-slate-900 font-mono font-bold text-[11px]">{citizenId}</strong>
            </div>
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">Assigned Ward</span>
              <strong className="text-slate-900 font-bold text-[11px]">{assignedWardDisplay}</strong>
            </div>
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">Paguthi</span>
              <strong className="text-[#A00000] font-bold text-[11px]">{paguthiDisplay}</strong>
            </div>
            {villageDisplay ? (
              <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
                <span className="text-[10px] text-slate-500 block">Village</span>
                <strong className="text-slate-900 font-bold text-[11px]">{villageDisplay}</strong>
              </div>
            ) : null}
            <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/50">
              <span className="text-[10px] text-slate-500 block">Constituency</span>
              <strong className="text-slate-900 font-bold text-[11px]">{constituencyDisplay}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION NAVIGATION TABS ================= */}
      <section className="max-w-6xl w-full mx-auto px-4 mt-6">
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center sm:justify-start space-x-1.5 ${
              activeSection === 'overview'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t('citizen.publicServices', 'Public Services Overview')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('book-appointment')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center sm:justify-start space-x-1.5 ${
              activeSection === 'book-appointment'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{t('citizen.bookAppointment', 'Book Appointment Form')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('my-appointments')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center sm:justify-start space-x-1.5 ${
              activeSection === 'my-appointments'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{t('citizen.myAppointments', 'My Appointments')} ({appointments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('my-complaints')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center sm:justify-start space-x-1.5 ${
              activeSection === 'my-complaints'
                ? 'bg-[#A00000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{t('citizen.myComplaints', 'My Complaints')} ({complaints.length})</span>
          </button>
        </div>
      </section>

      {/* ================= MAIN CONTENT BASED ON ACTIVE SECTION ================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 my-6 space-y-8">
        {/* ================= 4. DASHBOARD STATISTICS ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E9E2DC] shadow-xs text-center">
            <span className="text-[10.5px] text-slate-500 block font-semibold">{t('complaintsReported.cardTotal', 'Total Complaints')}</span>
            <p className="text-xl sm:text-2xl font-black text-[#A00000] mt-0.5">{totalComplaints}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs text-center bg-amber-50/20">
            <span className="text-[10.5px] text-amber-800 block font-semibold">{t('status.Pending', 'Pending')}</span>
            <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{pendingComplaints}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-xs text-center bg-blue-50/20">
            <span className="text-[10.5px] text-blue-800 block font-semibold">{t('status.In Progress', 'In Progress')}</span>
            <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{inProgressComplaints}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs text-center bg-emerald-50/20">
            <span className="text-[10.5px] text-emerald-800 block font-semibold">{t('status.Resolved', 'Completed')}</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{completedComplaints}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-xs text-center bg-purple-50/20">
            <span className="text-[10.5px] text-purple-800 block font-semibold">{t('citizen.trackAppointment', 'Appointments')}</span>
            <p className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">{totalAppointments}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-[#FFE5A3] shadow-xs text-center bg-[#FFF8F0]">
            <span className="text-[10.5px] text-[#A00000] block font-semibold">{t('status.Confirmed', 'Confirmed')}</span>
            <p className="text-xl sm:text-2xl font-black text-[#A00000] mt-0.5">{confirmedAppointments}</p>
          </div>
        </div>

        {/* SECTION: OVERVIEW / SERVICES */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Service Cards */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#252525]">{t('citizen.publicServices', 'Citizen Public Services')}</h3>
                <p className="text-xs text-slate-500">{t('citizen.publicServicesDesc', 'Access online grievance redressal and ministerial consultation services')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <div
                      key={srv.id}
                      className="bg-white rounded-2xl border border-[#E9E2DC] shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-[#A00000] transition-all duration-200 p-5 flex flex-col justify-between group overflow-hidden relative"
                    >
                      <div className="h-1 bg-gradient-to-r from-[#A00000] via-[#FFD32A] to-[#850000] absolute top-0 left-0 right-0"></div>

                      <div>
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-[#FFF8F0] border border-[#FFE5A3] flex items-center justify-center text-[#A00000] shadow-xs group-hover:scale-105 transition">
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-50 text-[#A00000] border border-red-200">
                            {srv.badge}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 mt-3 group-hover:text-[#A00000] transition">
                          {srv.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{srv.description}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100">
                        {srv.path ? (
                          <Link
                            to={srv.path}
                            className="w-full py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <span>{t('citizen.proceedToService', 'Proceed to Service')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <button
                            onClick={srv.action}
                            className="w-full py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <span>{t('citizen.openModule', 'Open Module')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick My Appointments Glance */}
            <div className="bg-white rounded-3xl p-6 border border-[#E9E2DC] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-[#252525]">
                    {t('citizen.recentMinisterAppts', 'Recent Minister Appointment Bookings')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('citizen.recentMinisterApptsDesc', 'Your scheduled consultations and live approval status')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('book-appointment')}
                  className="w-full sm:w-auto px-4 py-2 bg-[#A00000] hover:bg-[#850000] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto min-h-[38px]"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t('citizen.bookNewAppt', 'Book New Appointment')}</span>
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="p-8 text-center bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#FFE5A3]">
                  <CalendarCheck className="w-10 h-10 text-[#A00000]/60 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">{t('citizen.noApptsYet', 'No appointments booked yet.')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('citizen.noApptsYetSub', 'Use the appointment form to schedule your first ministerial grievance consultation slot.')}</p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('book-appointment')}
                    className="mt-3 inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer min-h-[40px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span>{t('citizen.bookAnApptNow', 'Book An Appointment Now')}</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {appointments.slice(0, 3).map((a) => (
                    <div key={a._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[#A00000]">{a.appointmentId || a.tokenNumber}</span>
                          {getStatusBadge(a.status)}
                        </div>
                        <h5 className="font-bold text-slate-800">{a.subject || a.purpose}</h5>
                        <p className="text-[11px] text-slate-500">
                          {t('citizen.requestedFor', 'Requested for')}: {new Date(a.requestedDate || a.preferredDate).toLocaleDateString()} ({a.requestedTime || a.preferredTimeSlot})
                        </p>
                        {['Confirmed', 'Approved', 'Rescheduled'].includes(a.status) && (
                          <p className="text-[11px] text-emerald-800 font-medium flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-1 text-[#A00000] flex-shrink-0" />
                            <span>{t('citizen.confirmedLocation', 'Confirmed Location:')} {a.confirmedLocation || a.approvedVenue || t('citizen.locationNotAssigned', 'Location not assigned')}</span>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAppointment(a);
                          setIsApptModalOpen(true);
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold self-start sm:self-auto cursor-pointer"
                      >
                        {t('citizen.viewFullDetails', 'View Full Details')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Citizen Complaints & Status Tracking Section */}
            <div className="bg-white rounded-3xl p-6 border border-[#E9E2DC] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#252525]">
                    {t('citizen.registeredComplaintsHeading', 'My Registered Complaints & Live Status')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('citizen.registeredComplaintsSub', 'Real-time status updates synced live from your Ward Secretary and District Administration')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to="/citizen/register-complaint"
                    className="px-3.5 py-1.5 bg-[#A00000] text-white rounded-xl text-xs font-bold hover:bg-[#850000] transition flex items-center space-x-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{t('citizen.registerNewComplaint', 'Register New Complaint')}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveSection('my-complaints')}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{t('citizen.viewAll', 'View All')} ({complaints.length})</span>
                  </button>
                </div>
              </div>

              {complaints.length === 0 ? (
                <div className="p-8 text-center bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#FFE5A3]">
                  <FileText className="w-10 h-10 text-[#A00000]/60 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">{t('citizen.noComplaintsYet', 'No complaints registered yet.')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('citizen.noComplaintsYetSub', 'Have an issue in your ward? Register a new complaint for direct field resolution.')}</p>
                  <Link
                    to="/citizen/register-complaint"
                    className="mt-3 inline-block px-4 py-2 bg-[#A00000] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {t('citizen.registerFirstComplaint', 'Register Your First Complaint')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 4).map((c) => {
                    const isCompleted = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                    const isInProgress = c.status === 'In Progress';
                    const displayStatus = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending';

                    return (
                      <div
                        key={c._id}
                        className={`p-4 rounded-2xl border transition text-xs space-y-2.5 ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-300'
                            : isInProgress
                            ? 'bg-blue-50/30 border-blue-200'
                            : 'bg-amber-50/20 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#A00000] bg-white border border-red-200 px-2 py-0.5 rounded">
                              {c.issueCode || c.complaintId}
                            </span>
                            <StatusBadge status={displayStatus} />
                            <PriorityBadge priority={c.priority} />
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {t('citizen.registeredOn', 'Registered on')}: {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{c.description}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <div>
                            <span>{t('citizen.jurisdiction', 'Jurisdiction')}: </span>
                            <strong className="text-slate-800">
                              {c.wardId?.wardName ? `Ward ${c.wardId.wardNumber} - ${c.wardId.wardName}` : (c.wardNumber ? `Ward ${c.wardNumber}` : (currentUser?.assignedWard || 'Not Assigned'))}
                            </strong>
                            {c.category && (
                              <span className="ml-2 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                                {c.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 flex-wrap">
                            {/* 1. Download PDF – தமிழ் */}
                            <button
                              type="button"
                              onClick={() => handleDownloadComplaintPDF(c, 'ta')}
                              disabled={downloadingPdfId === `${c._id || c.id}_ta`}
                              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#A00000] border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                              title="Download Official Tamil Complaint PDF (புகார் நகல் - தமிழ்)"
                            >
                              {downloadingPdfId === `${c._id || c.id}_ta` ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>உருவாக்குகிறது...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 shrink-0 text-[#A00000]" />
                                  <span>Download PDF – தமிழ்</span>
                                </>
                              )}
                            </button>

                            {/* 2. Download PDF – English */}
                            <button
                              type="button"
                              onClick={() => handleDownloadComplaintPDF(c, 'en')}
                              disabled={downloadingPdfId === `${c._id || c.id}_en`}
                              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                              title="Download Official English Complaint PDF"
                            >
                              {downloadingPdfId === `${c._id || c.id}_en` ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 shrink-0 text-slate-700" />
                                  <span>Download PDF – English</span>
                                </>
                              )}
                            </button>

                            <Link
                              to="/citizen/my-complaints"
                              className="font-bold text-[#A00000] hover:underline flex items-center space-x-1"
                            >
                              <span>{t('citizen.trackTimeline', 'Track Timeline & Resolution')}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Completed Success Banner Preview */}
                        {isCompleted && (
                          <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 flex items-center justify-between gap-2 text-emerald-950">
                            <div className="flex items-center space-x-1.5 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                              <span>{t('citizen.complaintFixedSuccess', 'Your complaint was fixed successfully!')}</span>
                            </div>
                            <Link
                              to="/citizen/my-complaints"
                              className="text-[11px] font-bold text-emerald-800 hover:underline flex-shrink-0"
                            >
                              {t('citizen.viewEvidencePhotos', 'View Evidence & Photos')} &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================= 5. OUR ACHIEVEMENTS & PROJECTS SECTION ================= */}
            <section className="bg-white rounded-3xl sm:rounded-[2rem] border border-[#E7DFD7] shadow-sm p-5 sm:p-7 md:p-9 relative overflow-hidden space-y-6 sm:space-y-8">
              {/* Top decorative tricolor bar */}
              <div className="h-1.5 bg-gradient-to-r from-[#850000] via-[#FFD32A] to-[#850000] absolute top-0 left-0 right-0" />

              {/* Section Heading & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1.5 min-w-0">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-widest bg-red-50 text-[#850000] border border-red-200">
                    <Sparkles className="w-3 h-3 text-[#FFD32A]" />
                    <span>{t('achievements.badge', 'TVK Coimbatore Initiatives')}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#252525] tracking-tight break-words">
                    {t('achievements.sectionTitle', 'OUR ACHIEVEMENTS & PROJECTS')}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
                    "{t('achievements.sectionSubtitle', 'Development Initiatives & Public Welfare Activities')}"
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] font-extrabold text-[#A00000] uppercase tracking-wider bg-red-50/70 px-3.5 py-1.5 rounded-xl border border-red-200 shadow-2xs">
                    {projects.length > 0 ? `${String(projects.length).padStart(2, '0')} Active Projects` : '00 Projects'}
                  </span>
                </div>
              </div>

              {/* Dynamic Projects Content */}
              {projects.length === 0 ? (
                <div className="py-12 px-6 bg-slate-50/70 rounded-3xl border border-dashed border-[#E5DDD5] text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#850000] flex items-center justify-center border border-red-100 shadow-xs">
                    <Sparkles className="w-7 h-7 text-[#FFD32A]" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Projects or Achievements Published Yet</h4>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                    Development initiatives and community milestones will appear here dynamically as they are published by the administration.
                  </p>
                </div>
              ) : (() => {
                // Group projects by category
                const grouped = projects.reduce((acc, p) => {
                  const cat = (p.category && p.category.trim()) || 'Community Infrastructure';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(p);
                  return acc;
                }, {});

                const categories = Object.keys(grouped);
                const displayCategories = selectedCategory === 'All'
                  ? categories
                  : categories.filter((c) => c === selectedCategory);

                return (
                  <div className="space-y-8 sm:space-y-10">
                    {/* Category Filter Pills (when multiple categories exist) */}
                    {categories.length > 1 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('All')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#850000] ${
                            selectedCategory === 'All'
                              ? 'bg-[#850000] text-white shadow-xs'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-[#850000] hover:text-[#850000]'
                          }`}
                        >
                          All Categories ({projects.length})
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#850000] ${
                              selectedCategory === cat
                                ? 'bg-[#850000] text-white shadow-xs'
                                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-[#850000] hover:text-[#850000]'
                            }`}
                          >
                            {cat} ({grouped[cat].length})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Category Groups with Explicit Headings */}
                    {displayCategories.map((catName) => {
                      const catProjects = grouped[catName] || [];
                      return (
                        <div key={catName} className="space-y-5">
                          {/* CATEGORY HEADING BAR - 100% visible on all screen sizes */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#850000]/20">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[#850000] to-[#FFD32A] shrink-0" />
                              <h4 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight break-words">
                                {catName}
                              </h4>
                            </div>
                            <span className="text-[11px] sm:text-xs font-bold text-[#850000] bg-red-50 border border-red-200 px-3 py-0.5 rounded-full shrink-0">
                              {catProjects.length} {catProjects.length === 1 ? 'Project' : 'Projects'}
                            </span>
                          </div>

                          {/* Responsive Cards Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {catProjects.map((proj, pIdx) => {
                              const dateStr = proj.startDate
                                ? new Date(proj.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : proj.createdAt
                                ? new Date(proj.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Initiative';
                              const imgUrl = getSafeImageUrl(proj.imageUrl);

                              return (
                                <article
                                  key={proj.id || pIdx}
                                  className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5DDD5] hover:border-[#850000] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group min-w-0 w-full"
                                >
                                  {/* Card Image */}
                                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 shrink-0">
                                    <img
                                      src={imgUrl}
                                      alt={proj.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                    />
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                                      <span className="bg-black/75 backdrop-blur-md text-[#FFD32A] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-white/20 shadow-md shrink-0">
                                        #{String(pIdx + 1).padStart(2, '0')}
                                      </span>
                                      <span className="bg-white/95 backdrop-blur-md text-[#850000] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-red-100 shadow-md truncate max-w-[150px]">
                                        {proj.category || catName}
                                      </span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                  </div>

                                  {/* Card Content */}
                                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
                                        <span className="font-extrabold text-[#A00000] uppercase tracking-wider truncate">
                                          {proj.location || 'Coimbatore District'}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                                            proj.status === 'Completed'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : proj.status === 'Planned'
                                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                                          }`}
                                        >
                                          {proj.status || 'Ongoing'}
                                        </span>
                                      </div>

                                      <h5 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug break-words">
                                        {proj.title}
                                      </h5>

                                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal mt-2 break-words line-clamp-3">
                                        "{proj.description}"
                                      </p>
                                    </div>

                                    {/* Progress Bar (if available) */}
                                    {proj.progressPercentage > 0 && (
                                      <div className="space-y-1 pt-1">
                                        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500">
                                          <span>Progress</span>
                                          <span className="text-[#850000]">{proj.progressPercentage}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-[#850000] to-[#FFD32A] rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(0, proj.progressPercentage))}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Card Footer */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                      <span>{dateStr}</span>
                                      <span className="inline-flex items-center space-x-1 text-[#A00000] font-bold text-[11px]">
                                        <span>TVK Project</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFD32A]" />
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

            {/* ================= 6. REDESIGNED OFFICIAL QUICK LINKS SECTION ================= */}
            <section className="bg-white rounded-3xl sm:rounded-[2rem] border border-[#E7DFD7] shadow-sm p-5 sm:p-7 md:p-8 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 border-b border-slate-200">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-widest bg-amber-50 text-[#850000] border border-amber-200">
                    <Sparkles className="w-3 h-3 text-[#FFD32A]" />
                    <span>Official Citizen Services</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#252525] tracking-tight">
                    IMPORTANT LINKS
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
                    Direct access to essential government identity portals and TVK party initiatives.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 text-[#850000]" />
                  <span>Opens in New Tab</span>
                </div>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {/* Link 1: Aadhaar Card */}
                <a
                  href="https://myaadhaar.uidai.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-50/70 hover:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#850000] p-5 sm:p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-[#850000] focus:ring-offset-2"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-red-50 text-[#850000] group-hover:bg-[#850000] group-hover:text-white flex items-center justify-center border border-red-200 transition-colors duration-200 shadow-2xs">
                        <IdCard className="w-5 h-5" />
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-slate-400 group-hover:text-[#850000] group-hover:border-red-200 flex items-center justify-center transition-colors">
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#850000] bg-red-50 px-2 py-0.5 rounded border border-red-200/60 inline-block mb-1.5">
                        UIDAI Portal
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug">
                        Aadhaar Card – Apply / Download
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 mt-2 leading-relaxed">
                        Access official UIDAI self-service portal to update, verify, or download your e-Aadhaar.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#850000]">
                    <span>Visit Official Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Link 2: PAN Card */}
                <a
                  href="https://www.incometaxindia.gov.in/en/pan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-50/70 hover:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#850000] p-5 sm:p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-[#850000] focus:ring-offset-2"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#850000] group-hover:bg-[#850000] group-hover:text-white flex items-center justify-center border border-amber-200 transition-colors duration-200 shadow-2xs">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-slate-400 group-hover:text-[#850000] group-hover:border-red-200 flex items-center justify-center transition-colors">
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A00000] bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block mb-1.5">
                        Income Tax Department
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug">
                        PAN Card – Apply / Download
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 mt-2 leading-relaxed">
                        Official ITD services for new PAN application, reprint, corrections and instant e-PAN.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#850000]">
                    <span>Visit Official Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Link 3: Membership Drive */}
                <a
                  href="https://tvk.family/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-50/70 hover:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#850000] p-5 sm:p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-[#850000] focus:ring-offset-2"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-red-50 text-[#850000] group-hover:bg-[#850000] group-hover:text-white flex items-center justify-center border border-red-200 transition-colors duration-200 shadow-2xs">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-slate-400 group-hover:text-[#850000] group-hover:border-red-200 flex items-center justify-center transition-colors">
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#850000] bg-red-50 px-2 py-0.5 rounded border border-red-200/60 inline-block mb-1.5">
                        TVK Party Initiative
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug">
                        Membership Drive
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 mt-2 leading-relaxed">
                        Join the Tamilaga Vettri Kazhagam official family, register membership, and download your card.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#850000]">
                    <span>Join tvk.family</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Link 4: Land Records */}
                <a
                  href="https://eservices.tn.gov.in/eservicesnew/home.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-50/70 hover:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#850000] p-5 sm:p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-[#850000] focus:ring-offset-2"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#850000] group-hover:bg-[#850000] group-hover:text-white flex items-center justify-center border border-amber-200 transition-colors duration-200 shadow-2xs">
                        <LandPlot className="w-5 h-5" />
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-slate-400 group-hover:text-[#850000] group-hover:border-red-200 flex items-center justify-center transition-colors">
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A00000] bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block mb-1.5">
                        Government of Tamil Nadu
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug">
                        E-Services of Land Records | Tamil Nadu Government
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 mt-2 leading-relaxed">
                        Official portal to view Patta, Chitta, FMB sketch, and verify rural and urban land records online.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#850000]">
                    <span>Visit Official Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Link 5: Disability Certificate */}
                <a
                  href="https://swavlambancard.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-50/70 hover:bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-[#850000] p-5 sm:p-6 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-[#850000] focus:ring-offset-2"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-red-50 text-[#850000] group-hover:bg-[#850000] group-hover:text-white flex items-center justify-center border border-red-200 transition-colors duration-200 shadow-2xs">
                        <Accessibility className="w-5 h-5" />
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-slate-400 group-hover:text-[#850000] group-hover:border-red-200 flex items-center justify-center transition-colors">
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#850000] bg-red-50 px-2 py-0.5 rounded border border-red-200/60 inline-block mb-1.5">
                        UDID Portal
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#850000] transition-colors leading-snug">
                        Disability Certificate
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 mt-2 leading-relaxed">
                        Department of Empowerment of Persons with Disabilities portal for UDID Card and Disability Certificate services.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-[#850000]">
                    <span>Visit Official Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>
              </div>
            </section>

            {/* ================= 7. PROFESSIONAL LEADERSHIP CONNECT & SOCIAL LINKS ================= */}
            <section className="bg-white rounded-3xl sm:rounded-[2rem] border border-[#E7DFD7] shadow-sm p-5 sm:p-7 md:p-8 relative overflow-hidden space-y-6">
              {/* Top decorative tricolor bar */}
              <div className="h-1 bg-gradient-to-r from-[#850000] via-[#FFD32A] to-[#850000] absolute top-0 left-0 right-0" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
                {/* Designation & Public Connect Information */}
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 text-[#850000] border border-red-200/80 text-[10.5px] font-extrabold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 text-[#FFD32A]" />
                    <span>{t('achievements.connectBadge', 'Official Public Channel')}</span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                      {t('achievements.connectTitle', 'Connect with K. Vignesh')}
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-[#850000] mt-1">
                      {t('achievements.connectDesignation', 'Minister for Prohibition and Excise Department')}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    "{t('achievements.connectSubtitle', 'Public Grievance Redressal & Civic Welfare Communications')}"
                  </p>
                </div>

                {/* Social Media Interactive Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 shrink-0 w-full lg:w-auto">
                  {/* Twitter / X */}
                  <a
                    href="https://share.google/nPAyQVqIMEpBaDacb"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Connect with K. Vignesh on Twitter / X"
                    className="group flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-200/90 hover:border-slate-900 transition-all duration-200 shadow-2xs hover:shadow-md min-w-[210px] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white group-hover:bg-white/20 border border-slate-200/80 group-hover:border-white/20 text-slate-900 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                      <Twitter className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-white/70 block tracking-wider truncate">
                        {t('achievements.twitter', 'Twitter / X')}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 group-hover:text-white flex items-center justify-between">
                        <span className="truncate">@kvignesh</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-2 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://share.google/RPYFcif2qdXqyEqlP"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Connect with K. Vignesh on Instagram"
                    className="group flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-50 hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045] hover:text-white border border-slate-200/90 hover:border-transparent transition-all duration-200 shadow-2xs hover:shadow-md min-w-[210px] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-white/80 block tracking-wider truncate">
                        {t('achievements.instagram', 'Instagram')}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 group-hover:text-white flex items-center justify-between">
                        <span className="truncate">@kvignesh</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-2 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= 4. USER APPOINTMENT BOOKING SECTION & FORM ================= */}
        {activeSection === 'book-appointment' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-[#A00000]">
                {t('citizen.bookApptHeading', 'Book Grievance Consultation Appointment')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('citizen.bookApptSub', 'Fill out the required details below. The appointment will be saved with status Pending and assigned a unique Appointment ID for administrative review.')}
              </p>
            </div>

            {bookingSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{bookingSuccessMsg}</span>
                </div>
                <div className="flex items-center space-x-3 pt-1">
                  <button
                    onClick={() => setActiveSection('my-appointments')}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    {t('citizen.viewInMyAppts', 'View in My Appointments')}
                  </button>
                  <button
                    onClick={() => setBookingSuccessMsg('')}
                    className="text-emerald-700 underline font-semibold cursor-pointer"
                  >
                    {t('citizen.bookAnotherSlot', 'Book Another Slot')}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleAppointmentSubmit} className="space-y-4 text-xs">
              {/* Field 1: Full Name & Field 2: Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.fullNamePrefilled', 'Full Name (Prefilled from Profile) *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={appointmentForm.fullName}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, fullName: e.target.value })}
                    placeholder={t('citizen.fullNamePlaceholder', 'Enter your full name')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.mobileNumberRequired', 'Mobile Number *')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={appointmentForm.mobileNumber}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, mobileNumber: e.target.value })}
                    placeholder={t('citizen.mobilePlaceholder', '10-digit mobile number')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                  />
                </div>
              </div>

              {/* Field 3: Email Address */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('citizen.emailOptional', 'Email Address')}
                </label>
                <input
                  type="email"
                  value={appointmentForm.email}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, email: e.target.value })}
                  placeholder={t('citizen.emailPlaceholder', 'name@example.com (optional)')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                />
              </div>

              {/* Field 4: Appointment Subject */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('citizen.apptSubjectRequired', 'Appointment Subject *')}
                </label>
                <input
                  type="text"
                  required
                  value={appointmentForm.subject}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, subject: e.target.value })}
                  placeholder={t('citizen.apptSubjectPlaceholder', 'e.g. Community drinking water pipeline representation')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                />
              </div>

              {/* Field 5: Appointment Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('citizen.apptDescLabel', 'Appointment Description')}
                </label>
                <textarea
                  rows="3"
                  value={appointmentForm.description}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                  placeholder={t('citizen.apptDescPlaceholder', 'Provide background context and detailed points you plan to present during consultation...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-[#A00000]"
                />
              </div>

              {/* Field 6: Preferred Date & Field 7: Preferred Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.preferredDateRequired', 'Preferred Date *')}
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentForm.preferredDate}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, preferredDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.preferredTimeRequired', 'Preferred Time Slot *')}
                  </label>
                  <select
                    value={appointmentForm.preferredTime}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, preferredTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-[#A00000]"
                  >
                    <option value="10:00 AM - 11:30 AM">10:00 AM - 11:30 AM</option>
                    <option value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM</option>
                    <option value="02:30 PM - 04:00 PM">02:30 PM - 04:00 PM</option>
                    <option value="04:30 PM - 06:00 PM">04:30 PM - 06:00 PM</option>
                    <option value="06:00 PM - 07:30 PM">06:00 PM - 07:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Field 9: Additional Information */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('citizen.additionalInfoLabel', 'Additional Information (Optional)')}
                </label>
                <input
                  type="text"
                  value={appointmentForm.additionalInfo}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, additionalInfo: e.target.value })}
                  placeholder={t('citizen.additionalInfoPlaceholder', 'Supporting documents, attendee names, or special requirements')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 px-4 min-h-[44px] bg-[#A00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs sm:text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  <span>{bookingLoading ? t('citizen.submittingAppt', 'Submitting Appointment...') : t('citizen.bookAppointment', 'Book Appointment')}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= 5. MY APPOINTMENTS SECTION ================= */}
        {activeSection === 'my-appointments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#252525]">
                  {t('citizen.apptHistoryHeading', 'My Appointment History & Status')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('citizen.apptHistorySub', 'Track your booked slots, confirmed dates, times, venues, and administrative remarks')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('book-appointment')}
                className="w-full sm:w-auto px-4 py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer self-start sm:self-auto shrink-0 min-h-[38px]"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t('citizen.bookAnotherSlot', 'Book Another Slot')}</span>
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">{t('citizen.noApptsRecord', 'No Appointments on Record')}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('citizen.noApptsRecordSub', 'You have not submitted any appointment requests yet.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('book-appointment')}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer min-h-[40px]"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span>{t('citizen.bookAppointment', 'Book an Appointment')}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Responsive Appointments Table / Card Layout */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#FFF8F0] border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-3">{t('citizen.colApptId', 'Appointment ID')}</th>
                        <th className="py-3 px-3">{t('citizen.colSubject', 'Subject')}</th>
                        <th className="py-3 px-3">{t('citizen.colReqDate', 'Requested Date')}</th>
                        <th className="py-3 px-3">{t('citizen.colReqTime', 'Requested Time')}</th>
                        <th className="py-3 px-3">{t('citizen.colConfLocation', 'Confirmed Location')}</th>
                        <th className="py-3 px-3">{t('citizen.colStatus', 'Status')}</th>
                        <th className="py-3 px-3">{t('citizen.colConfDateTime', 'Confirmed Date & Time')}</th>
                        <th className="py-3 px-3 text-right">{t('citizen.colDetails', 'Details')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map((a) => {
                        const aptId = a.appointmentId || a.tokenNumber || 'APT-2026';
                        const reqDate = a.requestedDate || a.preferredDate
                          ? new Date(a.requestedDate || a.preferredDate).toLocaleDateString()
                          : '-';
                        const reqTime = a.requestedTime || a.preferredTimeSlot || '-';
                        const reqLoc = a.requestedLocation || a.assignedVenue || 'HQ';
                        const hasConfirmed = a.confirmedDate || a.approvedDate;
                        const confDate = hasConfirmed
                          ? `${new Date(a.confirmedDate || a.approvedDate).toLocaleDateString()} (${a.confirmedTime || a.approvedTimeSlot})`
                          : '-';

                        return (
                          <tr key={a._id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3 font-mono font-bold text-[#A00000] whitespace-nowrap">
                              {aptId}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 max-w-[180px] truncate" title={a.subject || a.purpose}>
                              {a.subject || a.purpose}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                              {reqDate}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                              {reqTime}
                            </td>
                            <td className="py-3 px-3 max-w-[170px] truncate text-slate-700" title={['Confirmed', 'Approved', 'Rescheduled'].includes(a.status) ? (a.confirmedLocation || a.approvedVenue || t('citizen.locationNotAssigned', 'Location not assigned')) : '-'}>
                              {['Confirmed', 'Approved', 'Rescheduled'].includes(a.status) ? (
                                <span className="flex items-center text-slate-800 font-medium">
                                  <MapPin className="w-3.5 h-3.5 mr-1 text-[#A00000] flex-shrink-0" />
                                  <span className="truncate">{a.confirmedLocation || a.approvedVenue || t('citizen.locationNotAssigned', 'Location not assigned')}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getStatusBadge(a.status)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                              {confDate}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedAppointment(a);
                                  setIsApptModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title={t('citizen.viewFullDetails', 'View Full Details')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Additional detailed cards for mobile view or quick highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {appointments.map((a) => (
                    <div
                      key={a._id}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#A00000] bg-white border border-red-200 px-2.5 py-0.5 rounded-md">
                          {a.appointmentId || a.tokenNumber}
                        </span>
                        {getStatusBadge(a.status)}
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm">{a.subject || a.purpose}</h4>

                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('citizen.requestedSchedule', 'Requested Schedule:')}</span>
                          <strong className="text-slate-700">
                            {new Date(a.requestedDate || a.preferredDate).toLocaleDateString()}
                          </strong>
                          <span className="text-[10.5px] text-slate-500 block">
                            {a.requestedTime || a.preferredTimeSlot}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('citizen.confirmedSchedule', 'Confirmed Schedule:')}</span>
                          {a.confirmedDate || a.approvedDate ? (
                            <>
                              <strong className="text-emerald-800">
                                {new Date(a.confirmedDate || a.approvedDate).toLocaleDateString()}
                              </strong>
                              <span className="text-[10.5px] text-emerald-700 block">
                                {a.confirmedTime || a.approvedTimeSlot}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">{t('citizen.awaitingConfirmation', 'Awaiting Confirmation')}</span>
                          )}
                        </div>
                      </div>

                      {/* Confirmed Location */}
                      {['Confirmed', 'Approved', 'Rescheduled'].includes(a.status) && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {t('citizen.confirmedLocation', 'Confirmed Location:')}
                          </span>
                          <p className="text-slate-800 font-bold mt-0.5 flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-[#A00000] flex-shrink-0" />
                            <span>
                              {a.confirmedLocation || a.approvedVenue || t('citizen.locationNotAssigned', 'Location not assigned')}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Reschedule banner */}
                      {a.rescheduleReason && (
                        <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 text-[11px]">
                          <strong>{t('citizen.rescheduleReason', 'Rescheduling Reason:')}</strong> {a.rescheduleReason}
                        </div>
                      )}

                      {/* Rejection banner */}
                      {a.rejectionReason && (
                        <div className="p-2.5 bg-red-50 text-red-900 rounded-xl border border-red-200 text-[11px]">
                          <strong>{t('citizen.rejectionReason', 'Rejection Reason:')}</strong> {a.rejectionReason}
                        </div>
                      )}

                      {/* Subadmin remarks */}
                      {a.subadminRemarks && (
                        <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl text-[11px]">
                          <strong>{t('citizen.subadminRemarks', 'Subadmin Remarks:')}</strong> {a.subadminRemarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 6. MY COMPLAINTS SECTION ================= */}
        {activeSection === 'my-complaints' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#252525]">
                  {t('citizen.myComplaints', 'My Registered Complaints & Live Status')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('citizen.myComplaintsDesc', 'Track all your filed grievances, inspection reports, and download official records')}
                </p>
              </div>
              <Link
                to="/citizen/register-complaint"
                className="w-full sm:w-auto px-4 py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto min-h-[38px]"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t('citizen.registerNewComplaint', 'Register New Complaint')}</span>
              </Link>
            </div>

            {/* Filter / Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                placeholder={t('citizen.trackPlaceholder', 'Filter complaints by ticket ID, title, or category...')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-[#A00000]"
              />
            </div>

            {(() => {
              const filteredComplaints = complaints.filter((c) => {
                if (!complaintSearch.trim()) return true;
                const q = complaintSearch.toLowerCase().trim();
                const code = (c.issueCode || c.complaintId || '').toLowerCase();
                const title = (c.title || '').toLowerCase();
                const cat = (c.category || '').toLowerCase();
                const desc = (c.description || '').toLowerCase();
                return code.includes(q) || title.includes(q) || cat.includes(q) || desc.includes(q);
              });

              if (filteredComplaints.length === 0) {
                return (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">
                        {complaintSearch.trim() ? t('reports.noData', 'No complaints match your search') : t('citizen.noComplaintsYet', 'No complaints registered yet.')}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {complaintSearch.trim() ? 'Try clearing or modifying your search filter.' : t('citizen.noComplaintsYetSub', 'Have an issue in your ward? Register a new complaint for direct field resolution.')}
                      </p>
                    </div>
                    {!complaintSearch.trim() && (
                      <Link
                        to="/citizen/register-complaint"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer min-h-[40px]"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span>{t('citizen.registerFirstComplaint', 'Register Your First Complaint')}</span>
                      </Link>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredComplaints.map((c) => {
                    const isCompleted = ['Completed', 'Resolved', 'Closed'].includes(c.status);
                    const isInProgress = c.status === 'In Progress';
                    const displayStatus = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending';

                    return (
                      <div
                        key={c._id || c.id}
                        className={`p-5 rounded-2xl border transition text-xs space-y-3 ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-300'
                            : isInProgress
                            ? 'bg-blue-50/30 border-blue-200'
                            : 'bg-amber-50/20 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100/80 pb-2.5">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#A00000] bg-white border border-red-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                              {c.issueCode || c.complaintId}
                            </span>
                            <StatusBadge status={displayStatus} />
                            <PriorityBadge priority={c.priority} />
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {t('citizen.registeredOn', 'Registered on')}: {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.description}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                          <div>
                            <span>{t('citizen.jurisdiction', 'Jurisdiction')}: </span>
                            <strong className="text-slate-800">
                              {c.wardId?.wardName ? `Ward ${c.wardId.wardNumber} - ${c.wardId.wardName}` : (c.wardNumber ? `Ward ${c.wardNumber}` : (currentUser?.assignedWard || 'Not Assigned'))}
                            </strong>
                            {c.category && (
                              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                                {c.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 flex-wrap">
                            {/* 1. Download PDF – தமிழ் */}
                            <button
                              type="button"
                              onClick={() => handleDownloadComplaintPDF(c, 'ta')}
                              disabled={downloadingPdfId === `${c._id || c.id}_ta`}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#A00000] border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[34px]"
                              title="Download Official Tamil Complaint PDF (புகார் நகல் - தமிழ்)"
                            >
                              {downloadingPdfId === `${c._id || c.id}_ta` ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>உருவாக்குகிறது...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 shrink-0 text-[#A00000]" />
                                  <span>Download PDF – தமிழ்</span>
                                </>
                              )}
                            </button>

                            {/* 2. Download PDF – English */}
                            <button
                              type="button"
                              onClick={() => handleDownloadComplaintPDF(c, 'en')}
                              disabled={downloadingPdfId === `${c._id || c.id}_en`}
                              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[34px]"
                              title="Download Official English Complaint PDF"
                            >
                              {downloadingPdfId === `${c._id || c.id}_en` ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 shrink-0 text-slate-700" />
                                  <span>Download PDF – English</span>
                                </>
                              )}
                            </button>

                            <Link
                              to="/citizen/my-complaints"
                              className="font-bold text-[#A00000] hover:underline flex items-center space-x-1"
                            >
                              <span>{t('citizen.trackTimeline', 'Track Timeline & Resolution')}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Completed Resolution Details */}
                        {isCompleted && (
                          <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 space-y-1.5 text-emerald-950">
                            <div className="flex items-center space-x-1.5 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                              <span>{t('citizen.complaintFixedSuccess', 'Your complaint was fixed successfully!')}</span>
                            </div>
                            {(c.actionTaken || c.finalReport) && (
                              <p className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-lg border border-emerald-200 mt-1">
                                <strong>Action Taken:</strong> {c.actionTaken || c.finalReport}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      <Footer />

      {/* ================= MODAL: APPOINTMENT DETAILS & HISTORY ================= */}
      {isApptModalOpen && selectedAppointment && (
        <Modal
          isOpen={isApptModalOpen}
          onClose={() => setIsApptModalOpen(false)}
          title={`${t('citizen.apptDetailsModalTitle', 'Appointment Details')}: ${selectedAppointment.appointmentId || selectedAppointment.tokenNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">{t('citizen.colApptId', 'Appointment ID')}</span>
                <strong className="text-[#850000] font-mono font-bold text-sm">
                  {selectedAppointment.appointmentId || selectedAppointment.tokenNumber}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{t('citizen.currentStatus', 'Current Status')}</span>
                <div className="mt-0.5">{getStatusBadge(selectedAppointment.status)}</div>
              </div>
            </div>

            <div className="p-3.5 bg-[#FFF8F0] rounded-2xl border border-[#FFE5A3] space-y-1.5">
              <span className="text-slate-500 block text-[11px]">{t('citizen.subjectPurpose', 'Subject / Purpose')}</span>
              <strong className="text-sm font-extrabold text-[#850000] block">
                {selectedAppointment.subject || selectedAppointment.purpose}
              </strong>
              {selectedAppointment.description && (
                <p className="text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                  {selectedAppointment.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold">{t('citizen.requestedByYou', 'Requested By You')}</span>
                <p className="text-slate-800">
                  <strong>{t('citizen.dateLabel', 'Date:')}</strong> {new Date(selectedAppointment.requestedDate || selectedAppointment.preferredDate).toLocaleDateString()}
                </p>
                <p className="text-slate-800">
                  <strong>{t('citizen.slotLabel', 'Slot:')}</strong> {selectedAppointment.requestedTime || selectedAppointment.preferredTimeSlot}
                </p>
                <p className="text-slate-700">
                  <strong>{t('citizen.locationLabel', 'Location:')}</strong> {selectedAppointment.requestedLocation || selectedAppointment.assignedVenue || 'HQ'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold">{t('citizen.officialConfirmedDetails', 'Official Confirmed Details')}</span>
                {selectedAppointment.confirmedDate || selectedAppointment.approvedDate ? (
                  <>
                    <p className="text-emerald-900 font-bold">
                      {t('citizen.dateLabel', 'Date:')} {new Date(selectedAppointment.confirmedDate || selectedAppointment.approvedDate).toLocaleDateString()}
                    </p>
                    <p className="text-emerald-800">
                      {t('citizen.timeLabel', 'Time:')} {selectedAppointment.confirmedTime || selectedAppointment.approvedTimeSlot}
                    </p>
                    <p className="text-emerald-800 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-[#A00000] flex-shrink-0" />
                      <span>
                        <strong>{t('citizen.locationLabel', 'Location:')}</strong>{' '}
                        {selectedAppointment.confirmedLocation || selectedAppointment.approvedVenue || t('citizen.locationNotAssigned', 'Location not assigned')}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 italic pt-2">
                    {t('citizen.pendingAdminConf', 'Pending administrative confirmation by Subadmin.')}
                  </p>
                )}
              </div>
            </div>

            {selectedAppointment.subadminRemarks && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block">{t('citizen.subadminRemarks', 'Subadmin Remarks:')}</span>
                <p className="text-slate-700 mt-0.5">{selectedAppointment.subadminRemarks}</p>
              </div>
            )}

            {selectedAppointment.rescheduleReason && (
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
                <span className="font-bold block">{t('citizen.reschedulingExpl', 'Rescheduling Explanation:')}</span>
                <p className="mt-0.5">{selectedAppointment.rescheduleReason}</p>
              </div>
            )}

            {selectedAppointment.rejectionReason && (
              <div className="p-3 bg-red-50 text-red-900 rounded-xl border border-red-200">
                <span className="font-bold block">{t('citizen.rejectionExpl', 'Rejection Explanation:')}</span>
                <p className="mt-0.5">{selectedAppointment.rejectionReason}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApptModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-black text-white rounded-xl font-bold transition cursor-pointer"
              >
                {t('citizen.close', 'Close')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CitizenPortalPage;
