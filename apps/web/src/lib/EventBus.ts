/**
 * 全局事件总线 - 模块间通信机制
 * 支持发布/订阅模式、命名空间、通配符订阅、once监听
 */

// 预设事件类型
export const EventTypes = {
  // 模块加载完成事件
  MODULE_LOADED: 'module:loaded',
  MODULE_ERROR: 'module:error',
  MODULE_UNLOADED: 'module:unloaded',

  // 主题切换事件
  THEME_CHANGED: 'theme:changed',
  THEME_CHANGING: 'theme:changing',

  // 用户事件
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_PROFILE_UPDATED: 'user:profile_updated',

  // 导航事件
  NAVIGATION_CHANGED: 'navigation:changed',
  NAVIGATION_REFRESH: 'navigation:refresh',

  // 模块间通信
  CROSS_MODULE_DATA: 'cross-module:data',
  CROSS_MODULE_ACTION: 'cross-module:action',

  // 全局通知
  NOTIFICATION_SHOW: 'notification:show',
  NOTIFICATION_HIDE: 'notification:hide',
} as const;

// 事件名称联合类型
export type PresetEventName = typeof EventTypes[keyof typeof EventTypes];

// 事件数据类型定义
export interface ModuleEventData {
  'module:loaded': { moduleId: string; moduleName: string };
  'module:error': { moduleId: string; error: Error };
  'module:unloaded': { moduleId: string };
  'theme:changed': { theme: string };
  'theme:changing': { theme: string };
  'user:login': { userId: string; userName: string };
  'user:logout': { userId: string };
  'user:profile_updated': { userId: string; changes: Record<string, unknown> };
  'navigation:changed': { path: string; params?: Record<string, unknown> };
  'navigation:refresh': { path: string };
  'cross-module:data': { source: string; target: string; data: unknown };
  'cross-module:action': { source: string; target: string; action: string; payload?: unknown };
  'notification:show': { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string };
  'notification:hide': { id: string };
}

// 通配符事件（用于自定义事件）
export type WildcardEventName = `${string}:*`;

// 所有支持的事件名称
export type EventName = PresetEventName | WildcardEventName | string;

// 订阅者接口
export interface Subscription {
  id: string;
  event: string | RegExp;
  callback: (data: unknown) => void;
  once?: boolean;
  namespace?: string;
}

// 订阅者存储
type Subscriber = {
  id: string;
  event: string | RegExp;
  callback: (data: unknown) => void;
  once?: boolean;
};

class EventBusClass {
  private subscribers: Map<string, Subscriber[]> = new Map();
  private wildcardSubscribers: Subscriber[] = [];
  private idCounter = 0;

  /**
   * 生成唯一订阅ID
   */
  private generateId(): string {
    return `sub_${++this.idCounter}_${Date.now()}`;
  }

