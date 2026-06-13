import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
          if (/^@radix-ui\//.test(scopedPackage)) return 'vendor-radix';
          
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
      // 文件服务代理 - 必须放在 /api 规则之前，确保 /file/api/* 被正确代理
      '/file/api': createServiceProxyConfig('file', 'http://localhost:8050'),
      '/file/health': createServiceProxyConfig('file', 'http://localhost:8050'),
      '/mail/api': createServiceProxyConfig('mail', 'http://localhost:8051'),
      '/mail/health': createServiceProxyConfig('mail', 'http://localhost:8051'),
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      // 通知服务代理 - 放在 /api 规则之前，确保优先匹配
      '/notification': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path: string) => {
          const newPath = path.replace(/^\/notification/, '');
          console.debug(`[Vite Proxy] /notification -> http://localhost:8002${newPath}`);
          return newPath;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq: any, req: any) => {
            console.debug(`[Vite Proxy] Forwarding to notification service:`, {
              originalUrl: req.url,
              headers: req.headers
            });
          });
          proxy.on('error', (err: Error, _req: any, _res: any) => {
            console.error(`[Vite Proxy] Notification service error:`, err.message);
          });
        }
      },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/iam/api': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/iam/, '') },
      '/iam/health': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/iam/, '') },
      '/doc/api': createServiceProxyConfig('doc', 'http://localhost:8024'),
      '/doc/health': createServiceProxyConfig('doc', 'http://localhost:8024'),
      '/flow/api': createServiceProxyConfig('flow', 'http://localhost:8004'),
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8004'),
      '/im/ws': { target: 'http://127.0.0.1:8052', changeOrigin: true, ws: true, secure: false, rewrite: (path) => path.replace(/^\/im/, '') },
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
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8001'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8001'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8053'),
      '/im/api': createServiceProxyConfig('im', 'http://localhost:8052'),
      '/im/health': createServiceProxyConfig('im', 'http://localhost:8052'),
      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/bi/health': createServiceProxyConfig('bi', 'http://localhost:8060'),
      '/report/api': createServiceProxyConfig('report', 'http://localhost:8061'),
      '/report/health': createServiceProxyConfig('report', 'http://localhost:8061'),
    },
  },
});
