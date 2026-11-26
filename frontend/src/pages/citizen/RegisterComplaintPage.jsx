import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  MapPin,
  Send,
  Camera,
  UploadCloud,
  X,
  Image as ImageIcon,
  Download,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Footer from '../../components/layout/Footer';
import {
  downloadComplaintPdf,
  downloadTamilComplaintPdf,
  downloadEnglishComplaintPdf,
} from '../../utils/complaintPdfGenerator';
import {
  PAGUTHI_LABEL,
  PAGUTHI_OPTIONS,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getWardsForPaguthi,
  isWardValidForPaguthi,
} from '../../utils/paguthiWardData';

export const RegisterComplaintPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Drinking Water',
    description: '',
    citizenName: user?.name || '',
    citizenMobile: user?.phone || '',
    citizenAddress: user?.address || '',
    district: 'Coimbatore',
    constituency: 'Kinathukadavu',
    paguthi: user?.paguthi && PAGUTHI_OPTIONS.includes(user.paguthi) ? user.paguthi : '',
    village: user?.village || '',
    wardNumber: '',
    wardId: '',
    priority: 'Medium',
  });

  const availableVillagesForPaguthi = useMemo(() => {
    return getVillagesForPaguthi(formData.paguthi);
  }, [formData.paguthi]);

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [downloadingPdfLang, setDownloadingPdfLang] = useState(null);

  const handleDownloadSubmittedPdf = async (lang = 'ta') => {
    if (!submittedComplaint) return;
    try {
      setDownloadingPdfLang(lang);
      let fullComplaint = submittedComplaint;
      const fetchId = submittedComplaint.id || submittedComplaint._id;
      if (fetchId) {
        try {
          const res = await api.get(`/issues/${fetchId}`);
          if (res.data?.success && res.data?.data) {
            fullComplaint = res.data.data.issue || res.data.data;
          }
        } catch (fetchErr) {
          console.warn('Using submitted complaint object for PDF:', fetchErr.message);
        }
      }
      await downloadComplaintPdf(fullComplaint, user, lang);
      if (lang === 'ta') {
        notifySuccess('Tamil complaint PDF downloaded successfully! (புகார் ஒப்புகைச் சீட்டு பதிவிறக்கம் செய்யப்பட்டது)');
      } else {
        notifySuccess('English complaint PDF downloaded successfully!');
      }
    } catch (err) {
      console.error('Failed to download complaint PDF:', err);
      notifyError(lang === 'ta' ? 'Failed to generate Tamil PDF. Please try again.' : 'Failed to generate English PDF. Please try again.');
    } finally {
      setDownloadingPdfLang(null);
    }
  };

  // Image Upload States
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await api.get('/districts/wards');
        if (res.data.success) {
          setWards(res.data.data);
        }
      } catch (err) {}
    };
    fetchWards();
  }, []);

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      notifyError('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      notifyError('Image size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Upload to server storage immediately
    try {
      setUploadingImage(true);
      const uploadData = new FormData();
      uploadData.append('image', file);

      const res = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.url) {
        setUploadedImageUrl(res.data.url);
        notifySuccess('Supporting image uploaded successfully!');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      notifyError(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadedImageUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadingImage) {
      notifyError('Please wait for the image upload to complete.');
      return;
    }

    if (!formData.paguthi) {
      notifyError(`Please select ${PAGUTHI_LABEL}`);
      return;
    }

    const villagesForCP = getVillagesForPaguthi(formData.paguthi);
    if (villagesForCP.length > 0 && !formData.village) {
      notifyError(`Please select a Village for ${formData.paguthi}`);
      return;
    }

    if (!formData.wardNumber) {
      notifyError('Please select a Ward Number');
      return;
    }

    if (!isWardValidForPaguthi(formData.paguthi, formData.wardNumber)) {
      notifyError(`Ward ${formData.wardNumber} does not belong to ${formData.paguthi}. Please select a valid ward.`);
      return;
    }

    setLoading(true);
    try {
      const selectedWardObj = wards.find(
        (w) => w.paguthi === formData.paguthi && String(w.wardNumber) === String(formData.wardNumber)
      );
      const payload = {
        ...formData,
        userId: user?.id || user?._id,
        status: 'New', // Initially registered complaints appear as 'New' in Admin Dashboard
        beforePhoto: uploadedImageUrl || '',
        beforeImage: uploadedImageUrl || '',
        wardId: selectedWardObj ? (selectedWardObj.id || selectedWardObj._id) : formData.wardId,
        wardNumber: String(formData.wardNumber),
        wardName: selectedWardObj?.wardName || `${formData.paguthi} Ward ${formData.wardNumber}`,
        paguthi: formData.paguthi,
        districtId: 1, // Coimbatore
        constituencyId: 6, // Kinathukadavu
      };
      const res = await api.post('/issues', payload);
      if (res.data.success) {
        notifySuccess('Complaint registered successfully! ID: ' + (res.data.data.issueCode || res.data.data.complaintId));
        setSubmittedCode(res.data.data.issueCode || res.data.data.complaintId);
        setSubmittedComplaint(res.data.data);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to register complaint');
    } finally {
      setLoading(false);
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
          <span className="text-xs font-bold text-[#FFD32A] uppercase hidden sm:inline">{t('citizen.registerComplaint', 'Register Complaint')}</span>
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E2DC] shadow-sm space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#A00000]">{t('citizen.complaintFormTitle', 'Register Citizen Grievance')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('citizen.registerComplaintDesc', 'Raise a new community issue to the Coimbatore TVK Ward Administration team.')}
            </p>
          </div>

          {submittedCode ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-emerald-900">{t('citizen.complaintSuccess', 'Grievance Registered Successfully!')}</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  {t('citizen.tokenNotice', 'Your complaint reference token has been generated. Our ward volunteer squad will inspect the issue.')}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-300 font-mono text-base font-extrabold text-red-800 tracking-wider inline-block">
                {submittedCode}
              </div>

              {/* Immediate Bilingual PDF Download Options */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* 1. Download PDF – தமிழ் */}
                <button
                  type="button"
                  onClick={() => handleDownloadSubmittedPdf('ta')}
                  disabled={Boolean(downloadingPdfLang)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#A00000] hover:bg-[#850000] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  title="Download Complaint Acknowledgement Slip in Tamil (புகார் ஒப்புகைச் சீட்டு - தமிழ்)"
                >
                  {downloadingPdfLang === 'ta' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{t('common.generatingPdf', 'PDF உருவாக்கப்படுகிறது...')}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 shrink-0 text-[#FFD32A]" />
                      <span>Download PDF – தமிழ்</span>
                    </>
                  )}
                </button>

                {/* 2. Download PDF – English */}
                <button
                  type="button"
                  onClick={() => handleDownloadSubmittedPdf('en')}
                  disabled={Boolean(downloadingPdfLang)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  title="Download Complaint Acknowledgement Slip in English"
                >
                  {downloadingPdfLang === 'en' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Generating English PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 shrink-0 text-[#FFD32A]" />
                      <span>Download PDF – English</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  to="/citizen/my-complaints"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
                >
                  {t('citizen.myComplaints', 'Track My Complaints')}
                </Link>
                <button
                  onClick={() => {
                    setSubmittedCode('');
                    setSubmittedComplaint(null);
                    setFormData({
                      title: '',
                      category: 'Drinking Water',
                      description: '',
                      citizenName: user?.name || '',
                      citizenMobile: user?.phone || '',
                      citizenAddress: user?.address || '',
                      district: 'Coimbatore',
                      constituency: 'Kinathukadavu',
                      paguthi: user?.paguthi && PAGUTHI_OPTIONS.includes(user.paguthi) ? user.paguthi : '',
                      wardNumber: '',
                      wardId: '',
                      priority: 'Medium',
                    });
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  {t('citizen.registerNewComplaint', 'Submit Another Complaint')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Geographical Hierarchy Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#A00000]" />
                  <span>Geographical Ward Jurisdiction</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. District */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">District *</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.district || 'Coimbatore'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  {/* 2. Assembly Constituency */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assembly Constituency *</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.constituency || 'Kinathukadavu'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 3. Paguthi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {PAGUTHI_LABEL} *
                    </label>
                    <select
                      value={formData.paguthi}
                      required
                      onChange={(e) => {
                        const newPaguthi = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          paguthi: newPaguthi,
                          village: '',
                          wardNumber: '',
                          wardId: '',
                        }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A00000] focus:border-[#A00000]"
                    >
                      <option value="">-- Select {PAGUTHI_LABEL} --</option>
                      {PAGUTHI_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Village - DYNAMIC BASED ON PAGUTHI */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Village {availableVillagesForPaguthi.length > 0 ? '*' : '(Optional / N/A)'}
                    </label>
                    <select
                      value={formData.village}
                      required={availableVillagesForPaguthi.length > 0}
                      disabled={!formData.paguthi || availableVillagesForPaguthi.length === 0}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          village: e.target.value,
                        }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A00000] focus:border-[#A00000] disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <option value="">
                        {!formData.paguthi
                          ? '-- Select Paguthi First --'
                          : availableVillagesForPaguthi.length === 0
                          ? '-- Not Applicable for selected Paguthi --'
                          : '-- Select Village --'}
                      </option>
                      {availableVillagesForPaguthi.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {formData.paguthi && availableVillagesForPaguthi.length > 0 && (
                      <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                        {availableVillagesForPaguthi.length} village(s) mapped to {formData.paguthi}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 5. Municipal Ward (Dynamic based on selected Paguthi) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ward Number *</label>
                    <select
                      value={formData.wardNumber}
                      disabled={!formData.paguthi}
                      onChange={(e) => {
                        const selectedWardNum = e.target.value;
                        const matchingWard = wards.find(
                          (w) => w.paguthi === formData.paguthi && String(w.wardNumber) === String(selectedWardNum)
                        );
                        setFormData((prev) => ({
                          ...prev,
                          wardNumber: selectedWardNum,
                          wardId: matchingWard ? String(matchingWard.id || matchingWard._id) : selectedWardNum,
                        }));
                      }}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#A00000] focus:border-[#A00000] disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <option value="">
                        {!formData.paguthi ? '-- Select Paguthi First --' : '-- Select Ward --'}
                      </option>
                      {getWardsForPaguthi(formData.paguthi).map((wNum) => (
                        <option key={wNum} value={String(wNum)}>
                          Ward {wNum}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 6. Complaint Category */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('citizen.complaintCategory', 'Issue Category')} *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-[#A00000]"
                    >
                      <option value="Drinking Water">Drinking Water</option>
                      <option value="Street Lighting">Street Lighting</option>
                      <option value="Road Infrastructure">Road Infrastructure</option>
                      <option value="Sanitation / Drainage">Sanitation / Drainage</option>
                      <option value="Public Health">Public Health</option>
                      <option value="Electricity / TANGEDCO">Electricity / TANGEDCO</option>
                      <option value="Public Transport">Public Transport</option>
                      <option value="Other">Other Issues</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('citizen.complaintTitle', 'Complaint Title')} *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Drinking water supply disrupted for 3 days"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-[#A00000]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('settings.nameLabel', 'Your Full Name')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.citizenName}
                    onChange={(e) => setFormData({ ...formData, citizenName: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-[#A00000]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('common.mobile', 'Contact Mobile Number')} *</label>
                  <input
                    type="tel"
                    required
                    value={formData.citizenMobile}
                    onChange={(e) => setFormData({ ...formData, citizenMobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-[#A00000]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('common.address', 'Location Details / Address')}</label>
                <input
                  type="text"
                  value={formData.citizenAddress}
                  onChange={(e) => setFormData({ ...formData, citizenAddress: e.target.value })}
                  placeholder="Street name, landmark, near bus stop..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-[#A00000]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('citizen.complaintDesc', 'Complaint Description')} *</label>
                <textarea
                  rows="4"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide complete details about the issue and its impact on residents..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-[#A00000]"
                />
              </div>

              {/* Supporting Image Upload (Optional / Recommended) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-[#A00000]" />
                    <span>Upload Supporting Image / Photo (Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Max 10MB)</span>
                </div>

                {!imagePreview ? (
                  <div>
                    <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-red-50/50 border border-slate-300 hover:border-red-400 rounded-xl font-bold text-slate-700 text-xs transition shadow-2xs">
                      <UploadCloud className="w-4 h-4 text-[#A00000]" />
                      <span>Choose Supporting Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Adding a clear photo of the ground situation helps our ward team inspect and resolve the issue faster.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Supporting Evidence Preview"
                        className="w-24 h-20 object-cover rounded-lg border border-slate-300"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{imageFile?.name || 'Selected Photo'}</p>
                      <p className="text-[10px] text-slate-400">
                        {imageFile?.size ? `${Math.round(imageFile.size / 1024)} KB` : ''}
                      </p>
                      {uploadedImageUrl ? (
                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ✓ Ready & Uploaded to Storage
                        </span>
                      ) : uploadingImage ? (
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Uploading to storage...
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1 text-slate-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#B00000] hover:bg-[#850000] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? t('citizen.submitting', 'Submitting Petition...') : t('citizen.submitComplaint', 'Submit Complaint to TVK Ward Team')}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterComplaintPage;
