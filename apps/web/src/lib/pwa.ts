import { logger } from '@/utils/logger';

const SW_PATH = '/service-worker.js';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

// V24.0 模块 D: 捕获 beforeinstallprompt 事件以便自定义安装 UI
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  logger.info('PWA install prompt captured (available for custom UI)');
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  logger.info('PWA installed successfully');
  deferredInstallPrompt = null;
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
            if (window.confirm('发现新版本，是否立即更新？')) {
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

export const checkForUpdate = async (): Promise<boolean> => {
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

export const getRegistration = (): ServiceWorkerRegistration | null => {
  return registration;
};

// V24.0 模块 D: 主动触发关键路由预缓存
export const precacheRoutes = async (): Promise<void> => {
  if (!registration?.active) {
    logger.debug('Service Worker not active, skip precache');
    return;
  }
  registration.active.postMessage({ type: 'PRECACHE_ROUTES' });
  logger.info('Precache routes triggered');
};

// V24.0 模块 D: 自定义安装提示（PWA install prompt）
export const promptInstall = async (): Promise<boolean> => {
  if (!deferredInstallPrompt) {
    logger.debug('Install prompt not available');
    return false;
  }
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    return choice.outcome === 'accepted';
  } catch (error) {
    logger.error('Install prompt failed:', error);
    return false;
  }
};

export const canInstall = (): boolean => deferredInstallPrompt !== null;

// V24.0 模块 D: 检测是否以 PWA 模式运行
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

// V24.0 模块 D: 推送通知 API 封装
export interface PushSubscriptionOptions {
  vapidPublicKey: string;
  applicationServerKey?: BufferSource;
}

/**
 * 请求通知权限（Web Notifications API）
 * @returns 'granted' | 'denied' | 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    logger.debug('Notifications not supported');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  const permission = await Notification.requestPermission();
  logger.info('Notification permission:', permission);
  return permission;
};

/**
 * 订阅 Web Push 服务
 * @returns PushSubscription 订阅对象（需发送到后端保存）
 */
export const subscribePush = async (options: PushSubscriptionOptions): Promise<PushSubscription | null> => {
  if (!registration) {
    logger.error('Service Worker not registered, cannot subscribe push');
    return null;
  }
  if (!('PushManager' in window)) {
    logger.debug('Push API not supported');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    logger.warn('Notification permission not granted, push subscription aborted');
    return null;
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      logger.info('Push subscription already exists');
      return existing;
    }

    // 转换 VAPID 公钥为 applicationServerKey
    // TS 6.x 对 ArrayBufferLike 与 ArrayBuffer 的类型校验更严格，需显式断言为 BufferSource
    const applicationServerKey: BufferSource = (
      options.applicationServerKey ?? urlBase64ToUint8Array(options.vapidPublicKey)
    ) as unknown as BufferSource;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    logger.info('Push subscription created');
    return subscription;
  } catch (error) {
    logger.error('Push subscription failed:', error);
    return null;
  }
};

/**
 * 取消订阅 Web Push 服务
 */
export const unsubscribePush = async (): Promise<boolean> => {
  if (!registration) {
    return false;
  }
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const result = await subscription.unsubscribe();
      logger.info('Push subscription removed');
      return result;
    }
    return false;
  } catch (error) {
    logger.error('Push unsubscribe failed:', error);
    return false;
  }
};

/**
 * 获取当前推送订阅状态
 */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!registration) {
    return null;
  }
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
};

/**
 * 检测推送通知支持情况
 */
export const getPushSupportStatus = (): {
  pushSupported: boolean;
  notificationSupported: boolean;
  permission: NotificationPermission;
} => {
  return {
    pushSupported: 'PushManager' in window,
    notificationSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied',
  };
};

// V24.0 模块 D: 工具函数 - VAPID 公钥转换
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// V24.0 模块 D: 网络状态监听
export type NetworkStatus = 'online' | 'offline';

export const getNetworkStatus = (): NetworkStatus =>
  typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';

export const onNetworkStatusChange = (callback: (status: NetworkStatus) => void): (() => void) => {
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
export const clearAllCaches = async (): Promise<boolean> => {
  if (!registration?.active) return false;
  registration.active.postMessage({ type: 'CLEAR_CACHE' });
  logger.info('Clear cache triggered');
  return true;
};

// V24.0 模块 D: 将失败的写请求加入同步队列（用于离线场景）
export const enqueueSyncRequest = async (
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<void> => {
  if (!registration?.active) {
    logger.warn('Service Worker not active, cannot enqueue sync request');
    return;
  }

  const request = new Request(url, {
    method,
    headers: headers ?? { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  registration.active.postMessage({
    type: 'ADD_TO_SYNC_QUEUE',
    payload: {
      request,
      timestamp: Date.now(),
    },
  });

  // 尝试立即触发同步（如果浏览器支持）
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-data');
    } catch (error) {
      logger.debug('Background sync registration failed (will retry on next sync):', error);
    }
  }
};

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
