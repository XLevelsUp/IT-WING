import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Droplet,
  Printer,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import AdminPageHeader from '../../components/common/AdminPageHeader';

export const MemberDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/members/${id}`);
        if (res.data.success) {
          setMember(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load member:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen text={t('memberDetail.loadingText', 'Loading TVK Member Profile...')} />;
  if (!member) return <p className="text-center py-12 text-slate-500">{t('memberDetail.notFound', 'Member not found.')}</p>;

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/members')}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#A00000]" />
          <span>{t('memberDetail.backToMembers', 'Back to Members Roster')}</span>
        </button>

        <button
          onClick={handlePrintCard}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-[#A00000] hover:bg-[#850000] text-white text-xs font-bold transition shadow-xs cursor-pointer space-x-1.5 border border-red-700/50"
        >
          <Printer className="w-4 h-4 text-[#FFD32A]" />
          <span>{t('memberDetail.printIdCard', 'Print ID Card')}</span>
        </button>
      </div>

      {/* TOP HERO/HEADER BOX - MATCHING LOGIN PAGE DEEP RED & GOLDEN YELLOW THEME */}
      <AdminPageHeader
        badge={t('memberDetail.headerBadge', 'Official TVK Cadre Member Profile')}
        badgeIcon={ShieldCheck}
        title={member.fullName}
        tamilTitle={member.tamilName}
        subtitle={`${member.designation || 'Active TVK Cadre'} • ${t('memberDetail.statMemberId', 'Member ID')}: ${member.memberId} • Coimbatore District Registry`}
        stats={[
          { label: t('memberDetail.statMemberId', 'Member ID'), value: member.memberId, highlight: true },
          { label: t('memberDetail.wardAssignment', 'Assigned Ward'), value: member.wardId?.wardNumber ? `${t('district.wardLabel', 'Ward')} ${member.wardId.wardNumber}` : 'General Ward' },
          { label: t('district.statAssemblyConstituency', 'Constituency'), value: member.constituencyId?.name || 'Kinathukadavu' },
          { label: t('memberDetail.statStatus', 'Cadre Status'), value: member.status ? t(`status.${member.status}`, member.status) : 'Active', highlight: true },
        ]}
      />

      {/* Main Profile & ID Badge Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Official TVK Membership Badge Card (Deep Red Gradient + Golden Yellow Accent) */}
        <div className="md:col-span-1 bg-gradient-to-b from-[#850000] via-[#A00000] to-[#850000] text-white p-6 rounded-3xl shadow-md flex flex-col justify-between border-2 border-[#FFD32A]/50 relative overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute right-0 bottom-0 w-40 h-40 bg-[#FFD32A]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD32A] text-[#850000] font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-sm border border-amber-300">
              TVK
            </div>
            <h4 className="text-xs font-black text-[#FFD32A] tracking-wider uppercase">
              Tamilaga Vettri Kazhagam
            </h4>
            <p className="text-[10px] text-white/80 font-medium">Coimbatore District Cadre</p>

            {/* Photo Avatar */}
            <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-[#FFD32A] mx-auto my-5 flex items-center justify-center shadow-lg overflow-hidden">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">
                  {member.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white leading-tight">{member.fullName}</h3>
            {member.tamilName && <p className="text-xs text-[#FFD32A] mt-0.5 font-medium">{member.tamilName}</p>}

            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-black/30 border border-[#FFD32A]/40 text-xs font-bold text-[#FFD32A]">
              {member.designation}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 text-center relative z-10">
            <p className="font-mono text-xs font-bold tracking-widest text-[#FFD32A]">{member.memberId}</p>
            <p className="text-[9px] text-white/70 uppercase tracking-wider mt-0.5">{t('memberDetail.statMemberId', 'Official Membership ID')}</p>
          </div>
        </div>

        {/* Right: Comprehensive Particulars Card (Clean Cream/White Palette) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-[#E9E2DC] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E9E2DC] pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#252525]">{t('memberDetail.personalInfoTitle', 'Member Particulars')}</h2>
              <p className="text-xs text-slate-500">Registered TVK cadre record details & verification</p>
            </div>
            <StatusBadge status={member.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.contactMobile', 'Mobile Contact')}</span>
              <p className="font-mono font-bold text-[#252525] text-sm flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-[#A00000]" />
                {member.mobileNumber}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.statGender', 'Gender')} & {t('memberDetail.statBloodGroup', 'Blood Group')}</span>
              <p className="font-bold text-[#252525] text-sm flex items-center">
                <Droplet className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                {member.gender} • {member.bloodGroup || 'Blood Group N/A'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('district.statAssemblyConstituency', 'Constituency')}</span>
              <p className="font-bold text-[#252525] text-sm flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-[#A00000]" />
                {member.constituencyId?.name || 'Kinathukadavu'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.wardAssignment', 'Assigned Ward')}</span>
              <p className="font-bold text-[#252525] text-sm flex items-center">
                <Award className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                {t('district.wardLabel', 'Ward')} {member.wardId?.wardNumber || 'General'} - {member.wardId?.wardName || ''}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.joinedDate', 'Enrollment Date')}</span>
              <p className="font-bold text-[#252525] text-sm flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                {new Date(member.joiningDate || member.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC]">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.isOfficeBearer', 'Office Bearer Status')}</span>
              <p className="font-bold text-[#252525] text-sm flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                {member.isOfficeBearer ? t('members.officeBearerBadge', 'Designated Office Bearer') : t('members.activeCadre', 'Cadre Volunteer')}
              </p>
            </div>
          </div>

          {member.address && (
            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#E9E2DC] text-xs">
              <span className="text-slate-500 block mb-1 font-bold uppercase text-[10px] tracking-wider">{t('memberDetail.address', 'Residential Address')}</span>
              <p className="text-[#252525] font-medium leading-relaxed">{member.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetailPage;

