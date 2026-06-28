import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_hrm',
      filename: 'remoteEntry.js',
      dts: false,

      remotes: {},
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
        'axios': {
          singleton: true,
          requiredVersion: '^1.0.0',
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
        'dayjs': {
          singleton: true,
          requiredVersion: '^1.11.0',
          strictVersion: true,
        },
        'clsx': {
          singleton: true,
          requiredVersion: '^2.0.0',
          strictVersion: true,
        },
        'lucide-react': {
          singleton: true,
          requiredVersion: '^1.0.0',
          strictVersion: true,
        },
        'zod': {
          singleton: true,
          requiredVersion: '^4.0.0',
          strictVersion: true,
        },
      },
      exposes: {
        './bootstrap': './src/bootstrap.tsx',
        './api/hrm': './src/api/hrm.ts',
        './api': './src/api/index.ts',
        './store/hrmStore': './src/store/hrmStore.ts',
        './store': './src/store/index.ts',
        './pages/DashboardPage': './src/pages/DashboardPage.tsx',
        './pages/AttendancePage': './src/pages/AttendancePage.tsx',
        './pages/PayrollPage': './src/pages/PayrollPage.tsx',
        './pages/PerformancePage': './src/pages/PerformancePage.tsx',
        './pages/TrainingPage': './src/pages/TrainingPage.tsx',
        './pages/RecruitmentPage': './src/pages/RecruitmentPage.tsx',
        './pages': './src/pages/index.ts',
        './App': './src/App.tsx',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      '@topems/shared-constants': path.resolve(__dirname, '../../packages/shared-constants/src'),
    },
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
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
    port: 3002,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/hrm/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/hrm/, '/api'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
