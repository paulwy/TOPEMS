import type { RuntimeConfig } from './types';

function getEnv(key: string, defaultValue: string = ''): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    return (globalThis as any).import.meta.env[key] || defaultValue;
  }

  try {
    const getImportMetaEnv = new Function(
      'return typeof import.meta !== "undefined" && import.meta.env'
    );
    const hasImportMetaEnv = getImportMetaEnv();
    if (hasImportMetaEnv) {
      const getEnvValue = new Function('key', 'return import.meta.env[key]');
      const value = getEnvValue(key);
      return value || defaultValue;
    }
  } catch {
    // ignore
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
    timeout: getEnvNumber('VITE_API_TIMEOUT', 60000),
  },
  ws: {
    url: getEnv('VITE_WS_URL', 'ws://localhost:8080'),
    reconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', 5000),
    maxReconnectAttempts: getEnvNumber('VITE_WS_MAX_RECONNECT_ATTEMPTS', 10),
  },
  services: {
    iam: getEnv('VITE_IAM_SERVICE_URL', '/iam'),
    pm: getEnv('VITE_PM_SERVICE_URL', '/pm'),
    portal: getEnv('VITE_PORTAL_SERVICE_URL', '/portal'),
    workflow: getEnv('VITE_FLOW_SERVICE_URL', '/flow'),
    integration: getEnv('VITE_INTEGRATION_SERVICE_URL', '/integration'),
    erp: getEnv('VITE_ERP_SERVICE_URL', '/erp'),
    hrm: getEnv('VITE_HRM_SERVICE_URL', '/hrm'),
    crm: getEnv('VITE_CRM_SERVICE_URL', '/crm'),
    rs: getEnv('VITE_RS_SERVICE_URL', '/rs'),
    doc: getEnv('VITE_DOC_SERVICE_URL', '/doc'),
    scm: getEnv('VITE_SCM_SERVICE_URL', '/scm'),
    srm: getEnv('VITE_SRM_SERVICE_URL', '/srm'),
    wms: getEnv('VITE_WMS_SERVICE_URL', '/wms'),
    file: getEnv('VITE_FILE_SERVICE_URL', '/file'),
    gis: getEnv('VITE_GIS_SERVICE_URL', '/gis'),
    ai: getEnv('VITE_AI_SERVICE_URL', '/ai'),
    mobile: getEnv('VITE_MOBILE_SERVICE_URL', '/mobile'),
    migration: getEnv('VITE_MIGRATION_SERVICE_URL', '/migration'),
    jaeger: getEnv('VITE_JAEGER_SERVICE_URL', 'http://localhost:14268'),

    // ========== [已整合] 统一服务 ==========
    communication: getEnv('VITE_COMMUNICATION_SERVICE_URL', '/comm'),
    manufacturing: getEnv('VITE_MANUFACTURING_SERVICE_URL', '/mfg'),
    qualityAssurance: getEnv('VITE_QUALITY_ASSURANCE_SERVICE_URL', '/qa'),
    analytics: getEnv('VITE_ANALYTICS_SERVICE_URL', '/analytics'),

    // ========== [向后兼容] 旧服务路径 -> 新服务 ==========
    // notification, im, mail -> communication
    notification: getEnv('VITE_NOTIFICATION_SERVICE_URL', '/api/core/comm/notify'),
    mail: getEnv('VITE_MAIL_SERVICE_URL', '/mail'),
    im: getEnv('VITE_IM_SERVICE_URL', '/im'),
    // mes, pdm -> manufacturing
    mes: getEnv('VITE_MES_SERVICE_URL', '/mes'),
    pdm: getEnv('VITE_PDM_SERVICE_URL', '/pdm'),
    // qms, lims, ehs -> qualityAssurance
    qms: getEnv('VITE_QMS_SERVICE_URL', '/qms'),
    lims: getEnv('VITE_LIMS_SERVICE_URL', '/lims'),
    ehs: getEnv('VITE_EHS_SERVICE_URL', '/ehs'),
    // bi, report -> analytics
    bi: getEnv('VITE_BI_SERVICE_URL', '/bi'),
    report: getEnv('VITE_REPORT_SERVICE_URL', '/report'),
    master: getEnv('VITE_MASTER_SERVICE_URL', '/master'),
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
