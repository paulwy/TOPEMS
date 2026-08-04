/**
 * V45.0 Track F: 微前端终极形态 — 统一生命周期管理
 *
 * ModuleLifecycle 提供基于状态机的模块生命周期管理：
 * - 状态机：状态转换校验（防止非法状态转换）
 * - 生命周期阶段：Registered → Preloading → Loaded → Mounting → Mounted → Updating → Unmounting → Unmounted
 * - 生命周期钩子：beforeMount / mounted / beforeUpdate / updated / beforeUnmount / unmounted / onError
 * - 事件时间线：记录所有生命周期事件
 *
 * @example
 * lifecycleManager.register('crm', { name: 'CRM 模块' });
 * lifecycleManager.preload('crm');
 * lifecycleManager.mount('crm', container);
 * lifecycleManager.unmount('crm');
 */

// ==================== 类型定义 ====================

/** 生命周期状态 */
export enum LifecycleState {
  REGISTERED = 'registered',
  PRELOADING = 'preloading',
  LOADED = 'loaded',
  MOUNTING = 'mounting',
  MOUNTED = 'mounted',
  UPDATING = 'updating',
  ERROR = 'error',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
}

/** 生命周期事件类型 */
export enum LifecycleEventType {
  REGISTERED = 'registered',
  PRELOADSTART = 'preload_start',
  PRELOADEND = 'preload_end',
  LOADSTART = 'load_start',
  LOADEND = 'load_end',
  MOUNTSTART = 'mount_start',
  MOUNTEND = 'mount_end',
  UPDATESTART = 'update_start',
  UPDATEEND = 'update_end',
  UNMOUNTSTART = 'unmount_start',
  UNMOUNTEND = 'unmount_end',
  ERROR = 'error',
  DESTROYED = 'destroyed',
  STATECHANGE = 'state_change',
}

/** 生命周期事件 */
export interface LifecycleEvent {
  /** 模块 ID */
  module_id: string;
  /** 事件类型 */
  event_type: LifecycleEventType;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件附加数据 */
  data?: Record<string, any>;
}

/** 生命周期钩子集合 */
export interface LifecycleHooks {
  beforeMount?: (container: HTMLElement, props: Record<string, any>) => void;
  mounted?: (container: HTMLElement) => void;
  beforeUpdate?: (container: HTMLElement, props: Record<string, any>) => void;
  updated?: (container: HTMLElement) => void;
  beforeUnmount?: (container: HTMLElement) => void;
  unmounted?: (container: HTMLElement) => void;
  onError?: (error: Error, container?: HTMLElement) => void;
}

/** 模块生命周期记录 */
export interface ModuleLifecycleRecord {
  /** 模块 ID */
  id: string;
  /** 模块名称 */
  name: string;
  /** 当前状态 */
  state: LifecycleState;
  /** 注册时间 */
  registeredAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 挂载容器 */
  container?: HTMLElement;
  /** 当前属性 */
  props?: Record<string, any>;
  /** 最后错误 */
  lastError?: Error;
  /** 生命周期钩子 */
  hooks?: LifecycleHooks;
  /** 状态历史 */
  stateHistory: Array<{ state: LifecycleState; timestamp: number }>;
}

/** 生命周期事件回调 */
export type LifecycleEventCallback = (event: LifecycleEvent) => void;

// ==================== 状态机定义 ====================

/** 合法状态转换映射 */
const STATE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.REGISTERED]: [
    LifecycleState.PRELOADING,
    LifecycleState.LOADED,
    LifecycleState.UNMOUNTED,
  ],
  [LifecycleState.PRELOADING]: [
    LifecycleState.LOADED,
    LifecycleState.ERROR,
    LifecycleState.REGISTERED,
  ],
  [LifecycleState.LOADED]: [
    LifecycleState.MOUNTING,
    LifecycleState.UNMOUNTING,
    LifecycleState.ERROR,
    LifecycleState.PRELOADING,
  ],
  [LifecycleState.MOUNTING]: [LifecycleState.MOUNTED, LifecycleState.ERROR],
  [LifecycleState.MOUNTED]: [
    LifecycleState.UPDATING,
    LifecycleState.UNMOUNTING,
    LifecycleState.ERROR,
  ],
  [LifecycleState.UPDATING]: [LifecycleState.MOUNTED, LifecycleState.ERROR],
  [LifecycleState.ERROR]: [
    LifecycleState.PRELOADING,
    LifecycleState.UNMOUNTING,
    LifecycleState.MOUNTING,
  ],
  [LifecycleState.UNMOUNTING]: [LifecycleState.UNMOUNTED, LifecycleState.ERROR],
  [LifecycleState.UNMOUNTED]: [
    LifecycleState.PRELOADING,
    LifecycleState.LOADED,
    LifecycleState.MOUNTING,
  ],
};

// ==================== ModuleLifecycle ====================

