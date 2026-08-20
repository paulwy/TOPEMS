/**
 * V42.0 Track D: 渐进式水合组件
 *
 * 实现 React 渐进式水合（Progressive Hydration）：
 * - 延迟水合（idle callback 或 intersection observer）
 * - 分块水合（按组件优先级）
 * - 水合状态追踪
 * - 交互优先（用户交互时立即水合）
 *
 * 原理：
 * - 服务端渲染的 HTML 在客户端水合时，默认会一次性水合所有组件，
 *   导致首屏交互延迟（TTI 下降）。
 * - ProgressiveHydration 将低优先级组件的水合推迟到浏览器空闲时
 *   （requestIdleCallback）或可见时（IntersectionObserver），
 *   并在用户交互时立即触发水合，保证交互响应性。
 *
 * @example
 * ```tsx
 * <ProgressiveHydration priority="high">
 *   <Header />  // 立即水合
 * </ProgressiveHydration>
 * <ProgressiveHydration priority="low" when="idle">
 *   <Comments />  // 空闲时水合
 * </ProgressiveHydration>
 * <ProgressiveHydration priority="medium" when="visible">
 *   <Chart />  // 可见时水合
 * </ProgressiveHydration>
 * ```
 */

import React, { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const hydrationLogger = logger.child({ prefix: 'ProgressiveHydration' });

// ==================== 类型定义 ====================

/** 水合优先级 */
export type HydrationPriority = 'high' | 'medium' | 'low';

/** 水合触发时机 */
export type HydrationTrigger = 'immediate' | 'idle' | 'visible' | 'interaction';

/** 水合状态 */
export type HydrationStatus = 'pending' | 'hydrating' | 'hydrated';

/** ProgressiveHydration Props */
export interface ProgressiveHydrationProps {
  children: ReactNode;
  /** 优先级：high(立即) / medium(空闲) / low(延迟) */
  priority?: HydrationPriority;
  /** 触发时机：immediate(立即) / idle(空闲) / visible(可见) / interaction(交互) */
  when?: HydrationTrigger;
  /** 组件标识（用于追踪） */
  id?: string;
  /** 空闲等待超时（毫秒），默认 3000ms（超时后强制水合） */
  idleTimeout?: number;
  /** 占位元素（水合前展示），默认渲染 children 的 SSR HTML */
  placeholder?: ReactNode;
  /** 水合完成回调 */
  onHydrated?: (id: string, duration: number) => void;
}

// ==================== 水合状态追踪 ====================

/** 水合记录 */
export interface HydrationRecord {
  id: string;
  priority: HydrationPriority;
  trigger: HydrationTrigger;
  status: HydrationStatus;
  duration: number | null;
  hydratedAt: number | null;
}

const hydrationListeners = new Set<() => void>();
const hydrationRecords: HydrationRecord[] = [];
const hydrationStatusMap = new Map<string, HydrationStatus>();
const MAX_HYDRATION_RECORDS = 200;

function notifyHydrationListeners(): void {
  hydrationListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      hydrationLogger.error(i18n.t('components.progressive_hydration.k0'), e);
    }
  });
}

/**
 * 记录水合状态（供 PerformancePanel 统计）
 */
function recordHydration(record: HydrationRecord): void {
  hydrationRecords.unshift(record);
  if (hydrationRecords.length > MAX_HYDRATION_RECORDS) {
    hydrationRecords.pop();
  }
  hydrationStatusMap.set(record.id, record.status);
  notifyHydrationListeners();
}

/**
 * 获取水合统计
 */
export function getHydrationStats(): {
  records: HydrationRecord[];
  totalComponents: number;
  hydratedCount: number;
  pendingCount: number;
  avgDuration: number;
} {
  const hydrated = hydrationRecords.filter((r) => r.status === 'hydrated' && r.duration !== null);
  const pending = hydrationRecords.filter((r) => r.status !== 'hydrated');
  const avgDuration =
    hydrated.length > 0
      ? hydrated.reduce((sum, r) => sum + (r.duration ?? 0), 0) / hydrated.length
      : 0;
  return {
    records: [...hydrationRecords],
    totalComponents: hydrationRecords.length,
    hydratedCount: hydrated.length,
    pendingCount: pending.length,
    avgDuration,
  };
}

/**
 * 订阅水合统计变化
 * @returns 取消订阅函数
 */
export function onHydrationStatsChange(callback: () => void): () => void {
  hydrationListeners.add(callback);
  return () => {
    hydrationListeners.delete(callback);
  };
}

