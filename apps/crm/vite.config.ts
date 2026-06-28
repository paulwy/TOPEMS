import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_crm',
      filename: 'remoteEntry.js',
      dts: false,

      remotes: {},
      shared: {
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^7.0.0',
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
        axios: {
          singleton: true,
          requiredVersion: '^1.0.0',
          strictVersion: true,
        },
        zustand: {
          singleton: true,
          strictVersion: true,
        },
        i18next: {
          singleton: true,
          strictVersion: true,
        },
        dayjs: {
          singleton: true,
          requiredVersion: '^1.11.0',
          strictVersion: true,
        },
      },
      exposes: {
        './api/crm': './src/api/crm.ts',
        './api': './src/api/index.ts',
        './store/crmStore': './src/store/crmStore.ts',
        './store': './src/store/index.ts',
        './pages/DashboardPage': './src/pages/DashboardPage',
        './pages/CustomerManagementPage': './src/pages/CustomerManagementPage',
        './pages/CustomerDetailPage': './src/pages/CustomerDetailPage',
        './pages/ContactManagementPage': './src/pages/ContactManagementPage',
        './pages/OpportunityManagementPage': './src/pages/OpportunityManagementPage',
        './pages/OpportunityDetailPage': './src/pages/OpportunityDetailPage',
        './pages/CustomerScoringPage': './src/pages/CustomerScoringPage',
        './pages/SalesForecastPage': './src/pages/SalesForecastPage',
        './pages/InteractionManagementPage': './src/pages/InteractionManagementPage',
        './pages/BillingPage': './src/pages/BillingPage',
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
    port: 3003,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/crm/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/crm/, '/api/crm'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
