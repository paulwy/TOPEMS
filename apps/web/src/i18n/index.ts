import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// schema JSON 体积小（~数十 KB），保持 eager 静态导入
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
 *
 * 注意：同一顶层 key 可能同时以嵌套对象和点号分隔扁平 key 出现，
 * 需要深度合并而非覆盖（例如 shared.json 末尾的 `"shared": {"config": ...}`
 * 会覆盖前面 `"shared.header_logo.k0"` 等构建的 shared 对象）。
 */
function flattenToNested(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedValue = flattenToNested(value as Record<string, unknown>);
      // 深度合并，避免覆盖已有的同名顶层 key
      if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          nestedValue
        );
      } else {
        result[key] = nestedValue;
      }
      continue;
    }
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (
        typeof current[part] !== 'object' ||
        current[part] === null ||
        Array.isArray(current[part])
      ) {
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
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
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
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── import.meta.glob 按命名空间拆分的懒加载 import 函数 ────────
// Vite 会为 "每个语言 × 每个命名空间的 JSON" 生成独立异步 chunk。
const moduleMaps: Record<
  'zh' | 'en',
  Record<string, () => Promise<{ default: Record<string, unknown> }>>
> = {
  zh: import.meta.glob('./locales/zh/*.json') as Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
  en: import.meta.glob('./locales/en/*.json') as Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
};
const rootMaps: Record<
  'zh' | 'en',
  Record<string, () => Promise<{ default: Record<string, unknown> }>>
> = {
  zh: import.meta.glob('./locales/zh.json') as Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
  en: import.meta.glob('./locales/en.json') as Record<
    string,
    () => Promise<{ default: Record<string, unknown> }>
  >,
};

const ALL_NAMESPACES = Object.keys(moduleMaps.zh)
  .map((path) => path.replace('./locales/zh/', '').replace('.json', ''))
  .filter((ns) => ns !== 'schema');

/**
 * ✨ 命名空间分层策略（决定加载时机与 chunk 切分粒度）
 *
 *  - BOOTSTRAP（首屏必需）：启动/切换语言时立即随语言根 JSON 一起加载
 *    → 保证主框架（导航、按钮、公共错误、面包屑、模块配置名）无 fallback 闪烁
 *  - FRAMEWORK（框架通用）：组件、模板、通知等跨模块复用命名空间
 *    → 进入任意模块页前按需批量预加载，避免重复声明
 *  - BUSINESS（业务模块）：每个模块专属命名空间
 *    → 进入对应路由时触发加载（由 useRouteNamespacePreload 完成）
 *
 *  注：未被下面集合明确归类的命名空间（如 ticket/rd 等）默认走 BUSINESS
 *      按需加载路径，依然可以被 ensureNamespacesLoaded() 直接加载。
 */
export const BOOTSTRAP_NAMESPACES: readonly string[] = Object.freeze([
  'shared', // shared.config / shared.error_handler / shared.format / shared.data_export ...
  'validation', // 表单字段校验提示（任何带表单的页面都会用）
  'auth', // 登录/SSO/未授权相关文案
  'routes', // 导航标签 / 面包屑显示名（侧边栏和顶栏）
  'layouts', // 主框架布局（header/sidebar/footer 等）
  'config', // 模块域名、套件分组等配置层展示名称
  'pages', // 页面级公共词汇（Dashboard、Profile 等首页必需）
  'components', // 全局通用组件（搜索框、表格、卡片等首页必需）
  'templates', // CRUD/Dashboard/List 模板组件
  'schemas', // schema 层翻译（表单字段标签等）
  'services', // 服务层公共文案
]);

const FRAMEWORK_NAMESPACES: readonly string[] = Object.freeze([
  'common', // → 该部分当前实际位于 zh.json/en.json 根（common.save/cancel）
  'system', // system 参数设置、日志等平台功能
  'store', // 状态相关消息
  'lib', // 内部库
  'utils', // 通用工具提示
  'notification', // 通知中心
  'monitor', // 监控告警
  'integration', // 集成中心
  'im', // 即时消息
  'mobile', // 移动端相关
  'plugin', // 插件市场
  'performance', // 性能监控
  'hooks', // hooks 消息
  'context', // 上下文
  'theme', // 主题相关
  'help', // 帮助中心
  'api', // API 配置/调试面板
  'aps', // APS 组件
  'asset', // 资产组件
  'devtools', // 开发者工具
  'debug', // 调试面板
  'design_system', // 设计系统组件
  'dev_platform', // 开发平台
  'fullstack_automation', // 全栈自动化
  'intelligent_ops', // 智能运维
  'lowcode', // 低代码
  'automation', // 自动化
  'microfrontend', // 微前端
  'oa', // OA 办公基础
]);

const BUSINESS_MODULE_NAMESPACES: readonly string[] = Object.freeze([
  'iam',
  'admin',
  'crm',
  'erp',
  'wms',
  'mes',
  'hrm',
  'finance',
  'lims',
  'pdm',
  'pm',
  'qms',
  'ehs',
  'tms',
  'scm',
  'srm',
  'doc',
  'bi',
  'report',
  'ai',
  'workflow',
  'gis',
  'ticket',
  'rd',
]);

const BOOTSTRAP_SET = new Set(BOOTSTRAP_NAMESPACES);
const FRAMEWORK_SET = new Set(FRAMEWORK_NAMESPACES);
const BUSINESS_SET = new Set(BUSINESS_MODULE_NAMESPACES);

type NamespaceTier = 'bootstrap' | 'framework' | 'business' | 'unknown';
function classifyNamespaceTier(ns: string): NamespaceTier {
  if (BOOTSTRAP_SET.has(ns)) return 'bootstrap';
  if (FRAMEWORK_SET.has(ns)) return 'framework';
  if (BUSINESS_SET.has(ns)) return 'business';
  return 'unknown';
}

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
  knownNamespaces: Set<string>
): Record<string, unknown> {
  for (const [key, value] of Object.entries(nested)) {
    // Skip keys that belong to OTHER known namespaces (only for explicit NS files, not root)
    // Reason: root JSON contains the "base" translations (common.save, shared.config.*, etc.)
    // that MUST be loaded; skipping them breaks i18n for all components.
    if (currentNs !== '__root__' && key !== currentNs && knownNamespaces.has(key)) continue;

    const existing = target[key];
    const existingIsObject =
      typeof existing === 'object' && existing !== null && !Array.isArray(existing);
    const valueIsObject = typeof value === 'object' && value !== null && !Array.isArray(value);

    if (existingIsObject && !valueIsObject) {
      continue;
    }

    if (existingIsObject && valueIsObject) {
      target[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}

// ─── 单文件加载：根 JSON ──────────────────────────────────────────────
async function loadRootJson(lang: 'zh' | 'en'): Promise<Record<string, unknown>> {
  const key = `./locales/${lang}.json`;
  const rootMap = rootMaps[lang];
  const modFn = rootMap[key];
  if (!modFn) return {};
  const mod = await modFn();
  return flattenToNested(mod.default || {});
}

// ─── 单文件加载：单个命名空间 JSON ───────────────────────────────────
async function loadNamespaceJsonFile(
  lang: 'zh' | 'en',
  ns: string
): Promise<Record<string, unknown>> {
  if (ns === 'schema') {
    // schema 是 eager 静态 import，不走 glob 路径
    return lang === 'zh'
      ? (schemaZh as Record<string, unknown>)
      : (schemaEn as Record<string, unknown>);
  }
  const moduleMap = moduleMaps[lang];
  const path = `./locales/${lang}/${ns}.json`;
  const modFn = moduleMap[path];
  if (!modFn) return {};
  const mod = await modFn();
  return flattenToNested(mod.default || {});
}

/**
 * 将单个命名空间的资源"就地"合并到 i18n 实例（使用 translation 主 NS）。
 * 直接使用 addResourceBundle 的深度合并，避免 read-modify-write 竞态。
 */
function installNamespaceResources(
  lang: string,
  rootOrNsObject: Record<string, unknown>,
  nsHint: string
): void {
  const knownNamespaces = new Set(ALL_NAMESPACES);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rootOrNsObject)) {
    if (nsHint !== '__root__' && key !== nsHint && knownNamespaces.has(key)) continue;
    filtered[key] = value;
  }
  i18n.addResourceBundle(lang, 'translation', filtered, true, true);
  if (nsHint !== '__root__') {
    const nsData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filtered)) {
      if (key === nsHint && typeof value === 'object' && value !== null) {
        Object.assign(nsData, value as Record<string, unknown>);
        nsData[key] = value;
      } else {
        nsData[key] = value;
      }
    }
    i18n.addResourceBundle(lang, nsHint, nsData, true, true);
    i18n.emit('loaded', { ns: nsHint });
  }
  i18n.emit('resourcesAdded');
  i18n.emit('loaded', { ns: 'translation' });
}

