import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Search,
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';

export const TrackAppointmentPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (searchStr) => {
    const q = searchStr || query;
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/appointments/track', { params: { query: q.trim() } });
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      handleTrack(tokenFromUrl);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans">
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between text-white">
        <Link to="/citizen" className="flex items-center space-x-2 text-xs font-semibold text-white/90 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('citizen.backToServices', 'Back to Citizen Services')}</span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-[#FFD32A] uppercase hidden sm:inline">{t('citizen.trackAppointment', 'Track Appointment')}</span>
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#A00000]">{t('citizen.trackAppointment', 'Track Minister Appointment')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('citizen.trackAppointmentDesc', 'Check your appointment status using token number or mobile number.')}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('citizen.trackPlaceholder', 'Enter Token Number (e.g. APT-2026-0101) or Mobile Number')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-[#A00000]"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
            >
              {t('citizen.searchBtn', 'Track Status')}
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <LoadingSpinner text={t('common.loading', 'Locating appointment records...')} />
        ) : appointments.length === 0 ? (
          searched && (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
              <p className="font-bold text-slate-700 text-sm">{t('reports.noData', 'No appointment found')}</p>
              <p className="text-xs">
                {t('citizen.noApptsRecordSub', 'No appointment matches token/mobile. Please verify your reference number.')}
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt._id}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-extrabold text-[#A00000] bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                      {apt.tokenNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        apt.status === 'Confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : apt.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : apt.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {t(`status.${apt.status}`, apt.status)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {t('citizen.requestedFor', 'Requested')}: {new Date(apt.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Subadmin Modification Banner (Part 13) */}
                {apt.isModifiedBySubadmin && (
                  <div className="p-3 bg-[#FFF8E7] border border-[#FFE5A3] rounded-2xl flex items-center space-x-2 text-xs text-[#850000] font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#A00000]" />
                    <span>Your appointment has been approved with updated date/time/location.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('citizen.fullNamePrefilled', 'Petitioner')}</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{apt.citizenName}</p>
                    <p className="text-slate-500">{apt.mobileNumber}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                      {['Approved', 'Confirmed'].includes(apt.status) ? t('citizen.confirmedSchedule', 'Confirmed Slot') : t('citizen.requestedSchedule', 'Requested Slot')}
                    </span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {new Date(apt.approvedDate || apt.preferredDate).toLocaleDateString()}
                    </p>
                    <p className="text-[#A00000] font-bold">{apt.approvedTimeSlot || apt.preferredTimeSlot}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                    {['Approved', 'Confirmed'].includes(apt.status)
                      ? t('citizen.colConfLocation', 'Confirmed Location')
                      : t('citizen.preferredLocationLabel', 'Venue Location')}
                  </span>
                  <p className="text-slate-700 font-medium flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-[#A00000]" />
                    {apt.confirmedLocation ||
                      apt.approvedVenue ||
                      (['Approved', 'Confirmed'].includes(apt.status)
                        ? t('citizen.locationNotAssigned', 'Location not assigned')
                        : apt.requestedLocation || apt.assignedVenue || t('citizen.locationNotAssigned', 'Location not assigned'))}
                  </p>
                </div>

                {apt.meetingInstructions && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs">
                    <span className="text-slate-400 block font-semibold uppercase text-[10px]">Meeting Instructions</span>
                    <p className="text-slate-700 mt-0.5">{apt.meetingInstructions}</p>
                  </div>
                )}

                {apt.approvedByName && (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                    Approved by: <strong>{apt.approvedByName}</strong> {apt.approvedAt ? `on ${new Date(apt.approvedAt).toLocaleDateString()}` : ''}
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl text-xs">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('citizen.subjectPurpose', 'Purpose')}</span>
                  <p className="text-slate-700 mt-0.5">{apt.purpose}</p>
                </div>

                {/* History Timeline (Part 15) */}
                {apt.history && apt.history.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Appointment History Timeline
                    </p>
                    <div className="space-y-1.5">
                      {apt.history.map((h, hIdx) => (
                        <div key={hIdx} className="flex items-start space-x-2 text-xs">
                          <span className="w-2 h-2 rounded-full bg-[#A00000] mt-1.5 flex-shrink-0"></span>
                          <div>
                            <span className="font-bold text-slate-800">{h.status}: </span>
                            <span className="text-slate-600">{h.note}</span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              ({new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {apt.adminNotes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong>Admin Note:</strong> {apt.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TrackAppointmentPage;
