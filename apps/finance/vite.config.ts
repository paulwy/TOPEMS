import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_finance',
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
        '@mui/icons-material': {
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
        './api/finance': './src/api/finance.ts',
        './api': './src/api/index.ts',
        './store/financeStore': './src/store/financeStore.ts',
        './store': './src/store/index.ts',
        './pages/DashboardPage': './src/pages/DashboardPage.tsx',
        './pages/FinanceAccountPage': './src/pages/FinanceAccountPage.tsx',
        './pages/FinanceVoucherPage': './src/pages/FinanceVoucherPage.tsx',
        './pages/FinanceLedgerPage': './src/pages/FinanceLedgerPage.tsx',
        './pages/FinanceReceivablePayablePage': './src/pages/FinanceReceivablePayablePage.tsx',
        './pages/FinanceReceiptPage': './src/pages/FinanceReceiptPage.tsx',
        './pages/FinancePaymentPage': './src/pages/FinancePaymentPage.tsx',
        './pages/FinanceReportsPage': './src/pages/FinanceReportsPage.tsx',
        './pages/FinancialReportsPage': './src/pages/FinancialReportsPage.tsx',
        './pages/FinanceBudgetPage': './src/pages/FinanceBudgetPage.tsx',
        './pages/FinanceExpensePage': './src/pages/FinanceExpensePage.tsx',
        './pages/FinanceInvoicePage': './src/pages/FinanceInvoicePage.tsx',
        './pages/FinanceTaxPage': './src/pages/FinanceTaxPage.tsx',
        './pages/FinanceAssetPage': './src/pages/FinanceAssetPage.tsx',
        './pages/FinanceCostPage': './src/pages/FinanceCostPage.tsx',
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
    port: 3004,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/finance/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/finance/, '/api/finance'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
