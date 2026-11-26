import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { changeAppLanguage } from '../../i18n';

export const LanguageSwitcher = ({ variant = 'light' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = i18n.language || 'en';

  const languages = [
    { code: 'en', label: 'English (EN)' },
    { code: 'ta', label: 'தமிழ் (TA)' },
  ];

  const handleSelect = (code) => {
    changeAppLanguage(code);
    setIsOpen(false);
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border shadow-xs ${
          isDark
            ? 'bg-black/25 hover:bg-black/40 text-white border-white/20'
            : 'bg-white hover:bg-slate-50 text-[#850000] border-[#E9E2DC] hover:border-[#A00000]'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-[#FFD32A]" />
        <span>{currentLang === 'ta' ? 'தமிழ் (TA)' : 'English (EN)'}</span>
        <ChevronDown className={`w-3 h-3 ${isDark ? 'text-white/70' : 'text-slate-500'}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-white border border-[#E9E2DC] rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {languages.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition ${
                  isSelected
                    ? 'bg-red-50 text-[#A00000] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#A00000]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
