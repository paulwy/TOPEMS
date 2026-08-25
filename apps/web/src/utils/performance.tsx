import { logger } from './logger';

export interface PerformanceMetrics {
  lcp: number;
  fid: number;
  tti: number;
  fcp: number;
  cls: number;
  tbt: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  firstInputDelay: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  timestamp: number;
  url: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  connectionType: string;
}

const performanceMetrics: PerformanceMetrics = {
  lcp: 0,
  fid: 0,
  tti: 0,
  fcp: 0,
  cls: 0,
  tbt: 0,
  timeToInteractive: 0,
  firstContentfulPaint: 0,
  largestContentfulPaint: 0,
  cumulativeLayoutShift: 0,
  totalBlockingTime: 0,
  firstInputDelay: 0,
};

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

interface NetworkInformation {
  effectiveType?: string;
}

function getConnectionType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const nav = window.navigator as Navigator & { connection?: NetworkInformation };
  return nav.connection?.effectiveType || 'unknown';
}

export function initPerformanceMonitoring(): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof PerformanceObserver !== 'function') {
      resolve(performanceMetrics);
      return;
    }

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            performanceMetrics.fcp = entry.startTime;
            performanceMetrics.firstContentfulPaint = entry.startTime;
          }
        } else if (entry.entryType === 'largest-contentful-paint') {
          performanceMetrics.lcp = entry.startTime;
          performanceMetrics.largestContentfulPaint = entry.startTime;
        } else if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as unknown as { hadRecentInput: boolean; value: number };
          if (!clsEntry.hadRecentInput) {
            performanceMetrics.cls += clsEntry.value;
            performanceMetrics.cumulativeLayoutShift = performanceMetrics.cls;
          }
        } else if (entry.entryType === 'first-input') {
          const fidEntry = entry as unknown as { processingStart: number; startTime: number };
          performanceMetrics.fid = fidEntry.processingStart - fidEntry.startTime;
          performanceMetrics.firstInputDelay = performanceMetrics.fid;
        }
      }
    });

    observer.observe({
      type: 'paint',
      buffered: true,
    });

    observer.observe({
      type: 'largest-contentful-paint',
      buffered: true,
    });

    observer.observe({
      type: 'layout-shift',
      buffered: true,
    });

    observer.observe({
      type: 'first-input',
      buffered: true,
    });

    const calculateTTI = () => {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length === 0) return;

      const navEntry = navEntries[0] as unknown as {
        domInteractive: number;
        domContentLoadedEventEnd: number;
      };
      const domInteractive = navEntry.domInteractive || 0;

      const longTasks = performance.getEntriesByType('longtask');
      let lastLongTaskEnd = domInteractive;

      longTasks.forEach((task) => {
        const taskEntry = task as unknown as { startTime: number; duration: number };
        const taskEnd = taskEntry.startTime + taskEntry.duration;
        if (taskEnd > lastLongTaskEnd) {
          lastLongTaskEnd = taskEnd;
        }
      });

      const paintEntries = performance.getEntriesByType('paint');
      let fcpTime = 0;
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          fcpTime = entry.startTime;
        }
      });

      const candidateTime = Math.max(fcpTime, lastLongTaskEnd);

      performanceMetrics.tti = candidateTime;
      performanceMetrics.timeToInteractive = candidateTime;
    };

    setTimeout(() => {
      calculateTTI();
      resolve(performanceMetrics);
    }, 5000);
  });
}

function generatePerformanceReport(): PerformanceReport {
  return {
    metrics: { ...performanceMetrics },
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
  };
}

export function logPerformanceMetrics(): void {
  initPerformanceMonitoring().then((_metrics) => {
    const report = generatePerformanceReport();
    logger.debug('[TOPEMS Performance]', JSON.stringify(report, null, 2));

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__TOPEMS_PERF__ = report;
    }
  });
}

export async function measureAsyncTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  logger.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}
