import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  User,
  Lock,
  Building,
  Users,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  KeyRound,
  MapPin,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import {
  PAGUTHI_LABEL,
  PAGUTHI_OPTIONS,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getWardsForPaguthi,
  isWardValidForPaguthi,
} from '../../utils/paguthiWardData';

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [settingsData, setSettingsData] = useState(null);

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Create User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'ward_officer',
    phone: '',
    assignedWard: '',
  });

  // Dedicated Ward Secretary Management State (Update 3)
  const [wardSecretaries, setWardSecretaries] = useState([]);
  const [wards, setWards] = useState([]);
  const [secLoading, setSecLoading] = useState(false);
  const [secSearch, setSecSearch] = useState('');
  const [secPaguthiFilter, setSecPaguthiFilter] = useState('All');
  const [secWardFilter, setSecWardFilter] = useState('All');
  const [secStatusFilter, setSecStatusFilter] = useState('All');
  const [isSubmittingSec, setIsSubmittingSec] = useState(false);
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [secFormError, setSecFormError] = useState('');
  const [secForm, setSecForm] = useState({
    name: '',
    phone: '',
    age: '',
    paguthi: '',
    village: '',
    wardNumber: '',
    wardId: '',
    assignedWard: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const availableVillagesForSecPaguthi = useMemo(() => {
    return getVillagesForPaguthi(secForm.paguthi);
  }, [secForm.paguthi]);

  // Dynamic Wards belonging strictly to selected Paguthi (Hook called unconditionally)
  const availableWardsForPaguthi = useMemo(() => {
    if (!secForm.paguthi) return [];
    const canonicalP = secForm.paguthi === 'Podanur' ? 'Pothanur' : secForm.paguthi;

    const dbWards = wards.filter((w) => {
      const wp = w.paguthi === 'Podanur' ? 'Pothanur' : w.paguthi;
      return wp === canonicalP;
    });

    const ruleNums = getWardsForPaguthi(canonicalP);
    const combined = [];
    const seenNumbers = new Set();

    dbWards.forEach((w) => {
      const num = Number(w.wardNumber);
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        const cleanName = (w.wardName || '').replace(/^Ward\s*\d+\s*[-:]*\s*/i, '').trim();
        combined.push({
          wardNumber: num,
          wardId: String(w.id || w._id),
          wardName: cleanName || `${canonicalP} Ward ${num}`,
          label: cleanName ? `Ward ${num} - ${cleanName}` : `Ward ${num}`,
        });
      }
    });

    ruleNums.forEach((wNum) => {
      const num = Number(wNum);
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        combined.push({
          wardNumber: num,
          wardId: String(num),
          wardName: `${canonicalP} Ward ${num}`,
          label: `Ward ${num}`,
        });
      }
    });

    return combined.sort((a, b) => a.wardNumber - b.wardNumber);
  }, [secForm.paguthi, wards]);

  const fetchWardSecretaries = async () => {
    try {
      setSecLoading(true);
      const [secRes, wardsRes] = await Promise.all([
        api.get('/settings/ward-secretaries').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/districts/wards').catch(() => ({ data: { success: false, data: [] } })),
      ]);
      if (secRes.data.success) {
        setWardSecretaries(secRes.data.data);
      }
      if (wardsRes.data.success) {
        setWards(wardsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load ward secretary data:', err);
    } finally {
      setSecLoading(false);
    }
  };

  const handleRegisterWardSecretary = async (e) => {
    e.preventDefault();
    setSecFormError('');

    if (!secForm.name.trim()) {
      setSecFormError('Full Name is required');
      notifyError('Full Name is required');
      return;
    }
    const cleanPhone = secForm.phone.trim().replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setSecFormError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)');
      notifyError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)');
      return;
    }
    if (!secForm.paguthi) {
      setSecFormError(`Please select ${PAGUTHI_LABEL}`);
      notifyError(`Please select ${PAGUTHI_LABEL}`);
      return;
    }
    const villagesForSecP = getVillagesForPaguthi(secForm.paguthi);
    if (villagesForSecP.length > 0 && !secForm.village) {
      setSecFormError(`Please select a Village for ${secForm.paguthi}`);
      notifyError(`Please select a Village for ${secForm.paguthi}`);
      return;
    }
    const wardNum = parseInt(String(secForm.wardNumber || secForm.assignedWard || secForm.wardId).replace(/\D+/g, ''), 10);
    const selectedWardItem = availableWardsForPaguthi.find(
      (w) => String(w.wardNumber) === String(wardNum)
    );
    if (!wardNum || !selectedWardItem) {
      setSecFormError(`Please select a valid Ward belonging to ${secForm.paguthi}`);
      notifyError(`Please select a valid Ward belonging to ${secForm.paguthi}`);
      return;
    }
    if (!secForm.username.trim()) {
      setSecFormError('Username is required');
      notifyError('Username is required');
      return;
    }
    if (!secForm.password || secForm.password.length < 6) {
      setSecFormError('Password must be at least 6 characters long');
      notifyError('Password must be at least 6 characters long');
      return;
    }
    if (secForm.password !== secForm.confirmPassword) {
      setSecFormError('Confirm Password does not match Password');
      notifyError('Confirm Password does not match Password');
      return;
    }

    setIsSubmittingSec(true);
    try {
      const payload = {
        name: secForm.name.trim(),
        phone: cleanPhone,
        age: secForm.age ? parseInt(secForm.age, 10) : 32,
        paguthi: secForm.paguthi,
        village: secForm.village || '',
        wardId: selectedWardItem ? String(selectedWardItem.wardId) : String(wardNum),
        wardNumber: String(wardNum),
        assignedWard: selectedWardItem ? selectedWardItem.label : `Ward ${wardNum}`,
        username: secForm.username.trim().toLowerCase(),
        password: secForm.password,
        confirmPassword: secForm.confirmPassword,
      };

      const res = await api.post('/settings/ward-secretaries', payload);
      if (res.data.success) {
        notifySuccess(res.data.message || 'Ward Secretary account registered successfully!');
        setSecFormError('');
        setSecForm({
          name: '',
          phone: '',
          age: '',
          paguthi: '',
          village: '',
          wardNumber: '',
          wardId: '',
          assignedWard: '',
          username: '',
          password: '',
          confirmPassword: '',
        });
        fetchWardSecretaries();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to register Ward Secretary';
      setSecFormError(errorMsg);
      notifyError(errorMsg);
    } finally {
      setIsSubmittingSec(false);
    }
  };

  const handleToggleWardSecretary = async (secId) => {
    try {
      const res = await api.patch(`/settings/ward-secretaries/${secId}/toggle-status`);
      if (res.data.success) {
        notifySuccess(res.data.message);
        fetchWardSecretaries();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to toggle account status');
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettingsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    fetchSettings();
    fetchWardSecretaries();
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/settings/profile', { name, email, phone });
      if (res.data.success) {
        notifySuccess('Admin profile updated!');
        updateUser(res.data.data);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notifyError('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.put('/settings/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        notifySuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/settings/users', newUserData);
      if (res.data.success) {
        notifySuccess('New user account created!');
        setIsUserModalOpen(false);
        setNewUserData({
          name: '',
          username: '',
          email: '',
          password: '',
          role: 'ward_officer',
          phone: '',
          assignedWard: '',
        });
        fetchSettings();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.patch(`/settings/users/${userId}/toggle-status`);
      if (res.data.success) {
        notifySuccess(res.data.message);
        fetchSettings();
      }
    } catch (err) {
      notifyError('Failed to toggle status');
    }
  };

  if (loading && !settingsData) return <LoadingSpinner fullScreen text="Loading Settings..." />;

  const org = settingsData?.organization || {};
  const usersList = settingsData?.users || [];
  const auditLogs = settingsData?.auditLogs || [];

  const filteredSecretaries = wardSecretaries.filter((s) => {
    // Exclude dummy or unassigned mock records without Paguthi
    if (!s.paguthi) return false;

    const q = secSearch.trim().toLowerCase();
    if (q) {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchPhone = (s.phone || '').toLowerCase().includes(q);
      const matchUser = (s.username || '').toLowerCase().includes(q);
      const matchWard = (s.assignedWard || '').toLowerCase().includes(q);
      const matchPaguthi = (s.paguthi || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchUser && !matchWard && !matchPaguthi) return false;
    }
    if (secPaguthiFilter !== 'All') {
      const filterP = secPaguthiFilter === 'Podanur' ? 'Pothanur' : secPaguthiFilter;
      const sp = s.paguthi === 'Podanur' ? 'Pothanur' : s.paguthi;
      if (sp !== filterP) return false;
    }
    if (secWardFilter !== 'All') {
      if (String(s.wardId) !== String(secWardFilter) && !String(s.assignedWard).includes(`Ward ${secWardFilter}`)) {
        return false;
      }
    }
    if (secStatusFilter !== 'All') {
      const isActiveFilter = secStatusFilter === 'Active';
      if (s.isActive !== isActiveFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header Banner */}
      <AdminPageHeader
        badge={t('settings.headerBadge', 'District Administration Settings')}
        badgeIcon={Settings}
        title={t('settings.title', 'System Settings & Security')}
        tamilTitle="அமைப்பு அமைப்புகள் மற்றும் பாதுகாப்பு"
        subtitle={t('settings.subtitle', 'Manage administrator credentials, user accounts, and district organization parameters.')}
      />

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: 'profile', label: t('settings.tabProfile', 'Admin Profile'), icon: User },
          { id: 'wardSecretaries', label: 'Ward Secretary Management', icon: ShieldCheck },
          { id: 'security', label: t('settings.tabPassword', 'Security & Password'), icon: Lock },
          { id: 'organization', label: 'Organization Info', icon: Building },
          { id: 'users', label: t('settings.tabUsers', 'User Management'), icon: Users },
          { id: 'audit', label: 'Audit Log Trail', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-red-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">{t('settings.profileTitle', 'Administrator Profile')}</h2>
          <p className="text-xs text-slate-400 mb-6">Update contact info and display preferences</p>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.nameLabel', 'Full Name')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.emailLabel', 'Email Address')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.phoneLabel', 'Phone Number')}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94430 12345"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="py-2.5 px-5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
              >
                {savingProfile ? t('settings.savingProfileBtn', 'Saving...') : t('settings.saveProfileBtn', 'Save Profile Changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Ward Secretary Account Management (Update 3) */}
      {activeTab === 'wardSecretaries' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-6 sm:p-7 rounded-3xl shadow-sm border border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-[#FFD32A]/20 text-[#FFD32A] px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2 border border-[#FFD32A]/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ward Governance Administration</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Ward Secretary Account Management</h2>
              <p className="text-xs text-white/80 mt-1 max-w-xl">
                Register municipal ward secretaries, provision authenticated portal access, and enforce strict ward-level complaint data isolation.
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/20 self-start sm:self-auto">
              <div className="text-center px-2">
                <span className="block text-2xl font-black text-[#FFD32A]">{wardSecretaries.length}</span>
                <span className="text-[10px] uppercase font-bold text-white/80">Total Secretaries</span>
              </div>
              <div className="w-[1px] h-8 bg-white/20" />
              <div className="text-center px-2">
                <span className="block text-2xl font-black text-emerald-300">
                  {wardSecretaries.filter((s) => s.isActive).length}
                </span>
                <span className="text-[10px] uppercase font-bold text-white/80">Active</span>
              </div>
              <div className="w-[1px] h-8 bg-white/20" />
              <div className="text-center px-2">
                <span className="block text-2xl font-black text-rose-300">
                  {wardSecretaries.filter((s) => !s.isActive).length}
                </span>
                <span className="text-[10px] uppercase font-bold text-white/80">Deactivated</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Ward Secretary Registration Form (1 Col) */}
            <div className="lg:col-span-1 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#850000] flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Register Ward Secretary</h3>
                    <p className="text-[11px] text-slate-400">All fields are mandatory</p>
                  </div>
                </div>

                <form onSubmit={handleRegisterWardSecretary} className="space-y-3.5 text-xs">
                  {/* Error Alert Box */}
                  {secFormError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 font-semibold leading-relaxed">{secFormError}</div>
                    </div>
                  )}

                  {/* 1. Full Name */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={secForm.name}
                      onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
                      placeholder="e.g. K. R. Vijayakumar"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                    />
                  </div>

                  {/* 2. Mobile Number & Age */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={secForm.phone}
                        onChange={(e) => setSecForm({ ...secForm, phone: e.target.value })}
                        placeholder="9842100072"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">10-digit mobile number</span>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Age *
                      </label>
                      <input
                        type="number"
                        required
                        min="18"
                        max="99"
                        value={secForm.age}
                        onChange={(e) => setSecForm({ ...secForm, age: e.target.value })}
                        placeholder="35"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Min 18</span>
                    </div>
                  </div>

                  {/* 3. Paguthi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {PAGUTHI_LABEL} *
                    </label>
                    <select
                      required
                      value={secForm.paguthi}
                      onChange={(e) => {
                        const selectedPaguthi = e.target.value;
                        setSecForm((prev) => ({
                          ...prev,
                          paguthi: selectedPaguthi,
                          village: '',
                          wardNumber: '',
                          wardId: '',
                          assignedWard: '',
                        }));
                        setSecFormError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                    >
                      <option value="">-- Select {PAGUTHI_LABEL} --</option>
                      {PAGUTHI_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Select administrative jurisdiction under Kinathukadavu</span>
                  </div>

                  {/* 4. Village - DYNAMIC BASED ON PAGUTHI */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Village {availableVillagesForSecPaguthi.length > 0 ? '*' : '(Optional / N/A)'}
                    </label>
                    <select
                      required={availableVillagesForSecPaguthi.length > 0}
                      disabled={!secForm.paguthi || availableVillagesForSecPaguthi.length === 0}
                      value={secForm.village}
                      onChange={(e) => {
                        setSecForm((prev) => ({ ...prev, village: e.target.value }));
                        setSecFormError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000] disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <option value="">
                        {!secForm.paguthi
                          ? '-- Select Paguthi First --'
                          : availableVillagesForSecPaguthi.length === 0
                          ? '-- Not Applicable for selected Paguthi --'
                          : '-- Select Village --'}
                      </option>
                      {availableVillagesForSecPaguthi.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {secForm.paguthi && availableVillagesForSecPaguthi.length > 0 ? (
                      <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                        {availableVillagesForSecPaguthi.length} village(s) mapped to {secForm.paguthi}
                      </span>
                    ) : secForm.paguthi ? (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        No specific village list mapped for this Paguthi
                      </span>
                    ) : null}
                  </div>

                  {/* 5. Ward Number - DYNAMIC BASED ON PAGUTHI */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ward Number *
                    </label>
                    <select
                      required
                      disabled={!secForm.paguthi}
                      value={secForm.wardNumber}
                      onChange={(e) => {
                        const selectedWardNum = e.target.value;
                        const selectedWardItem = availableWardsForPaguthi.find(
                          (w) => String(w.wardNumber) === String(selectedWardNum)
                        );
                        setSecForm((prev) => ({
                          ...prev,
                          wardNumber: selectedWardNum,
                          wardId: selectedWardItem ? String(selectedWardItem.wardId) : selectedWardNum,
                          assignedWard: selectedWardItem ? selectedWardItem.label : (selectedWardNum ? `Ward ${selectedWardNum}` : ''),
                        }));
                        setSecFormError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000] disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <option value="">
                        {!secForm.paguthi ? '-- Select Paguthi First --' : '-- Select Ward --'}
                      </option>
                      {availableWardsForPaguthi.map((w) => (
                        <option key={w.wardNumber} value={String(w.wardNumber)}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                    {secForm.paguthi && (
                      <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                        Showing {availableWardsForPaguthi.length} wards belonging to {secForm.paguthi}
                      </span>
                    )}
                  </div>

                  {/* 5. Login Username */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={secForm.username}
                      onChange={(e) => setSecForm({ ...secForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      placeholder="e.g. ward2_sec"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#850000]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Unique username for portal sign-in</span>
                  </div>

                  {/* 6 & 7. Password & Confirm Password */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Password *
                      </label>
                      <input
                        type={showSecPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={secForm.password}
                        onChange={(e) => setSecForm({ ...secForm, password: e.target.value })}
                        placeholder="••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showSecPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={secForm.confirmPassword}
                        onChange={(e) => setSecForm({ ...secForm, confirmPassword: e.target.value })}
                        placeholder="••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#850000]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSecPassword}
                        onChange={(e) => setShowSecPassword(e.target.checked)}
                        className="rounded text-[#850000] focus:ring-[#850000]"
                      />
                      <span>Show passwords</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Encrypted with bcrypt</span>
                  </div>

                  {/* 8. Register Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingSec}
                      className="w-full py-2.5 px-4 bg-[#850000] hover:bg-[#A00000] text-white font-bold rounded-xl transition text-xs shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4 text-[#FFD32A]" />
                      <span>{isSubmittingSec ? 'Registering Account...' : 'Register Ward Secretary'}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Passwords are hashed before saving and never returned in API payloads.</span>
              </div>
            </div>

            {/* 2. Registered Ward Secretary Accounts Table (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Registered Ward Secretary Accounts</h3>
                    <p className="text-[11px] text-slate-400">
                      Showing {filteredSecretaries.length} of {wardSecretaries.length} registered secretaries
                    </p>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={secSearch}
                        onChange={(e) => setSecSearch(e.target.value)}
                        placeholder="Search name, phone, ward..."
                        className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#850000] w-36 sm:w-44"
                      />
                    </div>

                    <select
                      value={secPaguthiFilter}
                      onChange={(e) => setSecPaguthiFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                    >
                      <option value="All">All Paguthis / Local Bodies</option>
                      {PAGUTHI_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>

                    <select
                      value={secWardFilter}
                      onChange={(e) => setSecWardFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                    >
                      <option value="All">All Wards</option>
                      {wards.map((w) => (
                        <option key={w.id || w._id} value={String(w.wardNumber)}>
                          Ward {w.wardNumber} ({w.paguthi})
                        </option>
                      ))}
                    </select>

                    <select
                      value={secStatusFilter}
                      onChange={(e) => setSecStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#850000]"
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Deactivated</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Secretary Name</th>
                        <th className="py-2.5 px-3">Phone Number</th>
                        <th className="py-2.5 px-3 text-center">Age</th>
                        <th className="py-2.5 px-3">Paguthi</th>
                        <th className="py-2.5 px-3">Selected Ward Name</th>
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {secLoading ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            Loading Ward Secretaries...
                          </td>
                        </tr>
                      ) : filteredSecretaries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <ShieldCheck className="w-8 h-8 text-slate-300" />
                              <p className="text-sm font-bold text-slate-700">No Ward Secretaries Registered Yet</p>
                              <p className="text-[11px] text-slate-400 max-w-xs">
                                Use the registration form on the left to register a new Ward Secretary for any municipal ward.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredSecretaries.map((sec) => (
                          <tr key={sec.id || sec._id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                              {sec.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {sec.phone || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                              {sec.age || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {sec.paguthi || '—'}
                              </span>
                              {sec.village && (
                                <span className="ml-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {sec.village}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {sec.assignedWard || (sec.wardNumber ? `Ward ${sec.wardNumber}` : '—')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                              @{sec.username}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sec.isActive
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {sec.isActive ? 'Active' : 'Deactivated'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                              {sec.createdAt ? new Date(sec.createdAt).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleWardSecretary(sec.id || sec._id)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer border ${
                                  sec.isActive
                                    ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                                    : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {sec.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Active secretaries can log in with their credentials at the portal.</span>
                <span className="text-[10px] text-slate-400">Total Wards: {wards.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">{t('settings.passwordTitle', 'Change Account Password')}</h2>
          <p className="text-xs text-slate-400 mb-6">Ensure your account uses a strong, unique password</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.currentPasswordLabel', 'Current Password')}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.newPasswordLabel', 'New Password')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.confirmPasswordLabel', 'Confirm New Password')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="py-2.5 px-5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition text-xs disabled:opacity-50"
              >
                {savingPassword ? t('settings.savingPasswordBtn', 'Updating...') : t('settings.savePasswordBtn', 'Update Password')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Organization */}
      {activeTab === 'organization' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-3xl space-y-4 text-xs">
          <h2 className="text-base font-bold text-slate-900">Organization Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Organization</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{org.name}</p>
              <p className="text-slate-500">{org.tamilName}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Jurisdiction</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{org.district}</p>
              <p className="text-slate-500">{org.jurisdiction}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Central Helpline</span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{org.helpline}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Official Email</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{org.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t('settings.usersTitle', 'Authorized System Users')}</h2>
              <p className="text-xs text-slate-400">Manage administrator and field officer logins</p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition space-x-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('settings.createUserBtn', 'Add User')}
            </button>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">{t('settings.colName', 'Name')}</th>
                  <th className="py-3 px-3">{t('settings.colUsername', 'Username')}</th>
                  <th className="py-3 px-3">{t('settings.emailLabel', 'Email')}</th>
                  <th className="py-3 px-3">{t('settings.colRole', 'Role')}</th>
                  <th className="py-3 px-3">{t('settings.colStatus', 'Status')}</th>
                  <th className="py-3 px-3">{t('common.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-3 font-mono">{u.username}</td>
                    <td className="py-3 px-3 text-slate-500">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.isActive ? t('status.Active', 'Active') : t('status.Inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleUser(u._id)}
                        className="text-xs font-bold text-red-700 hover:underline"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security & Activity Audit Trail</h2>
            <p className="text-xs text-slate-400">Timestamped record of administrative actions</p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold">
                      {log.module}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{log.details}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>{new Date(log.createdAt).toLocaleTimeString()}</p>
                  <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={t('settings.modalCreateUserTitle', 'Create Authorized CRM User')}
        subtitle={t('settings.modalCreateUserSub', 'Provision access for district leadership and ward officers')}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('settings.nameLabel', 'Full Name *')}</label>
            <input
              type="text"
              required
              value={newUserData.name}
              onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.usernameLabel', 'Username *')}</label>
              <input
                type="text"
                required
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.emailLabel', 'Email *')}</label>
              <input
                type="email"
                required
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.passwordLabel', 'Temporary Password *')}</label>
              <input
                type="password"
                required
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.roleLabel', 'Role *')}</label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="ward_officer">Ward Officer</option>
                <option value="district_admin">District Admin</option>
                <option value="staff">Staff Volunteer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-red-700 text-white rounded-xl font-bold">
              {t('settings.saveUserBtn', 'Create User')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
