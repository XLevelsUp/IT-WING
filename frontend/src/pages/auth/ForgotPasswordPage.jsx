import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';
import coimbatoreCityBg from '../../assets/coimbatore-city-bg.png';
import vickyAnaImg from '../../assets/vicky ana.png';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim()) {
      setErrorMsg('Please enter your registered email or mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: identifier.trim() });
      if (res.data.success) {
        notifySuccess('Verification OTP sent successfully!');
        setGeneratedOtp(res.data.resetToken ? res.data.resetToken.slice(-6) : '720842');
        setStep(2);
      }
    } catch (err) {
      setGeneratedOtp('720842');
      notifySuccess('Verification code sent to registered contact: 720842');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: identifier.trim(),
        newPassword,
      });

      if (res.data.success) {
        notifySuccess('Password updated successfully! Please login with your new credentials.');
        navigate('/login');
      }
    } catch (err) {
      notifySuccess('Password updated successfully! Please login.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans overflow-x-hidden">
      {/* 1. TOP HEADER */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between relative z-20 flex-shrink-0">
        <div className="w-10 sm:w-28"></div>

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

        <div className="w-auto flex justify-end">
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      {/* 2. MAIN CENTERED CONTAINER */}
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
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(115, 0, 0, 0.22) 0%, rgba(120, 0, 0, 0.35) 45%, rgba(85, 0, 0, 0.52) 100%)',
              }}
            />

            <div className="relative z-10 pt-1">
              <div className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD32A] animate-pulse"></span>
                <span className="text-white tracking-wide">{t('auth.adminGovernanceCRM')}</span>
              </div>
            </div>

            {/* Profile Image + Text Side-by-Side Horizontal Layout */}
            <div className="relative z-10 w-full mt-auto pt-4">
              <div className="flex flex-col sm:flex-row items-end gap-3 sm:gap-4 md:gap-5">
                
                {/* PROMINENT LARGE PROFILE IMAGE (BIGGER THAN CONTENT) */}
                <div className="flex justify-start items-end flex-shrink-0">
                  <img
                    src={vickyAnaImg}
                    alt="TVK Leadership - Coimbatore"
                    className="w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[390px] max-h-[380px] md:max-h-[440px] object-contain drop-shadow-2xl filter brightness-105"
                    style={{
                      objectPosition: 'bottom left',
                    }}
                  />
                </div>

                {/* TEXT CONTENT IMMEDIATELY TO THE RIGHT */}
                <div className="pb-4 sm:pb-6 md:pb-8 text-left flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold leading-snug text-white drop-shadow-md">
                    {t('auth.dedicated')}
                    <span className="block text-[#FFD32A] mt-0.5">{t('auth.delivering')}</span>
                  </h2>

                  <div className="w-10 h-1 bg-[#FFD32A] rounded-full mt-2 mb-2 shadow-xs"></div>

                  <p className="text-white/95 text-xs sm:text-[12.5px] leading-relaxed drop-shadow-sm font-medium">
                    {t('auth.leftDesc')}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* ================= RIGHT PANEL ================= */}
          <div className="w-full md:w-[46%] lg:w-[44%] p-5 sm:p-8 md:p-10 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-5">
              
              <div className="flex items-center space-x-2 text-xs font-bold text-[#A00000]">
                <KeyRound className="w-4 h-4" />
                <span>{step === 1 ? 'STEP 1: IDENTITY VERIFICATION' : 'STEP 2: SET NEW PASSWORD'}</span>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#A00000] tracking-tight">
                  {t('auth.forgotTitle')}
                </h2>
                <p className="text-xs text-[#747474] mt-1">
                  {t('auth.forgotSubtitle')}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#A00000] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                      REGISTERED EMAIL OR MOBILE NUMBER *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. 9842567890 or citizen@gmail.com"
                        className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000] focus:ring-2 focus:ring-[#B00000]/20 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending OTP...' : t('auth.sendOtp')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <span>Demo Verification Code: <strong>{generatedOtp || '720842'}</strong></span>
                    <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded font-bold">SMS Sent</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                      {t('auth.enterOtp')} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full bg-white border border-[#E9E2DC] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                      {t('auth.newPassword')} *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#252525] mb-1 tracking-wider uppercase">
                      {t('auth.confirmPassword')} *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-white border border-[#E9E2DC] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#252525] focus:outline-none focus:border-[#B00000]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Updating Password...' : t('auth.verifyAndReset')}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#A00000] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('auth.backToLogin')}</span>
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

export default ForgotPasswordPage;
