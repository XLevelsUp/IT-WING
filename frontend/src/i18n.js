import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import taTranslation from './locales/ta/translation.json';

const savedLang = localStorage.getItem('tvk_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ta: { translation: taTranslation },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

document.documentElement.lang = savedLang;

export const changeAppLanguage = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('tvk_language', lang);
  document.documentElement.lang = lang;
};

export default i18n;
