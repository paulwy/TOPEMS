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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    hmr: {
      port: 3000,
      host: 'localhost',
      clientPort: 3000,
      protocol: 'ws',
    },
    proxy: {
      '/api/v1/files': createServiceProxyConfig('doc', 'http://localhost:8001', true),
      '/mail': createServiceProxyConfig('mail', 'http://localhost:8054'),
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/iam': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iam/, ''),
      },
      '/doc/': createServiceProxyConfig('doc', 'http://localhost:8001'),
      '/flow': createServiceProxyConfig('flow', 'http://localhost:8006'),
      '/notification/ws': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/notification/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy] Notification WS service unavailable:', err.message);
          });
        },
      },
      '/im/ws': {
        target: 'http://localhost:8051',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/im/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy] IM WS service unavailable:', err.message);
          });
        },
      },
      '/notification': createServiceProxyConfig('notification', 'http://localhost:8003'),
      '/integration': createServiceProxyConfig('integration', 'http://localhost:8004'),
      '/portal': createServiceProxyConfig('portal', 'http://localhost:8005'),
      '/erp': createServiceProxyConfig('erp', 'http://localhost:8010'),
      '/hrm': createServiceProxyConfig('hrm', 'http://localhost:8011'),
      '/crm': createServiceProxyConfig('crm', 'http://localhost:8012'),
      '/ai': createServiceProxyConfig('ai', 'http://localhost:8013'),
      '/rs': createServiceProxyConfig('rs', 'http://localhost:8020'),
      '/lims': createServiceProxyConfig('lims', 'http://localhost:8022'),
      '/pdm': createServiceProxyConfig('pdm', 'http://localhost:8023'),
      '/mes': createServiceProxyConfig('mes', 'http://localhost:8030'),
      '/qms': createServiceProxyConfig('qms', 'http://localhost:8031'),
      '/ehs': createServiceProxyConfig('ehs', 'http://localhost:8032'),
      '/scm': createServiceProxyConfig('scm', 'http://localhost:8040'),
      '/srm': createServiceProxyConfig('srm', 'http://localhost:8041'),
      '/wms': createServiceProxyConfig('wms', 'http://localhost:8042'),
      '/pm': createServiceProxyConfig('pm', 'http://localhost:8002'),
      '/gis': createServiceProxyConfig('gis', 'http://localhost:8050'),
      '/im': createServiceProxyConfig('im', 'http://localhost:8051'),
      '/bi': createServiceProxyConfig('bi', 'http://localhost:8052'),
      '/report': createServiceProxyConfig('report', 'http://localhost:8053'),
      },
  },
})
