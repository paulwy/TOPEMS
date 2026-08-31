/**
 * ProgressiveHydration — 渐进式水合统计
 *
 * 提供水合过程的统计和监控功能，供 PerformancePanel 展示。
 * 记录水合时间、组件数量、错误等信息。
 */

import React from 'react';

/** 水合记录 */
export interface HydrationRecord {
  /** 记录ID */
  id: string;
  /** 组件名称 */
  componentName: string;
  /** 水合状态 */
  status: 'pending' | 'hydrating' | 'hydrated' | 'error';
  /** 水合优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 触发方式 */
  trigger: 'immediate' | 'idle' | 'visible' | 'manual';
  /** 水合开始时间（ms） */
  startTime: number;
  /** 水合结束时间（ms） */
  endTime: number;
  /** 水合耗时（ms） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
  /** 组件层级深度 */
  depth: number;
  /** 是否为关键路径组件 */
  isCritical: boolean;
}

/** 水合统计结果 */
export interface HydrationStats {
  /** 总水合组件数 */
  totalComponents: number;
  /** 已水合组件数 */
  hydratedCount: number;
  /** 待水合组件数 */
  pendingCount: number;
  /** 成功水合组件数 */
  successCount: number;
  /** 失败水合组件数 */
  failureCount: number;
  /** 总水合时间（ms） */
  totalDuration: number;
  /** 平均水合时间（ms） */
  avgDuration: number;
  /** 最长水合时间（ms） */
  maxDuration: number;
  /** 最短水合时间（ms） */
  minDuration: number;
  /** 水合记录列表 */
  records: HydrationRecord[];
  /** 关键路径组件数 */
  criticalCount: number;
  /** 水合开始时间 */
  hydrationStartTime: number | null;
  /** 水合结束时间 */
  hydrationEndTime: number | null;
}

/** 水合统计变更回调 */
type HydrationStatsChangeListener = () => void;

/** 内部水合记录存储 */
const hydrationRecords: HydrationRecord[] = [];
const changeListeners: Set<HydrationStatsChangeListener> = new Set();
let hydrationStartTime: number | null = null;
let hydrationEndTime: number | null = null;

/** 通知所有监听器统计已变更 */
function notifyChange(): void {
  changeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // 忽略监听器错误
    }
  });
}

/**
 * 记录水合开始
 * @param componentName 组件名称
 * @param depth 组件层级深度
 * @param isCritical 是否为关键路径组件
 * @returns 记录ID，用于结束水合
 */
export function startHydration(
  componentName: string,
  depth: number = 0,
  isCritical: boolean = false,
): number {
  if (hydrationStartTime === null) {
    hydrationStartTime = performance.now();
  }

  const recordId = `hyd-${Date.now()}-${hydrationRecords.length}`;
  const record: HydrationRecord = {
    id: recordId,
    componentName,
    status: 'hydrating',
    priority: isCritical ? 'high' : 'medium',
    trigger: 'immediate',
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    success: false,
    depth,
    isCritical,
  };

  hydrationRecords.push(record);
  return hydrationRecords.length - 1;
}

/**
 * 结束水合记录
 * @param recordId 记录ID
 * @param success 是否成功
 * @param error 错误信息（如果失败）
 */
export function endHydration(recordId: number, success: boolean = true, error?: string): void {
  const record = hydrationRecords[recordId];
  if (!record) return;

  record.endTime = performance.now();
  record.duration = record.endTime - record.startTime;
  record.success = success;
  record.status = success ? 'hydrated' : 'error';
  record.error = error;

  if (success) {
    hydrationEndTime = performance.now();
  }

  notifyChange();
}

/**
 * 获取水合统计
 * @returns 水合统计结果
 */
export function getHydrationStats(): HydrationStats {
  const successRecords = hydrationRecords.filter((r) => r.success);
  const failureRecords = hydrationRecords.filter((r) => !r.success && r.endTime > 0);
  const criticalRecords = hydrationRecords.filter((r) => r.isCritical);
  const hydratedRecords = hydrationRecords.filter((r) => r.status === 'hydrated');
  const pendingRecords = hydrationRecords.filter((r) => r.status === 'pending' || r.status === 'hydrating');
  const durations = successRecords.map((r) => r.duration);

  return {
    totalComponents: hydrationRecords.length,
    hydratedCount: hydratedRecords.length,
    pendingCount: pendingRecords.length,
    successCount: successRecords.length,
    failureCount: failureRecords.length,
    totalDuration: durations.reduce((sum, d) => sum + d, 0),
    avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    records: [...hydrationRecords],
    criticalCount: criticalRecords.length,
    hydrationStartTime,
    hydrationEndTime,
  };
}

/**
 * 注册水合统计变更监听器
 * @param listener 变更回调
 * @returns 取消订阅函数
 */
export function onHydrationStatsChange(listener: HydrationStatsChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/**
 * 清除所有水合记录
 */
export function clearHydrationStats(): void {
  hydrationRecords.length = 0;
  hydrationStartTime = null;
  hydrationEndTime = null;
  notifyChange();
}

/**
 * 渐进式水合组件 Props
 */
export interface ProgressiveHydrationProps {
  /** 组件名称（用于统计） */
  componentName?: string;
  /** 是否为关键路径组件 */
  isCritical?: boolean;
  /** 水合优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 延迟水合时间（ms） */
  delay?: number;
  /** 子组件 */
  children: React.ReactNode;
  /** 水合前的占位内容 */
  fallback?: React.ReactNode;
  /** 水合完成回调 */
  onHydrated?: () => void;
}

/**
 * 渐进式水合组件
 *
 * 支持延迟水合、优先级调度、水合统计。
 * 高优先级组件立即水合，低优先级组件延迟水合。
 */
export const ProgressiveHydration: React.FC<ProgressiveHydrationProps> = ({
  componentName = 'Unknown',
  isCritical = false,
  priority = 'medium',
  delay = 0,
  children,
  fallback = null,
  onHydrated,
}) => {
  const [isHydrated, setIsHydrated] = React.useState(priority === 'high');
  const recordIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (priority === 'high') {
      // 高优先级立即水合
      recordIdRef.current = startHydration(componentName, 0, isCritical);
      setIsHydrated(true);
      endHydration(recordIdRef.current, true);
      onHydrated?.();
      return;
    }

    // 中低优先级延迟水合
    const actualDelay = priority === 'low' ? Math.max(delay, 1000) : delay;

    const timer = setTimeout(() => {
      recordIdRef.current = startHydration(componentName, 0, isCritical);
      setIsHydrated(true);
      endHydration(recordIdRef.current, true);
      onHydrated?.();
    }, actualDelay);

    return () => clearTimeout(timer);
  }, [componentName, isCritical, priority, delay, onHydrated]);

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProgressiveHydration;
