import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  UserPlus,
  Building,
  MapPin,
  Landmark,
  Home,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import vickyAnaImg from '../../assets/vicky ana.png';
import {
  PAGUTHI_LABEL,
  PAGUTHI_OPTIONS,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getWardsForPaguthi,
} from '../../utils/paguthiWardData';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  // Registration Fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paguthi, setPaguthi] = useState('');
  const [village, setVillage] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [wardId, setWardId] = useState('');
  const [assignedWard, setAssignedWard] = useState('');
  const [constituency, setConstituency] = useState('');
  const [password, setPassword] = useState('');

  const [dbWards, setDbWards] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch actual master ward records from backend
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/auth/location-options');
        if (res.data?.success && Array.isArray(res.data.data?.wards)) {
          setDbWards(res.data.data.wards);
        }
      } catch (err) {
        console.warn('Using standard location master rules:', err.message);
      }
    };
    fetchLocations();
  }, []);

  // Dynamic Wards belonging strictly to selected Paguthi (Matches Ward Secretary Registration)
  const availableWardsForPaguthi = useMemo(() => {
    if (!paguthi) return [];
    const canonicalP = paguthi === 'Podanur' ? 'Pothanur' : paguthi;

    const matchedDbWards = dbWards.filter((w) => {
      const wp = w.paguthi === 'Podanur' ? 'Pothanur' : w.paguthi;
      return wp === canonicalP;
    });

    const ruleNums = getWardsForPaguthi(canonicalP);
    const combined = [];
    const seenNumbers = new Set();

    matchedDbWards.forEach((w) => {
      const num = Number(w.wardNumber);
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        const cleanName = (w.wardName || '').replace(/^Ward\s*\d+\s*[-:]*\s*/i, '').trim();
        const cName = w.constituency?.name || 'Kinathukadavu';
        combined.push({
          wardNumber: num,
          wardId: String(w.id || w._id),
          wardName: cleanName || `${canonicalP} Ward ${num}`,
          label: cleanName ? `Ward ${num} - ${cleanName}` : `Ward ${num}`,
          constituency: cName,
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
          constituency: 'Kinathukadavu',
        });
      }
    });

    return combined.sort((a, b) => a.wardNumber - b.wardNumber);
  }, [paguthi, dbWards]);

  // Dynamic Villages belonging to selected Paguthi
  const availableVillagesForPaguthi = useMemo(() => {
    return getVillagesForPaguthi(paguthi);
  }, [paguthi]);

  // Handle Paguthi selection & reset ward
  const handlePaguthiChange = (e) => {
    const selectedP = e.target.value;
    setPaguthi(selectedP);
    setVillage('');
    setWardNumber('');
    setWardId('');
    setAssignedWard('');
    setConstituency('');
    setErrorMessage('');
  };

  // Handle Ward selection & auto-map constituency
  const handleWardChange = (e) => {
    const selectedNum = e.target.value;
    const selectedItem = availableWardsForPaguthi.find(
      (w) => String(w.wardNumber) === String(selectedNum)
    );
    setWardNumber(selectedNum);
    setWardId(selectedItem ? String(selectedItem.wardId) : selectedNum);
    setAssignedWard(selectedItem ? selectedItem.label : (selectedNum ? `Ward ${selectedNum}` : ''));
    const mappedConstituency = selectedItem?.constituency || 'Kinathukadavu';
    setConstituency(mappedConstituency);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanName) {
      setErrorMessage(t('auth.namePlaceholder'));
      return;
    }

    // Validate Indian mobile number format: 10 digits starting with 6, 7, 8, or 9
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanPhone)) {
      setErrorMessage(
        'Please enter a valid 10-digit Indian mobile number (e.g., 9842567890)'
      );
      return;
    }

    if (!paguthi) {
      setErrorMessage(`Please select ${PAGUTHI_LABEL}`);
      return;
    }

    if (availableVillagesForPaguthi.length > 0 && !village) {
      setErrorMessage(`Please select a Village for ${paguthi}`);
      return;
    }

    if (!wardNumber) {
      setErrorMessage('Please select your Ward');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: cleanName,
        phoneNumber: cleanPhone,
        password,
        paguthi,
        village: village || '',
        wardId,
        wardNumber,
        assignedWard,
        constituency: constituency || 'Kinathukadavu',
      });

      if (res.data.success) {
        notifySuccess(
          'Citizen account registered successfully! Please sign in with your phone number and password.'
        );
        // After successful registration: redirect to Login Page as requested
        navigate('/login');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please check your phone number and details.';
      setErrorMessage(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans overflow-x-hidden">
      {/* 1. TOP HEADER WITH GLOBAL LANGUAGE SELECTOR */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between relative z-20 flex-shrink-0">
        <div className="w-10 sm:w-28"></div>

        {/* Center Headings */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-white text-base sm:text-xl md:text-2xl font-bold tracking-normal drop-shadow-xs">
            {t('header.systemTitle')}
          </h1>
          <div className="flex items-center justify-center space-x-2 mt-0.5">
            <span className="w-6 sm:w-10 h-[1px] bg-[#FFD32A]"></span>
            <span className="text-[#FFD32A] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              {t('header.adminPortal')}
            </span>
            <span className="w-6 sm:w-10 h-[1px] bg-[#FFD32A]"></span>
          </div>
        </div>

        {/* Right: Global Language Switcher */}
        <div className="w-auto flex justify-end">
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      {/* 2. MAIN CENTERED SIGNUP CONTAINER */}
      <main className="flex-1 flex flex-col justify-center items-center py-4 sm:py-6 md:py-8 px-3 sm:px-6 md:px-8 w-full">
        <div className="w-full max-w-[1240px] bg-white rounded-[24px] shadow-[0_10px_40px_rgba(133,0,0,0.08)] border border-[#E9E2DC]/80 overflow-hidden flex flex-col md:flex-row self-center">
          
          {/* ================= LEFT PANEL ================= */}
          <div
            className="w-full md:w-[54%] lg:w-[56%] relative flex flex-col justify-between p-4 sm:p-6 md:p-7 pb-0 sm:pb-0 md:pb-0 text-white min-h-[280px] sm:min-h-[360px] md:min-h-[460px] lg:min-h-[500px] overflow-hidden"
            style={{
              backgroundImage: `url(${coimbatoreCityBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Transparent Maroon Gradient Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(115, 0, 0, 0.22) 0%, rgba(120, 0, 0, 0.35) 45%, rgba(85, 0, 0, 0.52) 100%)',
              }}
            />

            {/* Top Badge */}
            <div className="relative z-10 pt-1">
              <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                <span className="text-white tracking-wide">{t('auth.adminGovernanceCRM')}</span>
              </div>
            </div>

            {/* Profile Image + Text Side-by-Side Horizontal Layout */}
            <div className="relative z-10 w-full mt-auto pt-3">
              <div className="flex flex-col sm:flex-row items-end gap-3 sm:gap-4 md:gap-5">
                
                {/* PROMINENT LARGE PROFILE IMAGE (BIGGER THAN CONTENT) */}
                <div className="flex justify-start items-end flex-shrink-0">
                  <img
                    src={vickyAnaImg}
                    alt="TVK Leadership - Coimbatore"
                    className="w-[180px] sm:w-[240px] md:w-[260px] lg:w-[320px] xl:w-[360px] max-h-[240px] sm:max-h-[300px] md:max-h-[340px] lg:max-h-[390px] object-contain drop-shadow-2xl filter brightness-105"
                    style={{
                      objectPosition: 'bottom left',
                    }}
                  />
                </div>

                {/* TEXT CONTENT IMMEDIATELY TO THE RIGHT */}
                <div className="pb-3 sm:pb-5 md:pb-6 text-left flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold leading-snug text-white drop-shadow-md">
                    {t('auth.dedicated')}
                    <span className="block text-[#FFD32A] mt-0.5">{t('auth.delivering')}</span>
                  </h2>

                  {/* Decorative Underline */}
                  <div className="w-10 h-1 bg-[#FFD32A] rounded-full mt-2 mb-2 shadow-xs"></div>

                  <p className="text-white/95 text-xs sm:text-[12.5px] leading-relaxed drop-shadow-sm font-medium">
                    {t('auth.leftDesc')}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* ================= RIGHT PANEL (ONLY 3 FIELDS SIGNUP FORM) ================= */}
          <div className="w-full md:w-[46%] lg:w-[44%] p-4 sm:p-6 md:p-8 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-3.5 sm:space-y-4">
              
              {/* Form Title & Subtitle */}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#A00000] tracking-tight">
                  {t('auth.signupTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-[#747474] mt-0.5 font-medium">
                  {t('auth.signupSubtitle')}
                </p>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#A00000] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
                
                {/* FIELD 1: NAME */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    {t('auth.name')} *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.namePlaceholder')}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] placeholder-slate-400 focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    />
                  </div>
                </div>

                {/* FIELD 2: PHONE NUMBER */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    {t('auth.phoneNumber')} *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder={t('auth.phonePlaceholder')}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] placeholder-slate-400 focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter valid 10-digit mobile number for SMS notifications
                  </p>
                </div>

                {/* FIELD 3: PAGUTHI / ONDRIYAM / NAGARAM */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    {PAGUTHI_LABEL} *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      required
                      value={paguthi}
                      onChange={handlePaguthiChange}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    >
                      <option value="">-- Select {PAGUTHI_LABEL} --</option>
                      {PAGUTHI_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* FIELD 4: VILLAGE (DYNAMIC BASED ON PAGUTHI) */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    Village {availableVillagesForPaguthi.length > 0 ? '*' : '(Optional / N/A)'}
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      required={availableVillagesForPaguthi.length > 0}
                      disabled={!paguthi || availableVillagesForPaguthi.length === 0}
                      value={village}
                      onChange={(e) => {
                        setVillage(e.target.value);
                        setErrorMessage('');
                      }}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!paguthi
                          ? '-- Select Paguthi First --'
                          : availableVillagesForPaguthi.length === 0
                          ? '-- Not Applicable for selected Paguthi --'
                          : '-- Select Village --'}
                      </option>
                      {availableVillagesForPaguthi.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  {paguthi && availableVillagesForPaguthi.length > 0 ? (
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                      {availableVillagesForPaguthi.length} village(s) mapped to {paguthi}
                    </p>
                  ) : null}
                </div>

                {/* FIELD 5: WARD NUMBER */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    Ward *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      required
                      disabled={!paguthi}
                      value={wardNumber}
                      onChange={handleWardChange}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!paguthi ? '-- Select Paguthi First --' : '-- Select Ward --'}
                      </option>
                      {availableWardsForPaguthi.map((w) => (
                        <option key={w.wardNumber} value={String(w.wardNumber)}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {paguthi && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                      Showing {availableWardsForPaguthi.length} wards belonging to {paguthi}
                    </p>
                  )}
                </div>

                {/* FIELD 5: CONSTITUENCY */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    Constituency *
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      readOnly
                      value={constituency || (!paguthi ? 'Select Paguthi & Ward' : 'Kinathukadavu')}
                      placeholder="Constituency"
                      className="w-full bg-slate-50 border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-700 font-medium cursor-not-allowed select-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Automatically mapped based on your selected administrative ward
                  </p>
                </div>

                {/* FIELD 3: PASSWORD */}
                <div>
                  <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                    {t('auth.password')} *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.enterPassword')}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#252525] placeholder-slate-400 focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* SUBMIT BUTTON: CREATE ACCOUNT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-xs sm:text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('auth.creatingAccount')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{t('auth.createAccount')}</span>
                    </>
                  )}
                </button>
              </form>

              {/* BOTTOM TEXT: ALREADY HAVE AN ACCOUNT? SIGN IN */}
              <div className="text-center pt-2 text-xs">
                <span className="text-[#747474]">{t('auth.alreadyAccount')} </span>
                <Link
                  to="/login"
                  className="font-bold text-[#A00000] hover:underline inline-flex items-center"
                >
                  {t('auth.signIn')} →
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignupPage;
