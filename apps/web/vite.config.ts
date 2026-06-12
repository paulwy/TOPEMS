import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path) => path.replace(new RegExp(`^\\/${serviceName}`), ''),
  configure: (proxy) => {
    proxy.on('error', (err, req, res) => {
      if (!req.url?.includes('/health')) {
        console.warn(`[Vite Proxy] ${serviceName.toUpperCase()} service unavailable, error:`, err.message);
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
  }
});

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const packageName = id.split('node_modules/')[1]?.split('/')[0];
            if (!packageName) return 'vendor-shared';
            if (['monaco-editor', '@monaco-editor'].includes(packageName)) return 'vendor-monaco';
            if (['pdfjs-dist', 'react-pdf'].includes(packageName)) return 'vendor-pdf';
            if (['xlsx', 'file-saver', 'xlsx-populate'].includes(packageName)) return 'vendor-excel';
            if (['mapbox-gl', 'react-map-gl'].includes(packageName)) return 'vendor-map';
            if (['clsx', 'tailwind-merge', 'class-variance-authority', 'isomorphic-dompurify', 'csstype', 'css-in-js-utils'].includes(packageName)) return 'vendor-utils';
            if (['axios', 'follow-redirects'].includes(packageName)) return 'vendor-axios';
            if (['zod', 'yup', 'property-expr', 'fast-deep-equal', 'tiny-invariant', 'get-nested-value'].includes(packageName)) return 'vendor-validation';
            if (packageName === '@babel' || id.includes('@babel/runtime')) return 'vendor-babel';
            if (['react', 'react-dom', 'scheduler', 'loose-envify', 'object-assign', 'prop-types'].includes(packageName)) return 'vendor-react';
            if (['react-router', 'react-router-dom', 'history', 'path-to-regexp', 'query-string'].includes(packageName)) return 'vendor-router';
            if (['@hookform/resolvers', 'react-hook-form'].includes(packageName)) return 'vendor-form';
            if (packageName === '@radix-ui') return 'vendor-radix';
            if (packageName === '@nextui-org') return 'vendor-nextui';
            if (packageName === 'lucide-react') return 'vendor-icons';
            if (['@testing-library', 'vitest', 'jsdom', 'faker'].includes(packageName)) return 'vendor-test';
            return 'vendor-shared';
          }
          if (id.includes('pages/AIPage')) return 'page-ai';
          if (id.includes('pages/GisPage')) return 'page-gis';
          if (id.includes('pages/Limspage')) return 'page-lims';
          if (id.includes('pages/Rspage')) return 'page-rs';
          if (id.includes('pages/Qmspage')) return 'page-qms';
          if (id.includes('pages/Ehspage')) return 'page-ehs';
          if (id.includes('pages/CrmPage') || id.includes('pages/CRMDashboardPage')) return 'page-crm';
          if (id.includes('pages/Hrm')) return 'page-hrm';
          if (id.includes('routes/')) {
            const routeName = id.split('routes/')[1]?.split('.')[0];
            if (routeName) return `route-${routeName}`;
          }
          if (id.includes('src/api/')) {
            const apiName = id.split('src/api/')[1]?.split('.')[0];
            if (apiName) return `api-${apiName}`;
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      port: 3000,
      host: 'localhost',
      clientPort: 3000,
      protocol: 'ws',
    },
    proxy: {
      '/api/v1/files': createServiceProxyConfig('doc', 'http://localhost:8028', true),
      '/mail/api': createServiceProxyConfig('mail', 'http://localhost:8051'),
      '/mail/health': createServiceProxyConfig('mail', 'http://localhost:8051'),
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8012'),
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8012'),
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/iam/api': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/iam/, '') },
      '/iam/health': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/iam/, '') },
      '/doc/api': createServiceProxyConfig('doc', 'http://localhost:8028'),
      '/doc/health': createServiceProxyConfig('doc', 'http://localhost:8028'),
      '/flow/api': createServiceProxyConfig('flow', 'http://localhost:8006'),
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8006'),
      '/notification': { target: 'http://localhost:8004', changeOrigin: true, ws: true, secure: false, rewrite: (path: string) => path.replace(/^\/notification/, '') },
      '/im/ws': { target: 'http://127.0.0.1:8052', changeOrigin: true, ws: true, secure: false, rewrite: (path) => path.replace(/^\/im/, '') },
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8007'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8007'),
      '/portal/api': createServiceProxyConfig('portal', 'http://localhost:8005'),
      '/portal/health': createServiceProxyConfig('portal', 'http://localhost:8005'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8013'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8013'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/lims/api': createServiceProxyConfig('lims', 'http://localhost:8022'),
      '/lims/health': createServiceProxyConfig('lims', 'http://localhost:8022'),
      '/pdm/api': createServiceProxyConfig('pdm', 'http://localhost:8023'),
      '/pdm/health': createServiceProxyConfig('pdm', 'http://localhost:8023'),
      '/mes/api': createServiceProxyConfig('mes', 'http://localhost:8030'),
      '/mes/health': createServiceProxyConfig('mes', 'http://localhost:8030'),
      '/qms/api': createServiceProxyConfig('qms', 'http://localhost:8031'),
      '/qms/health': createServiceProxyConfig('qms', 'http://localhost:8031'),
      '/ehs/api': createServiceProxyConfig('ehs', 'http://localhost:8032'),
      '/ehs/health': createServiceProxyConfig('ehs', 'http://localhost:8032'),
      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8041'),
      '/srm/health': createServiceProxyConfig('srm', 'http://localhost:8041'),
      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8042'),
      '/wms/health': createServiceProxyConfig('wms', 'http://localhost:8042'),
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8002'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8002'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      '/file/api': createServiceProxyConfig('file', 'http://localhost:8050'),
      '/file/health': createServiceProxyConfig('file', 'http://localhost:8050'),
      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/bi/health': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/report/api': createServiceProxyConfig('report', 'http://localhost:8061'),
      '/report/health': createServiceProxyConfig('report', 'http://localhost:8061'),
    },
  },
});
