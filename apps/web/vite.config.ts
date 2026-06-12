import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// 通用的服务不可用错误处理
const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite ? undefined : (path) => path.replace(new RegExp(`^\\/${serviceName}`), ''),
  configure: (proxy) => {
    proxy.on('error', (err, req, res) => {
      // 健康检查失败不打印警告
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
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TOPEMS',
        short_name: 'TOPEMS',
        description: 'TOPEMS - Enterprise Digital Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/api/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxAgeSeconds: 5 * 60,
                maxEntries: 100,
              },
            },
          },
          {
            urlPattern: /\.(css|js|png|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
                maxEntries: 50,
              },
            },
          },
        ],
      },
    }),
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
          if (id.includes('node_modules')) {
            const packageName = id.split('node_modules/')[1]?.split('/')[0];
            if (!packageName) {
              return 'vendor-other';
            }
            // 纯工具库（无外部依赖）
            if (['clsx', 'tailwind-merge', 'class-variance-authority', 'isomorphic-dompurify', 'csstype', 'css-in-js-utils'].includes(packageName)) {
              return 'vendor-utils';
            }
            // 数据处理工具（无 React 依赖）
            if (['date-fns', 'dayjs', 'xlsx', 'file-saver', 'uuid', 'nanoid'].includes(packageName)) {
              return 'vendor-data';
            }
            // HTTP 客户端（无 React 依赖）
            if (['axios', 'follow-redirects'].includes(packageName)) {
              return 'vendor-axios';
            }
            // 表单验证（无 React 依赖）
            if (['zod', 'yup', 'property-expr', 'fast-deep-equal', 'tiny-invariant', 'get-nested-value'].includes(packageName)) {
              return 'vendor-validation';
            }
            // React 核心（依赖工具库）
            if (['react', 'react-dom', 'scheduler', 'loose-envify', 'object-assign', 'prop-types'].includes(packageName)) {
              return 'vendor-react';
            }
            // Babel 运行时
            if (packageName === '@babel' || id.includes('@babel/runtime')) {
              return 'vendor-babel';
            }
            // React Router（依赖 React）
            if (['react-router', 'react-router-dom', 'history', 'path-to-regexp', 'query-string'].includes(packageName)) {
              return 'vendor-router';
            }
            // 状态管理（依赖 React）
            if (['zustand', 'jotai', 'redux', 'react-redux', '@reduxjs/toolkit'].includes(packageName)) {
              return 'vendor-state';
            }
            // Radix UI（依赖 React）
            if (packageName === '@radix-ui') {
              return 'vendor-radix';
            }
            // NextUI（依赖 React 和 Radix）
            if (packageName === '@nextui-org') {
              return 'vendor-nextui';
            }
            // 其他 UI 库（依赖 React）
            if (['lucide-react', '@heroui/react', '@heroui/styles'].includes(packageName)) {
              return 'vendor-ui';
            }
            // 图表库（依赖 React）
            if (['recharts', 'd3-array', 'd3-scale', 'd3-shape', 'd3-interpolate', 'd3-color', 'd3-format', 'd3-time', 'd3-time-format', 'd3-ease'].includes(packageName)) {
              return 'vendor-charts';
            }
            // Markdown 解析（依赖 React）
            if (['react-markdown', 'remark-gfm', 'remark-parse', 'remark-rehype', 'rehype-raw', 'rehype-sanitize', 'unified', 'unist-util-visit', 'mdast-util-definitions'].includes(packageName)) {
              return 'vendor-markdown';
            }
            // 语法高亮（依赖 React）
            if (['react-syntax-highlighter', 'highlight.js', 'refractor', 'prismjs'].includes(packageName)) {
              return 'vendor-highlighter';
            }
            // 文档预览
            if (['docx-preview', 'mammoth'].includes(packageName)) {
              return 'vendor-docx';
            }
            // 动画库
            if (['framer-motion', 'motion-dom'].includes(packageName)) {
              return 'vendor-animation';
            }
            // Hook 相关
            if (['@hookform/resolvers', 'react-hook-form'].includes(packageName)) {
              return 'vendor-form';
            }
            // Vite PWA / Workbox
            if (packageName === 'workbox' || id.includes('workbox-')) {
              return 'vendor-pwa';
            }
            // 测试相关（生产构建不应包含）
            if (['@testing-library', 'vitest', 'jsdom', 'faker'].includes(packageName)) {
              return 'vendor-test';
            }
            return 'vendor-other';
          }
          // 页面级代码分割
          if (id.includes('pages/AIPage')) {
            return 'page-ai';
          }
          if (id.includes('pages/GisPage')) {
            return 'page-gis';
          }
          if (id.includes('pages/Limspage')) {
            return 'page-lims';
          }
          if (id.includes('pages/Rspage')) {
            return 'page-rs';
          }
          if (id.includes('pages/Qmspage')) {
            return 'page-qms';
          }
          if (id.includes('pages/Ehspage')) {
            return 'page-ehs';
          }
          if (id.includes('pages/CrmPage') || id.includes('pages/CRMDashboardPage')) {
            return 'page-crm';
          }
          if (id.includes('pages/Hrm')) {
            return 'page-hrm';
          }
          // 路由级代码分割
          if (id.includes('routes/')) {
            const routeName = id.split('routes/')[1]?.split('.')[0];
            if (routeName) {
              return `route-${routeName}`;
            }
          }
          // API 模块代码分割
          if (id.includes('src/api/')) {
            const apiName = id.split('src/api/')[1]?.split('.')[0];
            if (apiName) {
              return `api-${apiName}`;
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      port: 3000,
      host: 'localhost',
      clientPort: 3000,
      protocol: 'ws',
    },
    proxy: {
      '/api/v1/files': createServiceProxyConfig('doc', 'http://localhost:8001', true),
      '/mail/api': createServiceProxyConfig('mail', 'http://localhost:8054'),
      '/mail/health': createServiceProxyConfig('mail', 'http://localhost:8054'),
      '/hrm/api': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/hrm/health': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/iam/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iam/, ''),
      },
      '/iam/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iam/, ''),
      },
      '/doc/api': createServiceProxyConfig('doc', 'http://localhost:8001'),
      '/doc/health': createServiceProxyConfig('doc', 'http://localhost:8001'),
      '/flow/api': createServiceProxyConfig('flow', 'http://localhost:8006'),
      '/flow/health': createServiceProxyConfig('flow', 'http://localhost:8006'),
      '/notification': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/notification/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy] Notification service unavailable:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.headers.upgrade === 'websocket') {
              console.log('[Vite Proxy] WebSocket upgrade request:', req.url);
            }
          });
        },
      },
      '/im/ws': {
        target: 'http://127.0.0.1:8051',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/im/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy] IM WS service unavailable:', err.message);
          });
        },
      },

      '/integration/api': createServiceProxyConfig('integration', 'http://localhost:8004'),
      '/integration/health': createServiceProxyConfig('integration', 'http://localhost:8004'),
      '/portal/api': createServiceProxyConfig('portal', 'http://localhost:8005'),
      '/portal/health': createServiceProxyConfig('portal', 'http://localhost:8005'),
      '/erp/api': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/erp/health': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/crm/api': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/crm/health': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/ai/api': createServiceProxyConfig('ai', 'http://localhost:8013'),
      '/ai/health': createServiceProxyConfig('ai', 'http://localhost:8013'),
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
      '/pm/api': createServiceProxyConfig('pm', 'http://localhost:8002'),
      '/pm/health': createServiceProxyConfig('pm', 'http://localhost:8002'),
      '/gis/api': createServiceProxyConfig('gis', 'http://localhost:8050'),
      '/gis/health': createServiceProxyConfig('gis', 'http://localhost:8050'),
      '/im/api': createServiceProxyConfig('im', 'http://localhost:8051'),
      '/im/health': createServiceProxyConfig('im', 'http://localhost:8051'),
      '/bi/api': createServiceProxyConfig('bi', 'http://localhost:8052'),
      '/bi/health': createServiceProxyConfig('bi', 'http://localhost:8052'),
      '/report/api': createServiceProxyConfig('report', 'http://localhost:8053'),
      '/report/health': createServiceProxyConfig('report', 'http://localhost:8053'),
      },
  },
})
