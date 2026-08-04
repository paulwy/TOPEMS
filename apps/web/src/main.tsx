import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './lib/reactQuery';
import { logger } from '@/utils/logger';
import { applySecurityHeaders } from '@/config/security';
import { logPerformanceMetrics } from '@/utils/performance';
import { initPWA } from '@/lib/pwa';

applySecurityHeaders();

logPerformanceMetrics();

initPWA();

import('./index.css').catch(logger.error);

const performDeferredInit = () => {
  const loadPriority1 = Promise.all([
    import('./i18n'),
    import('./api/permissionInterceptor').then(({ createPermissionInterceptor }) => {
      createPermissionInterceptor();
    }),
  ]).catch(logger.error);

  const loadPriority2 = loadPriority1
    .then(() => {
      return Promise.all([
        import('./utils/telemetry').then(({ initTelemetry }) => {
          initTelemetry();
        }),
      ]);
    })
    .catch(logger.error);

  loadPriority2
    .then(() => {
      import('./pages/shared/DashboardPage').catch(() => {});
    })
    .catch(() => {});

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
};

if ('requestIdleCallback' in window) {
  (
    window as unknown as {
      requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
    }
  ).requestIdleCallback(performDeferredInit, { timeout: 3000 });
} else {
  setTimeout(performDeferredInit, 800);
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (typeof window !== 'undefined' && window.location.pathname === '/performance') {
  import('./pages/performance/PerformanceTestPage')
    .then(({ default: PerformanceTestPage }) => {
      root.render(
        <React.StrictMode>
          <PerformanceTestPage />
        </React.StrictMode>
      );
    })
    .catch(() => {
      root.render(
        <React.StrictMode>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </React.StrictMode>
      );
    });
} else {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
