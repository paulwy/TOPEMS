import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './i18n';
import { createPermissionInterceptor } from './api/permissionInterceptor';
import { queryClient } from './lib/reactQuery';
import { logger } from '@/utils/logger';
import { applySecurityHeaders } from '@/config/security';

// 同步执行安全相关的初始化
applySecurityHeaders();
createPermissionInterceptor();

// 延迟初始化事件监听器，减少首屏阻塞
if (typeof window !== 'undefined') {
  window.addEventListener('permission-denied', (event: Event) => {
    const customEvent = event as CustomEvent;
    logger.warn('Permission denied:', customEvent.detail);
  });
}

// 使用 requestIdleCallback 延迟执行非关键初始化
const performDeferredInit = () => {
  // 预加载可能需要的组件
  import('./pages/shared/DashboardPage').catch(() => {
    // 忽略预加载错误
  });
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
