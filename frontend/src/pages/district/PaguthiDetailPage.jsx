import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Users,
  AlertCircle,
  Building2,
  ChevronRight,
  Plus,
  Edit,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  Calendar,
  Layers,
  FolderTree,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';

export const PaguthiDetailPage = () => {
  const { id, paguthiName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isTa = i18n.language === 'ta';
  const { success: notifySuccess, error: notifyError } = useNotification();

  const villageParam = searchParams.get('village') || '';
  const [selectedVillage, setSelectedVillage] = useState(villageParam);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isAddWardModalOpen, setIsAddWardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [wardForm, setWardForm] = useState({
    wardNumber: '',
    wardName: '',
    tamilName: '',
    village: '',
    wardSecretary: '',
    contactNumber: '',
    population: '',
    areaCoverage: '',
  });

  // Keep selectedVillage in sync with URL
  useEffect(() => {
    setSelectedVillage(searchParams.get('village') || '');
  }, [searchParams]);

  const handleSelectVillage = (vName) => {
    setSelectedVillage(vName);
    if (vName) {
      setSearchParams({ village: vName });
    } else {
      setSearchParams({});
    }
  };

  const fetchPaguthiData = async (v = selectedVillage) => {
    try {
      setLoading(true);
      const url = v
        ? `/districts/constituencies/${id}/paguthi/${encodeURIComponent(paguthiName)}?village=${encodeURIComponent(v)}`
        : `/districts/constituencies/${id}/paguthi/${encodeURIComponent(paguthiName)}`;
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load Paguthi details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaguthiData(selectedVillage);
  }, [id, paguthiName, selectedVillage]);

  const handleAddWardSubmit = async (e) => {
    e.preventDefault();
    if (!wardForm.wardNumber || !wardForm.wardName) {
      notifyError('Please enter ward number and name');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalVillage = selectedVillage || wardForm.village || '';
      const payload = {
        ...wardForm,
        constituencyId: id,
        paguthi: paguthiName,
        village: finalVillage,
        wardNumber: parseInt(wardForm.wardNumber, 10),
        officeBearer: wardForm.wardSecretary,
      };

      const res = await api.post('/districts/wards', payload);
      if (res.data.success) {
        notifySuccess(`Ward ${wardForm.wardNumber} successfully added to ${finalVillage ? `${finalVillage}, ` : ''}${paguthiName}!`);
        setIsAddWardModalOpen(false);
        setWardForm({
          wardNumber: '',
          wardName: '',
          tamilName: '',
          village: '',
          wardSecretary: '',
          contactNumber: '',
          population: '',
          areaCoverage: '',
        });
        fetchPaguthiData(selectedVillage);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to map ward to this Paguthi. Check for duplicates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen text={t('paguthi.loadingText', 'Loading Paguthi Details & Ward Hierarchy...')} />;
  if (!data) return <p className="text-center py-12 text-slate-500">{t('paguthi.notFound', 'Paguthi not found.')}</p>;

  const { constituency, paguthi, stats, wards = [], issues = [], hasVillages = false, villages = [] } = data;
  const constituencyDisplayName = isTa && constituency.tamilName ? constituency.tamilName : constituency.name;

  const isMunicipalCleanWard = ['Pothanur', 'Podanur', 'Kurichi', 'Sundarapuram'].includes(paguthi || paguthiName);

  let displayWards = Array.isArray(wards) ? [...wards] : [];

  // Pothanur: Ensure only ONE Ward 95 card is displayed
  if (['Pothanur', 'Podanur'].includes(paguthi || paguthiName)) {
    const ward95List = displayWards.filter((w) => Number(w.wardNumber) === 95);
    if (ward95List.length > 1) {
      const pothanurWard95 = ward95List.find((w) => ['Pothanur', 'Podanur'].includes(w.paguthi)) || ward95List[0];
      const otherWard95 = ward95List.find((w) => w !== pothanurWard95);

      const mergedWard95 = {
        ...pothanurWard95,
        wardSecretary: (pothanurWard95.wardSecretary && pothanurWard95.wardSecretary !== 'Not Assigned')
          ? pothanurWard95.wardSecretary
          : (otherWard95?.wardSecretary || pothanurWard95.wardSecretary || 'Not Assigned'),
        wardSecretaryRegistrationStatus: (pothanurWard95.wardSecretaryRegistrationStatus === 'Registered')
          ? 'Registered'
          : (otherWard95?.wardSecretaryRegistrationStatus || pothanurWard95.wardSecretaryRegistrationStatus || 'Not Assigned'),
        contactNumber: pothanurWard95.contactNumber || otherWard95?.contactNumber || null,
        totalComplaints: Math.max(Number(pothanurWard95.totalComplaints) || 0, Number(otherWard95?.totalComplaints) || 0),
        newComplaints: Math.max(Number(pothanurWard95.newComplaints) || 0, Number(otherWard95?.newComplaints) || 0),
        pendingComplaints: Math.max(Number(pothanurWard95.pendingComplaints) || 0, Number(otherWard95?.pendingComplaints) || 0),
        inProgressComplaints: Math.max(Number(pothanurWard95.inProgressComplaints) || 0, Number(otherWard95?.inProgressComplaints) || 0),
        completedComplaints: Math.max(Number(pothanurWard95.completedComplaints) || 0, Number(otherWard95?.completedComplaints) || 0),
      };

      displayWards = displayWards.filter((w) => Number(w.wardNumber) !== 95);
      displayWards.push(mergedWard95);
    }
  }

  if ((paguthi || paguthiName) === 'Sundarapuram') {
    const has96 = displayWards.some((w) => Number(w.wardNumber) === 96);
    if (!has96) {
      displayWards.push({
        id: 'ward-96-sundarapuram',
        wardNumber: 96,
        wardName: 'Ward 96',
        paguthi: 'Sundarapuram',
        wardSecretary: 'Not Assigned',
        wardSecretaryRegistrationStatus: 'Not Assigned',
        contactNumber: null,
        totalComplaints: 0,
        newComplaints: 0,
        pendingComplaints: 0,
        inProgressComplaints: 0,
        completedComplaints: 0,
      });
    }
  }
  displayWards.sort((a, b) => (Number(a.wardNumber) || 0) - (Number(b.wardNumber) || 0));

  return (
    <div className="space-y-6 font-sans">
      {/* ================= BREADCRUMB NAVIGATION ================= */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium flex-wrap">
        <Link to="/admin/dashboard" className="hover:text-[#A00000] transition">{t('breadcrumbs.home', 'Home')}</Link>
        <span>&gt;</span>
        <Link to="/admin/district" className="hover:text-[#A00000] transition">{t('breadcrumbs.district', 'Coimbatore District')}</Link>
        <span>&gt;</span>
        <Link to={`/admin/district/constituencies/${constituency._id}`} className="hover:text-[#A00000] transition">
          {constituencyDisplayName}
        </Link>
        <span>&gt;</span>
        {selectedVillage ? (
          <>
            <button
              type="button"
              onClick={() => handleSelectVillage('')}
              className="hover:text-[#A00000] transition underline cursor-pointer"
            >
              {paguthi}
            </button>
            <span>&gt;</span>
            <span className="text-[#A00000] font-bold">{selectedVillage}</span>
          </>
        ) : (
          <span className="text-[#A00000] font-bold">{paguthi}</span>
        )}
      </div>

      {/* Back Button */}
      {selectedVillage ? (
        <button
          type="button"
          onClick={() => handleSelectVillage('')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {paguthi} Villages</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate(`/admin/district/constituencies/${constituency._id}`)}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('paguthi.backToConstituency', { name: constituencyDisplayName, defaultValue: `Back to ${constituencyDisplayName} Constituency` })}</span>
        </button>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-[#850000] via-[#A00000] to-[#850000] text-white p-6 sm:p-8 rounded-3xl shadow-md relative overflow-hidden border-b-4 border-[#FFD32A]">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[#FFD32A] text-xs font-bold uppercase tracking-wider mb-2">
            <MapPin className="w-4 h-4" />
            <span>
              {constituencyDisplayName} Assembly Constituency
              {selectedVillage ? ` • ${paguthi}` : ''}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {selectedVillage ? `${selectedVillage} Village` : paguthi}
          </h1>

          <p className="text-xs sm:text-sm text-red-100 max-w-2xl mt-2 leading-relaxed font-medium">
            {selectedVillage
              ? `Village administration in ${paguthi}. Covers affiliated municipal wards, TVK grassroots cadre units, and local citizen grievance redressal.`
              : t('paguthi.subtitle', 'Jurisdiction covering designated Municipal Wards, TVK grassroots cadre units, and local civic grievance redressal.')}
          </p>

          {/* Actual database statistics */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-2.5 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/20">
            {hasVillages && !selectedVillage ? (
              <div className="bg-black/20 p-2 rounded-xl border border-white/10">
                <p className="text-[10px] text-red-200 uppercase font-semibold truncate">Villages</p>
                <p className="text-lg sm:text-xl font-black text-[#FFD32A] mt-0.5">{villages.length}</p>
              </div>
            ) : null}
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-red-200 uppercase font-semibold truncate">{t('constituency.totalWards', 'Total Wards')}</p>
              <p className="text-lg sm:text-xl font-black text-[#FFD32A] mt-0.5">{stats.totalWards}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-emerald-200 uppercase font-semibold truncate">Registered Secs</p>
              <p className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">{stats.registeredSecretaries || 0}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-red-200 uppercase font-semibold truncate">{t('ward.kpiTotalIssues', 'Total Complaints')}</p>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">{stats.totalComplaints}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-blue-200 uppercase font-semibold truncate">New</p>
              <p className="text-lg sm:text-xl font-black text-blue-300 mt-0.5">{stats.newComplaints || 0}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-amber-200 uppercase font-semibold truncate">{t('common.pending', 'Pending')}</p>
              <p className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">{stats.pendingComplaints || 0}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-sky-200 uppercase font-semibold truncate">In Progress</p>
              <p className="text-lg sm:text-xl font-black text-sky-300 mt-0.5">{stats.inProgressComplaints || 0}</p>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/10">
              <p className="text-[10px] text-emerald-300 uppercase font-semibold truncate">Completed</p>
              <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">{stats.completedComplaints || stats.resolvedComplaints || 0}</p>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#FFD32A]/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* ================= SECTION 1: VILLAGE DRILLDOWN (WHEN PAGUTHI HAS VILLAGES AND NONE SELECTED) ================= */}
      {hasVillages && !selectedVillage && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#252525] flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#A00000]" />
                <span>{paguthi} Villages ({villages.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Select any village to view its local municipal wards, TVK ward secretaries, and civic complaints
              </p>
            </div>
            <span className="text-xs font-bold text-[#A00000] bg-red-50 border border-red-200 px-3 py-1 rounded-full self-start sm:self-auto">
              {villages.length} Villages Mapped
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {villages.map((v) => (
              <div
                key={v.name}
                onClick={() => handleSelectVillage(v.name)}
                className="bg-white rounded-2xl border border-[#E9E2DC] shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-[#A00000] transition-all duration-200 flex flex-col justify-between overflow-hidden relative cursor-pointer group"
              >
                {/* Red Top Accent Border with Golden-Yellow Highlight */}
                <div className="h-1.5 bg-gradient-to-r from-[#A00000] via-[#FFD32A] to-[#850000]"></div>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF8F0] border border-[#FFE5A3] flex items-center justify-center text-[#A00000] shadow-xs group-hover:scale-105 transition">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {paguthi}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-3 group-hover:text-[#A00000] transition">
                    {v.name}
                  </h3>

                  {/* Village KPI Counts from Database */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="bg-[#FFF8F0] p-2 rounded-xl border border-[#FFE5A3]/40">
                      <span className="text-[10.5px] text-slate-500 block">Total Wards</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {v.totalWards || 0} {v.totalWards === 1 ? 'Ward' : 'Wards'}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200/50">
                      <span className="text-[10.5px] text-emerald-700 block">Secretary</span>
                      <strong className={`font-bold text-[11px] truncate block ${v.wardSecretary !== 'Not Assigned' ? 'text-emerald-900' : 'text-slate-400'}`}>
                        {v.wardSecretary || 'Not Assigned'}
                      </strong>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold">Total Complaints:</span>
                        <span className="font-bold text-[#A00000]">{v.totalComplaints || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200">
                        <span>Pending: <strong className="text-amber-700">{v.pendingComplaints || 0}</strong></span>
                        <span>In Prog: <strong className="text-sky-700">{v.inProgressComplaints || 0}</strong></span>
                        <span>Done: <strong className="text-emerald-700">{v.completedComplaints || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Open Village Wards Button */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVillage(v.name);
                    }}
                    className="w-full py-2 px-3 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Open Village Wards</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: EMPTY STATE ALERT FOR UNMAPPED URBAN LOCAL BODIES ================= */}
      {!hasVillages && (paguthi === 'Madukkarai Nagaram' || paguthi === 'Vellalur Nagaram') && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 flex items-start space-x-3.5 shadow-xs">
          <FolderTree className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-extrabold text-amber-950">
              No Verified Village Mapping Available
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              No rural villages are mapped to this urban/town local body ({paguthi}) in the database.
              Municipal ward administration and citizen grievances are maintained directly at the town level.
            </p>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: WARD ADMINISTRATION (WHEN VILLAGE SELECTED OR MUNICIPAL PAGUTHI) ================= */}
      {(!hasVillages || selectedVillage) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#252525] flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#A00000]" />
                <span>
                  {selectedVillage
                    ? `${selectedVillage} Municipal Wards`
                    : t('districtHierarchy.wardAdmin', 'Ward Administration')}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {selectedVillage
                  ? `Localized ward governance and TVK ward secretaries under ${selectedVillage} village`
                  : t('paguthi.wardsInPaguthiSub', 'Localized ward governance, TVK ward secretaries, and civic complaint tracking')}
              </p>
            </div>

            {/* Admin Action: Add Ward */}
            <button
              type="button"
              onClick={() => {
                setWardForm((prev) => ({ ...prev, village: selectedVillage || '' }));
                setIsAddWardModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {selectedVillage ? `Map New Ward to ${selectedVillage}` : t('paguthi.addWardBtn', 'Map New Ward to Paguthi')}
              </span>
            </button>
          </div>

          {/* WARD CARDS GRID */}
          {displayWards.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <p className="text-slate-500 text-sm">
                No municipal wards currently mapped to {selectedVillage || paguthi}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setWardForm((prev) => ({ ...prev, village: selectedVillage || '' }));
                  setIsAddWardModalOpen(true);
                }}
                className="mt-3 px-4 py-2 bg-[#A00000] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {t('district.addNewWard', 'Add Ward')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayWards.map((w) => (
                <div
                  key={w._id || w.id}
                  onClick={() => navigate(`/admin/district/wards/${w._id || w.id}?tab=complaints`)}
                  className="bg-white rounded-2xl border border-[#E9E2DC] shadow-xs hover:shadow-md hover:border-[#A00000] transition-all duration-200 flex flex-col justify-between overflow-hidden relative cursor-pointer group"
                >
                  <div className="h-1 bg-[#A00000]"></div>

                  <div className="p-5">
                    {isMunicipalCleanWard ? (
                      <div className="pb-1">
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-[#A00000] transition">
                          {t('district.wardLabel', 'Ward')} {w.wardNumber}
                        </h3>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#A00000] bg-[#FFF0F0] border border-red-200 px-2.5 py-0.5 rounded-lg">
                            {t('district.wardLabel', 'Ward')} {w.wardNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {selectedVillage || w.village || paguthi}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 mt-2 group-hover:text-[#A00000] transition">
                          {w.wardName}
                        </h3>
                        {w.tamilName && (
                          <p className="text-xs text-slate-500 font-medium">{w.tamilName}</p>
                        )}
                      </>
                    )}

                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('ward.secretaryName', 'Ward Secretary')}:</span>
                        <strong className={`font-semibold ${w.wardSecretary && w.wardSecretary !== 'Not Assigned' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                          {w.wardSecretary || 'Not Assigned'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Secretary Status:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.wardSecretaryRegistrationStatus === 'Registered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {w.wardSecretaryRegistrationStatus === 'Registered' ? 'Registered' : 'Not Assigned'}
                        </span>
                      </div>
                      {w.contactNumber ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('district.contactLabel', 'Contact')}:</span>
                          <span className="font-mono text-slate-700 font-medium">{w.contactNumber}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('district.contactLabel', 'Contact')}:</span>
                          <span className="text-slate-400 font-mono text-[11px]">Not Available</span>
                        </div>
                      )}
                      {!isMunicipalCleanWard && w.areaCoverage && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 pt-1">
                          {w.areaCoverage}
                        </p>
                      )}
                    </div>

                    {/* Ward KPI Stats */}
                    <div className="grid grid-cols-5 gap-1 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-500 block truncate">Total</span>
                        <strong className="text-slate-900 font-bold text-xs">{w.totalComplaints || 0}</strong>
                      </div>
                      <div className="bg-blue-50 p-1 rounded-lg border border-blue-200/60">
                        <span className="text-[9px] text-blue-700 block truncate">New</span>
                        <strong className="text-blue-800 font-bold text-xs">{w.newComplaints || 0}</strong>
                      </div>
                      <div className="bg-amber-50 p-1 rounded-lg border border-amber-200/60">
                        <span className="text-[9px] text-amber-700 block truncate">{t('common.pending', 'Pending')}</span>
                        <strong className="text-amber-800 font-bold text-xs">{w.pendingComplaints || 0}</strong>
                      </div>
                      <div className="bg-sky-50 p-1 rounded-lg border border-sky-200/60">
                        <span className="text-[9px] text-sky-700 block truncate">In Prog</span>
                        <strong className="text-sky-800 font-bold text-xs">{w.inProgressComplaints || 0}</strong>
                      </div>
                      <div className="bg-emerald-50 p-1 rounded-lg border border-emerald-200/60">
                        <span className="text-[9px] text-emerald-700 block truncate">Done</span>
                        <strong className="text-emerald-800 font-bold text-xs">{w.completedComplaints || w.resolvedComplaints || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* View Ward Complaints Button */}
                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/district/wards/${w._id || w.id}?tab=complaints`);
                      }}
                      className="w-full py-2 px-3 bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>View Ward Complaints ({w.totalComplaints || 0})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION 4: GRIEVANCES & COMPLAINTS SECTION ================= */}
      {(!hasVillages || selectedVillage) && (
        <div className="bg-white rounded-3xl p-6 border border-[#E9E2DC] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#252525] flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-[#A00000]" />
                <span>
                  {selectedVillage
                    ? `${selectedVillage} Grievances & Complaints (${issues.length})`
                    : `${paguthi} Grievances & Complaints (${issues.length})`}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {selectedVillage
                  ? `Complaints registered under ${selectedVillage} village across municipal wards`
                  : `Complaints registered under ${paguthi} Paguthi across its municipal wards`}
              </p>
            </div>
            <span className="text-xs font-bold text-[#A00000] bg-[#FFF0F0] border border-red-200 px-3 py-1 rounded-full self-start sm:self-auto">
              {stats.totalComplaints || 0} Total in MySQL
            </span>
          </div>

          {issues.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No complaints registered in {selectedVillage || paguthi} yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#FFF8F0] text-[11px] font-extrabold uppercase text-[#A00000] border-b border-[#FFE5A3]">
                  <tr>
                    <th className="py-3 px-3">Complaint ID</th>
                    <th className="py-3 px-3">Citizen</th>
                    <th className="py-3 px-3">Ward</th>
                    <th className="py-3 px-3">Title / Category</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Assigned Secretary</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {issues.map((iss) => (
                    <tr key={iss._id || iss.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-red-900 whitespace-nowrap">
                        {iss.issueCode || iss.complaintId}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{iss.citizenName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{iss.citizenMobile}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          Ward {iss.wardNumber || iss.ward?.wardNumber || '-'}
                        </span>
                        {!isMunicipalCleanWard && iss.village ? (
                          <div className="text-[10px] text-amber-700 font-semibold">{iss.village}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">{iss.title}</div>
                        <div className="text-[10.5px] text-slate-400">{iss.category}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <PriorityBadge priority={iss.priority || 'Medium'} />
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {iss.createdAt
                          ? new Date(iss.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {iss.assignedWardSecretary ? (
                          <div className="text-emerald-700 font-bold">
                            {iss.assignedWardSecretary.name || iss.assignedWardSecretary.username}
                          </div>
                        ) : (
                          <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={iss.status} />
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/complaints/${iss._id || iss.id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-[#A00000] hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: ADD WARD ================= */}
      {isAddWardModalOpen && (
        <Modal
          isOpen={isAddWardModalOpen}
          onClose={() => setIsAddWardModalOpen(false)}
          title={
            selectedVillage
              ? `Map New Ward to ${selectedVillage} (${paguthi})`
              : t('paguthi.modalTitle', { name: paguthi, defaultValue: `Add / Map Ward to ${paguthi} Paguthi` })
          }
          subtitle={
            selectedVillage
              ? `Assign a new municipal ward to ${selectedVillage} village`
              : t('paguthi.modalSubtitle', 'Assign a new municipal ward to this administrative Paguthi')
          }
        >
          <form onSubmit={handleAddWardSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('district.wardNumberRequired', 'Ward Number *')}
                </label>
                <input
                  type="number"
                  required
                  value={wardForm.wardNumber}
                  onChange={(e) => setWardForm({ ...wardForm, wardNumber: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#A00000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('district.wardNameRequired', 'Ward Name (English) *')}
                </label>
                <input
                  type="text"
                  required
                  value={wardForm.wardName}
                  onChange={(e) => setWardForm({ ...wardForm, wardName: e.target.value })}
                  placeholder="e.g. Vadaputhur East"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#A00000]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ward Name (Tamil)
                </label>
                <input
                  type="text"
                  value={wardForm.tamilName}
                  onChange={(e) => setWardForm({ ...wardForm, tamilName: e.target.value })}
                  placeholder="e.g. வடபுதூர் கிழக்கு"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#A00000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village
                </label>
                <input
                  type="text"
                  value={wardForm.village || selectedVillage || ''}
                  onChange={(e) => setWardForm({ ...wardForm, village: e.target.value })}
                  placeholder="e.g. Vadaputhur"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#A00000]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('ward.secretaryName', 'Ward Secretary Name')}
                </label>
                <input
                  type="text"
                  value={wardForm.wardSecretary}
                  onChange={(e) => setWardForm({ ...wardForm, wardSecretary: e.target.value })}
                  placeholder="Secretary full name"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#A00000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('district.contactLabel', 'Contact Number')}
                </label>
                <input
                  type="text"
                  value={wardForm.contactNumber}
                  onChange={(e) => setWardForm({ ...wardForm, contactNumber: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#A00000]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddWardModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#A00000] hover:bg-[#850000] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? t('common.saving', 'Saving...') : t('common.saveWard', 'Save Ward')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PaguthiDetailPage;
