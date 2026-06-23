const testEnv = {
  VITE_API_BASE_URL: "/api",
  VITE_API_TIMEOUT: "30000",
  VITE_WS_URL: "ws://localhost:8080",
  VITE_WS_RECONNECT_INTERVAL: "5000",
  VITE_WS_MAX_RECONNECT_ATTEMPTS: "10",
  VITE_IAM_SERVICE_URL: "http://localhost:8000",
  VITE_DOC_SERVICE_URL: "http://localhost:8000",
  VITE_PM_SERVICE_URL: "http://localhost:8023",
  VITE_NOTIFICATION_SERVICE_URL: "http://localhost:8000",
  VITE_INTEGRATION_SERVICE_URL: "http://localhost:8072",
  VITE_PORTAL_SERVICE_URL: "http://localhost:8063",
  VITE_FLOW_SERVICE_URL: "http://localhost:8000",
  VITE_ERP_SERVICE_URL: "http://localhost:8010",
  VITE_HRM_SERVICE_URL: "http://localhost:8020",
  VITE_CRM_SERVICE_URL: "http://localhost:8029",
  VITE_AI_SERVICE_URL: "http://localhost:8000",
  VITE_RS_SERVICE_URL: "http://localhost:8053",
  VITE_PDM_SERVICE_URL: "http://localhost:8030",
  VITE_MES_SERVICE_URL: "http://localhost:8030",
  VITE_QMS_SERVICE_URL: "http://localhost:8050",
  VITE_LIMS_SERVICE_URL: "http://localhost:8051",
  VITE_EHS_SERVICE_URL: "http://localhost:8052",
  VITE_SCM_SERVICE_URL: "http://localhost:8040",
  VITE_SRM_SERVICE_URL: "http://localhost:8042",
  VITE_WMS_SERVICE_URL: "http://localhost:8041",
  VITE_GIS_SERVICE_URL: "http://localhost:8071",
  VITE_BI_SERVICE_URL: "http://localhost:8060",
  VITE_REPORT_SERVICE_URL: "http://localhost:8061",
  VITE_MAIL_SERVICE_URL: "http://localhost:8000",
  VITE_MOBILE_SERVICE_URL: "http://localhost:8070",
  VITE_ENABLE_DEBUG_MODE: "false",
  VITE_ENABLE_HOT_RELOAD: "false",
  VITE_ENABLE_API_DOCS: "false",
  VITE_ENABLE_MOCK_DATA: "false",
  VITE_OAUTH_GOOGLE_ENABLED: "false",
  VITE_ENABLE_DARK_MODE: "false",
  VITE_MAX_UPLOAD_SIZE: "104857600",
  VITE_ALLOWED_FILE_TYPES: "",
  VITE_LOG_LEVEL: "info",
  VITE_ENABLE_ERROR_TRACKING: "false",
  VITE_DEFAULT_THEME: "light",
  VITE_DEFAULT_LOCALE: "zh-CN",
  VITE_FALLBACK_LOCALE: "en-US",
  VITE_SUPPORTED_LOCALES: "zh-CN,en-US",
  VITE_ENABLE_ANALYTICS: "false",
  VITE_ANALYTICS_ID: "",
  VITE_CSRF_TOKEN_URL: "/api/csrf-token",
  VITE_SESSION_TIMEOUT: "120",
  VITE_SENTRY_DSN: "",
  VITE_GA_TRACKING_ID: "",
};

const vitestWorker = globalThis as unknown as { __vitest_worker__?: { metaEnv?: Record<string, string> } };
if (vitestWorker.__vitest_worker__?.metaEnv) {
  Object.assign(vitestWorker.__vitest_worker__.metaEnv, testEnv);
} else if (typeof import.meta !== "undefined" && import.meta.env) {
  Object.assign(import.meta.env, testEnv);
}

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }) as unknown as Promise<Response>;
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    writable: true,
  });

  Object.defineProperty(window, "sessionStorage", {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    writable: true,
  });
}
