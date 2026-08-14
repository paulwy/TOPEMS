import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 静态导入 schema 翻译 — schema 模块在导入时即调用 i18n.t()，需要同步可用
import schemaZh from './locales/zh/schema.json';
import schemaEn from './locales/en/schema.json';

/**
 * 全部命名空间列表（37 个）
 *
 * 每个命名空间对应 locales/{en,zh}/{ns}.json 文件。
 * schema 命名空间静态导入（同步），其余动态导入（异步）。
 */
const ALL_NAMESPACES = [
  'admin',
  'ai',
  'asset',
  'bi',
  'crm',
  'devtools',
  'doc',
  'ehs',
  'erp',
  'finance',
  'gis',
  'help',
  'hrm',
  'iam',
  'im',
  'integration',
  'lims',
  'lowcode',
  'mes',
  'mobile',
  'monitor',
  'notification',
  'oa',
  'pdm',
  'performance',
  'plugin',
  'pm',
  'qms',
  'rd',
  'report',
  'shared',
  'scm',
  'srm',
  'system',
  'ticket',
  'wms',
  'workflow',
] as const;

/** 需要动态导入的命名空间（排除 schema，因为已静态导入） */
const DYNAMIC_NAMESPACES = ALL_NAMESPACES.filter((ns) => ns !== 'schema' as any);

/**
 * 更新文档语言方向（LTR/RTL）
 */
function updateDocumentDirection(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' || lng === 'he' || lng === 'fa' ? 'rtl' : 'ltr';
}

/** 动态导入单个命名空间的两种语言 */
async function loadNamespace(ns: string): Promise<{ en: unknown; zh: unknown }> {
  const [enMod, zhMod] = await Promise.all([
    import(`./locales/en/${ns}.json`).then((m) => m.default).catch(() => ({})),
    import(`./locales/zh/${ns}.json`).then((m) => m.default).catch(() => ({})),
  ]);
  return { en: enMod, zh: zhMod };
}

/**
 * 异步加载全部翻译资源
 */
async function loadAllTranslations(): Promise<void> {
  const savedLanguage = localStorage.getItem('language') || 'zh';

  // 并行加载主翻译文件 + 全部命名空间
  const [enTranslation, zhTranslation, ...namespaceResults] = await Promise.all([
    import('./locales/en.json').then((m) => m.default),
    import('./locales/zh.json').then((m) => m.default),
    ...DYNAMIC_NAMESPACES.map((ns) => loadNamespace(ns)),
  ]);

  // 注册主翻译
  i18n.addResourceBundle('en', 'translation', enTranslation, true, true);
  i18n.addResourceBundle('zh', 'translation', zhTranslation, true, true);

  // 注册各命名空间
  DYNAMIC_NAMESPACES.forEach((ns, idx) => {
    const { en, zh } = namespaceResults[idx];
    const enData = en as Record<string, unknown>;
    const zhData = zh as Record<string, unknown>;

    // 某些命名空间文件的结构是 { ns: { ... } }，需要解包
    const enContent = (enData[ns] as Record<string, unknown>) || enData;
    const zhContent = (zhData[ns] as Record<string, unknown>) || zhData;

    if (Object.keys(enContent).length > 0) {
      i18n.addResourceBundle('en', ns, enContent, true, true);
    }
    if (Object.keys(zhContent).length > 0) {
      i18n.addResourceBundle('zh', ns, zhContent, true, true);
    }
  });

  i18n.changeLanguage(savedLanguage);
  updateDocumentDirection(savedLanguage);
}

// 初始配置：schema namespace 静态加载，其余动态加载
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {}, schema: schemaEn },
    zh: { translation: {}, schema: schemaZh },
  },
  lng: localStorage.getItem('language') || 'zh',
  fallbackLng: 'zh',
  defaultNS: 'translation',
  ns: ['translation', 'schema', ...DYNAMIC_NAMESPACES],
  interpolation: {
    escapeValue: false,
  },
  partialBundledLanguages: true,
});

// 语言切换时更新文档方向
i18n.on('languageChanged', (lng: string) => {
  updateDocumentDirection(lng);
});

// 异步加载全部翻译资源
loadAllTranslations();

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
