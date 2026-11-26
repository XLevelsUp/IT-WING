import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Building,
  AlertCircle,
  LogIn,
  MapPin,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import vickyAnaImg from '../../assets/vicky ana.png';
import heroImg from '../../assets/hero.png';
import image3 from '../../assets/image3.png';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { error: notifyError, success: notifySuccess } = useNotification();

  // Role selections matching specifications
  const [selectedRole, setSelectedRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const rolesConfig = {
    admin: {
      key: 'admin',
      title: t('auth.adminLogin'),
      badge: t('auth.adminBadge'),
      subtitle: t('auth.adminSub'),
      userLabel: t('auth.username'),
      userPlaceholder: 'admin',
      defaultUser: 'admin',
      defaultPass: 'admin@123',
      icon: ShieldCheck,
      redirect: '/admin/dashboard',
    },
    subadmin: {
      key: 'subadmin',
      title: t('auth.subadminLogin'),
      badge: t('auth.subadminBadge'),
      subtitle: t('auth.subadminSub'),
      userLabel: t('auth.username'),
      userPlaceholder: 'subadmin',
      defaultUser: 'subadmin',
      defaultPass: 'subadmin123',
      icon: ShieldAlert,
      redirect: '/subadmin/dashboard',
    },
    citizen: {
      key: 'citizen',
      title: t('auth.userLogin'),
      badge: t('auth.citizenBadge'),
      subtitle: t('auth.citizenSub'),
      userLabel: t('auth.phoneOrUser'),
      userPlaceholder: '9842567890',
      defaultUser: '',
      defaultPass: '',
      icon: User,
      redirect: '/citizen',
    },
    ward_secretary: {
      key: 'ward_secretary',
      title: t('auth.wardSecretaryLogin'),
      badge: t('auth.wardBadge'),
      subtitle: t('auth.wardSub'),
      userLabel: t('auth.secretaryUsername', 'Registered Username'),
      userPlaceholder: 'Enter registered username',
      defaultUser: '',
      defaultPass: '',
      icon: Building,
      redirect: '/ward-secretary/dashboard',
    },
    paguthi_seyalaalar: {
      key: 'paguthi_seyalaalar',
      title: t('auth.paguthiSeyalaalarLogin', 'Paguthi / Ondriyam / Nagaram'),
      badge: t('auth.paguthiBadge', 'Paguthi / Ondriyam / Nagaram'),
      subtitle: t('auth.paguthiSub', 'Paguthi / Ondriyam / Nagaram Governance & Ward Oversight'),
      userLabel: t('auth.username', 'Username'),
      userPlaceholder: 'Username (e.g. thondamuthurtherkku, pothanur, kurichi...)',
      defaultUser: 'thondamuthurtherkku',
      defaultPass: 'thondamuthurtherkku@2026',
      icon: MapPin,
      redirect: '/paguthi-seyalaalar/dashboard',
    },
  };

  const currentRole = rolesConfig[selectedRole] || rolesConfig.admin;

  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    setIsRoleDropdownOpen(false);
    setErrorMessage('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage(t('auth.enterPassword'));
      return;
    }

    setLoading(true);
    try {
      const res = await login(username.trim(), password, selectedRole);
      notifySuccess(`${currentRole.title}: ${t('common.status')} OK!`);

      // Role-based smart redirection
      const userRole = res.data?.role;
      if (userRole === 'paguthi_seyalaalar' || selectedRole === 'paguthi_seyalaalar') {
        navigate('/paguthi-seyalaalar/dashboard');
      } else if (userRole === 'citizen' || userRole === 'user' || selectedRole === 'citizen') {
        navigate('/citizen');
      } else if (userRole === 'ward_secretary' || userRole === 'ward_officer' || selectedRole === 'ward_secretary') {
        navigate('/ward-secretary/dashboard');
      } else if (userRole === 'subadmin' || selectedRole === 'subadmin') {
        navigate('/subadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans overflow-x-hidden">
      {/* 1. TOP HEADER - EXACT DESIGN WITH LANGUAGE SELECTOR */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between relative z-20 flex-shrink-0">
        <div className="w-10 sm:w-28"></div>

        {/* Center Headings */}
        <div className="text-center flex-1 px-2 flex flex-col items-center">
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

          {/* hero.png placed directly below ADMINISTRATIVE PORTAL */}
          <div className="mt-2 flex justify-center">
            <img
              src={heroImg}
              alt="Administrative Portal Banner"
              className="h-10 sm:h-12 md:h-14 w-auto max-w-full object-contain drop-shadow-md"
            />
          </div>
        </div>

        {/* Right: Global Language Switcher */}
        <div className="w-auto flex justify-end">
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      {/* 2. MAIN CENTERED LOGIN CONTAINER - EQUAL HEIGHT PANELS & COMPACT FORM */}
      <main className="flex-1 flex flex-col justify-center items-center py-4 sm:py-6 md:py-8 px-3 sm:px-5 md:px-6 w-full">
        <div className="w-full max-w-[1240px] bg-white rounded-[24px] shadow-[0_10px_40px_rgba(133,0,0,0.08)] border border-[#E9E2DC]/80 overflow-hidden flex flex-col md:flex-row items-stretch self-center">
          
          {/* ================= LEFT PANEL (EQUAL HEIGHT, PROMINENT PROFILE IMAGE) ================= */}
          <div
            className="w-full md:w-[54%] lg:w-[56%] relative flex flex-col justify-between p-3.5 sm:p-5 md:p-6 pb-0 sm:pb-0 md:pb-0 text-white min-h-[260px] sm:min-h-[320px] md:min-h-[460px] lg:min-h-[480px] overflow-hidden"
            style={{
              backgroundImage: `url(${coimbatoreCityBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Transparent Maroon Gradient Overlay (City remains fully visible, image opacity NOT reduced) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(115, 0, 0, 0.22) 0%, rgba(120, 0, 0, 0.35) 45%, rgba(85, 0, 0, 0.52) 100%)',
              }}
            />

            {/* Top-Right Corner Image (image3.png) */}
            <div className="absolute top-3 sm:top-4 md:top-5 right-3 sm:right-4 md:right-5 z-20 pointer-events-none">
              <img
                src={image3}
                alt="TVK Official Emblem"
                className="w-11 h-11 min-[360px]:w-12 min-[360px]:h-12 min-[390px]:w-14 min-[390px]:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 object-contain drop-shadow-xl filter brightness-105 select-none"
              />
            </div>

            {/* Top Badge */}
            <div className="relative z-10 pt-1">
              <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                <span className="text-white tracking-wide">{t('auth.adminGovernanceCRM')}</span>
              </div>
            </div>

            {/* 
              IMAGE AND TEXT SIDE-BY-SIDE HORIZONTAL LAYOUT
              - Image shifted flush to the left boundary without container overshoot.
              - Balanced image sizing with original aspect ratio strictly preserved across mobile, tablet, laptop, and desktop.
              - Refined, balanced typography for heading and paragraph preventing overflow or overlap.
            */}
            <div className="relative z-10 w-full mt-auto pt-2 -ml-3.5 sm:-ml-5 md:-ml-6">
              <div className="flex flex-row items-end gap-2 sm:gap-3 md:gap-4 pl-0">
                
                {/* PROMINENT PROFILE IMAGE - SHIFTED LEFT FLUSH, BALANCED & CRISP */}
                <div className="flex justify-start items-end flex-shrink-0">
                  <img
                    src={vickyAnaImg}
                    alt="TVK Leadership - Coimbatore"
                    className="w-[140px] min-[360px]:w-[155px] min-[390px]:w-[175px] min-[430px]:w-[200px] sm:w-[260px] md:w-[205px] min-[900px]:w-[245px] lg:w-[295px] min-[1150px]:w-[340px] xl:w-[385px] 2xl:w-[415px] max-h-[220px] min-[360px]:max-h-[240px] min-[390px]:max-h-[265px] min-[430px]:max-h-[290px] sm:max-h-[330px] md:max-h-[350px] lg:max-h-[420px] xl:max-h-[470px] 2xl:max-h-[500px] object-contain drop-shadow-2xl filter brightness-105"
                    style={{
                      objectPosition: 'bottom left',
                    }}
                  />
                </div>

                {/* TEXT CONTENT IMMEDIATELY TO THE RIGHT - REFINED BALANCED TYPOGRAPHY */}
                <div className="pb-3 sm:pb-4 md:pb-5 text-left flex-1 min-w-0 pr-2 sm:pr-4 md:pr-5 pl-1 sm:pl-0">
                  <h2 className="text-xs min-[360px]:text-[13px] sm:text-base md:text-sm lg:text-[17px] xl:text-lg font-bold sm:font-extrabold leading-snug text-white drop-shadow-md">
                    {t('auth.dedicated')}
                    <span className="block text-[#FFD32A] mt-0.5">{t('auth.delivering')}</span>
                  </h2>

                  {/* Decorative Underline */}
                  <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#FFD32A] rounded-full mt-1 mb-1 shadow-xs"></div>

                  <p className="text-white/90 text-[9.5px] min-[360px]:text-[10px] sm:text-xs md:text-[11px] lg:text-xs leading-relaxed drop-shadow-sm font-normal sm:font-medium line-clamp-3 sm:line-clamp-none">
                    {t('auth.leftDesc')}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* ================= RIGHT PANEL (COMPACT PROFESSIONAL LOGIN FORM) ================= */}
          <div className="w-full md:w-[46%] lg:w-[44%] p-3.5 sm:p-4 md:p-5 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-2 sm:space-y-2.5">
              
              {/* Form Title & Role Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#A00000] tracking-tight leading-tight">
                    {currentRole.title}
                  </h2>
                  <p className="text-[10.5px] text-[#747474] mt-0.5 font-medium">
                    {currentRole.subtitle}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF0F0] text-[#A00000] border border-[#E9E2DC] uppercase tracking-wider flex-shrink-0">
                  {currentRole.badge}
                </span>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-[#A00000] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2">
                
                {/* 1. SELECT LOGIN ROLE DROPDOWN */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-[#252525] mb-0.5 tracking-wider uppercase">
                    {t('auth.selectRole')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full bg-white border border-[#B00000] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#252525] flex items-center justify-between hover:bg-red-50/30 transition focus:outline-none focus:ring-2 focus:ring-[#B00000]/20 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <currentRole.icon className="w-4 h-4 text-[#B00000]" />
                      <span>{currentRole.title}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#747474]" />
                  </button>

                  {/* Dropdown Menu */}
                  {isRoleDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E9E2DC] rounded-xl shadow-xl z-30 overflow-hidden py-1 divide-y divide-slate-100">
                      {Object.keys(rolesConfig).map((key) => {
                        const item = rolesConfig[key];
                        const Icon = item.icon;
                        const isSelected = selectedRole === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleRoleChange(key)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-red-50 font-bold text-[#B00000]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#B00000]' : 'text-slate-400'}`} />
                              <span>{item.title}</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {item.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. USERNAME / MOBILE FIELD */}
                <div>
                  <label className="block text-[10px] font-bold text-[#252525] mb-0.5 tracking-wider uppercase">
                    {currentRole.userLabel}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={currentRole.userPlaceholder}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#252525] placeholder-slate-400 focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    />
                  </div>
                </div>

                {/* 3. PASSWORD FIELD */}
                <div>
                  <label className="block text-[10px] font-bold text-[#252525] mb-0.5 tracking-wider uppercase">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.enterPassword')}
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-9 pr-9 py-1.5 text-xs sm:text-sm text-[#252525] placeholder-slate-400 focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-1.5 text-[#747474] cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#B00000] border-[#E9E2DC] focus:ring-[#B00000]"
                    />
                    <span>{t('auth.rememberMe')}</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-[#A00000] hover:underline text-[11px]"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                {/* 4. SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 text-xs sm:text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('auth.authenticating')}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{t('auth.signInBtn')}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Link to Signup */}
              <div className="text-center pt-0.5 text-xs">
                <span className="text-[#747474]">{t('auth.newUser')} </span>
                <Link
                  to="/signup"
                  className="font-bold text-[#A00000] hover:underline inline-flex items-center"
                >
                  {t('auth.signUpLink')}
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

export default LoginPage;
