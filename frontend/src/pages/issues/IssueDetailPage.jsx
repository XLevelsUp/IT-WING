import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  Building,
  Calendar,
  Send,
  ShieldCheck,
  UserCheck,
  FileText,
  Briefcase,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';
import BeforeAfterComparison from '../../components/common/BeforeAfterComparison';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

export const IssueDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [officers, setOfficers] = useState([]);

  // Remark / Action state
  const [remarkText, setRemarkText] = useState('');
  const [actionType, setActionType] = useState('Remark Added');
  const [newStatus, setNewStatus] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const fetchIssueDetail = async () => {
    try {
      setLoading(true);
      const [res, offRes] = await Promise.all([
        api.get(`/issues/${id}`),
        api.get('/officers'),
      ]);
      if (res.data.success) {
        setData(res.data.data);
        setNewStatus(res.data.data.issue.status);
        setSelectedOfficerId(res.data.data.issue.assignedOfficerId?._id || '');
      }
      if (offRes.data.success) {
        setOfficers(offRes.data.data);
      }
    } catch (err) {
      notifyError('Failed to load grievance details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetail();
  }, [id]);

  const handleUpdateStatusAndOfficer = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const updatePayload = {
        status: newStatus,
        assignedOfficerId: selectedOfficerId || null,
        notes: remarkText || `Status updated to ${newStatus}`,
      };

      const res = await api.put(`/issues/${id}`, updatePayload);
      if (res.data.success) {
        notifySuccess('Grievance record updated successfully!');
        setRemarkText('');
        fetchIssueDetail();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update grievance');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    setSubmittingAction(true);
    try {
      const res = await api.post(`/issues/${id}/activity`, {
        action: actionType,
        notes: remarkText,
        newStatus: newStatus !== data.issue.status ? newStatus : undefined,
      });

      if (res.data.success) {
        notifySuccess('Activity remark logged successfully');
        setRemarkText('');
        fetchIssueDetail();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to log remark');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text={t('issueDetail.loadingText', 'Loading Grievance & Timeline...')} />;
  if (!data?.issue) return <p className="text-center py-12 text-slate-500">{t('issueDetail.notFound', 'Grievance not found.')}</p>;

  const { issue, activities } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <button
        onClick={() => navigate('/admin/issues')}
        className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#A00000]" />
        <span>{t('issueDetail.backToIssues', 'Back to Issues Repository')}</span>
      </button>

      {/* Grievance Header Hero Banner */}
      <AdminPageHeader
        badge={`${t('issues.headerBadge', 'Grievance Record')} • ${issue.issueCode}`}
        badgeIcon={AlertCircle}
        title={issue.title}
        subtitle={`${t('issues.colCategory', 'Category')}: ${issue.category} ${issue.subcategory ? `• ${issue.subcategory}` : ''} • ${t('common.date', 'Registered')}: ${new Date(issue.createdAt).toLocaleString()}`}
        stats={[
          { label: t('issueDetail.statIssueCode', 'Issue Code'), value: issue.issueCode, highlight: true },
          { label: t('issueDetail.statPriority', 'Priority'), value: issue.priority ? t(`priority.${issue.priority}`, issue.priority) : '' },
          { label: t('issueDetail.statStatus', 'Status'), value: issue.status ? t(`status.${issue.status}`, issue.status) : '', highlight: true },
          { label: t('issueDetail.statWard', 'Ward'), value: issue.wardId?.wardNumber ? `${t('district.wardLabel', 'Ward')} ${issue.wardId.wardNumber}` : 'General Ward' },
        ]}
      >
        {/* Grievance Description Inside Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-black/25 backdrop-blur-xs border border-white/15 text-xs text-red-50/95 leading-relaxed font-medium">
          <span className="block text-[10px] text-[#FFD32A] uppercase font-bold tracking-wider mb-1">
            {t('issueDetail.summaryTitle', 'Grievance Summary & Description')}
          </span>
          {issue.description}
        </div>
      </AdminPageHeader>

      {/* Grid: Citizen & Location / Officer & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Citizen & Ward Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center">
            <User className="w-4 h-4 mr-2 text-red-700" />
            {t('issueDetail.citizenWardTitle', 'Citizen & Ward Information')}
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('issueDetail.petitionerName', 'Petitioner Name')}</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{issue.citizenName}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('issueDetail.contactMobile', 'Contact Mobile')}</span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-0.5 flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                {issue.citizenMobile}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('issueDetail.wardZone', 'Ward & Zone')}</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {t('district.wardLabel', 'Ward')} {issue.wardId?.wardNumber || 'General'} - {issue.wardId?.wardName || ''}
              </p>
              <p className="text-slate-500 mt-0.5">{issue.wardId?.zone} • {issue.constituencyId?.name}</p>
            </div>

            {issue.citizenAddress && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('issueDetail.locationAddress', 'Location Address')}</span>
                <p className="text-slate-700 mt-0.5">{issue.citizenAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Administrative Actions & Officer Assignment */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-red-700" />
            {t('issueDetail.adminActionsTitle', 'Administrative Action & Status Update')}
          </h2>

          <form onSubmit={handleUpdateStatusAndOfficer} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('issueDetail.grievanceStatus', 'Grievance Status')}</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="Pending">{t('status.Pending', 'Pending')}</option>
                <option value="Under Review">{t('status.Under Review', 'Under Review')}</option>
                <option value="In Progress">{t('status.In Progress', 'In Progress')}</option>
                <option value="Resolved">{t('status.Resolved', 'Resolved')}</option>
                <option value="Rejected">{t('status.Rejected', 'Rejected')}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('issueDetail.assignOfficer', 'Assign Department Officer')}</label>
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                <option value="">{t('issueDetail.unassigned', 'Unassigned')}</option>
                {officers.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.officerName} - {o.department} ({o.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('issueDetail.resolutionNotes', 'Officer Action / Resolution Notes')}</label>
              <textarea
                rows="2"
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder={t('issueDetail.notesPlaceholder', 'Enter field inspection findings or repair remarks...')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <button
              type="submit"
              disabled={submittingAction}
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
            >
              {submittingAction ? t('issueDetail.updatingBtn', 'Updating...') : t('issueDetail.saveStatusBtn', 'Save Status & Assignment')}
            </button>
          </form>
        </div>
      </div>

      {/* Photographic Evidence: Before & After Photos Side-by-Side Comparison */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
          <span>Field Evidence & Ground Inspection Photographs</span>
        </h2>

        {/* Side-by-Side Comparison Component */}
        <BeforeAfterComparison
          complaint={issue}
          onImageClick={openZoom}
          height="h-56"
        />

        {(issue.actionTaken || issue.finalReport || issue.wardSecretaryRemarks) && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 block">Action Taken & Final Report</span>
            <p className="leading-relaxed whitespace-pre-wrap">{issue.actionTaken || issue.finalReport}</p>
            {issue.wardSecretaryRemarks && (
              <p className="text-[11px] italic text-emerald-800 pt-1">Remarks: "{issue.wardSecretaryRemarks}"</p>
            )}
          </div>
        )}
      </div>

      {/* Resolution Details Card if Resolved */}
      {issue.resolutionDetails?.resolvedDate && (
        <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{t('issueDetail.verifiedTitle', 'Resolution Completed & Verified')}</span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            {issue.resolutionDetails.resolutionNotes || t('issueDetail.defaultResolvedNotes', 'Grievance satisfactorily resolved by assigned department squad.')}
          </p>
          <div className="text-[11px] text-emerald-700 pt-1">
            {t('issueDetail.resolvedOn', {
              date: new Date(issue.resolutionDetails.resolvedDate).toLocaleDateString(),
              by: issue.resolutionDetails.resolvedBy || 'District Administration',
              defaultValue: `Resolved on ${new Date(issue.resolutionDetails.resolvedDate).toLocaleDateString()} by ${issue.resolutionDetails.resolvedBy || 'District Administration'}`
            })}
          </div>
        </div>
      )}

      {/* Professional Activity Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t('issueDetail.timelineTitle', 'Activity Timeline & Audit Trail')}</h2>
          <p className="text-xs text-slate-400">{t('issueDetail.timelineSubtitle', 'Chronological history of status updates and field remarks')}</p>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400">{t('issueDetail.noActivity', 'No activity logged yet.')}</p>
          ) : (
            activities.map((act) => (
              <div key={act._id} className="relative group">
                <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-xs"></span>
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{act.action}</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {act.notes && <p className="text-slate-600 leading-snug">{act.notes}</p>}
                  {act.newStatus && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('issueDetail.statusLabel', 'Status:')}</span>
                      <StatusBadge status={act.newStatus} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fullscreen Zoomable Image Preview Modal */}
      <ImagePreviewModal
        isOpen={zoomModal.isOpen}
        onClose={closeZoom}
        imageUrl={zoomModal.imageUrl}
        title={zoomModal.title}
        ticketId={zoomModal.ticketId}
        type={zoomModal.type}
      />
    </div>
  );
};

export default IssueDetailPage;
