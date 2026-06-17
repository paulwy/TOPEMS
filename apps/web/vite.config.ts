import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import {federation} from '@module-federation/vite';

import type { IncomingMessage, ServerResponse } from 'http';

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

// Environment variable for module loading mode
const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [
    react(),
    // Module Federation Plugin
    federation({
      name: 'topems-host',
      // Expose modules that can be consumed by remote apps
      exposes: {
        './App': './src/App',
        './Registry': './src/modules/registry/index.ts',
        './ModuleLoader': './src/modules/loader/ModuleLoader.tsx',
      },
      // Shared dependencies (like React, React-DOM)
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: '^11.0.0',
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: '^11.0.0',
        },
      },
      // Remote modules configuration
      remotes: isDev ? {
        // Remote modules for development
        // These would be separate apps deployed on different ports
        // 'plugin-ai': 'plugin_ai@http://localhost:3001/assets/plugin-ai-manifest.json',
      } : {
        // Remote modules for production
        // Loaded from CDN or dedicated servers
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          
          const packageName = id.split('node_modules/')[1]?.split('/')[0] || '';
          const scopedPackage = id.split('node_modules/')[1]?.split('/').slice(0, 2).join('/') || '';
          
          // 核心框架 - 必须首先匹配
          if (/^react$/.test(packageName)) return 'vendor-react';
          if (/^react-dom$/.test(packageName)) return 'vendor-react';
          if (/^scheduler$/.test(packageName)) return 'vendor-react';
          if (/^loose-envify$/.test(packageName)) return 'vendor-react';
          if (/^object-assign$/.test(packageName)) return 'vendor-react';
          if (/^prop-types$/.test(packageName)) return 'vendor-react';
          if (/^react-is$/.test(packageName)) return 'vendor-react';
          
          // 路由
          if (/^react-router(-dom)?$/.test(packageName)) return 'vendor-router';
          if (/^history$/.test(packageName)) return 'vendor-router';
          if (/^path-to-regexp$/.test(packageName)) return 'vendor-router';
          if (/^query-string$/.test(packageName)) return 'vendor-router';
          
          // UI 库 - emotion 合并到 shared 以避免循环依赖
          if (/^@emotion\/react$/.test(scopedPackage)) return 'vendor-shared';
          if (/^@emotion\/styled$/.test(scopedPackage)) return 'vendor-shared';
          if (/^@mui\/(material|icons-material|lab)$/.test(scopedPackage)) return 'vendor-mui';
          if (/^@mui\/system$/.test(scopedPackage)) return 'vendor-mui';
          if (/^@heroui\/(react|styles)$/.test(scopedPackage)) return 'vendor-heroui';
          if (/^@nextui-org\/react$/.test(scopedPackage)) return 'vendor-nextui';

          // 图表
          if (/^recharts$/.test(packageName)) return 'vendor-charts';
          if (/^victory$/.test(packageName)) return 'vendor-charts';
          if (/^nivo_/.test(packageName)) return 'vendor-charts';
          
          // 数据处理
          if (/^(xlsx|xlsx-populate|exceljs|file-saver)$/.test(packageName)) return 'vendor-excel';
          
          // 状态管理 - 合并到 shared 以避免循环依赖
          if (/^(zustand|jotai|recoil|valtio)$/.test(packageName)) return 'vendor-shared';
          
          // 表单
          if (/^@hookform\//.test(scopedPackage)) return 'vendor-form';
          if (/^react-hook-form$/.test(packageName)) return 'vendor-form';
          
          // 验证
          if (/^(yup|zod|joi|superstruct)$/.test(packageName)) return 'vendor-validation';
          
          // 工具库
          if (/^(clsx|tailwind-merge|class-variance-authority)$/.test(packageName)) return 'vendor-utils';
          if (/^(axios|follow-redirects)$/.test(packageName)) return 'vendor-axios';
          if (/^(dayjs|date-fns|moment|luxon)$/.test(packageName)) return 'vendor-date';
          if (/^i18next$/.test(packageName)) return 'vendor-i18n';
          if (/^react-i18next$/.test(packageName)) return 'vendor-i18n';
          if (/^lodash(-es)?$/.test(packageName)) return 'vendor-lodash';
          
          // 图标和动画
          if (/^lucide-react$/.test(packageName)) return 'vendor-icons';
          if (/^framer-motion$/.test(packageName)) return 'vendor-animation';
          if (/^react-spring$/.test(packageName)) return 'vendor-animation';
          
          // 地图 - 合并到 shared 以避免循环依赖
          if (/^leaflet$/.test(packageName)) return 'vendor-shared';
          if (/^react-leaflet$/.test(packageName)) return 'vendor-shared';
          if (/^leaflet-draw$/.test(packageName)) return 'vendor-shared';
          if (/^leaflet-measure$/.test(packageName)) return 'vendor-shared';
          
          // 3D - 合并到 shared 以避免循环依赖
          if (/^three$/.test(packageName)) return 'vendor-shared';
          if (/^@react-three\//.test(scopedPackage)) return 'vendor-shared';
          
          // 特殊功能
          if (/^@monaco-editor\//.test(scopedPackage)) return 'vendor-monaco';
          if (/^pdfjs-dist$/.test(packageName)) return 'vendor-pdf';
          if (/^react-pdf$/.test(packageName)) return 'vendor-pdf';
          if (/^mapbox-gl$/.test(packageName)) return 'vendor-map';
          if (/^react-map-gl$/.test(packageName)) return 'vendor-map';
          
          // Markdown 相关
          if (/^react-markdown$/.test(packageName)) return 'vendor-markdown';
          if (/^remark-gfm$/.test(packageName)) return 'vendor-markdown';
          if (/^react-syntax-highlighter$/.test(packageName)) return 'vendor-markdown';
          
          // Toast
          if (/^react-toastify$/.test(packageName)) return 'vendor-toast';
          
          // Docx preview
          if (/^docx-preview$/.test(packageName)) return 'vendor-docx';
          
          // TanStack
          if (/^@tanstack\/react-query$/.test(scopedPackage)) return 'vendor-query';
          if (/^@tanstack\/react-table$/.test(scopedPackage)) return 'vendor-table';
          if (/^@tanstack\/react-virtual$/.test(scopedPackage)) return 'vendor-virtual';
          
          // 其他明确命名的包
          if (/^@amap\/amap-jsapi-loader$/.test(scopedPackage)) return 'vendor-amap';
          if (/^heatmap\.js$/.test(packageName)) return 'vendor-heatmap';
          if (/^react-heatmap-grid$/.test(packageName)) return 'vendor-heatmap';
          if (/^@dnd-kit\//.test(scopedPackage)) return 'vendor-dnd';
          if (/^react-window$/.test(packageName)) return 'vendor-virtualization';
          if (/^react-virtualized$/.test(packageName)) return 'vendor-virtualization';
          
          // 其余都归入 vendor-shared
          return 'vendor-shared';
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
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 3000
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
      // IAM 服务代理 (/iam/* -> /api/core/iam/*)
      '/iam': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iam(\/.*)$/, '/api/core/iam$1'),
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
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8004'),
      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8005'),
      '/portal/api': createServiceProxyConfig('portal', 'http://localhost:8003'),
      '/portal/health': createServiceProxyConfig('portal', 'http://localhost:8003'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8062'),
      '/rs/api': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/rs/health': createServiceProxyConfig('rs', 'http://localhost:8020'),
      
      // ========== [已整合] 制造服务代理 ==========
      // 新统一制造服务 (mes + pdm -> manufacturing)
      '/mfg/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mfg/, '/api/mfg'),
      },
      
      // 向后兼容：MES 服务代理 -> manufacturing
      '/mes': {
        target: 'http://localhost:8030',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mes(\/.*)$/, '/api/mfg$1'),
      },
      
      // 向后兼容：PDM 服务代理 -> manufacturing
      '/pdm': {
        target: 'http://localhost:8030',
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
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8053'),
      // [已整合] IM API - 注释掉，使用 /comm/im/*
      // '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      // '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      
      // ========== [已整合] 分析服务代理 ==========
      // 新统一分析服务 (bi + report -> analytics)
      '/analytics/api': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/analytics/, '/api/analytics'),
      },
      
      // 向后兼容：BI 服务代理 -> analytics
      '/bi': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/bi(\/.*)$/, '/api/analytics/bi$1'),
      },
      
      // 向后兼容：Report 服务代理 -> analytics
      '/report': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/report(\/.*)$/, '/api/analytics/report$1'),
      },
    },
  },
});
