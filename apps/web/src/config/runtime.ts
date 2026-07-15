import { API_TIMEOUT, WS_TIMEOUT } from '@topems/shared-constants';
import type { RuntimeConfig } from './types';

export function getEnv(key: string, defaultValue: string = ''): string {
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
    timeout: getEnvNumber('VITE_API_TIMEOUT', 5000),
  },
  ws: {
    reconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', WS_TIMEOUT.RECONNECT_DELAY),
    maxReconnectAttempts: getEnvNumber(
      'VITE_WS_MAX_RECONNECT_ATTEMPTS',
      WS_TIMEOUT.MAX_RECONNECT_ATTEMPTS
    ),
  },
  services: {
    iam: getEnv('VITE_IAM_SERVICE_URL', '/iam/api'),
    pm: getEnv('VITE_PM_SERVICE_URL', '/pm/api'),
    portal: getEnv('VITE_PORTAL_SERVICE_URL', '/portal/api'),
    workflow: getEnv('VITE_FLOW_SERVICE_URL', '/flow/api'),
    integration: getEnv('VITE_INTEGRATION_SERVICE_URL', '/integration/api'),
    erp: getEnv('VITE_ERP_SERVICE_URL', '/erp/api'),
    hrm: getEnv('VITE_HRM_SERVICE_URL', '/hrm/api'),
    crm: getEnv('VITE_CRM_SERVICE_URL', '/crm/api'),
    rd: getEnv('VITE_RD_SERVICE_URL', '/rd/api'),
    doc: getEnv('VITE_DOC_SERVICE_URL', '/doc/api'),
    scm: getEnv('VITE_SCM_SERVICE_URL', '/scm/api'),
    srm: getEnv('VITE_SRM_SERVICE_URL', '/srm/api'),
    wms: getEnv('VITE_WMS_SERVICE_URL', '/wms/api'),
    file: getEnv('VITE_FILE_SERVICE_URL', '/file/api'),
    gis: getEnv('VITE_GIS_SERVICE_URL', '/gis/api'),
    ai: getEnv('VITE_AI_SERVICE_URL', '/ai/api'),
    mobile: getEnv('VITE_MOBILE_SERVICE_URL', '/mobile/api'),
    migration: getEnv('VITE_MIGRATION_SERVICE_URL', '/migration/api'),
    jaeger: getEnv('VITE_JAEGER_SERVICE_URL', 'http://localhost:14268'),

    // ========== [已整合] 统一服务 ==========
    communication: getEnv('VITE_COMMUNICATION_SERVICE_URL', '/comm/api'),
    manufacturing: getEnv('VITE_MANUFACTURING_SERVICE_URL', '/mes/api'),
    qualityAssurance: getEnv('VITE_QUALITY_ASSURANCE_SERVICE_URL', '/qms/api'),
    analytics: getEnv('VITE_ANALYTICS_SERVICE_URL', '/bi/api'),

    // ========== 独立服务路径 ==========
    mes: getEnv('VITE_MES_SERVICE_URL', '/mes/api'),
    pdm: getEnv('VITE_PDM_SERVICE_URL', '/pdm/api'),
    qms: getEnv('VITE_QMS_SERVICE_URL', '/qms/api'),
    lims: getEnv('VITE_LIMS_SERVICE_URL', '/lims/api'),
    ehs: getEnv('VITE_EHS_SERVICE_URL', '/ehs/api'),
    bi: getEnv('VITE_BI_SERVICE_URL', '/bi/api'),
    report: getEnv('VITE_REPORT_SERVICE_URL', '/report/api'),

    // ========== 统一核心服务（unified-core） ==========
    core: getEnv('VITE_CORE_SERVICE_URL', '/core/api'),
    finance: getEnv('VITE_FINANCE_SERVICE_URL', '/finance/api'),

    // ========== 通信与通知服务 ==========
    im: getEnv('VITE_IM_SERVICE_URL', '/im/api'),
    notification: getEnv('VITE_NOTIFICATION_SERVICE_URL', '/notification/api'),
    mail: getEnv('VITE_MAIL_SERVICE_URL', '/mail/api'),
    master: getEnv('VITE_MASTER_SERVICE_URL', '/master/api'),
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
