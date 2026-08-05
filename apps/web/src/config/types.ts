export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export interface WebSocketConfig {
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface ServicesConfig {
  iam: string;
  doc: string;
  ai: string;
  workflow: string;
  rd: string;
  srm: string;
  erp: string;
  gis: string;
  mobile: string;
  integration: string;
  wms: string;
  hrm: string;
  crm: string;
  scm: string;
  portal: string;
  pm: string;
  migration: string;
  file: string;
  jaeger: string;
  // 独立服务路径
  mes: string;
  pdm: string;
  qms: string;
  lims: string;
  ehs: string;
  bi: string;
  monitor: string;
  // 统一核心服务
  core: string;
  finance: string;
  // 通信与通知服务
  im: string;
  notification: string;
  mail: string;
  master: string;
  // 搜索独立服务
  search: string;
  // 独立基础设施服务
  billing: string;
  ticket: string;
  feedback: string;
  // 低代码平台独立服务（V64 新增）
  lowcode: string;
  // 自动化编排服务（V64 新增，初期落地 unified-core，前端通过 /api/core/automation 访问）
  automation: string;
}

export interface FeaturesConfig {
  debugMode: boolean;
  hotReload: boolean;
  apiDocs: boolean;
  oauthGithub: boolean;
  oauthGoogle: boolean;
  darkMode: boolean;
}

export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
}

export interface LoggingConfig {
  level: string;
  errorTracking: boolean;
}

export interface ThemeConfig {
  default: 'light' | 'dark';
  enableDarkMode: boolean;
}

export interface I18nConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
}

export interface AnalyticsConfig {
  enabled: boolean;
  id: string;
}

export interface SecurityConfig {
  csrfTokenUrl: string;
  sessionTimeout: number;
}

export interface ThirdPartyConfig {
  sentryDsn: string;
  gaTrackingId: string;
  amapKey: string;
}

export interface RuntimeConfig {
  api: ApiConfig;
  ws: WebSocketConfig;
  services: ServicesConfig;
  features: FeaturesConfig;
  upload: UploadConfig;
  logging: LoggingConfig;
  theme: ThemeConfig;
  i18n: I18nConfig;
  analytics: AnalyticsConfig;
  security: SecurityConfig;
  thirdParty: ThirdPartyConfig;
}

declare global {
  interface ImportMetaEnv {
    readonly VITEApiBaseUrl: string;
    readonly VITE_API_TIMEOUT: string;
    readonly VITE_WS_URL: string;
    readonly VITE_WS_RECONNECT_INTERVAL: string;
    readonly VITE_WS_MAX_RECONNECT_ATTEMPTS: string;
    readonly VITE_IAM_SERVICE_URL: string;
    readonly VITE_DOC_SERVICE_URL: string;
    readonly VITE_AI_SERVICE_URL: string;
    readonly VITE_FLOW_SERVICE_URL: string;
    readonly VITE_EHS_SERVICE_URL: string;
    readonly VITE_LIMS_SERVICE_URL: string;
    readonly VITE_PDM_SERVICE_URL: string;
    readonly VITE_QMS_SERVICE_URL: string;
    readonly VITE_RD_SERVICE_URL: string;
    readonly VITE_SRM_SERVICE_URL: string;
    readonly VITE_ERP_SERVICE_URL: string;
    readonly VITE_NOTIFICATION_SERVICE_URL: string;
    readonly VITE_PM_SERVICE_URL: string;
    readonly VITEEnableDebugMode: string;
    readonly VITE_ENABLE_HOT_RELOAD: string;
    readonly VITE_ENABLE_API_DOCS: string;
    readonly VITE_OAUTH_GITHUB_ENABLED: string;
    readonly VITE_OAUTH_GOOGLE_ENABLED: string;
    readonly VITE_ENABLE_DARK_MODE: string;
    readonly VITE_MAX_UPLOAD_SIZE: string;
    readonly VITE_ALLOWED_FILE_TYPES: string;
    readonly VITELogLevel: string;
    readonly VITE_ENABLE_ERROR_TRACKING: string;
    readonly VITE_DEFAULT_THEME: string;
    readonly VITE_DEFAULT_LOCALE: string;
    readonly VITE_FALLBACK_LOCALE: string;
    readonly VITE_SUPPORTED_LOCALES: string;
    readonly VITE_ENABLE_ANALYTICS: string;
    readonly VITE_ANALYTICS_ID: string;
    readonly VITE_CSRF_TOKEN_URL: string;
    readonly VITE_SESSION_TIMEOUT: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_GA_TRACKING_ID: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
