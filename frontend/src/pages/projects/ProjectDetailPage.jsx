import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Award, MapPin, Building, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { getSafeImageUrl } from '../../utils/imageUtils';

export const ProjectDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProj = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/projects/${id}`);
        if (res.data.success) {
          setProject(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProj();
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen text={t('projects.loadingText', 'Loading Project Information...')} />;
  if (!project) return <p className="text-center py-12 text-slate-500">{t('common.noRecords', 'Project not found.')}</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <button
        onClick={() => navigate('/admin/projects')}
        className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-[#A00000] transition space-x-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-[#A00000]" />
        <span>{t('projects.title', 'Back to Achievements & Projects')}</span>
      </button>

      {/* Project Header Banner */}
      <AdminPageHeader
        badge={`${t('projects.headerBadge', 'Infrastructure Project')} • ${project.projectCode}`}
        badgeIcon={Award}
        title={project.title}
        subtitle={`${project.category} • ${t('projects.locationLabel', 'Location')}: ${project.location} • ${t('common.date', 'Started')}: ${new Date(project.startDate || project.createdAt).toLocaleDateString()}`}
        stats={[
          { label: 'Project Code', value: project.projectCode, highlight: true },
          { label: t('common.status', 'Status'), value: project.status ? t(`status.${project.status}`, project.status) : '', highlight: true },
          { label: t('projects.progressLabel', 'Completion'), value: `${project.progressPercentage}%`, highlight: true },
          { label: t('projects.budgetLabel', 'Budget Allocated'), value: project.budget || 'Sanctioned' },
        ]}
      />

      {/* Main Project Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
              {project.projectCode}
            </span>
            <StatusBadge status={project.status} />
          </div>
          <span className="text-xs text-slate-400">
            {t('common.date', 'Started')}: {new Date(project.startDate || project.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{project.title}</h1>
          <p className="text-xs font-semibold text-amber-700 mt-1">{project.category}</p>
        </div>

        {/* Project Image */}
        {project.imageUrl && (
          <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
            <img
              src={getSafeImageUrl(project.imageUrl)}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Progress Bar Large */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">{t('projects.progressLabel', 'Project Completion Status')}</span>
            <span className="text-red-700 text-sm">{project.progressPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-700 via-amber-500 to-emerald-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('projects.locationLabel', 'Location')}</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{project.location}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('projects.departmentLabel', 'Executing Department')}</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{project.department}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">{t('projects.budgetLabel', 'Budget Allocated')}</span>
            <p className="font-bold text-emerald-700 text-sm mt-0.5">
              {project.budget > 0 ? `₹${(project.budget / 10000000).toFixed(2)} Cr` : 'Municipal Fund'}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">{t('projects.descriptionRequired', 'Scope & Objectives')}</h3>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {project.description}
          </p>
        </div>

        {project.highlights && project.highlights.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Key Highlights & Impact</h3>
            <ul className="space-y-2 text-xs">
              {project.highlights.map((h, i) => (
                <li key={i} className="flex items-center text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
