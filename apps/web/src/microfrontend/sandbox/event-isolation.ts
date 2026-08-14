/**
 * V42.0 Track F: 微前端企业级 — 事件隔离
 *
 * 通过猴子补丁 addEventListener/removeEventListener + 包装定时器 API，
 * 将模块注册的事件监听器和定时器记录在沙箱内部，模块卸载时统一清理。
 *
 * 同时提供内存泄漏检测：
 * - detectLeaks(): 检测未清理的事件/定时器
 * - getLeakReport(): 获取泄漏报告
 *
 * @example
 * const iso = new EventIsolation('crm');
 * iso.addEventListener(window, 'resize', handler);
 * iso.clearAllEvents(); // 清理所有监听
 */

import { conflictDetector } from './conflict-detector';
import i18n from '@/i18n';

// ==================== 类型定义 ====================

export type TimerType = 'interval' | 'timeout' | 'raf';

export interface RegisteredEvent {
  /** 事件类型 */
  type: string;
  /** 监听器函数 */
  listener: EventListenerOrEventListenerObject;
  /** 事件选项 */
  options?: AddEventListenerOptions | boolean;
  /** 注册时间戳 */
  timestamp: number;
  /** 目标对象（用于清理） */
  target: EventTarget;
}

export interface RegisteredTimer {
  /** 定时器 ID */
  id: number;
  /** 定时器类型 */
  type: TimerType;
  /** 注册时间戳 */
  timestamp: number;
  /** 回调函数引用（用于报告） */
  callback?: Function;
  /** 延迟时间（毫秒） */
  delay?: number;
}

export interface EventLeakReport {
  /** 未清理的事件数量 */
  eventCount: number;
  /** 未清理的定时器数量 */
  timerCount: number;
  /** 按类型分组的未清理事件 */
  eventsByType: Record<string, number>;
  /** 按类型分组的未清理定时器 */
  timersByType: Record<TimerType, number>;
  /** 详细列表 */
  events: RegisteredEvent[];
  timers: RegisteredTimer[];
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error';
}

export interface EventConflict {
  /** 冲突的事件类型 */
  eventType: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error';
}

// ==================== EventIsolation ====================

export class EventIsolation {
  readonly moduleId: string;
  /** 已注册的事件监听器（key: target+type+listener 引用） */
  private readonly events = new Set<RegisteredEvent>();
  /** 已注册的定时器（key: id） */
  private readonly timers = new Map<number, RegisteredTimer>();
  /** 检测到的事件冲突 */
  private readonly conflicts: EventConflict[] = [];
  /** 是否已安装猴子补丁（每个实例只安装一次） */
  private patched = false;
  /** 原生 addEventListener 引用 */
  private originalAddEventListener: typeof EventTarget.prototype.addEventListener | null = null;
  /** 原生 removeEventListener 引用 */
  private originalRemoveEventListener: typeof EventTarget.prototype.removeEventListener | null =
    null;
  /** 原生 setInterval 引用（DOM 返回 number） */
  private originalSetInterval:
    ((handler: TimerHandler, timeout?: number, ...args: any[]) => number) | null = null;
  /** 原生 clearInterval 引用 */
  private originalClearInterval: ((id?: number) => void) | null = null;
  /** 原生 setTimeout 引用（DOM 返回 number） */
  private originalSetTimeout:
    ((handler: TimerHandler, timeout?: number, ...args: any[]) => number) | null = null;
  /** 原生 clearTimeout 引用 */
  private originalClearTimeout: ((id?: number) => void) | null = null;
  /** 原生 requestAnimationFrame 引用 */
  private originalRAF: ((callback: FrameRequestCallback) => number) | null = null;
  /** 原生 cancelAnimationFrame 引用 */
  private originalCancelRAF: ((id: number) => void) | null = null;
  /** 当前活跃标记（用于判断拦截是否生效） */
  private active = false;

  constructor(moduleId: string) {
    this.moduleId = moduleId;
  }

