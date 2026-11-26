import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, Clock, CheckCircle2, Phone, AlertCircle, ChevronRight, Image as ImageIcon, X, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  downloadComplaintPdf,
  downloadTamilComplaintPdf,
  downloadEnglishComplaintPdf,
} from '../../utils/complaintPdfGenerator';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';
import BeforeAfterComparison from '../../components/common/BeforeAfterComparison';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { getBeforeImageUrl, getAfterImageUrl } from '../../utils/imageUtils';

export const MyComplaintsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [mobileSearch, setMobileSearch] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [searched, setSearched] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

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

  const fetchComplaints = async (phoneToQuery) => {
    const q = phoneToQuery !== undefined ? phoneToQuery : mobileSearch;

    setLoading(true);
    setSearched(true);
    try {
      const params = { limit: 50 };
      if (q && q.trim()) {
        params.search = q.trim();
      }
      const res = await api.get('/issues', { params });
      if (res.data.success) {
        setComplaints(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints(user?.phone || '');
    // Live status polling every 6 seconds
    const timer = setInterval(() => {
      fetchComplaints(mobileSearch || user?.phone || '');
    }, 6000);
    return () => clearInterval(timer);
  }, [user]);

  const handleDownloadComplaintPDF = async (complaint, lang = 'ta') => {
    if (!complaint) return;
    const complaintKey = `${complaint._id || complaint.id}_${lang}`;
    setDownloadingPdfId(complaintKey);

    try {
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

      await downloadComplaintPdf(cData, user, lang);
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

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col font-sans">
      <header className="w-full bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] border-b-[3px] border-[#FFD32A] px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between text-white">
        <Link to="/citizen" className="flex items-center space-x-2 text-xs font-semibold text-white/90 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('citizen.backToServices', 'Back to Citizen Services')}</span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-[#FFD32A] uppercase hidden sm:inline">{t('citizen.myComplaints', 'My Complaints')}</span>
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#A00000]">{t('citizen.myComplaints', 'My Complaints')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('citizen.myComplaintsDesc', 'Track your complaint status and field resolution updates.')}</p>
          </div>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchComplaints();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder={t('citizen.trackPlaceholder', 'Enter registered mobile number or issue code (e.g. 9842567890 or GRI-2026-1001)')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:ring-[#A00000]"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
            >
              {t('common.search', 'Search')}
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <LoadingSpinner text={t('common.loading', 'Searching complaints repository...')} />
        ) : complaints.length === 0 ? (
          searched && (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
              <p className="font-bold text-slate-700 text-sm">{t('reports.noData', 'No complaints found')}</p>
              <p className="text-xs">
                {t('citizen.noComplaintsYetSub', 'No active complaints match the search query. Verify your mobile number or file a new complaint.')}
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => {
              const isCompleted = c.status === 'Completed' || c.status === 'Resolved';
              const beforeImg = c.beforeImage || c.beforePhoto || (c.attachments && c.attachments[0]?.fileUrl);
              const afterImg = c.afterImage || c.afterPhoto;

              return (
                <div
                  key={c._id}
                  className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition ${
                    isCompleted ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-[#E9E2DC]'
                  }`}
                >
                  {/* Status header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                        {c.issueCode || c.complaintId}
                      </span>
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center space-x-3 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        {t('citizen.registeredOn', 'Filed on')} {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {/* 1. Download PDF – தமிழ் */}
                      <button
                        type="button"
                        onClick={() => handleDownloadComplaintPDF(c, 'ta')}
                        disabled={downloadingPdfId === `${c._id || c.id}_ta`}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#A00000] border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[32px]"
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
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 min-h-[32px]"
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
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs font-medium text-amber-800 mt-0.5">
                      {t('common.category', 'Category')}: {c.category} • {t('common.ward', 'Ward')} {c.wardNumber || c.wardId?.wardNumber || 'General'}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  {/* USER SUCCESS NOTIFICATION BANNER & RESOLUTION VIEW */}
                  {isCompleted && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3">
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <h4 className="text-sm font-extrabold tracking-wide">
                          {t('citizen.complaintFixedSuccess', 'Your complaint was fixed successfully!')}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('citizen.colApptId', 'Complaint ID')}:</span>
                          <span className="font-mono font-bold text-slate-900">{c.issueCode || c.complaintId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('citizen.colConfDateTime', 'Completed Date')}:</span>
                          <span className="font-bold text-slate-900">
                            {c.completedAt || c.resolvedAt ? new Date(c.completedAt || c.resolvedAt).toLocaleString() : 'Recently'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('citizen.actionTaken', 'Action Taken / Ground Resolution')}:</span>
                          <p className="font-semibold bg-white p-2.5 rounded-xl border border-emerald-200 mt-0.5 whitespace-pre-wrap">
                            {c.actionTaken || c.finalReport || 'Issue inspected and resolved satisfactorily by Ward team.'}
                          </p>
                        </div>
                        {c.wardSecretaryRemarks && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('citizen.subadminRemarks', 'Ward Secretary Remarks')}:</span>
                            <p className="italic text-slate-700 bg-white/70 p-2 rounded-lg border border-emerald-100 mt-0.5">
                              "{c.wardSecretaryRemarks}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Before / After Images Comparison for Citizen */}
                      <div className="pt-2 border-t border-emerald-200/60">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-2">
                          {t('citizen.viewEvidencePhotos', 'Ground Resolution Evidence (Before / After Photos)')}:
                        </span>
                        <BeforeAfterComparison
                          complaint={c}
                          onImageClick={openZoom}
                          height="h-40"
                        />
                      </div>
                    </div>
                  )}

                  {/* Supporting Photo if In Progress / Pending / New */}
                  {!isCompleted && getBeforeImageUrl(c) && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Attached Supporting Photo:
                      </span>
                      <div
                        className="inline-block bg-white p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-red-400 transition"
                        onClick={() => openZoom(getBeforeImageUrl(c), 'Citizen Supporting Photo', c.issueCode || c.complaintId, 'BEFORE')}
                      >
                        <img
                          src={getBeforeImageUrl(c)}
                          alt="Supporting Photo"
                          className="w-32 h-24 object-cover rounded-lg border border-slate-100"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Progress Details */}
                  {!isCompleted && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-100">
                      <span>
                        {t('common.status', 'Status')}: <strong className="text-slate-700">{t(`status.${c.status}`, c.status)}</strong>
                        {c.assignedWardSecretaryId && (
                          <span className="ml-2 text-indigo-700 font-semibold">
                            (Assigned to Ward Secretary)
                          </span>
                        )}
                      </span>
                      <span>
                        {t('common.ward', 'Ward')}: <strong>Ward {c.wardNumber || c.wardId?.wardNumber || '72'}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fullscreen Zoomable Image Preview Modal */}
        <ImagePreviewModal
          isOpen={zoomModal.isOpen}
          onClose={closeZoom}
          imageUrl={zoomModal.imageUrl}
          title={zoomModal.title}
          ticketId={zoomModal.ticketId}
          type={zoomModal.type}
        />
      </main>
      <Footer />
    </div>
  );
};

export default MyComplaintsPage;
