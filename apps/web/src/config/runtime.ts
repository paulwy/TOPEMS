import { API_TIMEOUT, WS_TIMEOUT } from '@topems/shared-constants';
import type { RuntimeConfig } from './types';

function getImportMetaEnvSafe(): Record<string, string | boolean | undefined> {
  try {
    // 必须直接写 import.meta.env（不能用 new Function 包装字符串——
    // 因为 import.meta 只允许出现在真正的 ESM 模块源码中，动态字符串会触发 SyntaxError）
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env as unknown as Record<string, string | boolean | undefined>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { import?: { meta?: { env?: Record<string, string> } } }).import?.meta?.env) {
    return (globalThis as unknown as { import: { meta: { env: Record<string, string> } } }).import.meta.env[key] || defaultValue;
  }

  const env = getImportMetaEnvSafe();
  if (env && typeof env[key] !== 'undefined') {
    return String(env[key]);
  }

  return defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = getEnv(key, String(defaultValue));
  return value === 'true';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnv(key, String(defaultValue));
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

const config: RuntimeConfig = {
  api: {
    baseUrl: getEnv('VITE_API_BASE_URL', '/api'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 5000),
  },
  ws: {
    reconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', WS_TIMEOUT.RECONNECT_DELAY),
    maxReconnectAttempts: getEnvNumber('VITE_WS_MAX_RECONNECT_ATTEMPTS', WS_TIMEOUT.MAX_RECONNECT_ATTEMPTS),
  },
  services: {
    // === Group 1: core 虚拟服务（unified-core 承载，8000 端口） ===
    iam: getEnv('VITE_IAM_SERVICE_URL', '/api/core/iam'),
    workflow: getEnv('VITE_FLOW_SERVICE_URL', '/api/core/flow'),
    file: getEnv('VITE_FILE_SERVICE_URL', '/api/core/file'),
    mail: getEnv('VITE_MAIL_SERVICE_URL', '/api/core/mail'),
    im: getEnv('VITE_IM_SERVICE_URL', '/api/core/im'),
    notification: getEnv('VITE_NOTIFICATION_SERVICE_URL', '/api/core/notification'),
    master: getEnv('VITE_MASTER_SERVICE_URL', '/api/core/master'),
    migration: getEnv('VITE_MIGRATION_SERVICE_URL', '/api/core/migration'),
    communication: getEnv('VITE_COMMUNICATION_SERVICE_URL', '/api/core/comm'),

    // === Group 2: 独立进程服务（独立 deployment/port，/api/{svc}/ 开头） ===
    erp: getEnv('VITE_ERP_SERVICE_URL', '/api/erp'),
    finance: getEnv('VITE_FINANCE_SERVICE_URL', '/api/finance'),
    doc: getEnv('VITE_DOC_SERVICE_URL', '/api/doc'),
    ai: getEnv('VITE_AI_SERVICE_URL', '/api/ai'),
    hrm: getEnv('VITE_HRM_SERVICE_URL', '/api/hrm'),
    pm: getEnv('VITE_PM_SERVICE_URL', '/api/pm'),
    crm: getEnv('VITE_CRM_SERVICE_URL', '/api/crm'),
    mes: getEnv('VITE_MES_SERVICE_URL', '/api/mes'),
    manufacturing: getEnv('VITE_MANUFACTURING_SERVICE_URL', '/api/mes'),
    pdm: getEnv('VITE_PDM_SERVICE_URL', '/api/pdm'),
    scm: getEnv('VITE_SCM_SERVICE_URL', '/api/scm'),
    wms: getEnv('VITE_WMS_SERVICE_URL', '/api/wms'),
    srm: getEnv('VITE_SRM_SERVICE_URL', '/api/srm'),
    qms: getEnv('VITE_QMS_SERVICE_URL', '/api/qms'),
    qualityAssurance: getEnv('VITE_QUALITY_ASSURANCE_SERVICE_URL', '/api/qms'),
    lims: getEnv('VITE_LIMS_SERVICE_URL', '/api/lims'),
    ehs: getEnv('VITE_EHS_SERVICE_URL', '/api/ehs'),
    rd: getEnv('VITE_RD_SERVICE_URL', '/api/rd'),
    bi: getEnv('VITE_BI_SERVICE_URL', '/api/bi'),
    analytics: getEnv('VITE_ANALYTICS_SERVICE_URL', '/api/bi'),
    report: getEnv('VITE_REPORT_SERVICE_URL', '/api/report'),
    monitor: getEnv('VITE_MONITOR_SERVICE_URL', '/api/monitor'),
    portal: getEnv('VITE_PORTAL_SERVICE_URL', '/api/portal'),
    mobile: getEnv('VITE_MOBILE_SERVICE_URL', '/api/mobile'),
    gis: getEnv('VITE_GIS_SERVICE_URL', '/api/gis'),
    integration: getEnv('VITE_INTEGRATION_SERVICE_URL', '/api/integration'),

    // === 顶层辅助服务 ===
    core: getEnv('VITE_CORE_SERVICE_URL', '/api/core'),
    jaeger: getEnv('VITE_JAEGER_SERVICE_URL', 'http://localhost:14268'),
  },
  features: {
    debugMode: getEnvBool('VITE_ENABLE_DEBUG_MODE', false),
    hotReload: getEnvBool('VITE_ENABLE_HOT_RELOAD', false),
    apiDocs: getEnvBool('VITE_ENABLE_API_DOCS', false),
    oauthGithub: getEnvBool('VITE_OAUTH_GITHUB_ENABLED', false),
    oauthGoogle: getEnvBool('VITE_OAUTH_GOOGLE_ENABLED', false),
    darkMode: getEnvBool('VITE_ENABLE_DARK_MODE', false),
  },
  upload: {
    maxSize: getEnvNumber('VITE_MAX_UPLOAD_SIZE', 104857600),
    allowedTypes: getEnv('VITE_ALLOWED_FILE_TYPES', '')?.split(',') || [],
  },
  logging: {
    level: getEnv('VITE_LOG_LEVEL', 'info'),
    errorTracking: getEnvBool('VITE_ENABLE_ERROR_TRACKING', false),
  },
  theme: {
    default: getEnv('VITE_DEFAULT_THEME', 'light') as 'light' | 'dark',
    enableDarkMode: getEnvBool('VITE_ENABLE_DARK_MODE', false),
  },
  i18n: {
    defaultLocale: getEnv('VITE_DEFAULT_LOCALE', 'zh-CN'),
    fallbackLocale: getEnv('VITE_FALLBACK_LOCALE', 'en-US'),
    supportedLocales: getEnv('VITE_SUPPORTED_LOCALES', 'zh-CN,en-US')?.split(',') || [
      'zh-CN',
      'en-US',
    ],
  },
  analytics: {
    enabled: getEnvBool('VITE_ENABLE_ANALYTICS', false),
    id: getEnv('VITE_ANALYTICS_ID', ''),
  },
  security: {
    csrfTokenUrl: getEnv('VITE_CSRF_TOKEN_URL', '/api/csrf-token'),
    sessionTimeout: getEnvNumber('VITE_SESSION_TIMEOUT', 120),
  },
  thirdParty: {
    sentryDsn: getEnv('VITE_SENTRY_DSN', ''),
    gaTrackingId: getEnv('VITE_GA_TRACKING_ID', ''),
    amapKey: getEnv('VITE_AMAP_API_KEY', ''),
  },
};

export default config;

export function isProduction(): boolean {
  return getEnvBool('PROD', false);
}

export function isDevelopment(): boolean {
  return getEnvBool('DEV', true);
}

export function isTest(): boolean {
  return getEnv('MODE', '') === 'test';
}

export function getMode(): string {
  return getEnv('MODE', 'development');
}
