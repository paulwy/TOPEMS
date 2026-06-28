import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_core',
      filename: 'remoteEntry.js',
      dts: false,

      remotes: {},
      shared: {
        // react and react-dom are shared by the host
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
        './api/auth': './src/api/auth.ts',
        './api/org': './src/api/org.ts',
        './api/workflow': './src/api/workflow.ts',
        './api/iam': './src/api/iam.ts',
        './api/file': './src/api/file.ts',
        './api/notification': './src/api/notification.ts',
        './api/report': './src/api/report.ts',
        './api': './src/api/index.ts',
        './components/UserSelect': './src/components/UserSelect',
        './components/OrgTree': './src/components/OrgTree',
        './components/FileUpload': './src/components/FileUpload',
        './components/FileList': './src/components/FileList',
        './components/ReportCard': './src/components/ReportCard',
        './components/NotificationBell': './src/components/NotificationBell',
        './components/NotificationPanel': './src/components/NotificationPanel',
        './components': './src/components/index.ts',
        './hooks/usePermission': './src/hooks/usePermission.ts',
        './hooks': './src/hooks/index.ts',
        './store/authStore': './src/store/authStore.ts',
        './store/orgStore': './src/store/orgStore.ts',
        './store/iamStore': './src/store/iamStore.ts',
        './store/notificationStore': './src/store/notificationStore.ts',
        './store': './src/store/index.ts',
        './pages/UserManagement': './src/pages/UserManagement',
        './pages/RoleManagement': './src/pages/RoleManagement',
        './pages/PermissionManagement': './src/pages/PermissionManagement',
        './pages/OrgChart': './src/pages/OrgChart',
        './pages/FlowDesignerPage': './src/pages/FlowDesignerPage',
        './pages/FlowMonitorPage': './src/pages/FlowMonitorPage',
        './pages/FlowTemplatePage': './src/pages/FlowTemplatePage',
        './pages/DocumentCenterPage': './src/pages/DocumentCenterPage',
        './pages/ReportListPage': './src/pages/ReportListPage',
        './pages/ReportViewerPage': './src/pages/ReportViewerPage',
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
    port: 3001,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/core/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/core/, '/api/core'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