  /** 激活事件隔离（安装猴子补丁，开始拦截） */
  activate(): void {
    if (this.active) return;
    this.active = true;
    if (!this.patched) {
      this.installPatches();
      this.patched = true;
    }
  }

  /** 停用事件隔离（卸载猴子补丁） */
  deactivate(): void {
    this.active = false;
    // 不主动 uninstall 补丁，避免影响其他模块；
    // 由 sandbox-manager 统一在销毁时调用 clearAllEvents
  }

  /** 事件隔离是否激活 */
  isActive(): boolean {
    return this.active;
  }

  // ==================== 事件 API ====================

  /**
   * 注册事件（记录在沙箱内）
   *
   * 注意：调用此方法并不会真正绑定事件，需配合 installPatches 拦截原生 addEventListener
   * 使用；或直接调用 target.addEventListener 并手动 registerEvent。
   */
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;

  /** 重载：显式传入 target */
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;

  addEventListener(...args: any[]): void {
    let target: EventTarget;
    let type: string;
    let listener: EventListenerOrEventListenerObject;
    let options: boolean | AddEventListenerOptions | undefined;

    if (args.length >= 3 && typeof args[0] !== 'string') {
      // (target, type, listener, options?)
      [target, type, listener, options] = args;
    } else {
      // (type, listener, options?) - 默认 target 为 window
      [type, listener, options] = args;
      target = typeof window !== 'undefined' ? window : (null as any);
    }

    if (!target) {
      console.warn(`${i18n.t('microfrontend.event-isolation.eventisolation_0')}${this.moduleId}${i18n.t('microfrontend.event-isolation.k1')}${type}${i18n.t('microfrontend.event-isolation.target_2')}`);
      return;
    }

    const record: RegisteredEvent = {
      type,
      listener,
      options: options as AddEventListenerOptions | undefined,
      timestamp: Date.now(),
      target,
    };
    this.events.add(record);

    // 真正绑定（使用原生方法避免重复拦截）
    if (this.originalAddEventListener) {
      this.originalAddEventListener.call(target, type, listener, options);
    } else if (typeof target.addEventListener === 'function') {
      target.addEventListener(type, listener, options);
    }

    // 注册到冲突检测器
    conflictDetector.registerEvent(this.moduleId, type);
  }

  /** 移除事件监听 */
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;

  removeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void;

  removeEventListener(...args: any[]): void {
    let target: EventTarget;
    let type: string;
    let listener: EventListenerOrEventListenerObject;

    if (args.length >= 3 && typeof args[0] !== 'string') {
      [target, type, listener] = args;
    } else {
      [type, listener] = args;
      target = typeof window !== 'undefined' ? window : (null as any);
    }

    // 从沙箱记录中移除
    for (const record of this.events) {
      if (record.type === type && record.listener === listener && record.target === target) {
        this.events.delete(record);
        break;
      }
    }

    // 真正移除
    if (this.originalRemoveEventListener) {
      this.originalRemoveEventListener.call(target, type, listener);
    } else if (typeof target.removeEventListener === 'function') {
      target.removeEventListener(type, listener);
    }
  }

  /** 清理模块所有事件监听 */
  clearAllEvents(): void {
    for (const record of this.events) {
      try {
        if (this.originalRemoveEventListener) {
          this.originalRemoveEventListener.call(
            record.target,
            record.type,
            record.listener,
            record.options
          );
        } else if (typeof record.target.removeEventListener === 'function') {
          record.target.removeEventListener(record.type, record.listener, record.options as any);
        }
      } catch {
        /* ignore */
      }
    }
    this.events.clear();
  }

  /** 获取已注册的事件数量 */
  getEventCount(): number {
    return this.events.size;
  }

  /** 获取已注册的事件类型列表 */
  getEventTypes(): string[] {
    const types = new Set<string>();
    for (const record of this.events) {
      types.add(record.type);
    }
    return Array.from(types);
  }

