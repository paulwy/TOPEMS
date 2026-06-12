import type { RuntimeConfig } from "./types";

// Safe access to import.meta.env with Jest fallback
function getEnv(key: string, defaultValue: string = ""): string {
  // First, check if we have a globalThis mock (for Jest)
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).import?.meta?.env
  ) {
    return (globalThis as any).import.meta.env[key] || defaultValue;
  }

  // Then, check for Vite's import.meta.env - use a string check to avoid early syntax errors
  try {
    // Use Function constructor to safely access import.meta without early parse error
    const getImportMetaEnv = new Function(
      'return typeof import.meta !== "undefined" && import.meta.env',
    );
    const hasImportMetaEnv = getImportMetaEnv();
    if (hasImportMetaEnv) {
      const getEnvValue = new Function("key", "return import.meta.env[key]");
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
  return value === "true";
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnv(key, String(defaultValue));
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

const config: RuntimeConfig = {
  api: {
    baseUrl: getEnv("VITE_API_BASE_URL", "/api"),
    timeout: getEnvNumber("VITE_API_TIMEOUT", 60000), // 增加到 60 秒
  },
  ws: {
    url: getEnv("VITE_WS_URL", "ws://localhost:8080"),
    reconnectInterval: getEnvNumber("VITE_WS_RECONNECT_INTERVAL", 5000),
    maxReconnectAttempts: getEnvNumber("VITE_WS_MAX_RECONNECT_ATTEMPTS", 10),
  },
  services: {
    iam: getEnv("VITE_IAM_SERVICE_URL", "http://localhost:8000"),
    pm: getEnv("VITE_PM_SERVICE_URL", "http://localhost:8001"),
    notification: getEnv(
      "VITE_NOTIFICATION_SERVICE_URL",
      "http://localhost:8002",
    ),
    portal: getEnv("VITE_PORTAL_SERVICE_URL", "http://localhost:8003"),
    flow: getEnv("VITE_FLOW_SERVICE_URL", "http://localhost:8004"),
    integration: getEnv(
      "VITE_INTEGRATION_SERVICE_URL",
      "http://localhost:8005",
    ),
    erp: getEnv("VITE_ERP_SERVICE_URL", "http://localhost:8010"),
    hrm: getEnv("VITE_HRM_SERVICE_URL", "http://localhost:8011"),
    crm: getEnv("VITE_CRM_SERVICE_URL", "http://localhost:8012"),
    rs: getEnv("VITE_RS_SERVICE_URL", "http://localhost:8020"),
    lims: getEnv("VITE_LIMS_SERVICE_URL", "http://localhost:8022"),
    pdm: getEnv("VITE_PDM_SERVICE_URL", "http://localhost:8023"),
    doc: getEnv("VITE_DOC_SERVICE_URL", "http://localhost:8024"),
    mes: getEnv("VITE_MES_SERVICE_URL", "http://localhost:8030"),
    qms: getEnv("VITE_QMS_SERVICE_URL", "http://localhost:8031"),
    ehs: getEnv("VITE_EHS_SERVICE_URL", "http://localhost:8032"),
    scm: getEnv("VITE_SCM_SERVICE_URL", "http://localhost:8040"),
    srm: getEnv("VITE_SRM_SERVICE_URL", "http://localhost:8041"),
    wms: getEnv("VITE_WMS_SERVICE_URL", "http://localhost:8042"),
    file: getEnv("VITE_FILE_SERVICE_URL", "http://localhost:8050"),
    mail: getEnv("VITE_MAIL_SERVICE_URL", "http://localhost:8051"),
    im: getEnv("VITE_IM_SERVICE_URL", "http://localhost:8052"),
    gis: getEnv("VITE_GIS_SERVICE_URL", "http://localhost:8053"),
    bi: getEnv("VITE_BI_SERVICE_URL", "http://localhost:8060"),
    report: getEnv("VITE_REPORT_SERVICE_URL", "http://localhost:8061"),
    ai: getEnv("VITE_AI_SERVICE_URL", "/ai"),
    mobile: getEnv("VITE_MOBILE_SERVICE_URL", "http://localhost:8070"),
    migration: getEnv("VITE_MIGRATION_SERVICE_URL", "http://localhost:8787"),
  },
  features: {
    debugMode: getEnvBool("VITE_ENABLE_DEBUG_MODE", false),
    hotReload: getEnvBool("VITE_ENABLE_HOT_RELOAD", false),
    apiDocs: getEnvBool("VITE_ENABLE_API_DOCS", false),
    oauthGithub: getEnvBool("VITE_OAUTH_GITHUB_ENABLED", false),
    oauthGoogle: getEnvBool("VITE_OAUTH_GOOGLE_ENABLED", false),
    darkMode: getEnvBool("VITE_ENABLE_DARK_MODE", false),
  },
  upload: {
    maxSize: getEnvNumber("VITE_MAX_UPLOAD_SIZE", 104857600),
    allowedTypes: getEnv("VITE_ALLOWED_FILE_TYPES", "")?.split(",") || [],
  },
  logging: {
    level: getEnv("VITE_LOG_LEVEL", "info"),
    errorTracking: getEnvBool("VITE_ENABLE_ERROR_TRACKING", false),
  },
  theme: {
    default: getEnv("VITE_DEFAULT_THEME", "light") as "light" | "dark",
    enableDarkMode: getEnvBool("VITE_ENABLE_DARK_MODE", false),
  },
  i18n: {
    defaultLocale: getEnv("VITE_DEFAULT_LOCALE", "zh-CN"),
    fallbackLocale: getEnv("VITE_FALLBACK_LOCALE", "en-US"),
    supportedLocales: getEnv("VITE_SUPPORTED_LOCALES", "zh-CN,en-US")?.split(
      ",",
    ) || ["zh-CN", "en-US"],
  },
  analytics: {
    enabled: getEnvBool("VITE_ENABLE_ANALYTICS", false),
    id: getEnv("VITE_ANALYTICS_ID", ""),
  },
  security: {
    csrfTokenUrl: getEnv("VITE_CSRF_TOKEN_URL", "/api/csrf-token"),
    sessionTimeout: getEnvNumber("VITE_SESSION_TIMEOUT", 120),
  },
  thirdParty: {
    sentryDsn: getEnv("VITE_SENTRY_DSN", ""),
    gaTrackingId: getEnv("VITE_GA_TRACKING_ID", ""),
  },
};

export default config;

export function isProduction(): boolean {
  return getEnvBool("PROD", false);
}

export function isDevelopment(): boolean {
  return getEnvBool("DEV", true);
}

export function isTest(): boolean {
  return getEnv("MODE", "") === "test";
}

export function getMode(): string {
  return getEnv("MODE", "development");
}
