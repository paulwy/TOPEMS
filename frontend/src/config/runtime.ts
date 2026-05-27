import type { RuntimeConfig } from './types';

const config: RuntimeConfig = {
  api: {
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '/api',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  },
  ws: {
    url: (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:8080',
    reconnectInterval: Number(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 5000,
    maxReconnectAttempts: Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 10,
  },
  services: {
    iam: (import.meta.env.VITE_IAM_SERVICE_URL as string) || 'http://localhost:8002',
    rs: (import.meta.env.VITE_RS_SERVICE_URL as string) || 'http://localhost:8001',
    lims: (import.meta.env.VITE_LIMS_SERVICE_URL as string) || 'http://localhost:8003',
    qms: (import.meta.env.VITE_QMS_SERVICE_URL as string) || 'http://localhost:8004',
    mes: (import.meta.env.VITE_MES_SERVICE_URL as string) || 'http://localhost:8005',
    erp: (import.meta.env.VITE_ERP_SERVICE_URL as string) || 'http://localhost:8006',
    scm: (import.meta.env.VITE_SCM_SERVICE_URL as string) || 'http://localhost:8007',
    wms: (import.meta.env.VITE_WMS_SERVICE_URL as string) || 'http://localhost:8008',
    crm: (import.meta.env.VITE_CRM_SERVICE_URL as string) || 'http://localhost:8009',
    hrm: (import.meta.env.VITE_HRM_SERVICE_URL as string) || 'http://localhost:8010',
    gis: (import.meta.env.VITE_GIS_SERVICE_URL as string) || 'http://localhost:8011',
    bi: (import.meta.env.VITE_BI_SERVICE_URL as string) || 'http://localhost:8012',
    ehs: (import.meta.env.VITE_EHS_SERVICE_URL as string) || 'http://localhost:8013',
    pdm: (import.meta.env.VITE_PDM_SERVICE_URL as string) || 'http://localhost:8014',
    srm: (import.meta.env.VITE_SRM_SERVICE_URL as string) || 'http://localhost:8015',
    im: (import.meta.env.VITE_IM_SERVICE_URL as string) || 'http://localhost:8016',
    ai: (import.meta.env.VITE_AI_SERVICE_URL as string) || 'http://localhost:8005',
    mobile: (import.meta.env.VITE_MOBILE_SERVICE_URL as string) || 'http://localhost:8018',
    integration: (import.meta.env.VITE_INTEGRATION_SERVICE_URL as string) || 'http://localhost:8019',
    portal: (import.meta.env.VITE_PORTAL_SERVICE_URL as string) || 'http://localhost:8020',
    doc: (import.meta.env.VITE_DOC_SERVICE_URL as string) || 'http://localhost:8001',
    flow: (import.meta.env.VITE_FLOW_SERVICE_URL as string) || 'http://localhost:8004',
    notification: (import.meta.env.VITE_NOTIFICATION_SERVICE_URL as string) || 'http://localhost:8023',
    report: (import.meta.env.VITE_REPORT_SERVICE_URL as string) || 'http://localhost:8024',
  },
  features: {
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    hotReload: import.meta.env.VITE_ENABLE_HOT_RELOAD === 'true',
    apiDocs: import.meta.env.VITE_ENABLE_API_DOCS === 'true',
    mockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    oauthGithub: import.meta.env.VITE_OAUTH_GITHUB_ENABLED === 'true',
    oauthGoogle: import.meta.env.VITE_OAUTH_GOOGLE_ENABLED === 'true',
    darkMode: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  },
  upload: {
    maxSize: Number(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 104857600,
    allowedTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES as string)?.split(',') || [],
  },
  logging: {
    level: (import.meta.env.VITE_LOG_LEVEL as string) || 'info',
    errorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  },
  theme: {
    default: (import.meta.env.VITE_DEFAULT_THEME as 'light' | 'dark') || 'light',
    enableDarkMode: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  },
  i18n: {
    defaultLocale: (import.meta.env.VITE_DEFAULT_LOCALE as string) || 'zh-CN',
    fallbackLocale: (import.meta.env.VITE_FALLBACK_LOCALE as string) || 'en-US',
    supportedLocales: (import.meta.env.VITE_SUPPORTED_LOCALES as string)?.split(',') || ['zh-CN', 'en-US'],
  },
  analytics: {
    enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    id: (import.meta.env.VITE_ANALYTICS_ID as string) || '',
  },
  security: {
    csrfTokenUrl: (import.meta.env.VITE_CSRF_TOKEN_URL as string) || '/api/csrf-token',
    sessionTimeout: Number(import.meta.env.VITE_SESSION_TIMEOUT) || 120,
  },
  thirdParty: {
    sentryDsn: (import.meta.env.VITE_SENTRY_DSN as string) || '',
    gaTrackingId: (import.meta.env.VITE_GA_TRACKING_ID as string) || '',
  },
};

export default config;

export function isProduction(): boolean {
  return import.meta.env.PROD;
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function isTest(): boolean {
  return import.meta.env.MODE === 'test';
}

export function getMode(): string {
  return import.meta.env.MODE;
}
