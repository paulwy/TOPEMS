/**
 * V40.0 Track D: GraphQL 性能工具函数
 *
 * 提供 GraphQL 查询性能监控相关的工具函数：
 * - queryHash: 计算查询哈希
 * - parseQueryName: 从查询字符串提取操作名
 * - formatDuration: 格式化耗时
 * - performanceMark/performanceMeasure: 包装 Performance API
 */

import { logger } from './logger';

const perfLogger = logger.child({ prefix: 'GraphQL-Perf' });

/**
 * 计算查询字符串的 SHA256 哈希
 */
export async function queryHash(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 从 GraphQL 查询字符串中提取操作名
 *
 * 支持格式：
 * - query MyOperation { ... }
 * - mutation CreateTodo($title: String!) { ... }
 * - subscription ServiceHealthChanged { ... }
 */
export function parseQueryName(query: string): string {
  const trimmed = query.trim();

  const patterns = [/^(query|mutation|subscription)\s+(\w+)/i, /^\{\s*(\w+)/];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[2] || match[1] || 'Unknown';
    }
  }

  return 'Unknown';
}

/**
 * 格式化耗时显示
 *
 * @param ms 毫秒数
 * @returns 格式化后的字符串，如 "1.23s"、"456ms"、"12.3µs"
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  if (ms >= 1) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms * 1000).toFixed(0)}µs`;
}

/**
 * Performance Mark 包装
 * 在 performance API 不可用时优雅降级
 */
export function performanceMark(markName: string): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(markName);
    } catch (e) {
      perfLogger.debug('performance.mark failed:', e);
    }
  }
}

/**
 * Performance Measure 包装
 * 在 performance API 不可用时优雅降级
 *
 * @returns 测量的耗时（毫秒），失败时返回 0
 */
export function performanceMeasure(
  measureName: string,
  startMark: string,
  endMark: string
): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.measure === 'function' &&
    typeof performance.clearMarks === 'function'
  ) {
    try {
      const measure = performance.measure(measureName, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      return measure.duration;
    } catch (e) {
      perfLogger.debug('performance.measure failed:', e);
    }
  }
  return 0;
}

/**
 * 查询性能记录
 */
export interface QueryPerformanceRecord {
  operationName: string;
  queryHash: string;
  duration: number;
  success: boolean;
  cached: boolean;
  timestamp: number;
  variables?: Record<string, unknown>;
  error?: string;
}

/**
 * 查询性能统计
 */
export interface QueryPerformanceStats {
  operationName: string;
  totalCount: number;
  successCount: number;
  errorCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  totalDuration: number;
  lastAccessed: number;
}

/**
 * 计算百分位数
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * 从记录数组计算统计数据
 */
export function calculateStats(
  operationName: string,
  records: QueryPerformanceRecord[]
): QueryPerformanceStats {
  const durations = records.map((r) => r.duration).sort((a, b) => a - b);
  const successRecords = records.filter((r) => r.success);
  const cacheHitRecords = records.filter((r) => r.cached);

  const totalDuration = durations.reduce((sum, d) => sum + d, 0);

  return {
    operationName,
    totalCount: records.length,
    successCount: successRecords.length,
    errorCount: records.length - successRecords.length,
    cacheHitCount: cacheHitRecords.length,
    cacheMissCount: records.length - cacheHitRecords.length,
    avgDuration: records.length > 0 ? totalDuration / records.length : 0,
    minDuration: durations.length > 0 ? durations[0] : 0,
    maxDuration: durations.length > 0 ? durations[durations.length - 1] : 0,
    p50Duration: calculatePercentile(durations, 50),
    p95Duration: calculatePercentile(durations, 95),
    p99Duration: calculatePercentile(durations, 99),
    totalDuration,
    lastAccessed: records.length > 0 ? Math.max(...records.map((r) => r.timestamp)) : 0,
  };
}
