import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  Plus,
  Download,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';

export const OfficersPage = () => {
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0 });
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    officerName: '',
    department: 'Corporation / Municipal Admin',
    designation: '',
    officeAddress: '',
    contactNumber: '',
    email: '',
    district: 'Coimbatore',
    workingArea: 'Coimbatore District & Zones',
    status: 'Active',
  });

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedDepartment && selectedDepartment !== 'All') params.department = selectedDepartment;

      const res = await api.get('/officers', { params });
      if (res.data.success) {
        setOfficers(res.data.data);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      notifyError('Failed to load department officers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [search, selectedDepartment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const res = await api.post('/officers', formData);
        if (res.data.success) notifySuccess('Officer added to directory!');
      } else {
        const res = await api.put(`/officers/${currentId}`, formData);
        if (res.data.success) notifySuccess('Officer details updated!');
      }
      setIsModalOpen(false);
      fetchOfficers();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to save officer');
    }
  };

  const handleEdit = (off) => {
    setModalMode('edit');
    setCurrentId(off._id);
    setFormData({
      officerName: off.officerName || '',
      department: off.department || 'Corporation / Municipal Admin',
      designation: off.designation || '',
      officeAddress: off.officeAddress || '',
      contactNumber: off.contactNumber || '',
      email: off.email || '',
      district: off.district || 'Coimbatore',
      workingArea: off.workingArea || 'Coimbatore District & Zones',
      status: off.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this officer profile from directory?')) return;
    try {
      const res = await api.delete(`/officers/${id}`);
      if (res.data.success) {
        notifySuccess('Officer removed');
        fetchOfficers();
      }
    } catch (err) {
      notifyError('Failed to delete officer');
    }
  };

  const handleExport = () => {
    window.open('/api/officers/export', '_blank');
  };

  const departmentsList = [
    'Corporation / Municipal Admin',
    'TWAD Board (Water Supply)',
    'TANGEDCO (Electricity)',
    'Highways & Road Infrastructure',
    'Public Health & Sanitation',
    'Police & Traffic Management',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AdminPageHeader
        badge={t('officers.headerBadge', 'Government Inter-Departmental Directory')}
        badgeIcon={Briefcase}
        title={t('officers.title', 'Department Officers Directory')}
        tamilTitle="துறை அதிகாரிகள் தகவல் கையேடு"
        subtitle={t('officers.subtitle', 'Official nodal contacts across Municipal Corporation, TWAD, TANGEDCO, Highways, and Police for direct grievance assignment.')}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2.5 bg-white/95 hover:bg-white text-[#850000] font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#A00000]" />
              <span>{t('members.exportExcel', 'Export Excel')}</span>
            </button>
            <button
              onClick={() => {
                setModalMode('create');
                setFormData({
                  officerName: '',
                  department: 'Corporation / Municipal Admin',
                  designation: '',
                  officeAddress: '',
                  contactNumber: '',
                  email: '',
                  district: 'Coimbatore',
                  workingArea: 'Coimbatore District & Zones',
                  status: 'Active',
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-xl text-xs shadow-sm transition space-x-1.5 border border-[#FFD32A]/50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD32A]" />
              <span>{t('officers.addNewOfficer', 'Add Officer')}</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('officers.searchPlaceholder', 'Search officer name, department, designation, phone...')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-red-700"
          />
        </div>

        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:ring-red-700"
          >
            <option value="All">{t('officers.allDepartments', 'All Government Departments')}</option>
            {departmentsList.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Officers Cards Grid */}
      {loading ? (
        <LoadingSpinner text={t('officers.loadingText', 'Loading Department Officers...')} />
      ) : officers.length === 0 ? (
        <p className="text-center py-12 text-slate-400 text-xs">{t('common.noRecords', 'No department officers found.')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {officers.map((off) => (
            <div
              key={off._id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                    {off.department.split(' ')[0]}
                  </span>
                  <StatusBadge status={off.status} />
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{off.officerName}</h3>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">{off.designation}</p>
                <p className="text-xs text-slate-500 font-medium">{off.department}</p>

                <div className="mt-4 space-y-2 text-xs text-slate-700 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <p className="flex items-center font-mono font-bold text-slate-900">
                    <Phone className="w-3.5 h-3.5 mr-2 text-emerald-600 flex-shrink-0" />
                    <span>{off.contactNumber}</span>
                  </p>
                  {off.email && (
                    <p className="flex items-center text-slate-600 truncate">
                      <Mail className="w-3.5 h-3.5 mr-2 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{off.email}</span>
                    </p>
                  )}
                  {off.officeAddress && (
                    <p className="flex items-start text-slate-500 leading-snug">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{off.officeAddress}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {t('officers.title', 'Assigned Issues')}: <strong>{off.assignedIssuesCount || 0}</strong>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(off)}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    {t('common.edit', 'Edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(off._id)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Officer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? t('officers.modalAddTitle', 'Add Department Officer') : t('officers.modalEditTitle', 'Edit Officer')}
        subtitle={t('officers.modalSubtitle', 'Maintain official nodal officer directory for prompt grievance assignment')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.nameRequired', 'Officer Name *')}</label>
              <input
                type="text"
                required
                value={formData.officerName}
                onChange={(e) => setFormData({ ...formData, officerName: e.target.value })}
                placeholder="e.g. Er. R. Balasubramaniam"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.designationRequired', 'Designation *')}</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Superintending Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.departmentRequired', 'Government Department *')}</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
            >
              {departmentsList.map((d, i) => (
                <option key={i} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.contactNumberRequired', 'Contact Number *')}</label>
              <input
                type="tel"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="+91 94433 11223"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.emailOptional', 'Official Email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="officer@tn.gov.in"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('officers.officeAddressRequired', 'Office Address')}</label>
            <textarea
              rows="2"
              value={formData.officeAddress}
              onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
              placeholder="Building, street, town hall / corporation complex..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-red-700"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold"
            >
              {modalMode === 'create' ? t('officers.addNewOfficer', 'Add Officer') : t('common.save', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OfficersPage;
