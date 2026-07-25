import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'
import { visualizer } from 'rollup-plugin-visualizer'

import type { IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// 服务配置（与 config/services.yaml 保持同步）
// 新增服务只需在此处添加，proxy 会自动生成
// ============================================================================

interface ServiceConfig {
  name: string;
  port: number;
  /** 是否为虚拟服务（由 unified-core 提供） */
  isVirtual?: boolean;
  /** 新 API 路径前缀，如 /api/erp 或 /api/core/iam */
  apiPrefix?: string;
  /** 旧路径前缀（向后兼容），如 /erp/api */
  legacyPrefix?: string;
  /** WebSocket 路径 */
  wsPath?: string;
}

const CORE_PORT = 8000;

const SERVICES: ServiceConfig[] = [
  // 核心服务
  { name: 'unified-core', port: CORE_PORT, apiPrefix: '/api/core', legacyPrefix: '/core/api', wsPath: '/ws/core' },
  
  // 虚拟服务（由 unified-core 提供）
  { name: 'iam', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/iam', legacyPrefix: '/iam/api' },
  { name: 'doc', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/doc', legacyPrefix: '/doc/api' },
  { name: 'flow', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/flow', legacyPrefix: '/flow/api' },
  { name: 'file', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/file', legacyPrefix: '/file/api' },

  // 独立 communication 服务（从 unified-core 外迁，端口 8084）
  // mail/notification/im 已外迁至此服务，路径为 /api/communication/{mail,notification,im}
  { name: 'communication', port: 8084, apiPrefix: '/api/communication' },

  // 独立 search 服务（全文搜索，端口 8082）
  { name: 'search', port: 8082, apiPrefix: '/api/search' },

  // 独立 billing/ticket/feedback 服务（从 unified-core 外迁）
  // 旧路由 /api/core/{billing,ticket,feedback}/* 由 /api/core 通用代理兼容
  { name: 'billing', port: 8085, apiPrefix: '/api/billing' },
  { name: 'ticket', port: 8086, apiPrefix: '/api/ticket' },
  { name: 'feedback', port: 8087, apiPrefix: '/api/feedback' },
  
  // 经营管理
  { name: 'erp', port: 8010, apiPrefix: '/api/erp', legacyPrefix: '/erp/api' },
  { name: 'finance', port: 8011, apiPrefix: '/api/finance', legacyPrefix: '/finance/api' },
  { name: 'ai', port: 8013, apiPrefix: '/api/ai', legacyPrefix: '/ai/api' },
  
  // 协同办公
  { name: 'hrm', port: 8020, apiPrefix: '/api/hrm', legacyPrefix: '/hrm/api' },
  { name: 'pm', port: 8023, apiPrefix: '/api/pm', legacyPrefix: '/pm/api' },
  { name: 'crm', port: 8029, apiPrefix: '/api/crm', legacyPrefix: '/crm/api' },
  
  // 生产制造
  { name: 'mes', port: 8030, apiPrefix: '/api/mes', legacyPrefix: '/mes/api', wsPath: '/ws/mes' },
  { name: 'pdm', port: 8031, apiPrefix: '/api/pdm', legacyPrefix: '/pdm/api' },
  
  // 供应链
  { name: 'scm', port: 8040, apiPrefix: '/api/scm', legacyPrefix: '/scm/api' },
  { name: 'wms', port: 8041, apiPrefix: '/api/wms', legacyPrefix: '/wms/api' },
  { name: 'srm', port: 8042, apiPrefix: '/api/srm', legacyPrefix: '/srm/api' },
  
  // 质量/研发
  { name: 'qms', port: 8050, apiPrefix: '/api/qms', legacyPrefix: '/qms/api' },
  { name: 'lims', port: 8051, apiPrefix: '/api/lims', legacyPrefix: '/lims/api' },
  { name: 'ehs', port: 8052, apiPrefix: '/api/ehs', legacyPrefix: '/ehs/api' },
  { name: 'rd', port: 8053, apiPrefix: '/api/rd', legacyPrefix: '/rd/api' },
  
  // 数据分析
  { name: 'bi', port: 8060, apiPrefix: '/api/bi' },
  { name: 'monitor', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/monitor', legacyPrefix: '/monitor/api' },
  { name: 'portal', port: 8063, apiPrefix: '/api/portal' },

  // 主数据服务（独立进程，端口 8090）
  { name: 'master-data', port: 8090, apiPrefix: '/api/master-data' },
  
  // 基础设施
  { name: 'mobile', port: 8070, apiPrefix: '/api/mobile', legacyPrefix: '/mobile/api' },
  { name: 'gis', port: 8071, apiPrefix: '/api/gis', legacyPrefix: '/gis/api', wsPath: '/ws/gis' },
  { name: 'integration', port: 8072, apiPrefix: '/api/integration', legacyPrefix: '/integration/api' },
];

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
  'rd': '/health',
  'erp': '/health',
  'finance': '/health',
  'doc': '/health',
  'file': '/health',
  'communication': '/health',
  'unified-core': '/health',
  'flow': '/health',
  'billing': '/health',
  'ticket': '/health',
  'feedback': '/health',
  'master-data': '/health',
  'search': '/health',
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

// ============================================================================
// 自动生成 proxy 配置
// 从 SERVICES 数组自动生成所有 API proxy、legacy proxy、health proxy、WS proxy
// ============================================================================

const buildServiceProxies = (): Record<string, any> => {
  const proxies: Record<string, any> = {};

  // Dashboard backend proxy - routes /api/{module}/dashboard to port 8080
  const DASHBOARD_PORT = 8080;
  const DASHBOARD_MODULES = ['finance', 'ehs', 'lims', 'crm', 'wms', 'hrm', 'pdm', 'qms', 'mes', 'pm'];
  for (const mod of DASHBOARD_MODULES) {
    proxies[`/api/${mod}/dashboard`] = {
      target: `http://localhost:${DASHBOARD_PORT}`,
      changeOrigin: true,
    };
  }

  for (const svc of SERVICES) {
    const target = `http://localhost:${svc.port}`;

    // 1. 新 API 路径: /api/{service}/* 或 /api/core/{service}/*
    if (svc.apiPrefix) {
      proxies[svc.apiPrefix + '/'] = createNewApiProxyConfig(svc.apiPrefix.slice(1), target);
    }

    // 2. 旧路径（向后兼容）: /{service}/api -> /api/{service}
    if (svc.legacyPrefix) {
      const serviceName = svc.name.replace('-virtual', '');
      proxies[svc.legacyPrefix] = createServiceProxyConfig(serviceName, target);
      
      // health check
      const healthPath = svc.legacyPrefix.replace('/api', '/health');
      proxies[healthPath] = createHealthProxyConfig(serviceName, target);
    }

    // 3. WebSocket
    if (svc.wsPath) {
      proxies[svc.wsPath] = {
        target,
        changeOrigin: true,
        ws: true,
      };
    }
  }

  // /api/* 路径
  const apiV1Services = SERVICES.filter(s => s.apiPrefix && !s.isVirtual);
  for (const svc of apiV1Services) {
    const serviceName = svc.apiPrefix!.replace('/api/', '');
    proxies[`/api/${serviceName}`] = {
      target: `http://localhost:${svc.port}`,
      changeOrigin: true,
    };
  }

  // 核心服务 /api/core
  proxies['/api/core'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通用 health 端点
  proxies['/health'] = { target: `http://localhost:${CORE_PORT}`, changeOrigin: true };

  // Module Federation remote
  proxies['/core-remote'] = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/core-remote/, ''),
  };

  // ERP 插件代理（通过 unified-core）
  proxies['/api/plugins/erp'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通讯服务向后兼容
  proxies['/comm/api'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/comm/, '/api/core/comm'),
  };
  proxies['/comm/health'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };
  proxies['/ws/notifications'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
    ws: true,
  };

  return proxies;
};

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
          requiredVersion: '^9.0.0',
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
          requiredVersion: '^5.0.0',
          strictVersion: true,
        },
        'i18next': {
          singleton: true,
          requiredVersion: '^26.0.0',
          strictVersion: true,
        },
        'react-i18next': {
          singleton: true,
          requiredVersion: '^17.0.0',
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
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.0.0',
          strictVersion: true,
        },
        'zod': {
          singleton: true,
          requiredVersion: '^4.0.0',
          strictVersion: true,
        },
        '@tanstack/react-table': {
          singleton: true,
          requiredVersion: '^8.0.0',
          strictVersion: true,
        },
        'framer-motion': {
          singleton: true,
          requiredVersion: '^12.0.0',
          strictVersion: true,
        },
      },
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.NEXT_PUBLIC_WS_URL': JSON.stringify(process.env.VITE_WS_URL || 'ws://localhost:8080/ws'),
    'process.env.NEXT_PUBLIC_WS_SIGNING_SECRET': JSON.stringify(process.env.VITE_WS_SIGNING_SECRET || 'topems-ws-signing-secret'),
  },
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
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            // React 核心
            if (id.includes('react') || id.includes('scheduler')) return 'vendor';
            // MUI 组件库
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
            // 图标库
            if (id.includes('lucide-react') || id.includes('@heroicons') || id.includes('react-icons')) return 'icons';
            // 图表库（大型，单独分包）
            if (id.includes('recharts')) return 'charts';
            if (id.includes('echarts')) return 'echarts';
            // 地图库（大型，单独分包）
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
            // Excel 处理库（大型，单独分包）
            if (id.includes('xlsx') || id.includes('exceljs')) return 'excel';
            // 国际化
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            // 表单库
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
            // 3D 渲染库（大型，单独分包）
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            // 数据获取和状态管理
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) return 'vendor';
            // 日期处理（使用 dayjs，轻量）
            if (id.includes('dayjs')) return 'vendor';
            // HTTP 客户端
            if (id.includes('axios')) return 'vendor';
            // 动画库
            if (id.includes('framer-motion')) return 'vendor';
            // 工具库（大型，单独分包）
            if (id.includes('lodash')) return 'lodash';
            // 旧日期库（如存在，单独分包以便后续替换）
            if (id.includes('moment')) return 'moment';
            // 表格库（大型）
            if (id.includes('@tanstack/react-table')) return 'tables';
            // 数学计算库（大型）
            if (id.includes('mathjs') || id.includes('decimal.js')) return 'math';
            // Markdown 渲染
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'markdown';
            // 富文本编辑器
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
            return 'vendor-misc';
          }
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
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
      mangle: {
        safari10: true,
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
    proxy: buildServiceProxies(),
  },
});
