import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './i18n';
import { createPermissionInterceptor } from './api/permissionInterceptor';
import { queryClient } from './lib/reactQuery';
import { logger } from '@/utils/logger';
import { applySecurityHeaders } from '@/config/security';
import { initTelemetry } from '@/utils/telemetry';

applySecurityHeaders();
createPermissionInterceptor();
initTelemetry();

import('./index.css').catch(logger.error);

if (typeof window !== 'undefined') {
  window.addEventListener('permission-denied', (event: Event) => {
    const customEvent = event as CustomEvent;
    logger.warn('Permission denied:', customEvent.detail);
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason as Error;
    if (reason && reason.message && reason.message.includes('WebSocket')) {
      logger.debug('Ignoring unhandled WebSocket rejection:', reason.message);
      event.preventDefault();
    } else {
      logger.error('Unhandled promise rejection:', reason);
    }
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.message && event.message.includes('WebSocket')) {
      logger.debug('Ignoring WebSocket error:', event.message);
      event.preventDefault();
    }
  });
}

const performDeferredInit = () => {
  import('./pages/shared/DashboardPage').catch(() => {});
};

if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(performDeferredInit, { timeout: 3000 });
} else {
  setTimeout(performDeferredInit, 1000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
