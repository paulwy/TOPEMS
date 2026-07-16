import { logger } from '@/utils/logger';

const SW_PATH = '/service-worker.js';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

let registration: ServiceWorkerRegistration | null = null;

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

export const initPWA = (): void => {
  registerSW();

  setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

  if ('BeforeInstallPromptEvent' in window) {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      logger.info('PWA install prompt available');
    });
  }
};
