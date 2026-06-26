import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './i18n';
import { createPermissionInterceptor } from './api/permission-interceptor';
import { queryClient } from './lib/react-query';
import { logger } from '@/utils/logger';
import { applySecurityHeaders } from '@/config/security';

applySecurityHeaders();
createPermissionInterceptor();

window.addEventListener('permission-denied', (event: Event) => {
  const customEvent = event as CustomEvent;
  logger.warn('Permission denied:', customEvent.detail);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
