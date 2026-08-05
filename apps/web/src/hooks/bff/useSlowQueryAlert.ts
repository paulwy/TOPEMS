/**
 * V40.0 Track D: 慢查询告警 Hook
 *
 * 功能:
 * - 可配置慢查询阈值（默认 1000ms）
 * - 可配置告警频率限制（防止刷屏）
 * - 支持告警回调（通知/控制台/自定义）
 * - 慢查询自动上报（可选）
 */

import { useCallback, useEffect, useRef } from 'react';
import { useBffPerformance } from './useBffPerformance';
import type { QueryPerformanceRecord } from '@/utils/graphql-performance';
import { formatDuration } from '@/utils/graphql-performance';
import { logger } from '@/utils/logger';

const alertLogger = logger.child({ prefix: 'SlowQuery-Alert' });

/** 告警通知级别 */
export type AlertLevel = 'info' | 'warning' | 'error';

/** 告警选项 */
export interface SlowQueryAlertOptions {
  /** 慢查询阈值（毫秒），默认 1000ms */
  threshold?: number;
  /** 告警频率限制（毫秒），同一查询在此时间内只告警一次，默认 30000ms (30s) */
  rateLimit?: number;
  /** 告警回调函数 */
  onAlert?: (record: QueryPerformanceRecord, threshold: number) => void;
  /** 是否在控制台输出告警，默认 true */
  consoleAlert?: boolean;
  /** 告警级别，默认 'warning' */
  alertLevel?: AlertLevel;
  /** 是否自动上报到后端审计日志，默认 false */
  autoReport?: boolean;
  /** 上报地址（autoReport 为 true 时使用） */
  reportUrl?: string;
}

/** useSlowQueryAlert 返回值 */
export interface UseSlowQueryAlertResult {
  /** 当前慢查询阈值 */
  threshold: number;
  /** 设置慢查询阈值 */
  setThreshold: (threshold: number) => void;
  /** 手动触发告警（用于测试） */
  triggerAlert: (record: QueryPerformanceRecord) => void;
}

/**
 * 全局告警频率限制状态
 */
const rateLimitState = {
  lastAlertTime: new Map<string, number>(),
};

/**
 * 检查是否应该触发告警（频率限制）
 */
function shouldAlert(operationName: string, rateLimit: number): boolean {
  const now = Date.now();
  const last = rateLimitState.lastAlertTime.get(operationName) || 0;
  if (now - last < rateLimit) {
    return false;
  }
  rateLimitState.lastAlertTime.set(operationName, now);
  return true;
}

/**
 * 慢查询告警 Hook
 *
 * @example
 * ```tsx
 * useSlowQueryAlert({
 *   threshold: 2000,
 *   rateLimit: 60000,
 *   onAlert: (record, threshold) => {
 *     // 发送通知
 *     notification.warning({
 *       message: `慢查询告警: ${record.operationName}`,
 *       description: `耗时 ${formatDuration(record.duration)}，超过阈值 ${formatDuration(threshold)}`,
 *     });
 *   },
 * });
 * ```
 */
export function useSlowQueryAlert(options: SlowQueryAlertOptions = {}): UseSlowQueryAlertResult {
  const {
    threshold: thresholdOption,
    rateLimit = 30000,
    onAlert,
    consoleAlert = true,
    alertLevel = 'warning',
    autoReport = false,
    reportUrl = '/api/portal/graphql/audit-logs/report',
  } = options;

  const { slowQueryThreshold, setSlowQueryThreshold, onSlowQuery } = useBffPerformance();
  const threshold = thresholdOption ?? slowQueryThreshold;

  const onAlertRef = useRef(onAlert);
  const rateLimitRef = useRef(rateLimit);
  const consoleAlertRef = useRef(consoleAlert);
  const alertLevelRef = useRef(alertLevel);
  const autoReportRef = useRef(autoReport);
  const reportUrlRef = useRef(reportUrl);

  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    rateLimitRef.current = rateLimit;
  }, [rateLimit]);

  useEffect(() => {
    consoleAlertRef.current = consoleAlert;
  }, [consoleAlert]);

  useEffect(() => {
    alertLevelRef.current = alertLevel;
  }, [alertLevel]);

  useEffect(() => {
    autoReportRef.current = autoReport;
  }, [autoReport]);

  useEffect(() => {
    reportUrlRef.current = reportUrl;
  }, [reportUrl]);

  useEffect(() => {
    if (thresholdOption !== undefined) {
      setSlowQueryThreshold(thresholdOption);
    }
  }, [thresholdOption, setSlowQueryThreshold]);

  const triggerAlert = useCallback(
    (record: QueryPerformanceRecord) => {
      if (!shouldAlert(record.operationName, rateLimitRef.current)) {
        return;
      }

      if (consoleAlertRef.current) {
        const msg = `[慢查询告警] ${record.operationName} 耗时 ${formatDuration(record.duration)} (阈值: ${formatDuration(threshold)})`;
        switch (alertLevelRef.current) {
          case 'error':
            alertLogger.error(msg, record);
            break;
          case 'warning':
            alertLogger.warn(msg, record);
            break;
          case 'info':
          default:
            alertLogger.info(msg, record);
            break;
        }
      }

      if (onAlertRef.current) {
        try {
          onAlertRef.current(record, threshold);
        } catch (e) {
          alertLogger.error('告警回调执行失败:', e);
        }
      }

      if (autoReportRef.current) {
        fetch(reportUrlRef.current, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation_name: record.operationName,
            query_hash: record.queryHash,
            duration_ms: record.duration,
            success: record.success,
            timestamp: new Date(record.timestamp).toISOString(),
          }),
        }).catch((e) => {
          alertLogger.error('慢查询上报失败:', e);
        });
      }
    },
    [threshold]
  );

  useEffect(() => {
    const off = onSlowQuery((record, _th) => {
      if (record.duration >= threshold) {
        triggerAlert(record);
      }
    });
    return off;
  }, [onSlowQuery, threshold, triggerAlert]);

  return {
    threshold,
    setThreshold: setSlowQueryThreshold,
    triggerAlert,
  };
}

export default useSlowQueryAlert;