// ─── 命名空间加载状态追踪：单飞 Map + 已加载 Set ───────────────────────
// Key = `${lang}:${ns}`
const loadedNsKey = new Set<string>();
const nsLoadingPromises = new Map<string, Promise<void>>();

/**
 * 内部：加载 1 个命名空间（根 zh.json/en.json 视为 ns='__root__'）
 * 已加载：noop；加载中：等待；否则：启动 import 并合并。
 */
async function _ensureNsInstalled(lang: 'zh' | 'en', ns: string): Promise<void> {
  const key = `${lang}:${ns}`;
  if (loadedNsKey.has(key)) return;
  const existing = nsLoadingPromises.get(key);
  if (existing) {
    await existing;
    return;
  }
  const p = (async () => {
    if (ns === '__root__') {
      const obj = await loadRootJson(lang);
      installNamespaceResources(lang, obj, '__root__');
    } else {
      const obj = await loadNamespaceJsonFile(lang, ns);
      installNamespaceResources(lang, obj, ns);
    }
    loadedNsKey.add(key);
  })();
  nsLoadingPromises.set(key, p);
  try {
    await p;
  } finally {
    nsLoadingPromises.delete(key);
  }
}

// ─── 语言级 bootstrap 状态（兼容 ensureLanguageLoaded 原语义） ───────
const langBootstrapped = new Set<string>();
const langBootstrapPromises = new Map<string, Promise<void>>();

