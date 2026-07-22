import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'
import { visualizer } from 'rollup-plugin-visualizer'

import type { IncomingMessage, ServerResponse } from 'http';

// Deployment mode: 'module-federation' | 'static' | 'hybrid'
const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

/**
 * 从环境变量读取单个 remote 的 entry URL
 *
 * 多 remote 配置约定：
 *   VITE_REMOTE_<NAME_UPPER>=https://host/remoteEntry.js
 *
 * 生产环境注入示例：
 *   VITE_REMOTE_TOPEMS_CORE=https://core.topems.com/remoteEntry.js
 *   VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
 *   VITE_REMOTE_TOPEMS_HRM=https://hrm.topems.com/remoteEntry.js
 *   ...
 *
 * 完整模块清单与运行时配置见 apps/web/src/microfrontend/config.ts
 * （REMOTE_MODULES 中定义了所有可启用的业务域模块）
 */
const getRemoteEntry = (name: string, defaultValue: string): string => {
  const env = loadEnv('', process.cwd(), '');
  if (DEPLOYMENT_MODE === 'static') {
    // 静态部署模式下不加载任何 remote
    return '';
  }
  const envKey = `VITE_REMOTE_${name.toUpperCase()}`;
  return env[envKey] || defaultValue;
};

/**
 * 构建 federation remotes 配置
 *
 * - module-federation / hybrid: 启用 topems_core 作为基础 remote
 * - static: 关闭所有 remote（使用本地打包）
 *
 * 扩展多 remote：
 *   1. 在 apps/web/src/microfrontend/config.ts 的 REMOTE_MODULES 中追加配置
 *   2. 通过环境变量 VITE_REMOTE_TOPEMS_<NAME> 注入生产入口
 *   3. 可按下方示例在返回对象中追加 remote（仅显式声明的 remote 会被 federation 编译期处理）
 *
 *   return {
 *     topems_core: getRemoteEntry('topems_core', 'http://localhost:3001/remoteEntry.js'),
 *     topems_erp:  getRemoteEntry('topems_erp',  'http://localhost:3002/remoteEntry.js'),
 *     topems_hrm:  getRemoteEntry('topems_hrm',  'http://localhost:3003/remoteEntry.js'),
 *     // ...
 *   };
 *
 * 运行时动态加载（推荐生产环境使用）见
 * apps/web/src/microfrontend/RemoteLoader.tsx
 */