/**
 * 模块生命周期管理器
 *
 * 基于状态机管理模块从注册到销毁的完整生命周期，
 * 支持钩子注册、状态转换校验与事件时间线。
 */
export class ModuleLifecycle {
  /** 模块生命周期记录: id -> ModuleLifecycleRecord */
  private readonly records = new Map<string, ModuleLifecycleRecord>();
  /** 事件时间线（所有模块） */
  private readonly eventTimeline: LifecycleEvent[] = [];
  /** 事件监听器 */
  private readonly listeners = new Set<LifecycleEventCallback>();
  /** 时间线最大长度 */
  private readonly maxTimelineSize = 1000;

  // -------------------- 注册 --------------------

  /**
   * 注册模块
   */
  register(
    id: string,
    options: { name?: string; hooks?: LifecycleHooks } = {}
  ): ModuleLifecycleRecord {
    if (this.records.has(id)) {
      console.warn(`[Lifecycle] 模块 ${id} 已注册，将覆盖旧记录`);
    }
    const now = Date.now();
    const record: ModuleLifecycleRecord = {
      id,
      name: options.name || id,
      state: LifecycleState.REGISTERED,
      registeredAt: now,
      updatedAt: now,
      hooks: options.hooks,
      stateHistory: [{ state: LifecycleState.REGISTERED, timestamp: now }],
    };
    this.records.set(id, record);
    this.emitEvent(id, LifecycleEventType.REGISTERED, { name: record.name });
    return record;
  }

  // -------------------- 生命周期操作 --------------------

  /**
   * 预加载
   */
  preload(id: string): boolean {
    if (!this.validateTransition(id, LifecycleState.PRELOADING)) return false;
    this.emitEvent(id, LifecycleEventType.PRELOADSTART);
    this.updateState(id, LifecycleState.PRELOADING);
    // 模拟预加载完成
    this.emitEvent(id, LifecycleEventType.PRELOADEND);
    this.updateState(id, LifecycleState.LOADED);
    return true;
  }

  /**
   * 挂载
   */
  mount(id: string, container: HTMLElement, props: Record<string, any> = {}): boolean {
    const record = this.records.get(id);
    if (!record) {
      console.error(`[Lifecycle] 模块 ${id} 未注册`);
      return false;
    }

    // 允许从 Loaded / Unmounted / Error 状态挂载
    const allowedStates = [LifecycleState.LOADED, LifecycleState.UNMOUNTED, LifecycleState.ERROR];
    if (!allowedStates.includes(record.state)) {
      console.error(`[Lifecycle] 模块 ${id} 当前状态 ${record.state} 不允许挂载`);
      return false;
    }

    // beforeMount 钩子
    try {
      record.hooks?.beforeMount?.(container, props);
    } catch (err) {
      this.handleError(id, err as Error, container);
      return false;
    }

    this.emitEvent(id, LifecycleEventType.MOUNTSTART, {
      container: !!container,
      propsCount: Object.keys(props).length,
    });
    this.updateState(id, LifecycleState.MOUNTING);
    record.container = container;
    record.props = props;

    // 模拟挂载完成
    this.emitEvent(id, LifecycleEventType.MOUNTEND);
    this.updateState(id, LifecycleState.MOUNTED);

    // mounted 钩子
    try {
      record.hooks?.mounted?.(container);
    } catch (err) {
      this.handleError(id, err as Error, container);
    }
    return true;
  }

  /**
   * 更新
   */
  update(id: string, props: Record<string, any>): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    if (record.state !== LifecycleState.MOUNTED) {
      console.error(`[Lifecycle] 模块 ${id} 当前状态 ${record.state} 不允许更新（需 Mounted）`);
      return false;
    }

    // beforeUpdate 钩子
    try {
      record.hooks?.beforeUpdate?.(record.container!, props);
    } catch (err) {
      this.handleError(id, err as Error, record.container);
      return false;
    }

    this.emitEvent(id, LifecycleEventType.UPDATESTART, { propsCount: Object.keys(props).length });
    this.updateState(id, LifecycleState.UPDATING);
    record.props = { ...record.props, ...props };

    this.emitEvent(id, LifecycleEventType.UPDATEEND);
    this.updateState(id, LifecycleState.MOUNTED);