/**
 * ✅ 对外主 API（1）：按语言“初始化骨架”。
 *
 *  加载范围 = Root JSON + BOOTSTRAP_NAMESPACES（不再一次性加载全部 30+ NS）。
 *  用于：
 *   - 初始语言启动（i18nReady）
 *   - 切换语言时先加载骨架，避免主界面出现 fallback key 闪烁
 *   - idle 空闲预加载其他语言骨架
 */
export async function ensureLanguageLoaded(lng: string): Promise<void> {
  if (langBootstrapped.has(lng)) return;
  const existing = langBootstrapPromises.get(lng);
  if (existing) {
    await existing;
    return;
  }
  const p = (async () => {
    const lang = (lng === 'en' ? 'en' : 'zh') as 'zh' | 'en';
    // schema 命名空间：eager 已加载，直接 addResourceBundle（幂等）
    const schema = lang === 'zh' ? schemaZh : schemaEn;
    i18n.addResourceBundle(lang, 'schema', schema, true, true);
    // 串行加载所有命名空间（避免并行 read-modify-write 竞态）
    // 顺序：根 JSON → BOOTSTRAP 命名空间
    const allNss = ['__root__', ...BOOTSTRAP_NAMESPACES];
    for (const ns of allNss) {
      await _ensureNsInstalled(lang, ns);
    }
    langBootstrapped.add(lang);
  })();
  langBootstrapPromises.set(lng, p);
  try {
    await p;
  } finally {
    langBootstrapPromises.delete(lng);
  }
}