const buildRemotes = (): Record<string, string> => {
  if (DEPLOYMENT_MODE === 'static') {
    return {};
  }
  // 保留 topems_core 作为基础 remote，向后兼容
  return {
    topems_core: getRemoteEntry('topems_core', 'http://localhost:3001/remoteEntry.js'),
  };
};

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/v1/${serviceName}`),
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

const createNewApiProxyConfig = (servicePath: string, target: string) => ({
  target,
  changeOrigin: true,
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.includes('/health')) {
        console.warn(`[Vite Proxy] ${servicePath.toUpperCase()} service unavailable, error:`, err.message);
      }
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 503,
          success: false,
          message: `${servicePath.toUpperCase()} service is currently unavailable`,
          data: null
        }));
      }
    });
  }
});

const HEALTH_CHECK_PATHS: Record<string, string> = {
  'ai': '/health',
  'bi': '/health',
  'analytics': '/health',
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
       *
       * 多 remote 扩展：
       * - 编译期声明的 remote 通过 buildRemotes() 返回
       * - 运行时按需加载见 apps/web/src/microfrontend/RemoteLoader.tsx
       * - 模块清单（业务域拆分、权限、预加载策略）见
       *   apps/web/src/microfrontend/config.ts 的 REMOTE_MODULES
       */
      remotes: buildRemotes(),
      /**
       * Shared dependencies - These are shared between host and remotes
       * 配置为 singleton 模式避免重复加载
       *
       * 新增 shared 依赖（版本协商 + 降级）：
       * - @tanstack/react-query: 业务模块共享 QueryClient
       * - react-hook-form: 业务模块共享表单状态
       * - zod: 业务模块共享 schema 验证
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
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
          strictVersion: true,
        },

        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.0.0',
        },
        'zod': {
          singleton: true,
          requiredVersion: '^3.0.0',
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          icons: ['lucide-react'],
          charts: ['recharts'],
          maps: ['leaflet', '@react-leaflet/core', 'react-leaflet'],
          excel: ['xlsx'],
          i18n: ['i18next', 'react-i18next'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
      plugins: [
        visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
      ],
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
      // ========== [新路径直通] Group 1 核心服务 /api/core/* 直通 ==========
      '/api/core/': createNewApiProxyConfig('api/core', 'http://localhost:8000'),
      // ========== [新路径直通] Group 2 独立服务 /api/{service}/* 直通 ==========
      '/api/erp/': createNewApiProxyConfig('api/erp', 'http://localhost:8010'),
      '/api/finance/': createNewApiProxyConfig('api/finance', 'http://localhost:8011'),
      '/api/doc/': createNewApiProxyConfig('api/doc', 'http://localhost:8012'),
      '/api/hrm/': createNewApiProxyConfig('api/hrm', 'http://localhost:8020'),
      '/api/pm/': createNewApiProxyConfig('api/pm', 'http://localhost:8023'),
      '/api/crm/': createNewApiProxyConfig('api/crm', 'http://localhost:8029'),
      '/api/mes/': createNewApiProxyConfig('api/mes', 'http://localhost:8030'),
      '/api/pdm/': createNewApiProxyConfig('api/pdm', 'http://localhost:8031'),
      '/api/scm/': createNewApiProxyConfig('api/scm', 'http://localhost:8040'),
      '/api/wms/': createNewApiProxyConfig('api/wms', 'http://localhost:8041'),
      '/api/srm/': createNewApiProxyConfig('api/srm', 'http://localhost:8042'),
      '/api/qms/': createNewApiProxyConfig('api/qms', 'http://localhost:8050'),
      '/api/lims/': createNewApiProxyConfig('api/lims', 'http://localhost:8051'),
      '/api/ehs/': createNewApiProxyConfig('api/ehs', 'http://localhost:8052'),
      '/api/rd/': createNewApiProxyConfig('api/rd', 'http://localhost:8053'),
      '/api/bi/': createNewApiProxyConfig('api/bi', 'http://localhost:8060'),
      '/api/report/': createNewApiProxyConfig('api/report', 'http://localhost:8060'),
      '/api/analytics/': createNewApiProxyConfig('api/analytics', 'http://localhost:8060'),
      '/api/monitor/': createNewApiProxyConfig('api/monitor', 'http://localhost:8062'),
      '/api/portal/': createNewApiProxyConfig('api/portal', 'http://localhost:8063'),
      '/api/ai/': createNewApiProxyConfig('api/ai', 'http://localhost:8013'),
      '/api/mobile/': createNewApiProxyConfig('api/mobile', 'http://localhost:8070'),
      '/api/gis/': createNewApiProxyConfig('api/gis', 'http://localhost:8071'),
      // New /api/core/{service}/v1 paths
      '/api/core/ai/': createNewApiProxyConfig('api/core/ai', 'http://localhost:8013'),
      '/api/core/doc/': createNewApiProxyConfig('api/core/doc', 'http://localhost:8012'),
      '/api/core/gis/': createNewApiProxyConfig('api/core/gis', 'http://localhost:8071'),
      '/api/core/mobile/': createNewApiProxyConfig('api/core/mobile', 'http://localhost:8070'),
      '/api/core/finance/': createNewApiProxyConfig('api/core/finance', 'http://localhost:8011'),
      '/api/core/rd/': createNewApiProxyConfig('api/core/rd', 'http://localhost:8053'),
      '/api/integration/': createNewApiProxyConfig('api/integration', 'http://localhost:8072'),

      // ========== [核心平台] 统一核心服务代理 ==========
      // unified-core: IAM + Doc + Flow + File + Communication
      // 所有核心服务统一到端口 8000
      '/core/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/core/, '/api/v1/core'),
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
        rewrite: (path: string) => path.replace(/^\/comm/, '/api/v1/core/comm'),
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
        rewrite: (path: string) => path.replace(/^\/iam(\/api.*)$/, '/api/v1/core$1'),
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
        rewrite: (path: string) => path.replace(/^\/flow\/api(.*)$/, '/api/v1/core/flow$1'),
      },
      '/flow/health': createHealthProxyConfig('flow', 'http://localhost:8000'),

      // File 服务代理
      // 注意：/file/* 是前端页面路由（如 /file/list），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/file/* (见下方 /api/core 代理)
      '/file/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/file\/api(.*)$/, '/api/v1/core/file$1'),
      },
      '/file/health': createHealthProxyConfig('file', 'http://localhost:8000'),

      // 邮件服务代理
      // 注意：/mail/* 是前端页面路由（如 /mail/inbox），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/mail/* (见下方 /api/core 代理)
      '/mail/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mail\/api(.*)$/, '/api/v1/core/mail$1'),
      },
      '/mail/health': createHealthProxyConfig('mail', 'http://localhost:8000'),

      // 通知服务代理
      // 注意：/notification/* 是前端页面路由（如 /notification/dashboard），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/notification/* (见下方 /api/core 代理)
      '/notification/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/notification\/api(.*)$/, '/api/v1/core/notification$1'),
      },
      '/notification/health': createHealthProxyConfig('notification', 'http://localhost:8000'),

      // IM 服务代理
      // 注意：/im/* 是前端页面路由（如 /im/chat），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/core/im/* (见下方 /api/core 代理)
      '/im/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/im\/api(.*)$/, '/api/v1/core/im$1'),
      },
      '/im/health': createHealthProxyConfig('im', 'http://localhost:8000'),
      
      // 通用路由 - 放在所有服务特定路由之后
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8020'),
      '/hrm/health': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path: string) => '/health',
      },
      '/flow/health': createHealthProxyConfig('flow', 'http://localhost:8000'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8072'),
      '/integration/health': createHealthProxyConfig('integration', 'http://localhost:8072'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/erp(\/health)$/, '/api/v1/erp$1'),
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
        rewrite: (path: string) => path.replace(/^\/monitor\/api/, '/api/v1/monitor'),
      },
      '/monitor/health': createHealthProxyConfig('monitor', 'http://localhost:8062'),
      
      // [已整合] IM API - 注释掉，使用 /comm/im/*
      // '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      // '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      
      // 向后兼容：Report 服务代理 -> BI 服务
      // 注意：/report/* 是前端页面路由（如 /report/list），不可使用过于宽泛的代理
      // 实际 API 请求走 /api/report/* (见下方 /api/report 代理)
      '/report/api': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report\/api(.*)$/, '/api/bi/report$1'),
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
      
      // ========== [API路径代理] Group2 独立服务 /api/v1/{service} 格式 ==========
      '/api/v1/doc': {
        target: 'http://localhost:8012',
        changeOrigin: true,
      },
      '/api/v1/qms': {
        target: 'http://localhost:8050',
        changeOrigin: true,
      },
      '/api/v1/lims': {
        target: 'http://localhost:8051',
        changeOrigin: true,
      },
      '/api/v1/ehs': {
        target: 'http://localhost:8052',
        changeOrigin: true,
      },
      '/api/v1/rd': {
        target: 'http://localhost:8053',
        changeOrigin: true,
      },
      '/api/v1/scm': {
        target: 'http://localhost:8040',
        changeOrigin: true,
      },
      '/api/v1/srm': {
        target: 'http://localhost:8042',
        changeOrigin: true,
      },
      '/api/v1/wms': {
        target: 'http://localhost:8041',
        changeOrigin: true,
      },
      '/api/v1/bi': {
        target: 'http://localhost:8060',
        changeOrigin: true,
      },
      '/api/v1/report': {
        target: 'http://localhost:8060',
        changeOrigin: true,
      },
      '/api/v1/analytics': {
        target: 'http://localhost:8060',
        changeOrigin: true,
      },
      '/api/v1/erp': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
      '/api/v1/finance': {
        target: 'http://localhost:8011',
        changeOrigin: true,
      },
      '/api/v1/hrm': {
        target: 'http://localhost:8020',
        changeOrigin: true,
      },
      '/api/v1/crm': {
        target: 'http://localhost:8029',
        changeOrigin: true,
      },
      '/api/v1/pm': {
        target: 'http://localhost:8023',
        changeOrigin: true,
      },
      '/api/v1/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
      },
      '/api/v1/pdm': {
        target: 'http://localhost:8031',
        changeOrigin: true,
      },
      '/api/v1/ai': {
        target: 'http://localhost:8013',
        changeOrigin: true,
      },
      '/api/v1/mobile': {
        target: 'http://localhost:8070',
        changeOrigin: true,
      },
      '/api/v1/gis': {
        target: 'http://localhost:8071',
        changeOrigin: true,
      },
      '/api/v1/integration': {
        target: 'http://localhost:8072',
        changeOrigin: true,
      },
      '/api/v1/monitor': {
        target: 'http://localhost:8062',
        changeOrigin: true,
      },
      '/api/v1/portal': {
        target: 'http://localhost:8063',
        changeOrigin: true,
      },
      // ========== [API路径代理] Group1 核心服务 /api/v1/core/{service} 统一格式 ==========
      // 前端请求 /api/v1/core/iam/auth/login 等路径，代理到 unified-core
      '/api/v1/core': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/v1\/core/, '/api/v1/core'),
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
