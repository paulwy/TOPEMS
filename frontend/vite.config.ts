import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
        target: 'http://localhost:8012',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qms/, ''),
      },
      '/ehs': {
        target: 'http://localhost:8013',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ehs/, ''),
      },
      '/erp': {
        target: 'http://localhost:8009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/erp/, ''),
      },
      '/hrm': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hrm/, ''),
      },
      '/gis': {
        target: 'http://localhost:8011',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gis/, ''),
      },
      '/pdm': {
        target: 'http://localhost:8015',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pdm/, ''),
      },
      '/mes': {
        target: 'http://localhost:8014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mes/, ''),
      },
      '/srm': {
        target: 'http://localhost:8018',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/srm/, ''),
      },
      '/im': {
        target: 'http://localhost:8016',
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
      '/mobile': {
        target: 'http://localhost:8019',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mobile/, ''),
      },
      '/integration': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/integration/, ''),
      },
      '/portal': {
        target: 'http://localhost:8021',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/portal/, ''),
      },
      '/crm': {
        target: 'http://localhost:8014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/crm/, ''),
      },
      '/scm': {
        target: 'http://localhost:8007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scm/, ''),
      },
      '/wms': {
        target: 'http://localhost:8025',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wms/, ''),
      },
      '/bi': {
        target: 'http://localhost:8022',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bi/, ''),
      },
      '/notification': {
        target: 'http://localhost:8023',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notification/, ''),
      },
      '/report': {
        target: 'http://localhost:8024',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/report/, ''),
      },
    },
  },
})