// ==================== requestIdleCallback 兼容封装 ====================

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const requestIdleCallbackPolyfill = (
  callback: IdleCallback,
  options?: { timeout?: number }
): number => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (
      window as unknown as {
        requestIdleCallback: (cb: IdleCallback, options?: { timeout?: number }) => number;
      }
    ).requestIdleCallback(callback, options);
  }
  // 降级：使用 setTimeout 模拟
  const timeout = options?.timeout ?? 0;
  return (window as unknown as Window & { setTimeout: typeof setTimeout }).setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, timeout) as unknown as number;
};

const cancelIdleCallbackPolyfill = (handle: number): void => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(
      handle
    );
    return;
  }
  (window as unknown as Window & { clearTimeout: typeof clearTimeout }).clearTimeout(handle);
};

// ==================== ProgressiveHydration 组件 ====================

/**
 * 渐进式水合组件
 *
 * 根据优先级与触发时机决定何时水合子组件：
 * - priority="high" / when="immediate": 立即水合（同步）
 * - when="idle": 浏览器空闲时水合（requestIdleCallback）
 * - when="visible": 视口可见时水合（IntersectionObserver）
 * - when="interaction": 用户交互时水合（click/touchstart/mouseover）
 *
 * 水合前展示 SSR HTML（避免重复渲染），水合后挂载真实组件。
 * 交互优先：任何交互事件都会立即触发水合，保证用户体验。
 *
 * @example
 * ```tsx
 * <ProgressiveHydration priority="high">
 *   <CriticalHeader />
 * </ProgressiveHydration>
 *
 * <ProgressiveHydration priority="low" when="idle" id="comments">
 *   <Comments />
 * </ProgressiveHydration>
 * ```
 */
export const ProgressiveHydration: React.FC<ProgressiveHydrationProps> = ({
  children,
  priority = 'medium',
  when = 'immediate',
  id,
  idleTimeout = 3000,
  placeholder,
  onHydrated,
}) => {
  const componentId = useRef(id ?? `ph-${Math.random().toString(36).slice(2, 9)}`);
  const [status, setStatus] = useState<HydrationStatus>('pending');
  const containerRef = useRef<HTMLDivElement>(null);
  const startTime = useRef<number>(0);
  const interactionHandlersRef = useRef<Array<() => void>>([]);

  // 记录开始时间
  useEffect(() => {
    startTime.current = performance.now();
  }, []);

  const hydrate = useCallback(() => {
    if (status !== 'pending') return;
    setStatus('hydrating');
    const hydrationStart = performance.now();
    recordHydration({
      id: componentId.current,
      priority,
      trigger: when,
      status: 'hydrating',
      duration: null,
      hydratedAt: null,
    });

    // 使用 microtask 触发实际水合，确保状态更新顺序
    queueMicrotask(() => {
      setStatus('hydrated');
      const duration = performance.now() - hydrationStart;
      recordHydration({
        id: componentId.current,
        priority,
        trigger: when,
        status: 'hydrated',
        duration,
        hydratedAt: Date.now(),
      });
      onHydrated?.(componentId.current, duration);
      hydrationLogger.debug(
        `${i18n.t('components.progressive_hydration.k1')}${componentId.current}${i18n.t('components.progressive_hydration.k2')}${duration.toFixed(1)}ms)`
      );
    });
  }, [status, priority, when, onHydrated]);

  // 根据触发时机注册水合逻辑
  useEffect(() => {
    if (status !== 'pending') return;

    // 立即水合
    if (when === 'immediate' || priority === 'high') {
      hydrate();
      return;
    }

    let idleHandle: number | null = null;
    let observer: IntersectionObserver | null = null;
    let timeoutHandle: number | null = null;
    const interactionEvents: Array<keyof WindowEventMap> = [
      'click',
      'touchstart',
      'mouseover',
      'keydown',
    ];

    const cleanupInteraction = () => {
      for (const handler of interactionHandlersRef.current) {
        handler();
      }
      interactionHandlersRef.current = [];
    };

    // 交互优先：任何用户交互立即触发水合
    const interactionHandler = (): void => {
      hydrationLogger.debug(
        `${i18n.t('components.progressive_hydration.k3')}${componentId.current}${i18n.t('components.progressive_hydration.k4')}`
      );
      hydrate();
      cleanupInteraction();
    };

    if (when === 'interaction') {
      for (const event of interactionEvents) {
        const opts: AddEventListenerOptions = { passive: true, once: true };
        window.addEventListener(event, interactionHandler, opts);
        interactionHandlersRef.current.push(() =>
          window.removeEventListener(event, interactionHandler)
        );
      }
      return () => {
        cleanupInteraction();
      };
    }

    // 空闲时水合
    if (when === 'idle') {
      idleHandle = requestIdleCallbackPolyfill(
        () => {
          hydrate();
        },
        { timeout: idleTimeout }
      ) as number;
      // 超时保底：即使浏览器一直不空闲，也强制水合
      timeoutHandle = window.setTimeout(() => {
        if (status === 'pending') {
          hydrationLogger.debug(
            `${i18n.t('components.progressive_hydration.k5')}${componentId.current}${i18n.t('components.progressive_hydration.k6')}`
          );
          hydrate();
        }
      }, idleTimeout);

      // 同时注册交互优先（低优先级组件交互时也要立即响应）
      for (const event of interactionEvents) {
        const opts: AddEventListenerOptions = { passive: true, once: true };
        window.addEventListener(event, interactionHandler, opts);
        interactionHandlersRef.current.push(() =>
          window.removeEventListener(event, interactionHandler)
        );
      }

      return () => {
        if (idleHandle !== null) cancelIdleCallbackPolyfill(idleHandle);
        if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
        cleanupInteraction();
      };
    }

    // 可见时水合
    if (when === 'visible') {
      const node = containerRef.current;
      if (!node || typeof IntersectionObserver === 'undefined') {
        // 降级：立即水合
        hydrate();
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              hydrate();
              observer?.disconnect();
            }
          }
        },
        { rootMargin: '50px' }
      );
      observer.observe(node);

      // 交互优先
      for (const event of interactionEvents) {
        const opts: AddEventListenerOptions = { passive: true, once: true };
        window.addEventListener(event, interactionHandler, opts);
        interactionHandlersRef.current.push(() =>
          window.removeEventListener(event, interactionHandler)
        );
      }

      return () => {
        observer?.disconnect();
        cleanupInteraction();
      };
    }

    return;
  }, [when, priority, status, hydrate, idleTimeout]);

  // 水合前：展示占位（默认为 children 的 SSR HTML，通过 dangerouslySetInnerHTML 保留）
  // 但在 Vite SPA 场景下，SSR HTML 由服务端注入，这里展示 placeholder 或 null
  if (status === 'pending') {
    return (
      <div
        ref={containerRef}
        data-progressive-hydration={componentId.current}
        data-hydration-priority={priority}
        data-hydration-when={when}
        data-hydration-status='pending'
        suppressHydrationWarning
      >
        {placeholder ?? null}
      </div>
    );
  }

  // 水合中 / 已水合：渲染真实子组件
  return (
    <div
      data-progressive-hydration={componentId.current}
      data-hydration-status={status}
      suppressHydrationWarning={status === 'hydrating'}
    >
      {children}
    </div>
  );
};

