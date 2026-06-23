// Setup file that runs before the test environment is initialized
// Mock import.meta for Jest

// Create a mock for import.meta
Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: "/api",
        VITE_API_TIMEOUT: "30000",
        VITE_WS_URL: "ws://localhost:8080",
        VITE_WS_RECONNECT_INTERVAL: "5000",
        VITE_WS_MAX_RECONNECT_ATTEMPTS: "10",
        // 核心服务 (unified-core 包含 IAM, Doc, Flow, File, Communication)
        VITE_IAM_SERVICE_URL: "http://localhost:8000",
        VITE_DOC_SERVICE_URL: "http://localhost:8000",
        VITE_FLOW_SERVICE_URL: "http://localhost:8000",
        VITE_FILE_SERVICE_URL: "http://localhost:8000",
        // 业务服务
        VITE_PM_SERVICE_URL: "http://localhost:8023",
        VITE_INTEGRATION_SERVICE_URL: "http://localhost:8072",
        VITE_ERP_SERVICE_URL: "http://localhost:8010",
        VITE_HRM_SERVICE_URL: "http://localhost:8020",
        VITE_CRM_SERVICE_URL: "http://localhost:8029",
        VITE_RS_SERVICE_URL: "http://localhost:8053",
        VITE_MANUFACTURING_SERVICE_URL: "http://localhost:8030",
        VITE_QMS_SERVICE_URL: "http://localhost:8050",
        VITE_SCM_SERVICE_URL: "http://localhost:8040",
        VITE_SRM_SERVICE_URL: "http://localhost:8042",
        VITE_WMS_SERVICE_URL: "http://localhost:8041",
        VITE_GIS_SERVICE_URL: "http://localhost:8071",
        VITE_MOBILE_SERVICE_URL: "http://localhost:8070",
        VITE_ENABLE_DEBUG_MODE: "false",
        VITE_ENABLE_HOT_RELOAD: "false",
        VITE_ENABLE_API_DOCS: "false",
        VITE_ENABLE_MOCK_DATA: "false",
        VITE_OAUTH_GITHUB_ENABLED: "false",
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
        PROD: false,
        DEV: true,
        MODE: "test",
      },
    },
  },
  writable: true,
  configurable: true,
});

export {};
