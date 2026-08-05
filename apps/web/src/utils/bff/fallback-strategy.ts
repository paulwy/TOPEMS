/**
 * V45.0 Track D: BFF 降级策略
 *
 * 基于责任链模式实现多级降级：
 * - Primary（主路径）：GraphQL → REST → 缓存 → 本地数据 → 降级 UI
 * - 当某一级失败时，自动尝试下一级，保证用户可用性
 *
 * 内置降级策略：
 * - GraphqlToRestFallback：GraphQL 失败时降级到 REST
 * - CacheFallback：网络失败时使用缓存数据
 * - UIFallback：数据加载失败时显示降级 UI
 * - OfflineFallback：离线时使用本地数据
 *
 * 所有降级记录用内存存储 + localStorage 持久化，供监控面板消费。
 */

import { logger } from '@/utils/logger';

const fallbackLogger = logger.child({ prefix: 'BFF-Fallback' });

// ==================== 降级级别 ====================

/**
 * 降级级别（从高到低）
 * - Primary：主路径（如 GraphQL）
 * - Secondary：次级路径（如 REST / 缓存）
 * - Tertiary：三级路径（如本地数据 / 降级 UI）
 * - Offline：离线模式（本地兜底）
 */
export enum FallbackLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  OFFLINE = 'offline',
}

// ==================== 降级上下文 ====================

/** 降级执行上下文 */
export interface FallbackContext {
  /** 操作名（如 query name / mutation name） */
  operationName: string;
  /** 服务名（如 'erp' | 'crm'） */
  service?: string;
  /** 原始错误 */
  error?: unknown;
  /** 缓存数据（若可用） */
  cachedData?: unknown;
  /** 用户 ID（用于定向降级） */
  userId?: string;
  /** 额外上下文 */
  metadata?: Record<string, unknown>;
}

/** 降级执行结果 */
export interface FallbackResult<T = unknown> {
  /** 是否降级成功 */
  success: boolean;
  /** 降级后返回的数据 */
  data?: T;
  /** 实际命中的降级级别 */
  level: FallbackLevel;
  /** 使用的降级策略名 */
  strategyName: string;
  /** 降级耗时（毫秒） */
  durationMs: number;
  /** 降级原因（错误信息） */
  reason?: string;
}

/** 降级动作函数：接收上下文，返回数据或抛出错误 */
export type FallbackAction<T = unknown> = (context: FallbackContext) => Promise<T> | T;

// ==================== 降级策略 ====================

/** 降级策略定义 */
export interface FallbackStrategy<T = unknown> {
  /** 策略名（唯一标识） */
  name: string;
  /** 降级级别 */
  level: FallbackLevel;
  /** 触发条件：返回 true 时执行此策略 */
  condition: (context: FallbackContext) => boolean;
  /** 降级动作 */
  action: FallbackAction<T>;
  /** 优先级（数字越大越优先），同级别内按优先级排序 */
  priority: number;
  /** 是否在责任链中继续传播（false 表示终止链） */
  terminal?: boolean;
}

// ==================== 降级记录与统计 ====================

/** 单条降级记录 */
export interface FallbackRecord {
  id: string;
  timestamp: string;
  operationName: string;
  service?: string;
  level: FallbackLevel;
  strategyName: string;
  success: boolean;
  durationMs: number;
  reason?: string;
  userId?: string;
}

/** 降级统计 */
export interface FallbackStats {
  /** 总降级次数 */
  totalFallbacks: number;
  /** 成功降级次数 */
  successfulFallbacks: number;
  /** 失败降级次数 */
  failedFallbacks: number;
  /** 各级别降级次数 */
  byLevel: Record<FallbackLevel, number>;
  /** 各策略降级次数 */
  byStrategy: Record<string, number>;
  /** 最近一次降级时间 */
  lastFallbackAt: string | null;
  /** 成功率 */
  successRate: number;
}

// ==================== 内置降级策略 ====================

/**
 * GraphQL 降级 REST
 *
 * 当 GraphQL 请求失败时，自动回退到 REST API。
 * condition：错误包含 GraphQL/Network/Timeout 标志时触发。
 */
export class GraphqlToRestFallback<T = unknown> implements FallbackStrategy<T> {
  name = 'GraphqlToRestFallback';
  level = FallbackLevel.SECONDARY;
  priority = 100;
  terminal = false;

  private restFn: FallbackAction<T>;

  constructor(restFn: FallbackAction<T>, _priority = 100) {
    this.restFn = restFn;
  }

  condition(context: FallbackContext): boolean {
    if (!context.error) return false;
    const msg =
      context.error instanceof Error ? context.error.message : String(context.error ?? '');
    return (
      msg.includes('GraphQL') ||
      msg.includes('graphql') ||
      msg.includes('Network') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Timeout') ||
      msg.includes('timeout')
    );
  }

  action: FallbackAction<T> = (context) => this.restFn(context);
}

/**
 * 缓存降级
 *
 * 当网络请求失败时，使用缓存数据兜底。
 * condition：上下文携带 cachedData 且错误为网络错误时触发。
 */