    // updated 钩子
    try {
      record.hooks?.updated?.(record.container!);
    } catch (err) {
      this.handleError(id, err as Error, record.container);
    }
    return true;
  }

  /**
   * 卸载
   */
  unmount(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    if (record.state !== LifecycleState.MOUNTED && record.state !== LifecycleState.ERROR) {
      console.error(`[Lifecycle] 模块 ${id} 当前状态 ${record.state} 不允许卸载`);
      return false;
    }

    // beforeUnmount 钩子
    try {
      record.hooks?.beforeUnmount?.(record.container!);
    } catch (err) {
      console.error(`[Lifecycle] beforeUnmount 钩子错误:`, err);
    }

    this.emitEvent(id, LifecycleEventType.UNMOUNTSTART);
    this.updateState(id, LifecycleState.UNMOUNTING);

    // 模拟卸载完成
    this.emitEvent(id, LifecycleEventType.UNMOUNTEND);
    this.updateState(id, LifecycleState.UNMOUNTED);

    // unmounted 钩子
    try {
      record.hooks?.unmounted?.(record.container!);
    } catch (err) {
      console.error(`[Lifecycle] unmounted 钩子错误:`, err);
    }

    record.container = undefined;
    return true;
  }

  /**
   * 销毁（彻底移除记录）
   */
  destroy(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    if (record.state === LifecycleState.MOUNTED) {
      this.unmount(id);
    }

    this.emitEvent(id, LifecycleEventType.DESTROYED);
    this.records.delete(id);
    return true;
  }

  // -------------------- 查询方法 --------------------

  /** 获取模块当前状态 */
  getState(id: string): LifecycleState | null {
    return this.records.get(id)?.state ?? null;
  }

  /** 获取模块生命周期记录 */
  getRecord(id: string): ModuleLifecycleRecord | undefined {
    return this.records.get(id);
  }

  /** 列出所有模块记录 */
  listRecords(): ModuleLifecycleRecord[] {
    return Array.from(this.records.values());
  }

  /** 获取模块事件历史（按模块 ID 过滤） */
  getHistory(id: string): LifecycleEvent[] {
    return this.eventTimeline.filter((e) => e.module_id === id);
  }

  /** 获取所有事件时间线 */
  getAllEvents(): LifecycleEvent[] {
    return [...this.eventTimeline];
  }

  /** 按状态筛选模块 */
  getModulesByState(state: LifecycleState): ModuleLifecycleRecord[] {
    return this.listRecords().filter((r) => r.state === state);
  }

  // -------------------- 钩子管理 --------------------

  /** 注册生命周期钩子 */
  setHooks(id: string, hooks: LifecycleHooks): boolean {
    const record = this.records.get(id);
    if (!record) return false;
    record.hooks = hooks;
    return true;
  }

  // -------------------- 事件订阅 --------------------

  /** 订阅生命周期事件 */
  onEvent(callback: LifecycleEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // -------------------- 内部实现 --------------------

  /** 校验状态转换是否合法 */
  private validateTransition(id: string, targetState: LifecycleState): boolean {
    const record = this.records.get(id);
    if (!record) {
      console.error(`[Lifecycle] 模块 ${id} 未注册`);
      return false;
    }
    const allowed = STATE_TRANSITIONS[record.state];
    if (!allowed || !allowed.includes(targetState)) {
      console.error(`[Lifecycle] 模块 ${id} 非法状态转换: ${record.state} → ${targetState}`);
      return false;
    }
    return true;
  }

  /** 更新状态（带校验） */
  private updateState(id: string, newState: LifecycleState): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    const oldState = record.state;
    if (oldState === newState) return true;

    if (!this.validateTransition(id, newState)) return false;

    record.state = newState;
    record.updatedAt = Date.now();
    record.stateHistory.push({ state: newState, timestamp: record.updatedAt });

    this.emitEvent(id, LifecycleEventType.STATECHANGE, {
      from: oldState,
      to: newState,
    });
    return true;
  }

  /** 处理错误 */
  private handleError(id: string, error: Error, container?: HTMLElement): void {
    const record = this.records.get(id);
    if (!record) return;

    record.lastError = error;
    record.state = LifecycleState.ERROR;
    record.updatedAt = Date.now();
    record.stateHistory.push({ state: LifecycleState.ERROR, timestamp: record.updatedAt });

    this.emitEvent(id, LifecycleEventType.ERROR, {
      message: error.message,
      stack: error.stack,
    });

    try {
      record.hooks?.onError?.(error, container);
    } catch {
      // ignore
    }
  }

  /** 发射事件 */
  private emitEvent(
    moduleId: string,
    eventType: LifecycleEventType,
    data?: Record<string, any>
  ): void {
    const event: LifecycleEvent = {
      module_id: moduleId,
      event_type: eventType,
      timestamp: Date.now(),
      data,
    };
    this.eventTimeline.push(event);

    // 限制时间线长度
    if (this.eventTimeline.length > this.maxTimelineSize) {
      this.eventTimeline.shift();
    }

    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // ignore
      }
    });
  }

  /** 清空时间线 */
  clearTimeline(): void {
    this.eventTimeline.length = 0;
  }

  /** 获取已注册模块总数 */
  get size(): number {
    return this.records.size;
  }

  /** 获取事件总数 */
  get eventCount(): number {
    return this.eventTimeline.length;
  }
}

// ==================== 单例导出 ====================

export const lifecycleManager = new ModuleLifecycle();

export default lifecycleManager;