  // ==================== 定时器 API ====================

  /** 注册定时器（手动注册） */
  registerTimer(id: number, type: TimerType, callback?: Function, delay?: number): void {
    this.timers.set(id, {
      id,
      type,
      timestamp: Date.now(),
      callback,
      delay,
    });
  }

  /** 清理所有定时器 */
  clearAllTimers(): void {
    for (const [id, record] of this.timers) {
      try {
        switch (record.type) {
          case 'interval':
            if (this.originalClearInterval) {
              this.originalClearInterval.call(window, id);
            } else {
              clearInterval(id);
            }
            break;
          case 'timeout':
            if (this.originalClearTimeout) {
              this.originalClearTimeout.call(window, id);
            } else {
              clearTimeout(id);
            }
            break;
          case 'raf':
            if (this.originalCancelRAF) {
              this.originalCancelRAF.call(window, id);
            } else if (typeof cancelAnimationFrame === 'function') {
              cancelAnimationFrame(id);
            }
            break;
        }
      } catch {
        /* ignore */
      }
    }
    this.timers.clear();
  }

  /** 获取已注册的定时器数量 */
  getTimerCount(): number {
    return this.timers.size;
  }

  // ==================== 内存泄漏检测 ====================

  /** 检测未清理的事件/定时器 */
  detectLeaks(): EventLeakReport {
    const eventsByType: Record<string, number> = {};
    const timersByType: Record<TimerType, number> = {
      interval: 0,
      timeout: 0,
      raf: 0,
    };

    for (const record of this.events) {
      eventsByType[record.type] = (eventsByType[record.type] ?? 0) + 1;
    }
    for (const [, record] of this.timers) {
      timersByType[record.type] += 1;
    }

    const eventCount = this.events.size;
    const timerCount = this.timers.size;
    const totalLeaks = eventCount + timerCount;

    let severity: 'info' | 'warning' | 'error' = 'info';
    if (totalLeaks >= 10) severity = 'error';
    else if (totalLeaks >= 3) severity = 'warning';

    return {
      eventCount,
      timerCount,
      eventsByType,
      timersByType,
      events: Array.from(this.events),
      timers: Array.from(this.timers.values()),
      severity,
    };
  }

  /** 获取泄漏报告（同 detectLeaks，但格式化输出友好） */
  getLeakReport(): EventLeakReport {
    return this.detectLeaks();
  }

  // ==================== 冲突检测 ====================

  /** 检测事件冲突（同类型事件多模块监听） */
  detectEventConflicts(): EventConflict[] {
    const found: EventConflict[] = [];
    const report = conflictDetector.getConflictReport();
    for (const c of report.eventConflicts) {
      if (c.modules.includes(this.moduleId)) {
        found.push({
          eventType: c.eventType,
          modules: c.modules,
          timestamp: c.timestamp,
          severity: c.severity,
        });
      }
    }
    this.conflicts.push(...found);
    return found;
  }

  /** 获取已记录的冲突列表 */
  getConflicts(): EventConflict[] {
    return [...this.conflicts];
  }

  // ==================== 内部实现 ====================

  /**
   * 安装猴子补丁
   *
   * 包装 EventTarget.prototype.addEventListener / removeEventListener，
   * 以及 window 的 setInterval/setTimeout/clearInterval/clearTimeout/requestAnimationFrame。
   *
   * 由于一个模块对应一个 EventIsolation 实例，补丁仅在当前实例 active 时拦截。
   */
  private installPatches(): void {
    if (typeof window === 'undefined') return;

    const self = this;
    const target = EventTarget.prototype as any;

    // 保存原引用
    this.originalAddEventListener = target.addEventListener;
    this.originalRemoveEventListener = target.removeEventListener;
    this.originalSetInterval = window.setInterval.bind(window);
    this.originalClearInterval = window.clearInterval.bind(window);
    this.originalSetTimeout = window.setTimeout.bind(window);
    this.originalClearTimeout = window.clearTimeout.bind(window);
    this.originalRAF = window.requestAnimationFrame.bind(window);
    this.originalCancelRAF = window.cancelAnimationFrame.bind(window);

    // 包装 addEventListener
    target.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if (self.active) {
        self.events.add({
          type,
          listener,
          options: options as AddEventListenerOptions | undefined,
          timestamp: Date.now(),
          target: this,
        });
        conflictDetector.registerEvent(self.moduleId, type);
      }
      return self.originalAddEventListener!.call(this, type, listener, options);
    };

