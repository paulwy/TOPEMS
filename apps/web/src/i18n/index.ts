import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import schemaZh from './locales/zh/schema.json';
import schemaEn from './locales/en/schema.json';

/**
 * 将扁平 key（含点号）转换为嵌套对象结构。
 *
 * 例如：{ "shared.config.k23": "统一身份管理" }
 *   → { shared: { config: { k23: "统一身份管理" } } }
 *
 * i18next 使用点号作为嵌套分隔符，但 JSON 文件中的 key 是扁平格式，
 * 需要在运行时转换为嵌套结构才能被正确查找。
 */
function flattenToNested(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedValue = flattenToNested(value as Record<string, unknown>);
      result[key] = nestedValue;
      continue;
    }
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * 深度合并两个翻译对象。
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 使用 import.meta.glob 一次性加载所有 JSON 文件。
 * 注意: eager 返回的是 module { default: ... }, 需取 .default 才能拿到 JSON 数据。
 */
const zhModuleMap = import.meta.glob('./locales/zh/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const enModuleMap = import.meta.glob('./locales/en/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const zhRootMap = import.meta.glob('./locales/zh.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const enRootMap = import.meta.glob('./locales/en.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const ALL_NAMESPACES = Object.keys(zhModuleMap)
  .map((path) => path.replace('./locales/zh/', '').replace('.json', ''))
  .filter((ns) => ns !== 'schema');

function updateDocumentDirection(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' || lng === 'he' || lng === 'fa' ? 'rtl' : 'ltr';
}

/**
 * 将单个命名空间的扁平化数据合并到累计翻译中。
 * - 跳过属于其他已知命名空间的 key（由对应命名空间文件处理）
 * - 绝不允许原始值（字符串等）覆盖已有的对象值
 */
function mergeNamespaceData(
  target: Record<string, unknown>,
  nested: Record<string, unknown>,
  currentNs: string,
  knownNamespaces: Set<string>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(nested)) {
    if (key !== currentNs && knownNamespaces.has(key)) continue;

    const existing = target[key];
    const existingIsObject = typeof existing === 'object' && existing !== null && !Array.isArray(existing);
    const valueIsObject = typeof value === 'object' && value !== null && !Array.isArray(value);

    if (existingIsObject && !valueIsObject) {
      continue;
    }

    if (existingIsObject && valueIsObject) {
      target[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}

/**
 * 同步构建全部翻译数据（使用 eager import.meta.glob，无需异步加载）。
 */
function buildAllTranslations(): { zh: Record<string, unknown>; en: Record<string, unknown> } {
  const mainZh = zhRootMap['./locales/zh.json']?.default || {};
  const mainEn = enRootMap['./locales/en.json']?.default || {};

  let mergedZh = flattenToNested(mainZh);
  let mergedEn = flattenToNested(mainEn);

  const knownNamespaces = new Set(ALL_NAMESPACES);

  ALL_NAMESPACES.forEach((ns) => {
    const zhPath = `./locales/zh/${ns}.json`;
    const enPath = `./locales/en/${ns}.json`;

    const zhData = zhModuleMap[zhPath]?.default;
    const enData = enModuleMap[enPath]?.default;

    if (zhData && Object.keys(zhData).length > 0) {
      const nested = flattenToNested(zhData);
      mergedZh = mergeNamespaceData(mergedZh, nested, ns, knownNamespaces);
    }

    if (enData && Object.keys(enData).length > 0) {
      const nested = flattenToNested(enData);
      mergedEn = mergeNamespaceData(mergedEn, nested, ns, knownNamespaces);
    }
  });

  return { zh: mergedZh, en: mergedEn };
}

const { zh: mergedZh, en: mergedEn } = buildAllTranslations();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: mergedEn, schema: schemaEn },
    zh: { translation: mergedZh, schema: schemaZh },
  },
  lng: localStorage.getItem('language') || 'zh',
  fallbackLng: 'zh',
  defaultNS: 'translation',
  ns: ['translation', 'schema'],
  interpolation: {
    escapeValue: false,
  },
  partialBundledLanguages: true,
});

i18n.on('languageChanged', (lng: string) => {
  updateDocumentDirection(lng);
});

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
