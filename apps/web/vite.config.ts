import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';


import type { IncomingMessage, ServerResponse } from 'http';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

const env = loadEnv('', process.cwd(), '');

const isPageRequest = (req: IncomingMessage): boolean => {
  const url = req.url || '';
  const accept = req.headers.accept || '';
  if (url.includes('.') && !url.includes('?')) return false;
  if (url.startsWith('/api/') || url.startsWith('/ws/')) return false;
  if (url.startsWith('/notification/v1/')) return false;
  if (url.startsWith('/notification/api/v1/')) return false;
  if (url.endsWith('/health')) return false;
  if (url.includes('/api/')) return false;
  if (accept.includes('text/html') && req.method === 'GET') return true;
  return false;
};

const createPageSafeProxy = (config: any) => ({
  ...config,
  bypass: (req: IncomingMessage) => {
    if (isPageRequest(req)) {
      return req.url;
    }
    return undefined;
  },
});

const REMOTE_MODULES = [
  { name: 'topems_core', port: 3001, description: 'Core Module' },
  { name: 'topems_hrm', port: 3002, description: 'HRM Module' },
  { name: 'topems_crm', port: 3003, description: 'CRM Module' },
  { name: 'topems_finance', port: 3004, description: 'Finance Module' },
  { name: 'topems_pm', port: 3005, description: 'Project Management' },
  { name: 'topems_mes', port: 3006, description: 'Manufacturing Execution' },
  { name: 'topems_scm', port: 3007, description: 'Supply Chain' },
  { name: 'topems_bi', port: 3008, description: 'Business Intelligence' },
];

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
};

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/${serviceName}`),
  configure: createProxyLogger(serviceName, target),
});

const createHealthProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(new RegExp(`^\\/${serviceName}`), ''),
  configure: createProxyLogger(serviceName, target),
});

const plugins = [
  react(),
  viteCompression({
    algorithm: 'gzip',
    threshold: 10240,
    verbose: true,
  }),
  viteCompression({
    algorithm: 'brotliCompress',
    threshold: 10240,
    verbose: false,
  }),
  viteImagemin({
    gifsicle: {
      optimizationLevel: 7,
      interlaced: false,
    },
    optipng: {
      optimizationLevel: 7,
    },
    mozjpeg: {
      quality: 80,
    },
    pngquant: {
      quality: [0.8, 0.9],
      speed: 4,
    },
    svgo: {
      plugins: [
        {
          name: 'removeViewBox',
        },
        {
          name: 'removeEmptyAttrs',
          active: false,
        },
      ],
    },
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
      { find: /^topems_core\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_hrm\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_crm\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_finance\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_pm\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_mes\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_scm\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
      { find: /^topems_bi\/.*/, replacement: path.resolve(__dirname, './src/modules/empty-remote.ts') },
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
          filename: './dist/stats.json',
          format: 'json',
          gzipSize: true,
          brotliSize: true,
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
            if (id.includes('@mui/material') || id.includes('@mui/system')) {
              return 'mui-material';
            }
            if (id.includes('@mui/lab')) {
              return 'mui-lab';
            }
            if (id.includes('@mui/x-date-pickers') || id.includes('@mui/x-tree-view')) {
              return 'mui-x-extended';
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
            if (id.includes('zod') || id.includes('es-toolkit')) {
              return 'validation-vendor';
            }
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            if (id.includes('leaflet') || id.includes('@react-leaflet')) {
              return 'map-vendor';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            if (id.includes('@hookform') || id.includes('react-hook-form')) {
              return 'form-vendor';
            }
            if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-table')) {
              return 'data-vendor';
            }
            if (id.includes('clsx') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('xlsx') || id.includes('xlsx-style')) {
              return 'excel-vendor';
            }
            if (id.includes('docx-preview')) {
              return 'docx-vendor';
            }
            if (id.includes('dompurify')) {
              return 'sanitize-vendor';
            }
            if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('react-syntax-highlighter')) {
              return 'markdown-vendor';
            }
            if (id.includes('lodash') || id.includes('lodash-es')) {
              return 'lodash-vendor';
            }
            if (id.includes('uuid')) {
              return 'uuid-vendor';
            }
            if (id.includes('crypto-js')) {
              return 'crypto-vendor';
            }
            if (id.includes('marked')) {
              return 'markdown-vendor';
            }
            if (id.includes('prismjs')) {
              return 'prism-vendor';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
          }
          
          if (id.includes('/pages/iam/')) {
            return 'iam-chunk';
          }
          if (id.includes('/pages/admin/')) {
            return 'admin-chunk';
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
          if (id.includes('/pages/dashboard/')) {
            return 'dashboard-chunk';
          }
          if (id.includes('/pages/bi/')) {
            return 'bi-chunk';
          }
          if (id.includes('/pages/portal/')) {
            return 'portal-chunk';
          }
          if (id.includes('/pages/report/')) {
            return 'report-chunk';
          }
          if (id.includes('/pages/gis/')) {
            return 'gis-chunk';
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
    target: ['es2020', 'chrome100', 'edge100', 'firefox100', 'safari15'],
    polyfillModulePreload: true,
    outDir: 'dist',
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'ws',
    },
    fs: {
      allow: ['..'],
    },
    proxy: {
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
      '/core/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/core/, '/api/core'),
        configure: createProxyLogger('core', 'http://localhost:8000'),
      },
      '/core/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: createProxyLogger('core', 'http://localhost:8000'),
      },
      '/ws/core': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: createProxyLogger('core-ws', 'http://localhost:8000'),
      },
      
      '/comm/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/comm/, '/api/core/comm'),
        configure: createProxyLogger('comm', 'http://localhost:8000'),
      },
      '/comm/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: createProxyLogger('comm', 'http://localhost:8000'),
      },
      '/ws/notifications': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: createProxyLogger('comm-ws', 'http://localhost:8000'),
      },
      '/ws/im': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: createProxyLogger('im-ws', 'http://localhost:8000'),
      },
      
      '/iam/api/iam/auth/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\/auth\//, '/api/v1/auth/'),
        configure: createProxyLogger('iam-auth', 'http://localhost:8000'),
      },
      '/iam/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\//, '/api/core/iam/'),
        configure: createProxyLogger('iam', 'http://localhost:8000'),
      },
      '/iam/auth/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\/auth\//, '/api/v1/auth/'),
        configure: createProxyLogger('iam-auth', 'http://localhost:8000'),
      },
      '/iam/': createPageSafeProxy({
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\//, '/api/core/iam/'),
        configure: createProxyLogger('iam', 'http://localhost:8000'),
      }),
      '/doc': createPageSafeProxy({
        target: 'http://localhost:8012',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/doc(\/.*)$/, '/api/doc$1'),
        configure: createProxyLogger('doc', 'http://localhost:8012'),
      }),
      '/file': createPageSafeProxy({
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/file(\/.*)$/, '/api/core/file$1'),
        configure: createProxyLogger('file', 'http://localhost:8000'),
      }),
      '/mail': createPageSafeProxy({
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mail(\/.*)$/, '/api/core/comm/mail$1'),
        configure: createProxyLogger('mail', 'http://localhost:8000'),
      }),
      '/notification/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification\/api\/v1/, '/api/v1'),
        configure: createProxyLogger('notification', 'http://localhost:8000'),
      },
      '/notification/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification\/v1/, '/api/v1'),
        configure: createProxyLogger('notification', 'http://localhost:8000'),
      },
      '/notification': createPageSafeProxy({
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification(\/.*)$/, '/api$1'),
        configure: createProxyLogger('notification', 'http://localhost:8000'),
      }),
      '/im': createPageSafeProxy({
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/im(\/.*)$/, '/api/core/comm/im$1'),
        configure: createProxyLogger('im', 'http://localhost:8000'),
      }),

      '/health': { 
        target: 'http://localhost:8000', 
        changeOrigin: true,
        configure: createProxyLogger('health', 'http://localhost:8000'),
      },

      '/api/finance': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        configure: createProxyLogger('erp-finance', 'http://localhost:8010'),
      },

      '/api/erp': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        configure: createProxyLogger('erp-api', 'http://localhost:8010'),
      },

      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createHealthProxyConfig('erp', 'http://localhost:8010'),
      '/erp/system/': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp\/system/, '/api/erp'),
        configure: createProxyLogger('erp', 'http://localhost:8010'),
      },
      '/erp/consolidation/': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp\/consolidation/, '/api/consolidation'),
        configure: createProxyLogger('erp-consolidation', 'http://localhost:8010'),
      },
      '/erp/': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp/, '/api/erp'),
        configure: createProxyLogger('erp', 'http://localhost:8010'),
      },

      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8020'),
      '/hrm/api/hrm/': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm\/api\/hrm\//, '/api/hrm/'),
        configure: createProxyLogger('hrm', 'http://localhost:8020'),
      },
      '/hrm/health': createHealthProxyConfig('hrm', 'http://localhost:8020'),
      '/hrm/': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm/, '/api/hrm'),
        configure: createProxyLogger('hrm', 'http://localhost:8020'),
      },

      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8023'),
      '/pm/health': createHealthProxyConfig('pm', 'http://localhost:8023'),
      '/pm/': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pm/, '/api/pm'),
        configure: createProxyLogger('pm', 'http://localhost:8023'),
      },
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8029'),
      '/crm/health': createHealthProxyConfig('crm', 'http://localhost:8029'),
      '/crm/opportunities': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('crm-opportunities', 'http://localhost:8029'),
      },
      '/crm/customers': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('crm-customers', 'http://localhost:8029'),
      },
      '/crm/contacts': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('crm-contacts', 'http://localhost:8029'),
      },
      '/crm/sales-funnel': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('crm-sales-funnel', 'http://localhost:8029'),
      },

      '/mes/api': createServiceProxyConfig('mes', 'http://localhost:8030'),
      '/mes/health': createHealthProxyConfig('mes', 'http://localhost:8030'),
      '/mes/ws': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        ws: true,
        rewrite: (path: string) => path.replace(/^\/mes/, '/api/mes'),
        configure: createProxyLogger('mes-ws', 'http://localhost:8030'),
      },
      '/mes/': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes/, '/api/mes'),
        configure: createProxyLogger('mes', 'http://localhost:8030'),
      },

      '/pdm/api': createServiceProxyConfig('pdm', 'http://localhost:8031'),
      '/pdm/health': createHealthProxyConfig('pdm', 'http://localhost:8031'),
      '/pdm/': createPageSafeProxy({
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm/, '/api/pdm'),
        configure: createProxyLogger('pdm', 'http://localhost:8031'),
      }),

      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createHealthProxyConfig('scm', 'http://localhost:8040'),
      '/scm/sync-records': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-sync-records', 'http://localhost:8040'),
      },
      '/scm/sync/': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-sync', 'http://localhost:8040'),
      },
      '/scm/evaluations': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-evaluations', 'http://localhost:8040'),
      },
      '/scm/purchase-requisitions': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-purchase-requisitions', 'http://localhost:8040'),
      },
      '/scm/price-comparisons': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-price-comparisons', 'http://localhost:8040'),
      },
      '/scm/comparisons': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-comparisons', 'http://localhost:8040'),
      },
      '/scm/quotes': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-quotes', 'http://localhost:8040'),
      },
      '/scm/inquiries': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-inquiries', 'http://localhost:8040'),
      },
      '/scm/incoming-inspections': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-incoming-inspections', 'http://localhost:8040'),
      },
      '/scm/inspection-records': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-inspection-records', 'http://localhost:8040'),
      },
      '/scm/delivery-appointments': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-delivery-appointments', 'http://localhost:8040'),
      },
      '/scm/audit-logs': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-audit-logs', 'http://localhost:8040'),
      },
      '/scm/dashboard/': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-dashboard', 'http://localhost:8040'),
      },
      '/scm/mrp/': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-mrp', 'http://localhost:8040'),
      },
      '/scm/purchase-items': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-purchase-items', 'http://localhost:8040'),
      },
      '/scm/purchase-contracts': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-purchase-contracts', 'http://localhost:8040'),
      },
      '/scm/mrp-suggestions': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-mrp-suggestions', 'http://localhost:8040'),
      },
      '/scm/purchase-orders': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-purchase-orders', 'http://localhost:8040'),
      },
      '/scm/inventory-turnover': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-inventory-turnover', 'http://localhost:8040'),
      },
      '/scm/suppliers': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-suppliers', 'http://localhost:8040'),
      },
      '/scm/supplier-admissions': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-supplier-admissions', 'http://localhost:8040'),
      },
      '/scm/v1/': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => '/api' + path,
        configure: createProxyLogger('scm-v1', 'http://localhost:8040'),
      },

      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8041'),
      '/wms/health': createHealthProxyConfig('wms', 'http://localhost:8041'),
      '/wms/': createPageSafeProxy({
        target: 'http://localhost:8041',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/wms/, '/api/wms'),
        configure: createProxyLogger('wms', 'http://localhost:8041'),
      }),

      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8042'),
      '/srm/health': createHealthProxyConfig('srm', 'http://localhost:8042'),
      '/srm/': {
        target: 'http://localhost:8042',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/srm/, '/api/srm'),
        configure: createProxyLogger('srm', 'http://localhost:8042'),
      },

      '/qms/api': createServiceProxyConfig('qms', 'http://localhost:8050'),
      '/qms/health': createHealthProxyConfig('qms', 'http://localhost:8050'),
      '/qms/': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qms/, '/api/qms'),
        configure: createProxyLogger('qms', 'http://localhost:8050'),
      },

      '/lims/api': createServiceProxyConfig('lims', 'http://localhost:8051'),
      '/lims/health': createHealthProxyConfig('lims', 'http://localhost:8051'),
      '/lims/': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/lims/, '/api/lims'),
        configure: createProxyLogger('lims', 'http://localhost:8051'),
      },

      '/ehs/api': createServiceProxyConfig('ehs', 'http://localhost:8052'),
      '/ehs/health': createHealthProxyConfig('ehs', 'http://localhost:8052'),
      '/ehs/': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ehs/, '/api/ehs'),
        configure: createProxyLogger('ehs', 'http://localhost:8052'),
      },

      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8053'),
      '/rs/health': createHealthProxyConfig('rs', 'http://localhost:8053'),
      '/rs/': {
        target: 'http://localhost:8053',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rs/, '/api/rs'),
        configure: createProxyLogger('rs', 'http://localhost:8053'),
      },

      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/bi/health': createHealthProxyConfig('bi', 'http://localhost:8060'),
      '/bi/': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/bi/, '/api/bi'),
        configure: createProxyLogger('bi', 'http://localhost:8060'),
      },

      '/report/api': createServiceProxyConfig('report', 'http://localhost:8061'),
      '/report/health': createHealthProxyConfig('report', 'http://localhost:8061'),
      '/report/': {
        target: 'http://localhost:8061',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report/, '/api/report'),
        configure: createProxyLogger('report', 'http://localhost:8061'),
      },

      '/monitor/api': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/monitor\/api/, '/api/v1/monitor'),
        configure: createProxyLogger('monitor', 'http://localhost:8062'),
      },
      '/monitor/health': createHealthProxyConfig('monitor', 'http://localhost:8062'),

      '/portal/api': createServiceProxyConfig('portal', 'http://localhost:8063'),
      '/portal/health': createHealthProxyConfig('portal', 'http://localhost:8063'),
      '/portal/': {
        target: 'http://localhost:8063',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/portal/, '/api/portal'),
        configure: createProxyLogger('portal', 'http://localhost:8063'),
      },

      '/mobile/api': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/health': createHealthProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mobile/, '/api/mobile'),
        configure: createProxyLogger('mobile', 'http://localhost:8070'),
      },

      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8071'),
      '/gis/health': createHealthProxyConfig('gis', 'http://localhost:8071'),
      '/gis/': {
        target: 'http://localhost:8071',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/gis/, '/api/gis'),
        configure: createProxyLogger('gis', 'http://localhost:8071'),
      },

      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/integration/health': createHealthProxyConfig('integration', 'http://localhost:8072'),
      '/integration/': {
        target: 'http://localhost:8072',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/integration/, '/api/integration'),
        configure: createProxyLogger('integration', 'http://localhost:8072'),
      },

      '/master/api': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/master/health': createHealthProxyConfig('master', 'http://localhost:8000'),
      '/master/monitor/': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/master\/monitor/, '/api/v1/monitor'),
        configure: createProxyLogger('monitor', 'http://localhost:8062'),
      },

      '/migration/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/migration\/api/, '/api'),
        configure: createProxyLogger('migration', 'http://localhost:8000'),
      },
      '/migration/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/migration/, '/api/migrations'),
        configure: createProxyLogger('migration', 'http://localhost:8000'),
      },

      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8013'),
      '/ai/health': createHealthProxyConfig('ai', 'http://localhost:8013'),

      '/flow/health': createHealthProxyConfig('flow', 'http://localhost:8000'),
      '/flow/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/flow/, '/api/flow'),
        configure: createProxyLogger('flow', 'http://localhost:8000'),
      },

      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      '/manufacturing/health': createHealthProxyConfig('manufacturing', 'http://localhost:8030'),

      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
        configure: createProxyLogger('mfg', 'http://localhost:8030'),
      },

      '/plugin-health/erp': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/erp/, ''),
        configure: createProxyLogger('plugin-health-erp', 'http://localhost:8010'),
      },
      '/plugin-health/hrm': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/hrm/, ''),
        configure: createProxyLogger('plugin-health-hrm', 'http://localhost:8020'),
      },
      '/plugin-health/pm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/pm/, ''),
        configure: createProxyLogger('plugin-health-pm', 'http://localhost:8023'),
      },
      '/plugin-health/crm': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/crm/, ''),
        configure: createProxyLogger('plugin-health-crm', 'http://localhost:8029'),
      },
      '/plugin-health/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/mes/, ''),
        configure: createProxyLogger('plugin-health-mes', 'http://localhost:8030'),
      },
      '/plugin-health/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/pdm/, ''),
        configure: createProxyLogger('plugin-health-pdm', 'http://localhost:8031'),
      },
      '/plugin-health/scm': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/scm/, ''),
        configure: createProxyLogger('plugin-health-scm', 'http://localhost:8040'),
      },
      '/plugin-health/wms': {
        target: 'http://localhost:8041',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/wms/, ''),
        configure: createProxyLogger('plugin-health-wms', 'http://localhost:8041'),
      },
      '/plugin-health/srm': {
        target: 'http://localhost:8042',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/srm/, ''),
        configure: createProxyLogger('plugin-health-srm', 'http://localhost:8042'),
      },
      '/plugin-health/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/qms/, ''),
        configure: createProxyLogger('plugin-health-qms', 'http://localhost:8050'),
      },
      '/plugin-health/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/lims/, ''),
        configure: createProxyLogger('plugin-health-lims', 'http://localhost:8051'),
      },
      '/plugin-health/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/ehs/, ''),
        configure: createProxyLogger('plugin-health-ehs', 'http://localhost:8052'),
      },
      '/plugin-health/rs': {
        target: 'http://localhost:8053',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/rs/, ''),
        configure: createProxyLogger('plugin-health-rs', 'http://localhost:8053'),
      },
      '/plugin-health/bi': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/bi/, ''),
        configure: createProxyLogger('plugin-health-bi', 'http://localhost:8060'),
      },
      '/plugin-health/report': {
        target: 'http://localhost:8061',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/report/, ''),
        configure: createProxyLogger('plugin-health-report', 'http://localhost:8061'),
      },
      '/plugin-health/monitor': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/monitor/, ''),
        configure: createProxyLogger('plugin-health-monitor', 'http://localhost:8062'),
      },
      '/plugin-health/doc': {
        target: 'http://localhost:8012',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/doc/, ''),
        configure: createProxyLogger('plugin-health-doc', 'http://localhost:8012'),
      },
      '/plugin-health/portal': {
        target: 'http://localhost:8063',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/portal/, ''),
        configure: createProxyLogger('plugin-health-portal', 'http://localhost:8063'),
      },
      '/plugin-health/mobile': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/mobile/, ''),
        configure: createProxyLogger('plugin-health-mobile', 'http://localhost:8070'),
      },
      '/plugin-health/gis': {
        target: 'http://localhost:8071',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/gis/, ''),
        configure: createProxyLogger('plugin-health-gis', 'http://localhost:8071'),
      },
      '/plugin-health/integration': {
        target: 'http://localhost:8072',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/integration/, ''),
        configure: createProxyLogger('plugin-health-integration', 'http://localhost:8072'),
      },
      '/plugin-health/workflow': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/workflow/, ''),
        configure: createProxyLogger('plugin-health-workflow', 'http://localhost:8000'),
      },

      '/api': { 
        target: 'http://localhost:8000', 
        changeOrigin: true,
        configure: createProxyLogger('api-fallback', 'http://localhost:8000'),
      },
    },
  },
});