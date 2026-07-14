import { API_TIMEOUT, WS_TIMEOUT } from '@topems/shared-constants';
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
    timeout: getEnvNumber('VITE_API_TIMEOUT', 5000),
  },
  ws: {
    reconnectInterval: getEnvNumber('VITE_WS_RECONNECT_INTERVAL', WS_TIMEOUT.RECONNECT_DELAY),
    maxReconnectAttempts: getEnvNumber('VITE_WS_MAX_RECONNECT_ATTEMPTS', WS_TIMEOUT.MAX_RECONNECT_ATTEMPTS),
  },
  services: {
    iam: getEnv('VITE_IAM_SERVICE_URL', '/api/core/iam/v1'),
    pm: getEnv('VITE_PM_SERVICE_URL', '/api/core/pm/v1'),
    portal: getEnv('VITE_PORTAL_SERVICE_URL', '/api/core/portal/v1'),
    workflow: getEnv('VITE_FLOW_SERVICE_URL', '/api/core/flow/v1'),
    integration: getEnv('VITE_INTEGRATION_SERVICE_URL', '/api/core/integration/v1'),
    erp: getEnv('VITE_ERP_SERVICE_URL', '/api/core/erp/v1'),
    hrm: getEnv('VITE_HRM_SERVICE_URL', '/api/core/hrm/v1'),
    crm: getEnv('VITE_CRM_SERVICE_URL', '/api/core/crm/v1'),
    rd: getEnv('VITE_RD_SERVICE_URL', '/api/core/rd/v1'),
    doc: getEnv('VITE_DOC_SERVICE_URL', '/api/core/doc/v1'),
    scm: getEnv('VITE_SCM_SERVICE_URL', '/api/core/scm/v1'),
    srm: getEnv('VITE_SRM_SERVICE_URL', '/api/core/srm/v1'),
    wms: getEnv('VITE_WMS_SERVICE_URL', '/api/core/wms/v1'),
    file: getEnv('VITE_FILE_SERVICE_URL', '/api/core/file/v1'),
    gis: getEnv('VITE_GIS_SERVICE_URL', '/api/core/gis/v1'),
    ai: getEnv('VITE_AI_SERVICE_URL', '/api/core/ai/v1'),
    mobile: getEnv('VITE_MOBILE_SERVICE_URL', '/api/core/mobile/v1'),
    migration: getEnv('VITE_MIGRATION_SERVICE_URL', '/api/core/migration/v1'),
    jaeger: getEnv('VITE_JAEGER_SERVICE_URL', 'http://localhost:14268'),

    // ========== [已整合] 统一服务 ==========
    communication: getEnv('VITE_COMMUNICATION_SERVICE_URL', '/api/core/comm/v1'),
    manufacturing: getEnv('VITE_MANUFACTURING_SERVICE_URL', '/api/core/mes/v1'),
    qualityAssurance: getEnv('VITE_QUALITY_ASSURANCE_SERVICE_URL', '/api/core/qms/v1'),
    analytics: getEnv('VITE_ANALYTICS_SERVICE_URL', '/api/core/bi/v1'),

    // ========== 独立服务路径 ==========
    mes: getEnv('VITE_MES_SERVICE_URL', '/api/core/mes/v1'),
    pdm: getEnv('VITE_PDM_SERVICE_URL', '/api/core/pdm/v1'),
    qms: getEnv('VITE_QMS_SERVICE_URL', '/api/core/qms/v1'),
    lims: getEnv('VITE_LIMS_SERVICE_URL', '/api/core/lims/v1'),
    ehs: getEnv('VITE_EHS_SERVICE_URL', '/api/core/ehs/v1'),
    bi: getEnv('VITE_BI_SERVICE_URL', '/api/core/bi/v1'),
    report: getEnv('VITE_REPORT_SERVICE_URL', '/api/core/report/v1'),

    // ========== 统一核心服务（unified-core） ==========
    core: getEnv('VITE_CORE_SERVICE_URL', '/api/core'),
    finance: getEnv('VITE_FINANCE_SERVICE_URL', '/api/core/finance/v1'),

    // ========== 通信与通知服务 ==========
    im: getEnv('VITE_IM_SERVICE_URL', '/api/core/im/v1'),
    notification: getEnv('VITE_NOTIFICATION_SERVICE_URL', '/api/core/notification/v1'),
    mail: getEnv('VITE_MAIL_SERVICE_URL', '/api/core/mail/v1'),
    master: getEnv('VITE_MASTER_SERVICE_URL', '/api/core/master/v1'),
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