export class CacheFallback<T = unknown> implements FallbackStrategy<T> {
  name = 'CacheFallback';
  level = FallbackLevel.TERTIARY;
  priority = 80;
  terminal = false;

  /** 自定义缓存读取函数（可选，优先于 context.cachedData） */
  private cacheFn?: FallbackAction<T>;

  constructor(cacheFn?: FallbackAction<T>, priority = 80) {
    this.cacheFn = cacheFn;
    if (priority !== 80) this.priority = priority;
  }

  condition(context: FallbackContext): boolean {
    if (this.cacheFn) return true;
    return context.cachedData !== undefined && context.cachedData !== null;
  }

  action: FallbackAction<T> = (context) => {
    if (this.cacheFn) return this.cacheFn(context);
    return context.cachedData as T;
  };
}

/**
 * UI 降级
 *
 * 当所有数据源都失败时，返回一个降级 UI 标记，由组件层渲染降级 UI。
 * condition：始终为 true（责任链末端兜底）。
 */
export class UIFallback<T = unknown> implements FallbackStrategy<T> {
  name = 'UIFallback';
  level = FallbackLevel.TERTIARY;
  priority = 10;
  terminal = true;

  /** 降级 UI 标记数据 */
  private fallbackData: T;

  constructor(fallbackData: T, priority = 10) {
    this.fallbackData = fallbackData;
    if (priority !== 10) this.priority = priority;
  }

  condition(): boolean {
    return true;
  }

  action: FallbackAction<T> = () => this.fallbackData;
}

/**
 * 离线降级
 *
 * 当 navigator.onLine === false 时，使用本地数据（IndexedDB / localStorage）。
 * condition：检测到离线状态时触发。
 */
export class OfflineFallback<T = unknown> implements FallbackStrategy<T> {
  name = 'OfflineFallback';
  level = FallbackLevel.OFFLINE;
  priority = 90;
  terminal = true;

  private localFn: FallbackAction<T>;

  constructor(localFn: FallbackAction<T>, priority = 90) {
    this.localFn = localFn;
    if (priority !== 90) this.priority = priority;
  }

  condition(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  action: FallbackAction<T> = (context) => this.localFn(context);
}

// ==================== 降级管理器 ====================

const STORAGE_KEY = 'topems:bff:fallback-records';
const MAX_RECORDS = 500;

/** 降级管理器：责任链调度降级策略 */
export class FallbackManager {
  private strategies: Map<string, FallbackStrategy> = new Map();
  private records: FallbackRecord[] = [];
  private listeners: Set<(stats: FallbackStats) => void> = new Set();

  constructor() {
    this.loadRecords();
  }

  // ---- 策略注册 ----

  /**
   * 注册降级策略
   * @returns 取消注册函数
   */
  register<T = unknown>(strategy: FallbackStrategy<T>): () => void {
    this.strategies.set(strategy.name, strategy as FallbackStrategy);
    fallbackLogger.debug(
      `注册降级策略: ${strategy.name} (level=${strategy.level}, priority=${strategy.priority})`
    );
    return () => {
      this.strategies.delete(strategy.name);
    };
  }

  /** 注销降级策略 */
  unregister(name: string): void {
    this.strategies.delete(name);
  }

  /** 获取所有已注册策略（按级别 + 优先级排序） */
  getStrategies(): FallbackStrategy[] {
    const levelOrder: Record<FallbackLevel, number> = {
      [FallbackLevel.PRIMARY]: 0,
      [FallbackLevel.SECONDARY]: 1,
      [FallbackLevel.TERTIARY]: 2,
      [FallbackLevel.OFFLINE]: 3,
    };
    return Array.from(this.strategies.values()).sort((a, b) => {
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return b.priority - a.priority;
    });
  }

  // ---- 责任链执行 ----

