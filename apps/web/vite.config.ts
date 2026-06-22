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
      // API 代理配置说明
      // --------------------------------------------------------------------------------
      // Vite 开发服务器代理配置，将前端请求转发到后端服务
      //
      // 【模式一：标准服务模式】适用于独立服务（CRM、ERP、HRM、Flow、BI、MES等）
      //   前端调用: apiClient.{service}.get('/api/{service}/{resource}')
      //   服务 baseURL: /{service} (来自 runtime.ts services.{service})
      //   请求 URL:     /{service}/api/{service}/{resource}
      //   rewrite 规则: 简单去除 /{service} 前缀
      //   示例: /flow/api/flow/approvals -> /api/flow/approvals
      //
      // 【模式二：核心平台模式】适用于集成在核心平台的服务（Doc、File、Mail等）
      //   前端调用: apiClient.{service}.get('/api/{path}')
      //   服务 baseURL: /{service} (来自 runtime.ts services.{service})
      //   请求 URL:     /{service}/api/{path}
      //   rewrite 规则: 添加核心平台前缀 /api/core/{service}/
      //   示例: /doc/api/documents -> /api/core/doc/documents
      //
      // 【代理顺序重要】特定路径必须放在通用路径之前！
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
      // IAM 登录专用路由（必须在 /iam/api 之前）
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
      
      // ========== BI 服务代理 (需要放在 /api 通用代理之前) ==========
      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/bi/health': createServiceProxyConfig('bi', 'http://localhost:8060'),

      // 通用路由
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      
      // ========== HRM 服务代理 ==========
      // 规则: /hrm/api/hrm/{resource} -> /api/hrm/{resource}
      '/hrm/api/hrm/': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm\/api\/hrm\//, '/api/hrm/'),
      },
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8020'),
      
      // ========== 其他业务服务代理 ==========
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8000'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8029'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8029'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8000'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8000'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8053'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8053'),
      
      // ========== [已整合] 制造服务代理 ==========
      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      '/manufacturing/health': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      '/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes/, ''),
      },
      '/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm/, ''),
      },
      
      // ========== [已拆分] 质量管控服务代理 ==========
      // QMS: 8050, LIMS: 8051, EHS: 8052
      '/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qms/, ''),
      },
      '/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/lims/, ''),
      },
      '/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ehs/, ''),
      },
      
      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8042'),
      '/srm/health': createServiceProxyConfig('srm', 'http://localhost:8042'),
      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8041'),
      '/wms/health': createServiceProxyConfig('wms', 'http://localhost:8041'),
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8022'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8022'),
      '/unified-core/api': createServiceProxyConfig('unified-core', 'http://localhost:8000'),
      '/unified-core/health': createServiceProxyConfig('unified-core', 'http://localhost:8000'),
      '/master/api': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/master/health': createServiceProxyConfig('master', 'http://localhost:8000'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8071'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8071'),
      '/report': {
        target: 'http://localhost:8061',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report/, ''),
      },
      '/mobile/api': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/health': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/migration/api': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/migration/health': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/quality-assurance/api': createServiceProxyConfig('quality-assurance', 'http://localhost:8052'),
      '/quality-assurance/health': createServiceProxyConfig('quality-assurance', 'http://localhost:8052'),
    },
  },
});
