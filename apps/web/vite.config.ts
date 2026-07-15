import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

import type { IncomingMessage, ServerResponse } from 'http';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

const env = loadEnv('', process.cwd(), '');

interface ServiceConfig {
  name: string;
  port: number;
  target?: string;
  apiRewrite?: (path: string) => string;
  healthRewrite?: (path: string) => string;
  pageRewrite?: (path: string) => string;
  hasWs?: boolean;
  wsPath?: string;
  wsRewrite?: (path: string) => string;
  basePath?: string;
  useCoreService?: boolean;
  skipPluginHealth?: boolean;
}

// WebSocket 路径规范: /ws/{module}/{feature} 或 /{module}/ws/{feature}
// 后端路由与前端钩子路径必须保持一致
const services: ServiceConfig[] = [
  { name: 'core', port: 8000, hasWs: true, wsPath: '/ws/core' },
  { name: 'comm', port: 8000, useCoreService: true, apiRewrite: (path) => path.replace(/^\/comm\/api/, '/api/core/comm') },
  { name: 'iam', port: 8000, useCoreService: true, apiRewrite: (path) => path.replace(/^\/iam\/api\/iam/, '/api/core/iam') },
  { name: 'doc', port: 8012, pageRewrite: (path) => path.replace(/^\/doc(\/.*)$/, '/api/doc$1') },
  { name: 'file', port: 8000, useCoreService: true, pageRewrite: (path) => path.replace(/^\/file(\/.*)$/, '/api/core/file$1') },
  { name: 'mail', port: 8000, useCoreService: true, pageRewrite: (path) => path.replace(/^\/mail(\/.*)$/, '/api/core/comm/mail$1') },
  { name: 'notification', port: 8000, useCoreService: true, pageRewrite: (path) => path.replace(/^\/notification(\/.*)$/, '/api/core/notification$1'), apiRewrite: (path) => path.replace(/^\/notification\/api\/v1/, '/api/core/notification').replace(/^\/notification\/api/, '/api/core/notification') },
  { name: 'im', port: 8000, useCoreService: true, pageRewrite: (path) => path.replace(/^\/im(\/.*)$/, '/api/core/comm/im$1') },
  { name: 'erp', port: 8010, apiRewrite: (path) => path.replace(/^\/erp\/system/, '/api/erp') },
  { name: 'finance', port: 8011 },
  { name: 'hrm', port: 8020 },
  { name: 'pm', port: 8023 },
  { name: 'crm', port: 8029 },
  { name: 'mes', port: 8030, hasWs: true, wsPath: '/ws/mes' },
  { name: 'pdm', port: 8031 },
  { name: 'scm', port: 8040 },
  { name: 'wms', port: 8041 },
  { name: 'srm', port: 8042 },
  { name: 'qms', port: 8050 },
  { name: 'lims', port: 8051 },
  { name: 'ehs', port: 8052 },
  { name: 'rs', port: 8053 },
  { name: 'bi', port: 8060, hasWs: true, wsPath: '/ws/bi' },
  { name: 'report', port: 8060, skipPluginHealth: true },
  { name: 'monitor', port: 8062, apiRewrite: (path) => path.replace(/^\/monitor\/api/, '/api/monitor') },
  { name: 'portal', port: 8063 },
  { name: 'mobile', port: 8070 },
  { name: 'gis', port: 8071, hasWs: true, wsPath: '/ws/gis' },
  { name: 'integration', port: 8072 },
  { name: 'master', port: 8000, useCoreService: true, apiRewrite: (path) => path.replace(/^\/master\/api/, '/api') },
  { name: 'migration', port: 8000, useCoreService: true, apiRewrite: (path) => path.replace(/^\/migration\/api/, '/api') },
  { name: 'ai', port: 8064, skipPluginHealth: true },
  { name: 'flow', port: 8000, useCoreService: true, pageRewrite: (path) => path.replace(/^\/flow/, '/api/core/flow') },
  { name: 'manufacturing', port: 8030, skipPluginHealth: true },
];

