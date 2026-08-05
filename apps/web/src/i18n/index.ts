import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 静态导入 schema 翻译 — schema 模块在导入时即调用 i18n.t()，需要同步可用
import schemaZh from './locales/zh/schema.json';
import schemaEn from './locales/en/schema.json';

// 动态导入翻译文件以优化首屏加载
const loadTranslations = async () => {
  const savedLanguage = localStorage.getItem('language') || 'zh';

  const [
    enTranslation,
    zhTranslation,
    enDevtools,
    zhDevtools,
    enAi,
    zhAi,
    enMonitor,
    zhMonitor,
    enAdmin,
    zhAdmin,
    enErp,
    zhErp,
    enFinance,
    zhFinance,
    enCrm,
    zhCrm,
  ] = await Promise.all([
    import('./locales/en.json').then((m) => m.default),
    import('./locales/zh.json').then((m) => m.default),
    import('./locales/en/devtools.json').then((m) => m.default),
    import('./locales/zh/devtools.json').then((m) => m.default),
    import('./locales/en/ai.json').then((m) => m.default),
    import('./locales/zh/ai.json').then((m) => m.default),
    import('./locales/en/monitor.json').then((m) => m.default),
    import('./locales/zh/monitor.json').then((m) => m.default),
    import('./locales/en/admin.json').then((m) => m.default),
    import('./locales/zh/admin.json').then((m) => m.default),
    import('./locales/en/erp.json').then((m) => m.default),
    import('./locales/zh/erp.json').then((m) => m.default),
    import('./locales/en/finance.json').then((m) => m.default),
    import('./locales/zh/finance.json').then((m) => m.default),
    import('./locales/en/crm.json').then((m) => m.default),
    import('./locales/zh/crm.json').then((m) => m.default),
  ]);

  return {
    lng: savedLanguage,
    resources: {
      en: {
        translation: {
          ...enTranslation,
          devtools: enDevtools.devtools,
          ...enAi,
          ...enMonitor,
          ...(((enAdmin as Record<string, unknown>).admin as Record<string, string> | undefined) ||
            {}),
          ...enCrm,
        },
        erp: enErp,
        finance: enFinance,
      },
      zh: {
        translation: {
          ...zhTranslation,
          devtools: zhDevtools.devtools,
          ...zhAi,
          ...zhMonitor,
          ...(((zhAdmin as Record<string, unknown>).admin as Record<string, string> | undefined) ||
            {}),
          ...zhCrm,
        },
        erp: zhErp,
        finance: zhFinance,
      },
    },
  };
};

// 初始配置：schema namespace 静态加载，其余动态加载
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {}, erp: {}, finance: {}, schema: schemaEn },
    zh: { translation: {}, erp: {}, finance: {}, schema: schemaZh },
  },
  lng: localStorage.getItem('language') || 'zh',
  fallbackLng: 'zh',
  defaultNS: 'translation',
  ns: ['translation', 'erp', 'finance', 'schema'],
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
  i18n.addResourceBundle('en', 'erp', config.resources.en.erp, true, true);
  i18n.addResourceBundle('zh', 'erp', config.resources.zh.erp, true, true);
  i18n.addResourceBundle('en', 'finance', config.resources.en.finance, true, true);
  i18n.addResourceBundle('zh', 'finance', config.resources.zh.finance, true, true);
  i18n.changeLanguage(config.lng);
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
