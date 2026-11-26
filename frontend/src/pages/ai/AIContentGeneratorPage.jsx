import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Save,
  Trash2,
  FileText,
  Languages,
  Clock,
  ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';

export const AIContentGeneratorPage = () => {
  const { t } = useTranslation();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [contentType, setContentType] = useState('Press Release');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Tamil');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedContents, setSavedContents] = useState([]);
  const [saving, setSaving] = useState(false);

  const contentTypes = [
    'Press Release',
    'Social Media Post',
    'Public Notice',
    'Meeting Speech',
    'Official Letter',
    'Grievance Resolution Notice',
  ];

  const fetchSaved = async () => {
    try {
      const res = await api.get('/ai-content/saved');
      if (res.data.success) {
        setSavedContents(res.data.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      notifyError('Please enter a topic for AI generation');
      return;
    }

    setGenerating(true);
    setCopied(false);
    try {
      const res = await api.post('/ai-content/generate', {
        contentType,
        topic,
        language,
        promptDescription: description,
      });

      if (res.data.success) {
        setGeneratedResult(res.data.data.content);
        notifySuccess('AI statement generated successfully!');
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to generate AI content');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    notifySuccess('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async () => {
    if (!generatedResult) return;
    setSaving(true);
    try {
      const res = await api.post('/ai-content/save', {
        title: `${contentType} - ${topic}`,
        contentType,
        language,
        topic,
        promptDescription: description,
        generatedContent: generatedResult,
      });

      if (res.data.success) {
        notifySuccess('Saved to Generated Communications archive!');
        fetchSaved();
      }
    } catch (err) {
      notifyError('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      const res = await api.delete(`/ai-content/${id}`);
      if (res.data.success) {
        notifySuccess('Archive item removed');
        fetchSaved();
      }
    } catch (err) {
      notifyError('Failed to delete item');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <AdminPageHeader
        badge={t('aiContent.headerBadge', 'AI Governance Intelligence Studio')}
        badgeIcon={Sparkles}
        title={t('aiContent.title', 'AI Content Generator')}
        tamilTitle="செயற்கை நுண்ணறிவு உள்ளடக்க ஆக்கி"
        subtitle={t('aiContent.subtitle', 'Draft authoritative press releases, party speeches, citizen notices, and official communications in formal Tamil and English.')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">{t('aiContent.configTitle', 'Generation Parameters')}</h2>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('aiContent.contentTypeLabel', 'Content Type')}</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-red-700"
              >
                {contentTypes.map((typeKey) => (
                  <option key={typeKey} value={typeKey}>
                    {t(`aiContent.types.${typeKey}`, typeKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('aiContent.languageLabel', 'Language')}</label>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                {['Tamil', 'English', 'Bilingual'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={`py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold border transition text-center ${
                      language === l
                        ? 'bg-red-700 text-white border-red-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {l === 'Tamil' ? 'தமிழ் (Tamil)' : l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('aiContent.topicLabel', 'Topic / Key Subject *')}</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('aiContent.topicPlaceholder', 'e.g. Siruvani Water Supply Redressal in R.S. Puram')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t('aiContent.descriptionLabel', 'Context & Directives (Optional)')}
              </label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('aiContent.descriptionPlaceholder', 'Key points, assurances, instructions to ward cadres or government departments...')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-red-700"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>{t('aiContent.generatingBtn', 'Synthesizing Communication...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t('aiContent.generateBtn', 'Generate AI Content')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Preview & Action Container (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('aiContent.outputTitle', 'Generated Communiqué Preview')}</h2>
                <p className="text-xs text-slate-400">
                  {contentType} • {t('aiContent.languageLabel', 'Language')}: {language}
                </p>
              </div>

              {generatedResult && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    <span>{copied ? t('aiContent.copiedBtn', 'Copied') : t('aiContent.copyBtn', 'Copy')}</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    <span>{saving ? t('aiContent.savingBtn', 'Saving...') : t('aiContent.saveBtn', 'Save')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Output Box */}
            <div className="mt-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200 min-h-[300px] text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
              {generating ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-red-700" />
                  <p className="font-semibold text-xs text-slate-600">{t('aiContent.generatingBtn', 'Drafting official communication...')}</p>
                </div>
              ) : generatedResult ? (
                generatedResult
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-6">
                  <Sparkles className="w-10 h-10 text-amber-400 mb-2" />
                  <p className="font-bold text-slate-600">{t('aiContent.outputPlaceholder', 'AI Assistant Ready')}</p>
                  <p className="text-slate-400 text-[11px] max-w-sm mt-1">
                    Select a content type, enter your topic, and click "Generate AI Content" to produce official Tamil or English releases.
                  </p>
                </div>
              )}
            </div>
          </div>

          {generatedResult && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Word Count: ~{generatedResult.split(/\s+/).length} words</span>
              <button
                onClick={handleGenerate}
                className="text-red-700 font-bold hover:underline flex items-center"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                {t('aiContent.generateBtn', 'Regenerate Variant')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Archive */}
      {savedContents.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">{t('aiContent.savedStatementsTitle', 'Saved Communications Archive')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedContents.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {item.contentType}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.language}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-3">{item.generatedContent}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setGeneratedResult(item.generatedContent);
                      setContentType(item.contentType);
                      setTopic(item.topic);
                      setLanguage(item.language);
                    }}
                    className="text-red-700 font-bold hover:underline text-[11px]"
                  >
                    Load into Editor
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(item._id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContentGeneratorPage;