const isPageRequest = (req: IncomingMessage): boolean => {
  const url = req.url || '';
  const accept = req.headers.accept || '';
  if (url.includes('.') && !url.includes('?')) return false;
  if (url.startsWith('/api/') || url.startsWith('/ws/')) return false;
  if (url.startsWith('/src/')) return false;
  if (url.endsWith('/health')) return false;
  if (url.includes('/api/')) return false;
  if (accept.includes('text/html') && req.method === 'GET') return true;
  return false;
};

const createPageSafeProxy = (config: any) => ({
  ...config,
  bypass: (req: IncomingMessage) => {
    const url = req.url || '';
    if (url.startsWith('/src/')) {
      return url;
    }
    if (isPageRequest(req)) {
      return req.url;
    }
    return undefined;
  },
});

const createProxyLogger = (serviceName: string, target: string) => (proxy: any) => {
  proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
    const originalUrl = req.url || '';
    const finalPath = proxyReq.path || proxyReq.pathname || '';
    const finalUrl = `${target}${finalPath}`;
    console.log(
      `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}\x1b[0m ` +
      `\x1b[33m${req.method}\x1b[0m ` +
      `\x1b[35m${originalUrl}\x1b[0m ` +
      `\x1b[32m->\x1b[0m ` +
      `\x1b[32m${finalUrl}\x1b[0m`
    );
  });

  proxy.on('proxyRes', (proxyRes: any, req: IncomingMessage) => {
    const originalUrl = req.url || '';
    const statusCode = proxyRes.statusCode || 0;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}\x1b[0m ` +
      `\x1b[33m${req.method}\x1b[0m ` +
      `\x1b[35m${originalUrl}\x1b[0m ` +
      `\x1b[32m<- \x1b[0m` +
      `${statusColor}${statusCode}\x1b[0m`
    );
  });

  proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
    const originalUrl = req.url || '';
    if (!originalUrl.includes('/health')) {
      console.error(
        `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}\x1b[0m ` +
        `\x1b[33m${req.method}\x1b[0m ` +
        `\x1b[35m${originalUrl}\x1b[0m ` +
        `\x1b[31mERROR: ${err.message}\x1b[0m`
      );
    }
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 503,
        success: false,
        message: `${serviceName.toUpperCase()} service is currently unavailable`,
        data: null
      }));
    }
  });

  proxy.on('open', (proxySocket: any) => {
    console.log(
      `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}\x1b[0m ` +
      `\x1b[32mWebSocket connection opened\x1b[0m`
    );
  });

  proxy.on('close', (proxySocket: any, proxyHead: any) => {
    console.log(
      `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}\x1b[0m ` +
      `\x1b[31mWebSocket connection closed\x1b[0m`
    );
  });
};

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/${serviceName}`),
  configure: createProxyLogger(serviceName, target),
});

const createCoreServiceProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), '/api'),
  configure: createProxyLogger(serviceName, target),
});

const createHealthProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(new RegExp(`^\\/${serviceName}`), ''),
  configure: createProxyLogger(serviceName, target),
});

const createWsProxyConfig = (serviceName: string, target: string, wsPath?: string, wsRewrite?: (path: string) => string) => ({
  target,
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
  rewrite: wsRewrite,
  configure: (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
      if (req.headers['upgrade'] && req.headers['upgrade'].toLowerCase() === 'websocket') {
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
      }
      const originalUrl = req.url || '';
      const finalPath = proxyReq.path || proxyReq.pathname || '';
      console.log(
        `\x1b[36m[Vite Proxy] \x1b[34m${serviceName.toUpperCase()}-WS\x1b[0m ` +
        `\x1b[33m${req.method}\x1b[0m ` +
        `\x1b[35m${originalUrl}\x1b[0m ` +
        `\x1b[32m->\x1b[0m ` +
        `\x1b[32m${target}${finalPath}\x1b[0m`
      );
    });
  },
});

const generateServiceProxies = (services: ServiceConfig[]) => {
  const proxyConfig: Record<string, any> = {};

  services.forEach((service) => {
    const target = service.target || `http://localhost:${service.port}`;
    const serviceName = service.name;

    if (service.useCoreService) {
      proxyConfig[`/${serviceName}/api`] = {
        target,
        changeOrigin: true,
        rewrite: service.apiRewrite || ((path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), '/api/core/' + serviceName)),
        configure: createProxyLogger(serviceName, target),
      };

      proxyConfig[`/${serviceName}/health`] = {
        target,
        changeOrigin: true,
        configure: createProxyLogger(serviceName, target),
      };

      if (service.pageRewrite) {
        proxyConfig[`/${serviceName}`] = createPageSafeProxy({
          target,
          changeOrigin: true,
          rewrite: service.pageRewrite,
          configure: createProxyLogger(serviceName, target),
        });
      }

      if (service.hasWs && service.wsPath) {
        proxyConfig[service.wsPath] = createWsProxyConfig(serviceName, target, service.wsPath, service.wsRewrite);
      }
    } else {
      proxyConfig[`/${serviceName}/api`] = service.apiRewrite
        ? {
            target,
            changeOrigin: true,
            rewrite: service.apiRewrite,
            configure: createProxyLogger(serviceName, target),
          }
        : createServiceProxyConfig(serviceName, target);

      proxyConfig[`/${serviceName}/health`] = service.healthRewrite
        ? {
            target,
            changeOrigin: true,
            rewrite: service.healthRewrite,
            configure: createProxyLogger(serviceName, target),
          }
        : createHealthProxyConfig(serviceName, target);

      proxyConfig[`/${serviceName}/`] = createPageSafeProxy({
        target,
        changeOrigin: true,
        rewrite: service.pageRewrite || ((path: string) => path.replace(new RegExp(`^\\/${serviceName}`), `/api/${serviceName}`)),
        configure: createProxyLogger(serviceName, target),
      });

      proxyConfig[`/api/${serviceName}`] = {
        target,
        changeOrigin: true,
        configure: createProxyLogger(`${serviceName}-api`, target),
      };

      if (!service.skipPluginHealth) {
        proxyConfig[`/plugin-health/${serviceName}`] = {
          target,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(new RegExp(`^\\/plugin-health\\/${serviceName}`), ''),
          configure: createProxyLogger(`plugin-health-${serviceName}`, target),
        };
      }

      if (service.hasWs && service.wsPath) {
        proxyConfig[service.wsPath] = createWsProxyConfig(serviceName, target, service.wsPath, service.wsRewrite);
      }
    }
  });

  return proxyConfig;
};

const generateLegacyRewrites = () => {
  const proxyConfig: Record<string, any> = {};

  (['iam','flow','file','mail','im','notification','master','migration','comm'] as const).forEach((svc) => {
    proxyConfig[`/api/core/${svc}/v1`] = {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (p: string) => p.replace(`/api/core/${svc}/v1`, `/api/core/${svc}`),
      configure: createProxyLogger(`legacy-${svc}`, 'http://localhost:8000'),
    };
  });

  const group2SvcMap: Record<string, number> = {
    erp: 8010, finance: 8011, doc: 8012, ai: 8013, hrm: 8020, pm: 8023, crm: 8029,
    mes: 8030, pdm: 8031, scm: 8040, wms: 8041, srm: 8042, qms: 8050, lims: 8051,
    ehs: 8052, rd: 8053, bi: 8060, report: 8061, monitor: 8062, portal: 8063,
    mobile: 8070, gis: 8071, integration: 8072
  };
  Object.entries(group2SvcMap).forEach(([svc, port]) => {
    proxyConfig[`/api/core/${svc}/v1`] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(`/api/core/${svc}/v1`, `/api/${svc}`),
      configure: createProxyLogger(`legacy-${svc}`, `http://localhost:${port}`),
    };
    proxyConfig[`/api/core/${svc}/`] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(`/api/core/${svc}`, `/api/${svc}`),
      configure: createProxyLogger(`core-legacy-${svc}`, `http://localhost:${port}`),
    };
  });

  const legacyV1SvcMap: Record<string, { target: string; rewrite: (p: string) => string }> = {
    auth: { target: 'http://localhost:8000', rewrite: (p) => p.replace('/api/v1/auth', '/api/core/iam/auth') },
    users: { target: 'http://localhost:8000', rewrite: (p) => p.replace('/api/v1/users', '/api/core/iam/users') },
    roles: { target: 'http://localhost:8000', rewrite: (p) => p.replace('/api/v1/roles', '/api/core/iam/roles') },
    permissions: { target: 'http://localhost:8000', rewrite: (p) => p.replace('/api/v1/permissions', '/api/core/iam/permissions') },
    employees: { target: 'http://localhost:8020', rewrite: (p) => p.replace('/api/v1/employees', '/api/hrm/employees') },
    departments: { target: 'http://localhost:8020', rewrite: (p) => p.replace('/api/v1/departments', '/api/hrm/departments') },
    health: { target: 'http://localhost:8000', rewrite: (p) => p.replace('/api/v1/health', '/health') },
  };
  Object.entries(legacyV1SvcMap).forEach(([svc, cfg]) => {
    proxyConfig[`/api/v1/${svc}`] = {
      target: cfg.target,
      changeOrigin: true,
      rewrite: cfg.rewrite,
      configure: createProxyLogger(`v1-legacy-${svc}`, cfg.target),
    };
  });

  return proxyConfig;
};

const plugins = [
  react(),
  viteCompression({
    algorithm: 'gzip',
    threshold: 1024,
    verbose: true,
    deleteOriginalAssets: false,
  }),
  viteCompression({
    algorithm: 'brotliCompress',
    threshold: 1024,
    verbose: false,
    deleteOriginalAssets: false,
  }),
  VitePWA({
    srcDir: 'src',
    filename: 'sw.js',
    strategies: 'generateSW',
    manifest: {
      name: 'TOPEMS',
      short_name: 'TOPEMS',
      description: '企业数字化平台',
      theme_color: '#1976d2',
      background_color: '#ffffff',
      display: 'standalone',
      display_override: ['standalone', 'fullscreen', 'minimal-ui'],
      orientation: 'any',
      lang: 'zh-CN',
      dir: 'ltr',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any',
        },
      ],
      shortcuts: [
        {
          name: '首页',
          short_name: '首页',
          description: '快速访问首页',
          url: '/dashboard',
          icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
        },
        {
          name: '工单管理',
          short_name: '工单',
          description: '查看生产工单',
          url: '/mes/work-orders',
          icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
        },
        {
          name: '库存管理',
          short_name: '库存',
          description: '查看仓库库存',
          url: '/wms/inventory',
          icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
        },
        {
          name: '员工管理',
          short_name: '员工',
          description: '管理员工信息',
          url: '/hrm/employees',
          icons: [{ src: 'icons/icon-96x96.png', sizes: '96x96' }],
        },
      ],
      categories: ['business', 'productivity', 'enterprise'],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,gif,woff,woff2}'],
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/localhost/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'api-cache',
            cacheableResponse: {
              statuses: [200],
            },
            expiration: {
              maxAgeSeconds: 5 * 60,
              maxEntries: 100,
            },
          },
        },
        {
          urlPattern: /^https?:\/\/fonts\.(googleapis|gstatic)\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts-cache',
            cacheableResponse: {
              statuses: [200],
            },
            expiration: {
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxEntries: 50,
            },
          },
        },
        {
          urlPattern: /^https?:\/\/cdn\.jsdelivr\.net/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'cdn-cache',
            cacheableResponse: {
              statuses: [200],
            },
            expiration: {
              maxAgeSeconds: 7 * 24 * 60 * 60,
              maxEntries: 30,
            },
          },
        },
        {
          urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            cacheableResponse: {
              statuses: [200],
            },
            expiration: {
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxEntries: 200,
            },
          },
        },
        {
          urlPattern: /\.(woff|woff2|ttf|eot)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'font-files-cache',
            cacheableResponse: {
              statuses: [200],
            },
            expiration: {
              maxAgeSeconds: 90 * 24 * 60 * 60,
              maxEntries: 20,
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
    registerType: 'prompt',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  }),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@topems/shared-types', replacement: path.resolve(__dirname, '../../packages/shared-types/src') },
      { find: '@topems/shared-utils', replacement: path.resolve(__dirname, '../../packages/shared-utils/src') },
      { find: '@topems/shared-components', replacement: path.resolve(__dirname, '../../packages/shared-components/src') },
      { find: '@topems/shared-hooks', replacement: path.resolve(__dirname, '../../packages/shared-hooks/src') },
      { find: '@topems/shared-constants', replacement: path.resolve(__dirname, '../../packages/shared-constants/src') },
      { find: '@topems/tokens', replacement: path.resolve(__dirname, '../../packages/tokens/src') },
      { find: 'react-transition-group', replacement: path.resolve(__dirname, '../../node_modules/react-transition-group') },
      { find: 'react-transition-group/cjs', replacement: path.resolve(__dirname, '../../node_modules/react-transition-group/cjs') },
      { find: 'react-transition-group/TransitionGroupContext', replacement: path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js') },
    ],
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
  ssr: {
    noExternal: ['react-transition-group'],
  },
  build: {
    rollupOptions: {
      plugins: [
        visualizer({
          filename: './dist/stats.html',
          format: 'html',
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
      ],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'react-vendor';
            }
            if (id.includes('react-router-dom') || id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@mui/material') || id.includes('@mui/system') || id.includes('@mui/icons-material') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (id.includes('@mui/lab') || id.includes('@mui/x-date-pickers') || id.includes('@mui/x-tree-view') || id.includes('@mui/x-data-grid')) {
              return 'mui-x-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            if (id.includes('axios')) {
              return 'network-vendor';
            }
            if (id.includes('dayjs') || id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('zod') || id.includes('es-toolkit') || id.includes('@hookform') || id.includes('react-hook-form')) {
              return 'form-validation-vendor';
            }
            if (id.includes('zustand') || id.includes('@tanstack/react-query') || id.includes('@tanstack/react-table')) {
              return 'state-data-vendor';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            if (id.includes('leaflet') || id.includes('@react-leaflet') || id.includes('@amap')) {
              return 'map-vendor';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            if (id.includes('clsx') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('xlsx') || id.includes('xlsx-style') || id.includes('docx-preview')) {
              return 'document-vendor';
            }
            if (id.includes('dompurify') || id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('react-syntax-highlighter') || id.includes('marked') || id.includes('prismjs')) {
              return 'content-vendor';
            }
            if (id.includes('lodash') || id.includes('lodash-es')) {
              return 'lodash-vendor';
            }
            if (id.includes('uuid') || id.includes('crypto-js')) {
              return 'utils-vendor';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            return 'other-vendor';
          }
          
          if (id.includes('/pages/iam/')) {
            return 'iam-chunk';
          }
          if (id.includes('/pages/admin/')) {
            if (id.includes('/pages/admin/DashboardPage')) {
              return 'admin-overview-chunk';
            }
            if (id.includes('/pages/admin/Tenant') || id.includes('/pages/admin/Billing')) {
              return 'admin-tenant-chunk';
            }
            if (id.includes('/pages/admin/Account') || id.includes('/pages/admin/BankAccount')) {
              return 'admin-account-chunk';
            }
            if (id.includes('/pages/admin/Dictionary') || id.includes('/pages/admin/System') || id.includes('/pages/admin/Plugin')) {
              return 'admin-settings-chunk';
            }
            if (id.includes('/pages/admin/Database') || id.includes('/pages/admin/Migration') || id.includes('/pages/admin/ConfigDebug')) {
              return 'admin-tools-chunk';
            }
            if (id.includes('/pages/admin/Audit') || id.includes('/pages/admin/Monitor') || id.includes('/pages/admin/Performance')) {
              return 'admin-analytics-chunk';
            }
            return 'admin-other-chunk';
          }
          if (id.includes('/pages/hrm/')) {
            return 'hrm-chunk';
          }
          if (id.includes('/pages/crm/')) {
            return 'crm-chunk';
          }
          if (id.includes('/pages/finance/')) {
            return 'finance-chunk';
          }
          if (id.includes('/pages/mes/')) {
            return 'mes-chunk';
          }
          if (id.includes('/pages/workflow/')) {
            return 'workflow-chunk';
          }
          if (id.includes('/pages/ai/')) {
            return 'ai-chunk';
          }
          if (id.includes('/pages/dashboard/') || id.includes('/pages/shared/')) {
            return 'dashboard-chunk';
          }
          if (id.includes('/pages/bi/')) {
            return 'bi-chunk';
          }
          if (id.includes('/pages/report/')) {
            return 'report-chunk';
          }
          if (id.includes('/pages/gis/')) {
            return 'gis-chunk';
          }
          if (id.includes('/pages/lowcode/')) {
            return 'lowcode-chunk';
          }
          if (id.includes('/pages/pdm/')) {
            return 'pdm-chunk';
          }
          if (id.includes('/pages/qms/')) {
            return 'qms-chunk';
          }
          if (id.includes('/pages/scm/')) {
            return 'scm-chunk';
          }
          if (id.includes('/pages/wms/')) {
            return 'wms-chunk';
          }
          if (id.includes('/pages/srm/')) {
            return 'srm-chunk';
          }
          if (id.includes('/pages/lims/')) {
            return 'lims-chunk';
          }
          if (id.includes('/pages/ehs/')) {
            return 'ehs-chunk';
          }
          if (id.includes('/pages/rs/')) {
            return 'rs-chunk';
          }
          if (id.includes('/pages/oa/')) {
            return 'oa-chunk';
          }
          if (id.includes('/pages/im/')) {
            return 'im-chunk';
          }
          if (id.includes('/pages/erp/')) {
            return 'erp-chunk';
          }
          if (id.includes('/pages/integration/')) {
            return 'integration-chunk';
          }
          if (id.includes('/pages/asset/')) {
            return 'asset-chunk';
          }
          if (id.includes('/pages/plugin/')) {
            return 'plugin-chunk';
          }
          if (id.includes('/pages/monitor/')) {
            return 'monitor-chunk';
          }
          if (id.includes('/pages/notification/')) {
            return 'notification-chunk';
          }
          if (id.includes('/pages/mobile/')) {
            return 'mobile-chunk';
          }
          if (id.includes('/pages/doc/')) {
            return 'doc-chunk';
          }
        },
      },
    },
    chunkSizeWarningLimit: 350,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 3,
        dead_code: true,
        unused: true,
        collapse_vars: true,
        reduce_vars: true,
        inline: false,
        join_vars: true,
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
        toplevel: true,
      },
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    target: ['es2022', 'chrome108', 'edge108', 'firefox108', 'safari16'],
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        const coreVendors = [
          'react-vendor',
          'router-vendor',
          'mui-vendor',
          'mui-x-vendor',
          'state-data-vendor',
          'form-validation-vendor',
          'date-vendor',
          'ui-vendor',
          'i18n-vendor',
          'network-vendor',
          'charts-vendor',
        ];
        return deps.filter((dep) => {
          const depName = dep.split('/').pop()?.split('-')[0];
          return coreVendors.some((vendor) => dep.includes(vendor));
        });
      },
    },
    outDir: 'dist',
    base: process.env.VITE_CDN_URL || '/',
    cacheDir: '.vite/cache',
    manifest: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      path: '/vite-hmr',
      host: 'localhost',
      port: 3000,
    },
    fs: {
      allow: ['..'],
    },
    proxy: {
      ...generateServiceProxies(services),
      ...generateLegacyRewrites(),

      '/api/core/plugins': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: createProxyLogger('core', 'http://localhost:8000'),
      },
      '/api/core/comm/notify': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: createProxyLogger('notification', 'http://localhost:8000'),
      },
      '/api/core': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: createProxyLogger('core', 'http://localhost:8000'),
      },
      '/unified-core/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/unified-core/, ''),
        configure: createProxyLogger('unified-core', 'http://localhost:8000'),
      },
      '/health': { 
        target: 'http://localhost:8000', 
        changeOrigin: true,
        configure: createProxyLogger('health', 'http://localhost:8000'),
      },
      '/erp/consolidation/': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp\/consolidation/, '/api/consolidation'),
        configure: createProxyLogger('erp-consolidation', 'http://localhost:8010'),
      },
      '/master/monitor/': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/master\/monitor/, '/api/monitor'),
        configure: createProxyLogger('monitor', 'http://localhost:8062'),
      },
      '/migration/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/migration/, '/api/migrations'),
        configure: createProxyLogger('migration', 'http://localhost:8000'),
      },
      '/api': { 
        target: 'http://localhost:8000', 
        changeOrigin: true,
        configure: createProxyLogger('api-fallback', 'http://localhost:8000'),
      },
    },
  },
});