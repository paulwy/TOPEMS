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
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/${serviceName}`),
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

const HEALTH_CHECK_PATHS: Record<string, string> = {
  'ai': '/health',
  'bi': '/health',
  'report': '/health',
  'monitor': '/health',
  'portal': '/health',
  'mobile': '/health',
  'gis': '/health',
  'integration': '/health',
  'hrm': '/health',
  'pm': '/health',
  'crm': '/health',
  'mes': '/health',
  'pdm': '/health',
  'scm': '/health',
  'wms': '/health',
  'srm': '/health',
  'qms': '/health',
  'lims': '/health',
  'ehs': '/health',
  'rs': '/health',
  'erp': '/health',
  'finance': '/health',
  'doc': '/health',
  'notification': '/health',
  'file': '/health',
  'mail': '/health',
  'im': '/health',
  'unified-core': '/health',
  'flow': '/health',
  'manufacturing': '/health',
  'quality-assurance': '/health',
};

const createHealthProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => {
    const healthPath = HEALTH_CHECK_PATHS[serviceName] || `/health`;
    return healthPath;
  },
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      console.warn(`[Vite Proxy] ${serviceName.toUpperCase()} health check failed:`, err.message);
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 503,
          success: false,
          message: `${serviceName.toUpperCase()} service health check failed`,
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
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
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
      '@topems/tokens': path.resolve(__dirname, '../../packages/tokens/dist'),
      '@topems/shared-constants': path.resolve(__dirname, '../../packages/shared-constants/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
    },
    dedupe: ['react', 'react-dom', 'scheduler', 'react-router-dom', '@tanstack/react-query'],
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
      
      // ========== [服务特定 WebSocket] ==========
      '/ws/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        ws: true,
      },
      '/ws/gis': {
        target: 'http://localhost:8071',
        changeOrigin: true,
        ws: true,
      },
      
      // IAM API 服务代理 (/iam/api/* -> /api/core/iam/*)
      '/iam/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam(\/api.*)$/, '/api/core$1'),
      },
      
      // Doc 服务代理（独立服务，端口 8012）
      // 注意：/doc/* 是前端页面路由（如 /doc/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/doc/* (见下方 /api/doc 代理)
      '/doc/api': createServiceProxyConfig('doc', 'http://localhost:8012'),
      '/doc/health': createHealthProxyConfig('doc', 'http://localhost:8012'),

      // Flow 服务代理
      // 注意：/flow/* 是前端页面路由（如 /flow/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/flow/* (见下方 /api/core 代理)
      '/flow/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/flow\/api(.*)$/, '/api/core/flow$1'),
      },
      '/flow/health': createHealthProxyConfig('flow', 'http://localhost:8000'),

      // File 服务代理
      // 注意：/file/* 是前端页面路由（如 /file/list），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/file/* (见下方 /api/core 代理)
      '/file/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/file\/api(.*)$/, '/api/core/file$1'),
      },
      '/file/health': createHealthProxyConfig('file', 'http://localhost:8000'),

      // 邮件服务代理
      // 注意：/mail/* 是前端页面路由（如 /mail/inbox），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/mail/* (见下方 /api/core 代理)
      '/mail/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mail\/api(.*)$/, '/api/core/mail$1'),
      },
      '/mail/health': createHealthProxyConfig('mail', 'http://localhost:8000'),

      // 通知服务代理
      // 注意：/notification/* 是前端页面路由（如 /notification/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/notification/* (见下方 /api/core 代理)
      '/notification/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification\/api(.*)$/, '/api/core/notification$1'),
      },
      '/notification/health': createHealthProxyConfig('notification', 'http://localhost:8000'),

      // IM 服务代理
      // 注意：/im/* 是前端页面路由（如 /im/chat），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/im/* (见下方 /api/core 代理)
      '/im/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/im\/api(.*)$/, '/api/core/im$1'),
      },
      '/im/health': createHealthProxyConfig('im', 'http://localhost:8000'),
      
      // 通用路由 - 放在所有服务特定路由之后
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8020'),
      '/hrm/health': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm(\/health)$/, '/api/hrm$1'),
      },
      '/flow/health': createHealthProxyConfig('flow', 'http://localhost:8000'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/integration/health': createHealthProxyConfig('integration', 'http://localhost:8072'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp(\/health)$/, '/api/erp$1'),
      },
      // ERP 插件代理（通过 unified-core）
      '/api/plugins/erp': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/plugins\/erp/, '/api/plugins/erp'),
      },
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8029'),
      '/crm/health': createHealthProxyConfig('crm', 'http://localhost:8029'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8013'),
      '/ai/health': createHealthProxyConfig('ai', 'http://localhost:8013'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8053'),
      '/rs/health': createHealthProxyConfig('rs', 'http://localhost:8053'),
      
      // ========== [已整合] 制造服务代理 ==========
      // 新统一制造服务 (mes + pdm -> manufacturing)
      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
      '/manufacturing/api': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      '/manufacturing/health': createServiceProxyConfig('manufacturing', 'http://localhost:8030'),
      
      // 向后兼容：MES 服务代理 -> manufacturing
      // 注意：/mes/* 是前端页面路由（如 /mes/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/mes/* (见下方 /api/mes 代理)
      '/mes/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes\/api(.*)$/, '/api/mes$1'),
      },
      '/mes/health': createHealthProxyConfig('mes', 'http://localhost:8030'),
      
      // 向后兼容：PDM 服务代理 -> manufacturing
      // 注意：/pdm/* 是前端页面路由（如 /pdm/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/pdm/* (见下方 /api/pdm 代理)
      '/pdm/api': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pdm\/api(.*)$/, '/api/pdm$1'),
      },
      '/pdm/health': createHealthProxyConfig('pdm', 'http://localhost:8031'),
      
      // ========== [质量管控服务代理] ==========
      // QMS 服务代理
      '/qms/health': createHealthProxyConfig('qms', 'http://localhost:8050'),
      '/qms/api': createServiceProxyConfig('qms', 'http://localhost:8050'),
      
      // LIMS 服务代理
      '/lims/health': createHealthProxyConfig('lims', 'http://localhost:8051'),
      '/lims/api': createServiceProxyConfig('lims', 'http://localhost:8051'),
      
      // EHS 服务代理
      '/ehs/health': createHealthProxyConfig('ehs', 'http://localhost:8052'),
      '/ehs/api': createServiceProxyConfig('ehs', 'http://localhost:8052'),
      
      '/scm/api': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/scm/health': createHealthProxyConfig('scm', 'http://localhost:8040'),
      '/srm/api': createServiceProxyConfig('srm', 'http://localhost:8042'),
      '/srm/health': createHealthProxyConfig('srm', 'http://localhost:8042'),
      '/wms/api': createServiceProxyConfig('wms', 'http://localhost:8041'),
      '/wms/health': createHealthProxyConfig('wms', 'http://localhost:8041'),
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8023'),
      '/pm/health': createHealthProxyConfig('pm', 'http://localhost:8023'),
      '/unified-core/api': createServiceProxyConfig('unified-core', 'http://localhost:8000'),
      '/unified-core/health': createHealthProxyConfig('unified-core', 'http://localhost:8000'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8071'),
      '/gis/health': createHealthProxyConfig('gis', 'http://localhost:8071'),
      
      // Monitor 服务代理
      '/monitor/api': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/monitor\/api/, '/api/monitor'),
      },
      '/monitor/health': createHealthProxyConfig('monitor', 'http://localhost:8062'),
      
      // [已整合] IM API - 注释掉，使用 /comm/im/*
      // '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      // '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      
      // 向后兼容：Report 服务代理 -> analytics
      // 注意：/report/* 是前端页面路由（如 /report/list），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/report/* (见下方 /api/report 代理)
      '/report/api': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report\/api(.*)$/, '/api/analytics/report$1'),
      },
      '/report/health': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: () => '/health',
      },

      '/mobile/api': createServiceProxyConfig('mobile', 'http://localhost:8070'),
      '/mobile/health': createHealthProxyConfig('mobile', 'http://localhost:8070'),
      '/migration/api': createServiceProxyConfig('migration', 'http://localhost:8787'),
      '/migration/health': createHealthProxyConfig('migration', 'http://localhost:8787'),

      '/quality-assurance/api': createServiceProxyConfig('quality-assurance', 'http://localhost:8050'),
      '/quality-assurance/health': createHealthProxyConfig('quality-assurance', 'http://localhost:8050'),
      
      // ========== [API路径代理] /api/服务名 格式 ==========
      // 前端直接请求 /api/doc/documents 等路径
      // 统一核心服务
      '/api/core': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/core/, '/api/core'),
      },
      '/api/doc': {
        target: 'http://localhost:8012',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/doc/, '/api/doc'),
      },
      '/api/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/qms/, '/api/qms'),
      },
      '/api/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/lims/, '/api/lims'),
      },
      '/api/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/ehs/, '/api/ehs'),
      },
      '/api/rd': {
        target: 'http://localhost:8053',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/rd/, '/api/rd'),
      },
      '/api/scm': {
        target: 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/scm/, '/api/scm'),
      },
      '/api/srm': {
        target: 'http://localhost:8042',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/srm/, '/api/srm'),
      },
      '/api/wms': {
        target: 'http://localhost:8041',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/wms/, '/api/wms'),
      },
      '/api/bi': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/bi/, '/api/bi'),
      },
      '/api/report': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/report/, '/api/report'),
      },
      '/api/erp': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/erp/, '/api/erp'),
      },
      '/api/finance': {
        target: 'http://localhost:8011',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/finance/, '/api/finance'),
      },
      '/api/hrm': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/hrm/, '/api/hrm'),
      },
      '/api/crm': {
        target: 'http://localhost:8029',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/crm/, '/api/crm'),
      },
      '/api/pm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/pm/, '/api/pm'),
      },
      '/api/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/mes/, '/api/mes'),
      },
      '/api/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/pdm/, '/api/pdm'),
      },
      '/api/ai': {
        target: 'http://localhost:8013',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/ai/, '/api/ai'),
      },
      '/api/mobile': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/mobile/, '/api/mobile'),
      },
      '/api/gis': {
        target: 'http://localhost:8071',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/gis/, '/api/gis'),
      },
      '/api/integration': {
        target: 'http://localhost:8072',
        changeOrigin: true,
        configure: (proxy: any) => {
          proxy.on('proxyReq', (proxyReq: any, req: any, res: any) => {
            console.log(`[Vite Proxy] integration request: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
            console.log(`[Vite Proxy] integration response: ${proxyRes.statusCode} ${req.url}`);
          });
          proxy.on('error', (err: Error, req: any, res: any) => {
            console.error(`[Vite Proxy] integration error:`, err.message);
          });
        }
      },
      '/api/monitor': {
        target: 'http://localhost:8062',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/monitor/, '/api/monitor'),
      },
      '/api/portal': {
        target: 'http://localhost:8063',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/portal/, '/api/portal'),
      },
      
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