/**
 * ✅ 对外主 API（2）：按需加载任意命名空间列表（按当前语言 / 指定语言）。
 *
 *  核心特性：
 *   - 自动去重 + 单飞 Promise（并发调用同 (lang,ns) 共享同一 fetch）
 *   - 幂等：同一命名空间已安装则 no-op
 *   - 未传 lang 默认取 i18n.language（最常用场景）
 *
 *  典型调用场景：
 *   - useRouteNamespacePreload() 自动按路由预加载
 *   - 页面组件：在 useEffect 中 await ensureNamespacesLoaded(['crm'])
 *   - 模块配置加载器中在渲染前批量预取
 */
export async function ensureNamespacesLoaded(
  namespaces: string | readonly string[],
  opts?: { lang?: string }
): Promise<void> {
  const langRaw = opts?.lang ?? i18n.language ?? 'zh';
  const lang = (langRaw.startsWith('en') ? 'en' : 'zh') as 'zh' | 'en';
  const arr = typeof namespaces === 'string' ? [namespaces] : namespaces;
  if (!arr || arr.length === 0) return;
  // 串行加载（避免并行 read-modify-write 竞态）
  for (const ns of arr) {
    await _ensureNsInstalled(lang, ns);
  }
}

/**
 * 加载一整套语言的全部命名空间（含 business + framework，通常用于空闲
 * 时批量预热其他语言，或在“下载离线包”时一次性拉满）。
 */
export async function preloadFullLanguagePack(lng: string): Promise<void> {
  const lang = (lng === 'en' ? 'en' : 'zh') as 'zh' | 'en';
  await ensureLanguageLoaded(lang);
  // 其余所有非 bootstrap NS 顺序加载（节流，避免网络并发过多）
  const rest = ALL_NAMESPACES.filter((ns) => !BOOTSTRAP_SET.has(ns));
  for (const ns of rest) {
    await _ensureNsInstalled(lang, ns);
  }
}

// ─── URL segment → 对应业务命名空间 映射 ─────────────────────────────
// 用于 useRouteNamespacePreload() 从 pathname 推断应预载的业务 NS。
const SEGMENT_TO_NS: Readonly<Record<string, string>> = Object.freeze({
  iam: 'iam',
  admin: 'admin',
  system: 'system',
  audit: 'admin',
  dictionary: 'admin',
  tenant: 'admin',
  aps: 'aps',
  asset: 'asset',
  crm: 'crm',
  customer: 'crm',
  opportunity: 'crm',
  interaction: 'crm',
  lead: 'crm',
  segmentation: 'crm',
  sales: 'crm',
  erp: 'erp',
  purchase: 'erp',
  supplier: 'erp',
  finance: 'finance',
  accounting: 'finance',
  voucher: 'finance',
  budget: 'finance',
  wms: 'wms',
  warehouse: 'wms',
  inventory: 'wms',
  inbound: 'wms',
  outbound: 'wms',
  mes: 'mes',
  production: 'mes',
  workstation: 'mes',
  workcenter: 'mes',
  hrm: 'hrm',
  employee: 'hrm',
  department: 'hrm',
  attendance: 'hrm',
  payroll: 'hrm',
  lims: 'lims',
  sample: 'lims',
  inspection: 'lims',
  instrument: 'lims',
  pdm: 'pdm',
  bom: 'pdm',
  product: 'pdm',
  version: 'pdm',
  pm: 'pm',
  project: 'pm',
  task: 'pm',
  milestone: 'pm',
  qms: 'qms',
  quality: 'qms',
  spc: 'qms',
  fmea: 'qms',
  ehs: 'ehs',
  safety: 'ehs',
  hazard: 'ehs',
  incident: 'ehs',
  tms: 'tms',
  shipment: 'tms',
  transport: 'tms',
  vehicle: 'tms',
  scm: 'scm',
  mrp: 'scm',
  srm: 'srm',
  bidding: 'srm',
  bid: 'srm',
  doc: 'doc',
  document: 'doc',
  bi: 'bi',
  dashboard: 'bi',
  report: 'report',
  ai: 'ai',
  chat: 'ai',
  workflow: 'workflow',
  approval: 'workflow',
  gis: 'gis',
  map: 'gis',
  monitor: 'monitor',
  log: 'monitor',
  alert: 'monitor',
  notification: 'notification',
  im: 'im',
  chat_message: 'im',
  integration: 'integration',
  plugin: 'plugin',
  marketplace: 'plugin',
  mobile: 'mobile',
  report_viewer: 'report',
  lowcode: 'lowcode',
  automation: 'automation',
  settings: 'config',
  profile: 'common',
  tickets: 'ticket',
  ticket: 'ticket',
  rd: 'rd',
  oa: 'oa',
  desktop: 'desktop',
  audit_log: 'admin',
});

