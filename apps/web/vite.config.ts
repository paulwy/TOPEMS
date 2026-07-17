import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'

import type { IncomingMessage, ServerResponse } from 'http';

// Deployment mode: 'module-federation' | 'static' | 'hybrid'
const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'module-federation';

// Remote entry URL for Module Federation
const getRemoteEntryUrl = () => {
  const env = loadEnv('', process.cwd(), '');
  if (DEPLOYMENT_MODE === 'static') {
    // In static mode, use local chunks instead of remote
    return undefined;
  }
  // Dynamic mode: use remote entry from env or default to localhost:3001/remoteEntry.js
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

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_portal',
      /**
       * Remote modules configuration
       * 核心模块通过 Module Federation 动态加载
       *
       * 部署模式:
       * - module-federation: 动态加载远程模块 (SaaS)
       * - static: 静态打包所有模块 (本地安装)
       * - hybrid: 核心静态 + 插件动态
       */
      remotes: DEPLOYMENT_MODE !== 'static' ? {
        topems_core: getRemoteEntryUrl(),
      } : {},
      /**
       * Shared dependencies - These are shared between host and remotes
       * 配置为 singleton 模式避免重复加载
       */
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
      },
    }),
  ],
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
    // Module Federation handles shared dependencies automatically
    // DO NOT use manualChunks when using Module Federation
    rollupOptions: {
      output: {
        // manualChunks is disabled when using Module Federation
        // The federation plugin automatically optimizes shared dependencies
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
      // ========== [核心平台] 统一核心服务代理 ==========
      // unified-core: IAM + Doc + Flow + File + Communication
      // 所有核心服务统一到端口 8000
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
      
      // ========== [已整合] 通讯服务 - 向后兼容代理 ==========
      // 新统一通讯服务 (notification + im + mail -> unified-core)
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
      
      // ========== [向后兼容] 旧核心服务路由代理 ==========
      // IAM auth 代理 (/iam/api/v1/auth/* -> /api/v1/auth/*)
      '/iam/api/v1/auth/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam/, ''),
      },
      '/iam/api/v1/auth/register': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam/, ''),
      },
      '/iam/api/v1/auth/refresh': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam/, ''),
      },
      
      // IAM API 服务代理 (/iam/api/* -> /api/core/iam/*)
      '/iam/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam(\/api.*)$/, '/api/core$1'),
      },
      
      // Doc 服务代理 (/doc/* -> /api/core/doc/*)
      '/doc': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/doc(\/.*)$/, '/api/core/doc$1'),
      },
      
      // Flow 服务代理 (/flow/* -> /api/core/flow/*)
      '/flow': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/flow(\/.*)$/, '/api/core/flow$1'),
      },
      
      // File 服务代理 (/file/* -> /api/core/file/*)
      '/file': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/file(\/.*)$/, '/api/core/file$1'),
      },
      
      // 邮件服务代理 (/mail/* -> /api/core/comm/mail/*)
      '/mail': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mail(\/.*)$/, '/api/core/comm/mail$1'),
      },
      
      // 通知服务代理 - API v1 路径直接转发
      '/notification/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification(\/api\/v1.*)$/, '$1'),
      },
      // 通知服务代理 (/notification/* -> /api/core/comm/notify/*)
      '/notification': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification(\/.*)$/, '/api/core/comm/notify$1'),
      },
      
      // IM 服务代理 (/im/* -> /api/core/comm/im/*)
      '/im': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/im(\/.*)$/, '/api/core/comm/im$1'),
      },
      
      // 通用路由
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8000'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      // ERP 插件代理（通过 unified-core）
      '/api/plugins/erp': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/plugins\/erp/, '/api/plugins/erp'),
      },
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8020'),
      
      // ========== [已整合] 制造服务代理 ==========
      // 新统一制造服务 (mes + pdm -> manufacturing)
      '/mfg/api': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8023'),
      '/manufacturing/health': createServiceProxyConfig('manufacturing', 'http://localhost:8023'),
      
      // 向后兼容：MES 服务代理 -> manufacturing
      '/mes': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes(\/.*)$/, '/api/mfg$1'),
      },
      
      // 向后兼容：PDM 服务代理 -> manufacturing
      '/pdm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm(\/.*)$/, '/api/mfg/pdm$1'),
      },
      
      // ========== [已整合] 质量管控服务代理 ==========
      // 新统一质量服务 (qms + lims + ehs -> quality-assurance)
      '/qa/api': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qa/, '/api/qa'),
      },
      
      // 向后兼容：QMS 服务代理 -> quality-assurance
      '/qms': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/qms(\/.*)$/, '/api/qa/quality$1'),
      },
      
      // 向后兼容：LIMS 服务代理 -> quality-assurance
      '/lims': {
        target: 'http://localhost:8032',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/lims(\/.*)$/, '/api/qa/lab$1'),
      },
      
      // 向后兼容：EHS 服务代理 -> quality-assurance
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
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8053'),
      // [已整合] IM API - 注释掉，使用 /comm/im/*
      // '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      // '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      
      // 向后兼容：Report 服务代理 -> analytics
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
      
      // ========== [Module Federation] Core Remote Module 代理 ==========
      // 将 /core-remote/* 请求代理到 apps/core 的 Vite dev server
      '/core-remote': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/core-remote/, ''),
      },
    },
  },
});
