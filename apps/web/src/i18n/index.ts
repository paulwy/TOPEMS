import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 动态导入翻译文件以优化首屏加载
const loadTranslations = async () => {
  const savedLanguage = localStorage.getItem('language') || 'zh';

  const [enTranslation, zhTranslation, enDevtools, zhDevtools] = await Promise.all([
    import('./locales/en.json').then((m) => m.default),
    import('./locales/zh.json').then((m) => m.default),
    import('./locales/en/devtools.json').then((m) => m.default),
    import('./locales/zh/devtools.json').then((m) => m.default),
  ]);

  return {
    lng: savedLanguage,
    resources: {
      en: { translation: { ...enTranslation, devtools: enDevtools.devtools } },
      zh: { translation: { ...zhTranslation, devtools: zhDevtools.devtools } },
    },
  };
};

// 初始配置使用空资源，后续动态加载完整翻译
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {} },
    zh: { translation: {} },
  },
  lng: localStorage.getItem('language') || 'zh',
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
  // 延迟加载配置
  partialBundledLanguages: true,
});

// 异步加载翻译资源
loadTranslations().then((config) => {
  i18n.addResourceBundle('en', 'translation', config.resources.en.translation, true, true);
  i18n.addResourceBundle('zh', 'translation', config.resources.zh.translation, true, true);
  i18n.changeLanguage(config.lng);
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