/**
 * 由路由 pathname 推断需要预加载的命名空间集合（去重）。
 *   例：/wms/inbound/detail/123 → ['wms', 'components', 'templates']
 */
export function resolveNamespacesForPath(pathname: string): string[] {
  const result = new Set<string>();
  if (!pathname) return [];

  // 1. 逐段尝试匹配 SEGMENT_TO_NS
  const segments = pathname.split('/').filter(Boolean);
  for (const seg of segments) {
    if (!seg) continue;
    if (/^[:?]/.test(seg)) continue; // 跳过通配段
    const clean = seg.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (!clean) continue;
    const mapped = SEGMENT_TO_NS[clean];
    if (mapped) result.add(mapped);
  }

  // 2. 所有业务页面一般都依赖 components/templates/schemas/framework 层
  //    → 轻量批量；如果已加载会立即 no-op
  const commonFramework = ['components', 'templates', 'schemas', 'services', 'pages'];
  for (const ns of commonFramework) result.add(ns);

  return Array.from(result);
}

// 必须在 pickInitialLanguage() 之前声明，避免 TS2448/TS2454 声明顺序错误
export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', flag: 'CN' },
  { code: 'en', name: 'English', flag: 'US' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * 安全地获取浏览器可接受语言代码集合。
 */
function _navigatorLanguageCodes(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  const primary = typeof navigator.language === 'string' ? [navigator.language] : [];
  const list =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? Array.from(navigator.languages)
      : primary;
  return list.map((x) => x.toLowerCase());
}

/**
 * 选择初始语言。
 */
function pickInitialLanguage(): LanguageCode {
  const validCodes = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null;
  if (stored !== null && validCodes.has(stored as LanguageCode)) {
    return stored as LanguageCode;
  }

  const navCodes = _navigatorLanguageCodes();
  if (navCodes.some((code) => code.startsWith('zh'))) {
    return 'zh';
  }

  return 'zh';
}

const initialLanguage = pickInitialLanguage();
if (typeof localStorage !== 'undefined') {
  const current = localStorage.getItem('language');
  const validCodes = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));
  if (current === null || !validCodes.has(current)) {
    try {
      localStorage.setItem('language', initialLanguage);
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
}

// ─── i18n 初始化 ────────────────────────────────────────────────────────
// 仅注入 schema（小体积 eager），主 NS 只放占位。资源通过 ensureLanguageLoaded /
// ensureNamespacesLoaded 按层次注入。partialBundledLanguages 允许 key 回退。
// 注：不挂载 i18next-http-backend 插件 — 所有异步加载逻辑由我们自定义的
//     _ensureNsInstalled 驱动，保证幂等、单飞、合并逻辑与 glob chunk 对齐。
i18n.use(initReactI18next).init({
  resources: {
    zh: { schema: schemaZh },
    en: { schema: schemaEn },
  },
  lng: initialLanguage,
  fallbackLng: 'zh',
  defaultNS: 'translation',
  ns: ['translation', 'schema'],
  interpolation: {
    escapeValue: false,
  },
  partialBundledLanguages: true,
});

// 启动期：初始化语言骨架（root JSON + BOOTSTRAP NS）
export const i18nReady = ensureLanguageLoaded(initialLanguage);

// 空闲时：先预加载其他语言骨架，再逐步加载其框架层 NS；业务 NS 留给路由预载。
const otherLang: LanguageCode = initialLanguage === 'zh' ? 'en' : 'zh';
if (typeof window !== 'undefined') {
  const schedulePreload = (cb: () => void, delayMs = 2000) => {
    if ('requestIdleCallback' in window) {
      (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
        }
      ).requestIdleCallback(cb, { timeout: 5000 });
    } else {
      setTimeout(cb, delayMs);
    }
  };
  // Phase 1：当前语言框架层命名空间（等待 bootstrap 完成后串行加载）
  schedulePreload(() => {
    i18nReady.then(() =>
      Promise.resolve()
        .then(async () => {
          for (const ns of FRAMEWORK_NAMESPACES) {
            try {
              await _ensureNsInstalled(initialLanguage as 'zh' | 'en', ns);
            } catch {
              /* skip */
            }
          }
        })
        .catch(() => {})
    );
  }, 2000);

  // Phase 2：另一语言骨架 + 框架层命名空间（等待 Phase 1 完成后启动）
  schedulePreload(() => {
    ensureLanguageLoaded(otherLang).then(() =>
      Promise.resolve()
        .then(async () => {
          for (const ns of FRAMEWORK_NAMESPACES) {
            try {
              await _ensureNsInstalled(otherLang as 'zh' | 'en', ns);
            } catch {
              /* skip */
            }
          }
        })
        .catch(() => {})
    ).catch(() => {});
  }, 3500);
}

