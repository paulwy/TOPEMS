import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

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
    hmr: {
      port: 3000,
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      '/iam': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iam/, ''),
      },
      '/doc': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/doc/, ''),
      },
      '/ai': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, ''),
      },
      '/flow': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flow/, ''),
      },
      '/rs': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rs/, ''),
      },
      '/lims': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lims/, ''),
      },
      '/qms': {
        target: 'http://localhost:8007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qms/, ''),
      },
      '/ehs': {
        target: 'http://localhost:8008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ehs/, ''),
      },
      '/erp': {
        target: 'http://localhost:8009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/erp/, ''),
      },
      '/srm': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/srm/, ''),
      },
      '/bi': {
        target: 'http://localhost:8011',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bi/, ''),
      },
      '/gis': {
        target: 'http://localhost:8017',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gis/, ''),
      },
      '/im': {
        target: 'http://localhost:8018',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/im/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.warn('[Vite Proxy] IM service unavailable, error:', err.message);
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                code: 503,
                success: false,
                message: 'IM service is currently unavailable',
                data: null
              }));
            }
          });
        },
      },
      '/hrm': {
        target: 'http://localhost:8019',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hrm/, ''),
      },
      '/wms': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wms/, ''),
      },
      '/mobile': {
        target: 'http://localhost:8021',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mobile/, ''),
      },
      '/integration': {
        target: 'http://localhost:8022',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/integration/, ''),
      },
      '/portal': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/portal/, ''),
      },
      '/report': {
        target: 'http://localhost:8024',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/report/, ''),
      },
      '/mes': {
        target: 'http://localhost:8025',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mes/, ''),
      },
      '/crm': {
        target: 'http://localhost:8014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/crm/, ''),
      },
      '/pdm': {
        target: 'http://localhost:8015',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pdm/, ''),
      },
      '/scm': {
        target: 'http://localhost:8016',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scm/, ''),
      },
      '/notification': {
        target: 'http://localhost:8026',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notification/, ''),
      },
    },
  },
})
