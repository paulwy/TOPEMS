import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'

import type { IncomingMessage, ServerResponse } from 'http';

// Deployment mode: 'module-federation' | 'static' | 'hybrid'
// Default to 'static' in development to avoid cross-origin Module Federation issues
const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

// Remote entry URL for Module Federation
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

// Check if we should enable Module Federation
const enableMF = DEPLOYMENT_MODE !== 'static';

// Build plugins array based on deployment mode
const plugins = [react()];

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
    },
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
  build: {
    rollupOptions: {
      output: {
        // In static mode, externalize remote module imports
        external: DEPLOYMENT_MODE === 'static' ? [
          'topems_core',
          /^topems_core\/.*/,
        ] : [],
      },
    },
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
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
      // ================================================================================
      // API 代理命名规则
      // --------------------------------------------------------------------------------
      // 前端 API 调用: apiClient.{service}.get('/api/{service}/{resource}')
      // 请求 URL:       /{service}/api/{service}/{resource}
      // 代理转换:       /{service}/api/{service}/ -> /api/{service}/
      // 后端路由:       /api/{service}/{resource}
      //
      // 示例 (CRM):
      //   前端调用: apiClient.crm.get('/api/crm/customers')
      //   请求 URL: /crm/api/crm/customers
      //   代理转换: /crm/api/crm/customers -> /api/crm/customers
      //   后端路由: /api/crm/customers
      // ================================================================================

      // ========== [核心平台] 统一核心服务代理 ==========
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
      
      // ========== [已整合] 通讯服务 ==========
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
      
      // ========== [IAM 服务代理] ==========
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
        rewrite: (path: string) => path.replace(/^\/flow(\/.*)$/, '/api/core/flow$1'),
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
      
      // 通用路由
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      
      // ========== HRM 服务代理 ==========
      // 规则: /hrm/api/hrm/{resource} -> /api/hrm/{resource}
      '/hrm/api/hrm/': {
        target: 'http://localhost:8011',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm\/api\/hrm\//, '/api/hrm/'),
      },
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      
      // ========== 其他业务服务代理 ==========
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8000'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8020'),
      
      // ========== [已整合] 制造服务代理 ==========
      '/mfg/api': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8023'),
      '/manufacturing/health': createServiceProxyConfig('manufacturing', 'http://localhost:8023'),
      '/mes': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes(\/.*)$/, '/api/mfg$1'),
      },
      '/pdm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm(\/.*)$/, '/api/mfg/pdm$1'),
      },
      
      // ========== [已整合] 质量管控服务代理 ==========
      '/qa/api': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qa/, '/api/qa'),
      },
      '/qms': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qms(\/.*)$/, '/api/qa/quality$1'),
      },
      '/lims': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/lims(\/.*)$/, '/api/qa/lab$1'),
      },
      '/ehs': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ehs(\/.*)$/, '/api/qa/ehs$1'),
      },
      
      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8041'),
      '/srm/health': createServiceProxyConfig('srm', 'http://localhost:8041'),
      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8042'),
      '/wms/health': createServiceProxyConfig('wms', 'http://localhost:8042'),
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8001'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8001'),
      '/unified-core/api': createServiceProxyConfig('unified-core', 'http://localhost:8000'),
      '/unified-core/health': createServiceProxyConfig('unified-core', 'http://localhost:8000'),
      '/master/api': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/master/health': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/report': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report(\/.*)$/, '/api/analytics/report$1'),
      },
      '/mobile/api': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/health': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/migration/api': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/migration/health': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/quality-assurance/api': createServiceProxyConfig('quality-assurance', 'http://localhost:8032'),
      '/quality-assurance/health': createServiceProxyConfig('quality-assurance', 'http://localhost:8032'),
    },
  },
});