// ==================== 批量水合管理器 ====================

/** 水合任务 */
interface HydrationTask {
  id: string;
  priority: HydrationPriority;
  hydrate: () => void;
}

/** 优先级权重（数字越大越优先） */
const PRIORITY_WEIGHT: Record<HydrationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * 批量水合调度器
 *
 * 按优先级分批调度水合任务，避免一次性水合导致主线程阻塞。
 * high 优先级立即执行，medium/low 在空闲时间分批执行。
 */
class HydrationScheduler {
  private tasks: HydrationTask[] = [];
  private running = false;
  private batchSize = 3;

  /**
   * 加入水合任务队列
   */
  enqueue(task: HydrationTask): void {
    this.tasks.push(task);
    this.tasks.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    if (!this.running) {
      void this.run();
    }
  }

  /**
   * 启动调度
   */
  private async run(): Promise<void> {
    this.running = true;

    while (this.tasks.length > 0) {
      const batch = this.tasks.splice(0, this.batchSize);

      // high 优先级同步执行
      const highPriority = batch.filter((t) => t.priority === 'high');
      const others = batch.filter((t) => t.priority !== 'high');

      for (const task of highPriority) {
        task.hydrate();
      }

      // 其余在空闲时执行
      if (others.length > 0) {
        await new Promise<void>((resolve) => {
          requestIdleCallbackPolyfill(
            () => {
              for (const task of others) {
                task.hydrate();
              }
              resolve();
            },
            { timeout: 1000 }
          );
        });
      }
    }

    this.running = false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.tasks = [];
    this.running = false;
  }
}

/** 全局水合调度器单例 */
let globalScheduler: HydrationScheduler | null = null;

/**
 * 获取全局水合调度器
 */
function getHydrationScheduler(): HydrationScheduler {
  if (!globalScheduler) {
    globalScheduler = new HydrationScheduler();
  }
  return globalScheduler;
}

export default ProgressiveHydration;
