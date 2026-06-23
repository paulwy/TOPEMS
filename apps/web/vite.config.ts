import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'
import viteCompression from 'vite-plugin-compression'

import type { IncomingMessage, ServerResponse } from 'http';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

const getRemoteEntryUrl = () => {
  const env = loadEnv('', process.cwd(), '');
  if (DEPLOYMENT_MODE === 'static') {
    return undefined;
  }
  return env.VITE_CORE_REMOTE_ENTRY || 'http://localhost:3001/remoteEntry.js';
};

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}`), ''),
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
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

const enableMF = DEPLOYMENT_MODE !== 'static';

const plugins = [react(), viteCompression({
  algorithm: 'gzip',
  threshold: 10240,
  verbose: true,
})];

if (enableMF) {
  plugins.push(
    federation({
      name: 'topems_portal',
      remotes: {
        topems_core: getRemoteEntryUrl(),
      },
      shared: {
        'react': {
          singleton: true,
          requiredVersion: '^19.0.0',
          strictVersion: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          strictVersion: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^7.0.0',
          strictVersion: true,
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^6.0.0',
          strictVersion: true,
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: '^11.0.0',
          strictVersion: true,
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: '^11.0.0',
          strictVersion: true,
        },
        'zustand': {
          singleton: true,
          strictVersion: true,
        },
        'i18next': {
          singleton: true,
          strictVersion: true,
        },
        'react-i18next': {
          singleton: true,
          strictVersion: true,
        },
        'axios': {
          singleton: true,
          requiredVersion: '^1.0.0',
          strictVersion: true,
        },
        'dayjs': {
          singleton: true,
          requiredVersion: '^1.11.0',
          strictVersion: true,
        },
      },
    })
  );
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      'react-transition-group/TransitionGroupContext': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
    },
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
  ssr: {
    noExternal: ['react-transition-group'],
  },
  build: {
    rollupOptions: {
      output: {
        external: DEPLOYMENT_MODE === 'static' ? [
          'topems_core',
          /^topems_core\/.*/,
        ] : [],
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/lab', '@mui/x-date-pickers', '@mui/x-tree-view'],
          charts: ['recharts'],
          utils: ['axios', 'dayjs', 'date-fns', 'zod', 'zustand'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      path: '/vite-hmr',
    },
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/core/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/core/, '/api/core'),
        configure: (proxy) => {
          proxy.on('error', (err: Error, req: any, res: any) => {
            console.warn(`[Vite Proxy] Core platform error:`, err.message);
          });
        }
      },
      '/core/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws/core': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      
      '/comm/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/comm/, '/api/core/comm'),
      },
      '/comm/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws/notifications': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws/im': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      
      '/iam/api/iam/auth/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\/auth\//, '/api/v1/auth/'),
      },
      '/iam/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\//, '/api/core/iam/'),
      },
      '/doc': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/doc(\/.*)$/, '/api/core/doc$1'),
      },
      '/flow': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/flow/, ''),
      },
      '/file': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/file(\/.*)$/, '/api/core/file$1'),
      },
      '/mail': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mail(\/.*)$/, '/api/core/comm/mail$1'),
      },
      '/notification/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification(\/api\/v1.*)$/, '$1'),
      },
      '/notification': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification(\/.*)$/, '/api/core/comm/notify$1'),
      },
      '/im': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/im(\/.*)$/, '/api/core/comm/im$1'),
      },

      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },

      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),

      '/hrm/api/hrm/': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm\/api\/hrm\//, '/api/hrm/'),
      },
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8020'),

      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8023'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8023'),

      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8029'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8029'),

      '/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes/, ''),
      },
      '/mes/api': createServiceProxyConfig('mes', 'http://localhost:8030'),
      '/mes/health': createServiceProxyConfig('mes', 'http://localhost:8030'),

      '/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm/, ''),
      },
      '/pdm/api': createServiceProxyConfig('pdm', 'http://localhost:8031'),
      '/pdm/health': createServiceProxyConfig('pdm', 'http://localhost:8031'),

      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createServiceProxyConfig('scm', 'http://localhost:8040'),

      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8041'),
      '/wms/health': createServiceProxyConfig('wms', 'http://localhost:8041'),

      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8042'),
      '/srm/health': createServiceProxyConfig('srm', 'http://localhost:8042'),

      '/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qms/, ''),
      },
      '/qms/api': createServiceProxyConfig('qms', 'http://localhost:8050'),
      '/qms/health': createServiceProxyConfig('qms', 'http://localhost:8050'),

      '/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/lims/, ''),
      },
      '/lims/api': createServiceProxyConfig('lims', 'http://localhost:8051'),
      '/lims/health': createServiceProxyConfig('lims', 'http://localhost:8051'),

      '/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ehs/, ''),
      },
      '/ehs/api': createServiceProxyConfig('ehs', 'http://localhost:8052'),
      '/ehs/health': createServiceProxyConfig('ehs', 'http://localhost:8052'),

      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8053'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8053'),

      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/bi/health': createServiceProxyConfig('bi', 'http://localhost:8060'),

      '/report': {
        target: 'http://localhost:8061',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report/, ''),
      },
      '/report/api': createServiceProxyConfig('report', 'http://localhost:8061'),
      '/report/health': createServiceProxyConfig('report', 'http://localhost:8061'),

      '/monitor/api': createServiceProxyConfig('monitor', 'http://localhost:8062'),
      '/monitor/health': createServiceProxyConfig('monitor', 'http://localhost:8062'),

      '/portal/api': createServiceProxyConfig('portal', 'http://localhost:8063'),
      '/portal/health': createServiceProxyConfig('portal', 'http://localhost:8063'),

      '/mobile/api': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/health': createServiceProxyConfig('mobile', 'http://localhost:8070'),

      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8071'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8071'),

      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8072'),

      '/migration/api': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/migration/health': createServiceProxyConfig('migration', 'http://localhost:8787'),

      '/master/api': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/master/health': createServiceProxyConfig('master', 'http://localhost:8000'),

      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8064'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8064'),

      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8000'),

      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      '/manufacturing/health': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),

      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
    },
  },
});
