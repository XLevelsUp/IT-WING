import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  FileText,
  Info,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';

export const BookAppointmentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    mobileNumber: user?.phone || '',
    email: user?.email || '',
    subject: '',
    description: '',
    preferredDate: '',
    preferredTime: '10:00 AM - 11:30 AM',
    additionalInfo: '',
  });

  const [loading, setLoading] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);

  const timeSlots = [
    '10:00 AM - 11:30 AM',
    '11:30 AM - 01:00 PM',
    '02:30 PM - 04:00 PM',
    '04:30 PM - 06:00 PM',
    '06:00 PM - 07:30 PM',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobileNumber.trim() || !formData.subject.trim() || !formData.preferredDate) {
      notifyError('Please complete all required fields (Full Name, Mobile Number, Subject, Preferred Date).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        citizenName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        purpose: formData.subject.trim(),
        description: formData.description.trim(),
        requestedDate: formData.preferredDate,
        preferredDate: formData.preferredDate,
        requestedTime: formData.preferredTime,
        preferredTimeSlot: formData.preferredTime,
        additionalInfo: formData.additionalInfo.trim(),
        constituency: user?.constituency || 'Coimbatore South',
        ward: user?.assignedWard || 'Ward 72',
      };

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        notifySuccess('Your appointment request has been submitted successfully. Waiting for approval.');
        setBookedAppointment(res.data.data);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans overflow-x-hidden">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between text-white">
        <Link
          to="/citizen"
          className="flex items-center space-x-2 text-xs font-semibold text-white/90 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('citizen.backToServices', 'Back to Citizen Portal')}</span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-[#FFD32A] uppercase hidden sm:inline">
            {t('citizen.bookAppointment', 'Minister Appointment Booking')}
          </span>
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#A00000]">
              {t('citizen.bookApptHeading', 'Book Public Grievance Appointment')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {t('citizen.bookApptSub', 'Submit an official appointment request for ministerial grievance consultation at TVK Coimbatore Headquarters.')}
            </p>
          </div>

          {bookedAppointment ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-emerald-900">
                  {t('citizen.appointmentSuccess', 'Appointment Booked Successfully!')}
                </h3>
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  {t('citizen.bookApptSub', 'Your appointment request has been saved with status Pending. A unique Appointment ID has been generated.')}
                </p>
              </div>

              <div className="bg-white px-5 py-3 rounded-xl border border-emerald-300 font-mono text-xl font-black text-[#A00000] tracking-wider inline-block shadow-xs">
                {bookedAppointment.appointmentId || bookedAppointment.tokenNumber}
              </div>

              <div className="text-xs text-slate-600 max-w-md mx-auto space-y-1 pt-1">
                <p><strong>{t('citizen.colSubject', 'Subject')}:</strong> {bookedAppointment.subject || bookedAppointment.purpose}</p>
                <p><strong>{t('citizen.colReqDate', 'Requested Date')}:</strong> {new Date(bookedAppointment.requestedDate || bookedAppointment.preferredDate).toLocaleDateString()}</p>
                <p><strong>{t('citizen.colReqTime', 'Requested Slot')}:</strong> {bookedAppointment.requestedTime || bookedAppointment.preferredTimeSlot}</p>
                <p><strong>{t('citizen.colReqLocation', 'Location')}:</strong> {bookedAppointment.requestedLocation || bookedAppointment.assignedVenue}</p>
              </div>

              <div className="pt-3 flex flex-wrap justify-center gap-3">
                <Link
                  to="/citizen"
                  className="px-5 py-2.5 bg-[#A00000] hover:bg-[#850000] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {t('citizen.viewInMyAppts', 'View in My Appointments')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setBookedAppointment(null);
                    setFormData({
                      fullName: user?.name || '',
                      mobileNumber: user?.phone || '',
                      email: user?.email || '',
                      subject: '',
                      description: '',
                      preferredDate: '',
                      preferredTime: '10:00 AM - 11:30 AM',
                      additionalInfo: '',
                    });
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {t('citizen.bookAnotherSlot', 'Book Another Appointment')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Field 1: Full Name & Field 2: Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.fullNamePrefilled', 'Full Name (Prefilled from Profile) *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder={t('citizen.fullNamePlaceholder', 'Enter your full name')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.mobileNumberRequired', 'Mobile Number *')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder={t('citizen.mobilePlaceholder', '10-digit mobile number')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('citizen.emailPlaceholder', 'name@example.com (optional)')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
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
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t('citizen.apptSubjectPlaceholder', 'e.g. Community drinking water pipeline representation')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
                />
              </div>

              {/* Field 5: Appointment Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('citizen.apptDescLabel', 'Appointment Description')}
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('citizen.apptDescPlaceholder', 'Provide background context and detailed points you plan to present during consultation...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
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
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('citizen.preferredTimeRequired', 'Preferred Time Slot *')}
                  </label>
                  <select
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-[#A00000] focus:border-[#A00000]"
                  >
                    {timeSlots.map((slot, i) => (
                      <option key={i} value={slot}>
                        {slot}
                      </option>
                    ))}
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
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  placeholder={t('citizen.additionalInfoPlaceholder', 'Any supporting document references, attendee count, or special notes')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-[#A00000] focus:border-[#A00000]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#A00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>{loading ? t('citizen.submittingAppt', 'Submitting Appointment...') : t('citizen.bookAppointment', 'Book Appointment')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookAppointmentPage;
