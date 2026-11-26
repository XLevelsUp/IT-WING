import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Users,
  AlertCircle,
  Building2,
  ChevronRight,
  FolderTree,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getVillagesForPaguthi } from '../../utils/paguthiWardData';

export const ConstituencyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isTa = i18n.language === 'ta';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/districts/constituencies/${id}`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load constituency detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen text={t('constituency.loadingText', 'Loading Constituency Details & Paguthi Hierarchy...')} />;
  if (!data) return <p className="text-center py-12 text-slate-500">{t('constituency.notFound', 'Constituency not found.')}</p>;

  const { constituency, paguthis = [], wards = [], issues = [], members = [] } = data;

  const KINATHUKADAVU_PAGUTHIS_ORDER = [
    'Thondamuthur Therkku Ondriyam',
    'Thondamuthur Merkku Ondriyam',
    'Madukkarai Therkku Ondriyam',
    'Madukkarai Merkku Ondriyam',
    'Madukkarai Nagaram',
    'Vellalur Nagaram',
    'Kinathukadavu Ondriyam',
    'Malumachampatti',
    'Pothanur',
    'Kurichi',
    'Sundarapuram',
  ];

  const rawPaguthisList = Array.isArray(paguthis) ? paguthis : [];
  const isKinathukadavu = constituency?.name?.toLowerCase().includes('kinathu') || constituency?.code === 'KKD';

  const displayPaguthis = isKinathukadavu
    ? KINATHUKADAVU_PAGUTHIS_ORDER.map((pName) => {
        const found = rawPaguthisList.find((p) => {
          const rawName = typeof p === 'string' ? p : (p?.name || '');
          const cleanName = rawName === 'Podanur' ? 'Pothanur' : rawName;
          return cleanName === pName;
        });

        if (found && typeof found === 'object') {
          return { ...found, name: pName };
        }

        const paguthiWards = wards.filter(
          (w) => w.paguthi === pName || (pName === 'Pothanur' && w.paguthi === 'Podanur')
        );
        const paguthiIssues = issues.filter(
          (i) => i.paguthi === pName || (pName === 'Pothanur' && i.paguthi === 'Podanur')
        );

        return {
          name: pName,
          totalVillages: getVillagesForPaguthi(pName).length,
          totalWards: paguthiWards.length,
          registeredSecretaries: paguthiWards.filter((w) => w.wardSecretaryRegistrationStatus === 'Registered').length,
          totalComplaints: paguthiIssues.length,
          pendingComplaints: paguthiIssues.filter((i) => ['Pending', 'Assigned', 'Under Review'].includes(i.status)).length,
          inProgressComplaints: paguthiIssues.filter((i) => i.status === 'In Progress').length,
          completedComplaints: paguthiIssues.filter((i) => ['Completed', 'Resolved', 'Closed'].includes(i.status)).length,
        };
      })
    : rawPaguthisList.map((p) => {
        const rawName = typeof p === 'string' ? p : (p?.name || '');
        const cleanName = rawName === 'Podanur' ? 'Pothanur' : rawName;
        return typeof p === 'string' ? { name: cleanName } : { ...p, name: cleanName };
      });

  const constituencyDisplayName = isTa && constituency.tamilName ? constituency.tamilName : constituency.name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
        <Link to="/admin/dashboard" className="hover:text-[#A00000] transition">{t('breadcrumbs.home', 'Home')}</Link>
        <span>&gt;</span>
        <Link to="/admin/district" className="hover:text-[#A00000] transition">{t('breadcrumbs.district', 'Coimbatore District')}</Link>
        <span>&gt;</span>
        <span className="text-[#A00000] font-bold">{constituencyDisplayName}</span>
      </div>

      <button
        onClick={() => navigate('/admin/district')}
        className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('constituency.backToDistrict', 'Back to Coimbatore District')}</span>
      </button>

      {/* Hero Header Banner (Matching Login Page Deep Red & Golden Yellow Theme) */}
      <div className="bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-6 sm:p-8 rounded-3xl shadow-md relative overflow-hidden border-b-4 border-[#FFD32A]">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[#FFD32A] text-xs font-bold uppercase tracking-wider mb-2">
            <span className="font-mono bg-black/40 px-2.5 py-0.5 rounded border border-[#FFD32A]/30">
              {constituency.code}
            </span>
            <span>•</span>
            <span>{constituency.zone}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {constituencyDisplayName}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#FFD32A] mt-0.5">
            {t('constituency.assemblyConstituency', 'Assembly Constituency')}
          </p>

          <p className="text-xs sm:text-sm text-red-100 max-w-2xl mt-2 leading-relaxed font-medium">
            {t('constituency.cardSubtitle', 'Select a Paguthi to Continue. Administrative jurisdiction covers Municipal Wards, local TVK cadre units, and citizen grievance redressal networks.')}
          </p>

          {/* Actual database statistics */}
          <div className="flex flex-wrap gap-2.5 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/20 max-w-xl">
            <div className="bg-black/20 px-4 py-2.5 rounded-xl border border-white/10 min-w-[140px]">
              <p className="text-[11px] text-red-200">{t('constituency.totalPaguthi', 'Total Paguthi')}</p>
              <p className="text-xl sm:text-2xl font-black text-[#FFD32A] mt-0.5">
                {displayPaguthis.length}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#FFD32A]/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* ================= PART 6: PAGUTHI ADMINISTRATION SECTION (4 CARDS) ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#252525] flex items-center space-x-2">
              <FolderTree className="w-5 h-5 text-[#A00000]" />
              <span>{t('constituency.paguthiAdminTitle', 'Paguthi Administration')}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {t('constituency.paguthiAdminSubtitle', { count: displayPaguthis.length, defaultValue: `Select any of the ${displayPaguthis.length} Paguthis below to view Ward Administration and localized operations` })}
            </p>
          </div>
          <span className="text-xs font-bold text-[#A00000] bg-[#FFF0F0] border border-[#E9E2DC] px-3 py-1 rounded-full">
            {t('constituency.paguthiAvailable', { count: displayPaguthis.length, defaultValue: `${displayPaguthis.length} Paguthi Available` })}
          </span>
        </div>

        {displayPaguthis.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9E2DC] p-8 text-center text-slate-500">
            <FolderTree className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">{t('constituency.noPaguthis', 'No Paguthis found for this constituency.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayPaguthis.map((p, idx) => (
              <div
                key={p.name || idx}
                className="bg-white rounded-2xl border border-[#E9E2DC] shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-[#A00000] transition-all duration-200 flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Red Top Accent Border with Golden-Yellow Highlight */}
                <div className="h-1.5 bg-gradient-to-r from-[#A00000] via-[#FFD32A] to-[#850000]"></div>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF8F0] border border-[#FFE5A3] flex items-center justify-center text-[#A00000] shadow-xs group-hover:scale-105 transition">
                      <MapPin className="w-5 h-5" />
                    </div>
                    {p.totalVillages > 0 ? (
                      <span className="text-xs font-bold text-[#A00000] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        {p.totalVillages} {p.totalVillages === 1 ? 'Village' : 'Villages'}
                      </span>
                    ) : ['Pothanur', 'Kurichi', 'Sundarapuram'].includes(p.name) ? (
                      <span className="text-xs font-bold text-[#A00000] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        Municipal
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        Town / Nagaram
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-3 group-hover:text-[#A00000] transition">
                    {p.name}
                  </h3>

                  {/* Key Statistics Counts */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/40">
                      <span className="text-[10.5px] text-slate-500 block">
                        {p.totalVillages !== undefined && p.totalVillages > 0 ? 'Total Villages' : t('constituency.totalWards', 'Total Wards')}
                      </span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {p.totalVillages !== undefined && p.totalVillages > 0
                          ? `${p.totalVillages} ${p.totalVillages === 1 ? 'Village' : 'Villages'}`
                          : `${p.totalWards || 0} ${p.totalWards === 1 ? 'Ward' : 'Wards'}`}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200/50">
                      <span className="text-[10.5px] text-emerald-700 block">Registered Secs</span>
                      <strong className="text-emerald-900 font-bold text-sm">{p.registeredSecretaries || 0}</strong>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold">{t('common.category', 'Total Complaints')}:</span>
                        <span className="font-bold text-[#A00000]">{p.totalComplaints || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200">
                        <span>Pending: <strong className="text-amber-700">{p.pendingComplaints || 0}</strong></span>
                        <span>In Prog: <strong className="text-sky-700">{p.inProgressComplaints || 0}</strong></span>
                        <span>Done: <strong className="text-emerald-700">{p.completedComplaints || p.resolvedComplaints || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Open Paguthi Button */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/district/constituencies/${constituency._id}/paguthi/${encodeURIComponent(p.name)}`
                      )
                    }
                    className="w-full py-2 px-3 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>{t('constituency.openPaguthi', 'Open Paguthi')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstituencyDetailPage;