  /**
   * 检查事件名称是否匹配通配符模式
   */
  private matchWildcard(event: string, pattern: string): boolean {
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return event.startsWith(prefix + ':') && event !== pattern;
    }
    return false;
  }

  /**
   * 获取事件对应的键
   */
  private getEventKey(event: string): string {
    return event.split(':*')[0];
  }

  /**
   * 订阅事件
   * @param event 事件名称，支持通配符如 'hrm:*'
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  subscribe<N extends EventName>(
    event: N,
    callback: (data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown) => void
  ): () => void {
    const id = this.generateId();
    const isWildcard = event.endsWith(':*');
    const namespace = isWildcard ? this.getEventKey(event) : undefined;

    const subscriber: Subscriber = {
      id,
      event: isWildcard ? new RegExp(`^${event.replace('*', '.*')}$`) : event,
      callback: callback as (data: unknown) => void,
      namespace,
    };

    if (isWildcard) {
      this.wildcardSubscribers.push(subscriber);
    } else {
      const existing = this.subscribers.get(event) || [];
      this.subscribers.set(event, [...existing, subscriber]);
    }

    // 返回取消订阅函数
    return () => this.unsubscribe(id);
  }

  /**
   * 订阅事件，只触发一次
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  once<N extends EventName>(
    event: N,
    callback: (data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown) => void
  ): () => void {
    const id = this.generateId();
    const isWildcard = event.endsWith(':*');
    const namespace = isWildcard ? this.getEventKey(event) : undefined;

    const subscriber: Subscriber = {
      id,
      event: isWildcard ? new RegExp(`^${event.replace('*', '.*')}$`) : event,
      callback: callback as (data: unknown) => void,
      once: true,
      namespace,
    };

    if (isWildcard) {
      this.wildcardSubscribers.push(subscriber);
    } else {
      const existing = this.subscribers.get(event) || [];
      this.subscribers.set(event, [...existing, subscriber]);
    }

    return () => this.unsubscribe(id);
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit<N extends EventName>(event: N, data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown): void {
    // 直接订阅者
    const directSubscribers = this.subscribers.get(event) || [];
    const toRemove: string[] = [];

    directSubscribers.forEach((sub) => {
      sub.callback(data);
      if (sub.once) {
        toRemove.push(sub.id);
      }
    });

    // 清理 once 订阅者
    if (toRemove.length > 0) {
      this.subscribers.set(
        event,
        directSubscribers.filter((sub) => !toRemove.includes(sub.id))
      );
    }

    // 通配符订阅者
    const wildcardToRemove: string[] = [];
    this.wildcardSubscribers.forEach((sub) => {
      if (sub.event instanceof RegExp) {
        const regex = new RegExp(`^${event.replace('*', '.*')}$`);
        if (regex.test(event)) {
          sub.callback(data);
          if (sub.once) {
            wildcardToRemove.push(sub.id);
          }
        }
      }
    });

    // 清理通配符 once 订阅者
    if (wildcardToRemove.length > 0) {
      this.wildcardSubscribers = this.wildcardSubscribers.filter(
        (sub) => !wildcardToRemove.includes(sub.id)
      );
    }
  }

  /**
   * 取消订阅
   * @param id 订阅ID
   */
  unsubscribe(id: string): void {
    // 从直接订阅者中移除
    for (const [event, subs] of this.subscribers.entries()) {
      const filtered = subs.filter((sub) => sub.id !== id);
      if (filtered.length !== subs.length) {
        if (filtered.length === 0) {
          this.subscribers.delete(event);
        } else {
          this.subscribers.set(event, filtered);
        }
        return;
      }
    }

    // 从通配符订阅者中移除
    this.wildcardSubscribers = this.wildcardSubscribers.filter((sub) => sub.id !== id);
  }

  /**
   * 取消订阅所有事件
   */
  unsubscribeAll(): void {
    this.subscribers.clear();
    this.wildcardSubscribers = [];
  }

  /**
   * 获取订阅者数量
   */
  getSubscriberCount(): number {
    let count = 0;
    for (const subs of this.subscribers.values()) {
      count += subs.length;
    }
    count += this.wildcardSubscribers.length;
    return count;
  }

  /**
   * 获取特定命名空间的订阅者数量
   * @param namespace 命名空间（如 'hrm', 'core'）
   */
  getSubscriberCountByNamespace(namespace: string): number {
    let count = 0;
    for (const subs of this.subscribers.values()) {
      count += subs.filter((sub) => {
        if (sub.namespace) return sub.namespace === namespace;
        return sub.event === `${namespace}:*` || String(sub.event).startsWith(`${namespace}:`);
      }).length;
    }
    count += this.wildcardSubscribers.filter((sub) => {
      return sub.namespace === namespace;
    }).length;
    return count;
  }

  /**
   * 清理特定命名空间的所有订阅者
   * @param namespace 命名空间
   */
  clearNamespace(namespace: string): void {
    for (const [event, subs] of this.subscribers.entries()) {
      const filtered = subs.filter((sub) => {
        if (sub.namespace) return sub.namespace !== namespace;
        return !event.startsWith(`${namespace}:`);
      });
      if (filtered.length === 0) {
        this.subscribers.delete(event);
      } else {
        this.subscribers.set(event, filtered);
      }
    }
    this.wildcardSubscribers = this.wildcardSubscribers.filter(
      (sub) => sub.namespace !== namespace
    );
  }
}

// 单例模式导出
export const eventBus = new EventBusClass();

// 命名空间辅助函数
export const createNamespaceEventBus = (namespace: string) => {
  return {
    emit: <N extends EventName>(event: N, data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown) =>
      eventBus.emit(`${namespace}:${event}` as N, data),
    subscribe: <N extends EventName>(
      event: N,
      callback: (data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown) => void
    ) => eventBus.subscribe(`${namespace}:${event}` as N, callback),
    once: <N extends EventName>(
      event: N,
      callback: (data: N extends keyof ModuleEventData ? ModuleEventData[N] : unknown) => void
    ) => eventBus.once(`${namespace}:${event}` as N, callback),
  };
};

export default eventBus;