// 语言切换时：确保骨架已加载 + 触发全局重渲染（i18n.t() 直接调用的组件也能拿到新语言）
i18n.on('languageChanged', (lng: string) => {
  updateDocumentDirection(lng);
  ensureLanguageLoaded(lng).then(() => {
    if (forceUpdate) {
      forceUpdate();
    }
  }).catch(() => {});
});

// ─── 全局 i18n 资源变更事件 → 触发 React 重渲染 ───────
// 解决 i18n.t() 直接调用（非 useTranslation hook）不触发重渲染的问题
let forceUpdate: (() => void) | null = null;
let pendingResourceUpdate = false;

i18n.on('resourcesAdded', () => {
  pendingResourceUpdate = true;
  if (forceUpdate) {
    forceUpdate();
  }
});

i18n.on('resourcesRemoved', () => {
  pendingResourceUpdate = true;
  if (forceUpdate) {
    forceUpdate();
  }
});

/**
 * 注册一个全局重渲染回调（由 App 根组件调用）。
 * 当 ensureNamespacesLoaded 动态注入翻译资源时，强制 App 根组件重渲染，
 * 使得所有使用 i18n.t() 直接调用的组件也能拿到最新翻译。
 */
export function registerI18nForceUpdate(fn: () => void): () => void {
  forceUpdate = fn;
  return () => {
    if (forceUpdate === fn) {
      forceUpdate = null;
    }
  };
}

/**
 * 检查是否有待处理的资源更新（用于 I18nReadyGate）。
 */
export function hasPendingResourceUpdate(): boolean {
  return pendingResourceUpdate;
}

/**
 * 清除待处理资源更新标记。
 */
export function clearPendingResourceUpdate(): void {
  pendingResourceUpdate = false;
}

// 给 i18n.default 额外挂出工具函数，方便 import i18n from '@/i18n' 的代码直接调用
const augmented = i18n as typeof i18n & {
  ensureNamespacesLoaded: typeof ensureNamespacesLoaded;
  ensureLanguageLoaded: typeof ensureLanguageLoaded;
  resolveNamespacesForPath: typeof resolveNamespacesForPath;
};
augmented.ensureNamespacesLoaded = ensureNamespacesLoaded;
augmented.ensureLanguageLoaded = ensureLanguageLoaded;
augmented.resolveNamespacesForPath = resolveNamespacesForPath;

export default augmented;
