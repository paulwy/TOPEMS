import { logger } from '@/utils/logger';

type EventHandler<T = any> = (data: T) => void;

interface EventListeners {
  [eventName: string]: Set<EventHandler>;
}

export class EventBus {
  private listeners: EventListeners = {};

  on<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = new Set();
    }
    this.listeners[eventName].add(handler);
  }

  off<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    if (this.listeners[eventName]) {
      this.listeners[eventName].delete(handler);
    }
  }

  emit<T = unknown>(eventName: string, data?: T): void {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((handler) => {
        try {
          handler(data);
        } catch (error: unknown) {
          logger.error(`Error handling event ${eventName}:`, error);
        }
      });
    }
  }

  once<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (data) => {
      handler(data);
      this.off(eventName, onceHandler);
    };
    this.on(eventName, onceHandler);
  }

  clear(eventName?: string): void {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }
}

export const eventBus = new EventBus();

export const ModuleEvents = {
  MODULE_LOADED: 'module-loaded',
  MODULE_UNLOADED: 'module-unloaded',
  MODULE_ERROR: 'module-error',
  USER_LOGIN: 'user-login',
  USER_LOGOUT: 'user-logout',
  THEME_CHANGE: 'theme-change',
  LANGUAGE_CHANGE: 'language-change',
  NOTIFICATION: 'notification',
};
