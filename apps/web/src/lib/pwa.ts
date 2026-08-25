import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const SW_PATH = '/service-worker.js';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | null = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  logger.info('PWA install prompt captured (available for custom UI)');
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  logger.info('PWA installed successfully');
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

export const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    logger.debug('Service Worker not supported');
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });

    logger.info('Service Worker registered successfully');

    registration.addEventListener('updatefound', () => {
      const currentRegistration = registration;
      if (!currentRegistration) return;
      const newWorker = currentRegistration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.info('New Service Worker available');
            if (window.confirm(i18n.t('shared.pwa.k0'))) {
              currentRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('Service Worker controller changed');
    });

    return registration;
  } catch (error) {
    logger.error('Service Worker registration failed:', error);
    return null;
  }
};

const checkForUpdate = async (): Promise<boolean> => {
  if (!registration) {
    return false;
  }

  try {
    await registration.update();
    return true;
  } catch (error) {
    logger.error('Failed to check for Service Worker update:', error);
    return false;
  }
};

// V24.0 模块 D: 主动触发关键路由预缓存

// V37.0 Phase 7: 智能预加载 — 导航历史记录 + 预测性缓存

/**
 * 记录用户导航到 Service Worker
 * 应在路由变化时调用，Service Worker 据此学习导航模式
 */
export const recordNavigation = (path: string): void => {
  if (!registration?.active) return;
  registration.active.postMessage({ type: 'RECORD_NAVIGATION', payload: path });
};

/**
 * 触发智能预加载
 * Service Worker 基于导航历史预测下一个可能访问的路由，提前缓存
 */
export const prefetchIntelligent = (): void => {
  if (!registration?.active) return;
  registration.active.postMessage({ type: 'PREFETCH_INTELLIGENT' });
};

/**
 * 预缓存微前端远程模块入口
 * 在用户认证后调用，提前缓存所有远程入口 JS 文件
 */
export const prefetchRemoteEntries = (entryUrls: string[]): void => {
  if (!registration?.active) return;
  // V64 防御：过滤空 entry（static 模式下所有 entry 为空），避免给 SW 发无意义消息
  const valid = entryUrls.filter((u) => typeof u === 'string' && u.trim() !== '');
  if (valid.length === 0) return;
  registration.active.postMessage({
    type: 'PREFETCH_REMOTE_ENTRIES',
    payload: valid,
  });
};

// V24.0 模块 D: 自定义安装提示（PWA install prompt）

// V24.0 模块 D: 检测是否以 PWA 模式运行
window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

// V24.0 模块 D: 推送通知 API 封装

// V24.0 模块 D: 工具函数 - VAPID 公钥转换

// V24.0 模块 D: 网络状态监听
export type NetworkStatus = 'online' | 'offline';

typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';

const onNetworkStatusChange = (callback: (status: NetworkStatus) => void): (() => void) => {
  const handleOnline = () => callback('online');
  const handleOffline = () => callback('offline');
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// V24.0 模块 D: 清理缓存（用于设置页/诊断）

// V24.0 模块 D: 将失败的写请求加入同步队列（用于离线场景）

export const initPWA = (): void => {
  if (import.meta.env.DEV) {
    logger.debug('Service Worker disabled in development mode');
    return;
  }

  registerSW();

  setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

  // 安装提示由 beforeinstallprompt 事件捕获，不再在此处理
  // 应用可通过 promptInstall() 主动触发安装 UI

  // 网络状态变化日志
  onNetworkStatusChange((status) => {
    if (status === 'offline') {
      logger.warn('Network offline - PWA switched to offline mode');
    } else {
      logger.info('Network online - PWA back to online mode');
    }
  });
};
