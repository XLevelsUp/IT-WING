import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  MapPin,
  Calendar,
  ChevronRight,
  TrendingUp,
  DollarSign,
  UploadCloud,
  Camera,
  X,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';
import { getSafeImageUrl } from '../../utils/imageUtils';

export const ProjectsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, planned: 0, ongoing: 0, completed: 0 });
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [wards, setWards] = useState([]);

  // Add / Edit Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Community Infrastructure',
    location: '',
    wardId: '',
    department: 'Coimbatore Municipal Corporation',
    budget: '',
    status: 'Ongoing',
    startDate: new Date().toISOString().split('T')[0],
    progressPercentage: 50,
    imageUrl: '',
  });

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;

      const res = await api.get('/projects', { params });
      if (res.data.success) {
        setProjects(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('fetchProjects error:', err);
      notifyError('Failed to load projects from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await api.get('/districts/wards');
        if (res.data?.success) setWards(res.data.data || []);
      } catch (err) {}
    };
    fetchWards();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [search, selectedStatus]);

  // Handle Image Selection and Validation
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    // Allowed image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      const err = 'Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed.';
      setImageError(err);
      notifyError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Allowed max file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const err = 'File size exceeds 10MB limit. Please upload an image under 10MB.';
      setImageError(err);
      notifyError(err);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageFile(file);
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);

    // Upload immediately to permanent storage via /api/upload
    try {
      setUploadingImage(true);
      const uploadData = new FormData();
      uploadData.append('image', file);

      const res = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.url }));
        notifySuccess('Project image uploaded to storage successfully!');
      } else {
        throw new Error(res.data.message || 'Upload failed');
      }
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      setImageError('Failed to upload image. Please try again.');
      notifyError(uploadErr.response?.data?.message || 'Failed to upload image to permanent storage');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Community Infrastructure',
      location: 'Coimbatore District',
      wardId: '',
      department: 'Coimbatore Municipal Corporation',
      budget: '',
      status: 'Ongoing',
      startDate: new Date().toISOString().split('T')[0],
      progressPercentage: 50,
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenAddModal = () => {
    setModalMode('create');
    setCurrentId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (proj, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentId(proj._id || proj.id);
    setFormData({
      title: proj.title || '',
      description: proj.description || '',
      category: proj.category || 'Community Infrastructure',
      location: proj.location || 'Coimbatore District',
      wardId: proj.wardId?._id || proj.wardId?.id || proj.wardId || '',
      department: proj.department || 'Coimbatore Municipal Corporation',
      budget: proj.budget || '',
      status: proj.status || 'Ongoing',
      startDate: proj.startDate ? new Date(proj.startDate).toISOString().split('T')[0] : '',
      progressPercentage: proj.progressPercentage || 0,
      imageUrl: proj.imageUrl || '',
    });
    setImagePreview(proj.imageUrl ? getSafeImageUrl(proj.imageUrl) : '');
    setImageFile(null);
    setImageError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project record? This action cannot be undone.')) return;
    try {
      const res = await api.delete(`/projects/${id}`);
      if (res.data.success) {
        notifySuccess('Project record deleted successfully');
        fetchProjects();
      }
    } catch (err) {
      console.error('Delete project failed:', err);
      notifyError('Failed to delete project record');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Required Field Validation
    if (!formData.title || !formData.title.trim()) {
      notifyError('Project Title is required.');
      return;
    }

    if (!formData.imageUrl || !formData.imageUrl.trim()) {
      setImageError('Project Image is required. Please upload an image.');
      notifyError('Project Image is required. Please select and upload an image.');
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      notifyError('Project Description is required.');
      return;
    }

    if (uploadingImage) {
      notifyError('Please wait for the image upload to complete.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        location: formData.location.trim() || 'Coimbatore District',
        department: formData.department.trim() || 'Coimbatore Municipal Corporation',
      };

      if (modalMode === 'create') {
        const res = await api.post('/projects', payload);
        if (res.data.success) {
          notifySuccess('New project initiative published successfully!');
        }
      } else {
        const res = await api.put(`/projects/${currentId}`, payload);
        if (res.data.success) {
          notifySuccess('Project details updated successfully!');
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err) {
      console.error('Submit project failed:', err);
      notifyError(err.response?.data?.message || 'Failed to save project. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AdminPageHeader
        badge={t('projects.headerBadge', 'Infrastructure & Public Works')}
        badgeIcon={Award}
        title={t('projects.title', 'Achievements & Projects')}
        tamilTitle="சாதனைகள் மற்றும் மக்கள் நலத்திட்டங்கள்"
        subtitle={t('projects.subtitle', 'Key civic advancements, completed public welfare projects and ongoing municipal initiatives across Coimbatore District.')}
        actions={
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-xl text-xs shadow-md transition space-x-1.5 border border-[#FFD32A]/50 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#FFD32A]" />
            <span>{t('projects.addNewProject', 'Add New Project')}</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">{t('projects.statTotal', 'Total Projects')}</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{summary.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase">{t('projects.statCompleted', 'Completed')}</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-sky-600 uppercase">{t('projects.statOngoing', 'Ongoing')}</p>
          <p className="text-2xl font-extrabold text-sky-700 mt-1">{summary.ongoing}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-purple-600 uppercase">{t('projects.statPlanned', 'Planned')}</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{summary.planned}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('projects.searchPlaceholder', 'Search projects, location, department...')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-red-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Ongoing', 'Completed', 'Planned'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedStatus === s
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'All' ? t('projects.allStatus', 'All') : s === 'Ongoing' ? t('projects.statusOngoing', 'Ongoing') : s === 'Completed' ? t('projects.statusCompleted', 'Completed') : t('projects.statusPlanned', 'Planned')}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid - Dynamically populated from database */}
      {loading ? (
        <LoadingSpinner text={t('projects.loadingText', 'Loading District Projects...')} />
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Achievements or Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No dynamic project records currently exist in the database. Click the button below to add your first project initiative.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('projects.addNewProject', 'Add New Project')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const hasImage = !!proj.imageUrl;
            const safeImage = hasImage ? getSafeImageUrl(proj.imageUrl) : '';

            return (
              <div
                key={proj._id || proj.id}
                onClick={() => navigate(`/admin/projects/${proj._id || proj.id}`)}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-red-200 transition cursor-pointer flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Top Image Preview if available */}
                  {hasImage ? (
                    <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-3.5 bg-slate-100 border border-slate-100">
                      <img
                        src={safeImage}
                        alt={proj.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="font-mono text-[10.5px] font-bold text-red-700 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-red-200 shadow-xs">
                          {proj.projectCode}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <StatusBadge status={proj.status} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                        {proj.projectCode}
                      </span>
                      <StatusBadge status={proj.status} />
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition leading-snug line-clamp-2">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{proj.description}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-red-600 flex-shrink-0" />
                      <span>{proj.location || 'Coimbatore District'}</span>
                    </p>
                    <p className="flex items-center truncate">
                      <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                      <span>{proj.department || 'Coimbatore Municipal Corporation'}</span>
                    </p>
                    {proj.startDate && (
                      <p className="flex items-center text-slate-400 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                        <span>Date: {new Date(proj.startDate).toLocaleDateString()}</span>
                      </p>
                    )}
                    {proj.budget > 0 && (
                      <p className="flex items-center font-bold text-emerald-700">
                        <span>{t('projects.budgetLabel', 'Budget')}: ₹{(proj.budget / 10000000).toFixed(2)} Crores</span>
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">{t('projects.progressLabel', 'Progress')}</span>
                      <span className="text-red-700">{proj.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-700 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${proj.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-red-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                    <span>{t('projects.viewProjectBtn', 'View Details')}</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                  </span>

                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleEdit(proj, e)}
                      className="px-2 py-1 text-slate-500 hover:text-blue-700 font-medium rounded hover:bg-slate-100 cursor-pointer"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      onClick={(e) => handleDelete(proj._id || proj.id, e)}
                      className="px-2 py-1 text-slate-500 hover:text-rose-700 font-medium rounded hover:bg-rose-50 cursor-pointer"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Adding/Editing Project */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={modalMode === 'create' ? t('projects.addNewProject', 'Add New Project') : t('projects.modalEditTitle', 'Edit Project')}
        subtitle={t('projects.subtitle', 'Track municipal development works and achievements in Coimbatore')}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          {/* Project Title (Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('projects.titleRequired', 'Project Title *')}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Model Citizen Health & Maternity Redressal Centre"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
            />
          </div>

          {/* Project Image Upload Section (Required) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Project Image *
              </label>
              <span className="text-[10px] text-slate-400">JPG, JPEG, PNG, WEBP (Max 10MB)</span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleImageChange}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-50 hover:bg-red-50/20 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-slate-400 group-hover:text-red-700 flex items-center justify-center mx-auto shadow-xs border border-slate-200 group-hover:border-red-200 transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 mt-2 group-hover:text-red-700 transition-colors">
                  Click to select project image from computer
                </p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  Clear ground photos of civic project execution
                </p>
              </div>
            ) : (
              <div className="relative bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center space-x-3.5">
                <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Project Preview"
                    className="w-full h-full object-cover"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                      Uploading...
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {imageFile ? imageFile.name : formData.imageUrl.split('/').pop() || 'Project Image'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {imageFile ? `${Math.round(imageFile.size / 1024)} KB` : 'Stored image'}
                  </p>
                  {formData.imageUrl ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-1">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Uploaded to storage
                    </span>
                  ) : null}

                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                    >
                      Replace Image
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {imageError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{imageError}</span>
              </p>
            )}
          </div>

          {/* Project Description (Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('projects.descriptionRequired', 'Project Description *')}
            </label>
            <textarea
              rows="3"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Scope of work, key deliverables, and community benefits..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('projects.categoryRequired', 'Project Category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              >
                <option value="Community Infrastructure">Community Infrastructure</option>
                <option value="Water Infrastructure">Water Infrastructure</option>
                <option value="Roads & Bridges">Roads & Bridges</option>
                <option value="Energy & Streetlights">Energy & Streetlights</option>
                <option value="Flood Prevention & Drainage">Flood Prevention & Drainage</option>
                <option value="Public Health">Public Health</option>
                <option value="Parks & Recreation">Parks & Recreation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('projects.statusRequired', 'Project Status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              >
                <option value="Planned">{t('projects.statusPlanned', 'Planned')}</option>
                <option value="Ongoing">{t('projects.statusOngoing', 'Ongoing')}</option>
                <option value="Completed">{t('projects.statusCompleted', 'Completed')}</option>
              </select>
            </div>
          </div>

          {/* Project Date (Optional) & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Date (Optional)
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('projects.locationRequired', 'Location / Ward Area')}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. R.S. Puram, Ward 72"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Department & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('projects.departmentRequired', 'Executing Department')}
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Coimbatore Municipal Corporation"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('projects.budgetLabel', 'Budget (INR, Optional)')}
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g. 25000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Progress Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>{t('projects.progressPercentageLabel', 'Progress Percentage')}</span>
              <span className="text-red-700 font-extrabold">{formData.progressPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progressPercentage}
              onChange={(e) => setFormData({ ...formData, progressPercentage: parseInt(e.target.value, 10) || 0 })}
              className="w-full accent-red-700 cursor-pointer"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Saving...'
                  : modalMode === 'create'
                  ? t('projects.addNewProject', 'Create Project')
                  : t('common.save', 'Save Changes')}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
