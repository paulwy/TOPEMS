import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  zh: {
    translation: zhTranslation,
  },
};

// 从 localStorage 读取保存的语言设置
const savedLanguage = localStorage.getItem('language') || 'zh';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