  /**
   * 执行降级责任链
   *
   * 按级别 + 优先级顺序遍历策略，跳过不满足 condition 的策略，
   * 第一个成功返回的策略终止链。若所有策略均失败，返回失败结果。
   *
   * @param context 降级上下文
   * @returns 降级结果
   */
  async execute<T = unknown>(context: FallbackContext): Promise<FallbackResult<T>> {
    const strategies = this.getStrategies();
    const startTime = Date.now();

    for (const strategy of strategies) {
      // 离线状态下，只执行 Offline 级别策略
      if (
        typeof navigator !== 'undefined' &&
        navigator.onLine === false &&
        strategy.level !== FallbackLevel.OFFLINE
      ) {
        continue;
      }

      let conditionMet = false;
      try {
        conditionMet = strategy.condition(context);
      } catch (condErr) {
        fallbackLogger.warn(`策略 ${strategy.name} condition 执行失败:`, condErr);
        continue;
      }

      if (!conditionMet) continue;

      const actionStart = Date.now();
      try {
        const data = await strategy.action(context);
        const durationMs = Date.now() - actionStart;
        const totalMs = Date.now() - startTime;
        const result: FallbackResult<T> = {
          success: true,
          data: data as T,
          level: strategy.level,
          strategyName: strategy.name,
          durationMs: totalMs,
        };
        this.recordFallback({
          operationName: context.operationName,
          service: context.service,
          level: strategy.level,
          strategyName: strategy.name,
          success: true,
          durationMs,
          reason: context.error instanceof Error ? context.error.message : undefined,
          userId: context.userId,
        });
        fallbackLogger.info(
          `降级成功: ${context.operationName} → ${strategy.name} (${durationMs}ms)`
        );
        return result;
      } catch (actionErr) {
        const durationMs = Date.now() - actionStart;
        const reason = actionErr instanceof Error ? actionErr.message : String(actionErr);
        this.recordFallback({
          operationName: context.operationName,
          service: context.service,
          level: strategy.level,
          strategyName: strategy.name,
          success: false,
          durationMs,
          reason,
          userId: context.userId,
        });
        fallbackLogger.warn(
          `降级失败: ${context.operationName} → ${strategy.name} (${durationMs}ms): ${reason}`
        );
        // 继续尝试下一个策略
        if (strategy.terminal) break;
      }
    }

    const totalMs = Date.now() - startTime;
    return {
      success: false,
      level: FallbackLevel.OFFLINE,
      strategyName: 'none',
      durationMs: totalMs,
      reason: context.error instanceof Error ? context.error.message : '所有降级策略均失败',
    };
  }

  // ---- 级别查询 ----

  /**
   * 根据错误推断合适的降级级别
   */
  getFallbackLevel(error: unknown): FallbackLevel {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return FallbackLevel.OFFLINE;
    }
    if (!error) return FallbackLevel.PRIMARY;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('GraphQL') || msg.includes('graphql')) {
      return FallbackLevel.SECONDARY;
    }
    if (msg.includes('Network') || msg.includes('Failed to fetch') || msg.includes('Timeout')) {
      return FallbackLevel.TERTIARY;
    }
    return FallbackLevel.TERTIARY;
  }

  // ---- 记录与统计 ----

  /** 记录一次降级 */
  recordFallback(record: Omit<FallbackRecord, 'id' | 'timestamp'>): void {
    const full: FallbackRecord = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...record,
    };
    this.records.unshift(full);
    if (this.records.length > MAX_RECORDS) {
      this.records.length = MAX_RECORDS;
    }
    this.persistRecords();
    this.notifyListeners();
  }

  /** 获取降级统计 */
  getStats(): FallbackStats {
    const total = this.records.length;
    const successful = this.records.filter((r) => r.success).length;
    const failed = total - successful;
    const byLevel: Record<FallbackLevel, number> = {
      [FallbackLevel.PRIMARY]: 0,
      [FallbackLevel.SECONDARY]: 0,
      [FallbackLevel.TERTIARY]: 0,
      [FallbackLevel.OFFLINE]: 0,
    };
    const byStrategy: Record<string, number> = {};
    let lastFallbackAt: string | null = null;

    for (const r of this.records) {
      byLevel[r.level] = (byLevel[r.level] ?? 0) + 1;
      byStrategy[r.strategyName] = (byStrategy[r.strategyName] ?? 0) + 1;
      if (!lastFallbackAt || r.timestamp > lastFallbackAt) {
        lastFallbackAt = r.timestamp;
      }
    }

    return {
      totalFallbacks: total,
      successfulFallbacks: successful,
      failedFallbacks: failed,
      byLevel,
      byStrategy,
      lastFallbackAt,
      successRate: total > 0 ? successful / total : 0,
    };
  }

  /** 获取降级记录列表 */
  getRecords(limit = 100): FallbackRecord[] {
    return this.records.slice(0, limit);
  }

  /** 清空降级记录 */
  clearRecords(): void {
    this.records = [];
    this.persistRecords();
    this.notifyListeners();
  }

  /** 订阅统计变化 */
  onStatsChange(callback: (stats: FallbackStats) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // ---- 持久化 ----

  private loadRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.records = JSON.parse(raw) as FallbackRecord[];
      }
    } catch (err) {
      fallbackLogger.warn('加载降级记录失败:', err);
    }
  }

  private persistRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(0, MAX_RECORDS)));
    } catch (err) {
      fallbackLogger.warn('持久化降级记录失败:', err);
    }
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (err) {
        fallbackLogger.error('降级统计监听器执行失败:', err);
      }
    });
  }
}

// ==================== 单例 ====================

/**
 * 降级管理器单例
 *
 * 全局共享一个 FallbackManager 实例。
 * 内置注册以下默认策略：
 * - UIFallback（兜底，Tertiary 级别）
 *
 * 业务代码可通过 fallbackManager.register() 注册自定义策略。
 */
export const fallbackManager = new FallbackManager();

// 注册默认兜底策略：返回空数据标记，由 UI 层渲染降级 UI
fallbackManager.register<unknown>(
  new UIFallback<unknown>({ __fallback: true, __reason: 'ui-fallback' })
);

export default fallbackManager;
