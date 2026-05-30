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
      '/doc': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/doc/, ''),
      },
      '/lims': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lims/, ''),
      },
      '/hrm': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hrm/, ''),
      },
      '/erp': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/erp/, ''),
      },
    },
  },
})
