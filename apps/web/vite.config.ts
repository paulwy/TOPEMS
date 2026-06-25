import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

import type { IncomingMessage, ServerResponse } from 'http';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

const env = loadEnv('', process.cwd(), '');

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

const getRemoteEntryUrl = (moduleName: string): string | undefined => {
  if (DEPLOYMENT_MODE === 'static') {
    return undefined;
  }
  const envKey = `VITE_${moduleName.toUpperCase()}_REMOTE_ENTRY`;
  const defaultUrls: Record<string, string> = REMOTE_MODULES.reduce((acc, module) => {
    acc[module.name] = `http://localhost:${module.port}/remoteEntry.js`;
    return acc;
  }, {} as Record<string, string>);
  return env[envKey] || defaultUrls[moduleName] || undefined;
};

const buildRemotesConfig = () => {
  const remotes: Record<string, string | undefined> = {};
  REMOTE_MODULES.forEach((module) => {
    const url = getRemoteEntryUrl(module.name);
    if (url) {
      remotes[module.name] = url;
    }
  });
  return remotes;
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

const sharedDependencies = {
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
  '@mui/icons-material': {
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
  'clsx': {
    singleton: true,
    requiredVersion: '^2.0.0',
    strictVersion: true,
  },
  'lucide-react': {
    singleton: true,
    requiredVersion: '^1.0.0',
    strictVersion: true,
  },
  'zod': {
    singleton: true,
    requiredVersion: '^4.0.0',
    strictVersion: true,
  },
};

const plugins = [react(), viteCompression({
  algorithm: 'gzip',
  threshold: 10240,
  verbose: true,
}), viteCompression({
  algorithm: 'brotliCompress',
  threshold: 10240,
  verbose: false,
})];

if (enableMF) {
  plugins.push(
    federation({
      name: 'topems_portal',
      filename: 'remoteEntry.js',
      exposes: {
        './PluginLoader': './src/lib/plugin-loader.ts',
        './PluginRuntime': './src/lib/plugin-runtime.ts',
        './hooks/usePluginStore': './src/store/pluginStore.ts',
        './api/plugin': './src/api/plugin.ts',
        './routes/plugin': './src/routes/plugin.ts',
        './config/plugins': './src/config/plugins.config.ts',
      },
      remotes: buildRemotesConfig(),
      shared: sharedDependencies,
      extraOptions: {
        automaticAsyncBoundary: true,
        experimental: {
          optimizeDeps: true,
        },
      },
    })
  );
}

const remoteModuleNames = REMOTE_MODULES.map((m) => m.name);

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      '@topems/shared-constants': path.resolve(__dirname, '../../packages/shared-constants/src'),
      'react-transition-group': path.resolve(__dirname, '../../node_modules/react-transition-group'),
      'react-transition-group/cjs': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs'),
      'react-transition-group/TransitionGroupContext': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
    },
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
        external: DEPLOYMENT_MODE === 'static' ? [
          ...remoteModuleNames,
          ...remoteModuleNames.map((name) => new RegExp(`^${name}\\/.*`)),
        ] : [],
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
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
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
      },
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
      
      '/iam/api/iam/auth/': {
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

      '/plugin-health/erp': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/erp/, ''),
      },
      '/plugin-health/hrm': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/hrm/, ''),
      },
      '/plugin-health/pm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/pm/, ''),
      },
      '/plugin-health/crm': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/crm/, ''),
      },
      '/plugin-health/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/mes/, ''),
      },
      '/plugin-health/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/pdm/, ''),
      },
      '/plugin-health/scm': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/scm/, ''),
      },
      '/plugin-health/wms': {
        target: 'http://localhost:8041',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/wms/, ''),
      },
      '/plugin-health/srm': {
        target: 'http://localhost:8042',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/srm/, ''),
      },
      '/plugin-health/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/qms/, ''),
      },
      '/plugin-health/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/lims/, ''),
      },
      '/plugin-health/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/ehs/, ''),
      },
      '/plugin-health/rs': {
        target: 'http://localhost:8053',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/rs/, ''),
      },
      '/plugin-health/bi': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/bi/, ''),
      },
      '/plugin-health/report': {
        target: 'http://localhost:8061',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/report/, ''),
      },
      '/plugin-health/monitor': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/monitor/, ''),
      },
      '/plugin-health/portal': {
        target: 'http://localhost:8063',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/portal/, ''),
      },
      '/plugin-health/mobile': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/mobile/, ''),
      },
      '/plugin-health/gis': {
        target: 'http://localhost:8071',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/gis/, ''),
      },
      '/plugin-health/integration': {
        target: 'http://localhost:8072',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/integration/, ''),
      },
      '/plugin-health/workflow': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/plugin-health\/workflow/, ''),
      },

      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },

      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});