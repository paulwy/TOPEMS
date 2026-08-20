/**
 * Web Vitals 监控 Hook
 *
 * V26.0: 全链路追踪生产化 - 前端性能监控
 * 监控 Core Web Vitals: LCP, FID, CLS, FCP, TTFB, INP
 *
 * 使用 PerformanceObserver API 收集性能指标，
 * 通过 OpenTelemetry 上报或回调给外部监控系统。
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

export interface WebVitalsMetrics {
  /** Largest Contentful Paint (ms) */
  lcp?: number;
  /** First Input Delay (ms) - deprecated, use INP */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** First Contentful Paint (ms) */
  fcp?: number;
  /** Time to First Byte (ms) */
  ttfb?: number;
  /** Interaction to Next Paint (ms) */
  inp?: number;
}

type WebVitalsCallback = (metrics: WebVitalsMetrics) => void;

interface PerformanceEntryWithValue extends PerformanceEntry {
  value?: number;
  processingStart?: number;
  hadRecentInput?: boolean;
}

function observeType(
  entryType: string,
  callback: (entry: PerformanceEntryWithValue) => void,
  options?: PerformanceObserverInit
): (() => void) | undefined {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return undefined;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry as PerformanceEntryWithValue);
      }
    });
    observer.observe({ type: entryType as string, buffered: true, ...options });
    return () => observer.disconnect();
  } catch {
    return undefined;
  }
}

/**
 * Web Vitals 监控 Hook
 *
 * @param onReport - 指标收集完成后的回调（约 5s 后触发）
 * @returns 当前指标值的 ref（实时更新）
 *
 * @example
 * ```tsx
 * function App() {
 *   useWebVitals((metrics) => {
 *     console.log('Web Vitals:', metrics);
 *   });
 *   return <div>App</div>;
 * }
 * ```
 */
export function useWebVitals(onReport?: WebVitalsCallback) {
  const metricsRef = useRef<WebVitalsMetrics>({});

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // LCP - Largest Contentful Paint
    const lcpCleanup = observeType('largest-contentful-paint', (entry) => {
      metricsRef.current.lcp = entry.startTime;
      logger.info(`[WebVitals] LCP: ${entry.startTime.toFixed(0)}ms`);
    });
    if (lcpCleanup) cleanups.push(lcpCleanup);

    // FID - First Input Delay (deprecated in favor of INP)
    const fidCleanup = observeType('first-input', (entry) => {
      if (entry.processingStart) {
        const fid = entry.processingStart - entry.startTime;
        metricsRef.current.fid = fid;
        logger.info(`[WebVitals] FID: ${fid.toFixed(0)}ms`);
      }
    });
    if (fidCleanup) cleanups.push(fidCleanup);

    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    const clsCleanup = observeType('layout-shift', (entry) => {
      if (!entry.hadRecentInput && entry.value !== undefined) {
        clsValue += entry.value;
        metricsRef.current.cls = clsValue;
      }
    });
    if (clsCleanup) {
      const reportCls = () => {
        if (clsValue > 0) {
          logger.info(`[WebVitals] CLS: ${clsValue.toFixed(3)}`);
        }
      };
      document.addEventListener('visibilitychange', reportCls);
      cleanups.push(() => document.removeEventListener('visibilitychange', reportCls));
      cleanups.push(clsCleanup);
    }

    // FCP - First Contentful Paint
    const fcpCleanup = observeType('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        metricsRef.current.fcp = entry.startTime;
        logger.info(`[WebVitals] FCP: ${entry.startTime.toFixed(0)}ms`);
      }
    });
    if (fcpCleanup) cleanups.push(fcpCleanup);

    // TTFB - Time to First Byte (from navigation timing)
    const navCleanup = observeType('navigation', (entry) => {
      const nav = entry as unknown as PerformanceNavigationTiming;
      if ('responseStart' in nav) {
        const ttfb = nav.responseStart;
        metricsRef.current.ttfb = ttfb;
        logger.info(`[WebVitals] TTFB: ${ttfb.toFixed(0)}ms`);
      }
    });
    if (navCleanup) cleanups.push(navCleanup);

    // INP - Interaction to Next Paint (simplified tracking)
    const eventCleanup = observeType('event', (entry) => {
      if (entry.duration > (metricsRef.current.inp || 0)) {
        metricsRef.current.inp = entry.duration;
      }
    });
    if (eventCleanup) {
      const reportInp = () => {
        if (metricsRef.current.inp !== undefined) {
          logger.info(`[WebVitals] INP: ${metricsRef.current.inp.toFixed(0)}ms`);
        }
      };
      document.addEventListener('visibilitychange', reportInp);
      cleanups.push(() => document.removeEventListener('visibilitychange', reportInp));
      cleanups.push(eventCleanup);
    }

    // 延迟上报完整指标
    const timeout = setTimeout(() => {
      if (onReport) {
        onReport({ ...metricsRef.current });
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      cleanups.forEach((fn) => fn());
    };
  }, [onReport]);

  return metricsRef;
}

/**
 * 获取当前所有 Web Vitals 指标（同步读取）
 */
export function getWebVitalsSnapshot(): WebVitalsMetrics {
  if (typeof window === 'undefined') return {};

  const metrics: WebVitalsMetrics = {};

  // 从 PerformanceObserver 已收集的数据中读取
  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (entries.length > 0) {
    const nav = entries[0];
    metrics.ttfb = nav.responseStart;
  }

  const paints = performance.getEntriesByType('paint');
  for (const paint of paints) {
    if (paint.name === 'first-contentful-paint') {
      metrics.fcp = paint.startTime;
    }
  }

  return metrics;
}