    // 包装 removeEventListener
    target.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      if (self.active) {
        for (const record of self.events) {
          if (record.type === type && record.listener === listener && record.target === this) {
            self.events.delete(record);
            break;
          }
        }
      }
      return self.originalRemoveEventListener!.call(this, type, listener, options);
    };

    // 包装 setInterval
    window.setInterval = function (
      handler: TimerHandler,
      timeout?: number,
      ...args: any[]
    ): number {
      const id = self.originalSetInterval!(handler as any, timeout, ...args);
      if (self.active) {
        self.timers.set(id, {
          id,
          type: 'interval',
          timestamp: Date.now(),
          callback: handler as Function,
          delay: timeout,
        });
      }
      return id;
    } as any;

    // 包装 clearInterval
    window.clearInterval = function (id?: number) {
      if (self.active && typeof id === 'number') {
        self.timers.delete(id);
      }
      return self.originalClearInterval!(id);
    } as any;

    // 包装 setTimeout
    window.setTimeout = function (handler: TimerHandler, timeout?: number, ...args: any[]): number {
      const id = self.originalSetTimeout!(handler as any, timeout, ...args);
      if (self.active) {
        self.timers.set(id, {
          id,
          type: 'timeout',
          timestamp: Date.now(),
          callback: handler as Function,
          delay: timeout,
        });
      }
      return id;
    } as any;

    // 包装 clearTimeout
    window.clearTimeout = function (id?: number) {
      if (self.active && typeof id === 'number') {
        self.timers.delete(id);
      }
      return self.originalClearTimeout!(id);
    } as any;

    // 包装 requestAnimationFrame
    window.requestAnimationFrame = function (callback: FrameRequestCallback): number {
      const id = self.originalRAF!(callback);
      if (self.active) {
        self.timers.set(id, {
          id,
          type: 'raf',
          timestamp: Date.now(),
          callback: callback as unknown as Function,
        });
      }
      return id;
    } as any;

    // 包装 cancelAnimationFrame
    window.cancelAnimationFrame = function (id: number) {
      if (self.active) {
        self.timers.delete(id);
      }
      return self.originalCancelRAF!(id);
    } as any;
  }

  /** 卸载猴子补丁（恢复原生 API） */
  uninstallPatches(): void {
    if (!this.patched) return;
    if (typeof window === 'undefined') return;

    const target = EventTarget.prototype as any;
    if (this.originalAddEventListener) target.addEventListener = this.originalAddEventListener;
    if (this.originalRemoveEventListener)
      target.removeEventListener = this.originalRemoveEventListener;
    if (this.originalSetInterval) window.setInterval = this.originalSetInterval as any;
    if (this.originalClearInterval) window.clearInterval = this.originalClearInterval as any;
    if (this.originalSetTimeout) window.setTimeout = this.originalSetTimeout as any;
    if (this.originalClearTimeout) window.clearTimeout = this.originalClearTimeout as any;
    if (this.originalRAF) window.requestAnimationFrame = this.originalRAF as any;
    if (this.originalCancelRAF) window.cancelAnimationFrame = this.originalCancelRAF as any;

    this.patched = false;
    this.active = false;
  }

  /** 完全销毁：清理事件、定时器、卸载补丁 */
  destroy(): void {
    this.clearAllEvents();
    this.clearAllTimers();
    this.uninstallPatches();
    this.conflicts.length = 0;
  }
}
