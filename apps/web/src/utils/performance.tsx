import React from 'react';
import * as ReactDOM from 'react-dom/client';
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

export function getConnectionType(): string {
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

export function generatePerformanceReport(): PerformanceReport {
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

export function measureTime<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  logger.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

export async function measureAsyncTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  logger.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function lazyLoadImages(): void {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-src]');
  const options = {
    root: null,
    rootMargin: '0px 0px 100px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, options);

  images.forEach((img) => observer.observe(img));
}

export function lazyLoadComponents(): void {
  if (typeof window === 'undefined') return;

  const components = document.querySelectorAll('[data-lazy-component]');
  const options = {
    root: null,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const componentName = el.dataset.lazyComponent;
        if (componentName) {
          import(`@/components/${componentName}`)
            .then((module) => {
              const Component = module.default;
              if (Component) {
                const container = document.createElement('div');
                const root = ReactDOM.createRoot(container);
                root.render(<Component />);
                el.replaceWith(container.firstChild || container);
              }
            })
            .catch((error) => {
              logger.error(`Failed to load component ${componentName}:`, error);
            });
        }
        observer.unobserve(el);
      }
    });
  }, options);

  components.forEach((el) => observer.observe(el));
}

export function getPerformanceScore(metrics: PerformanceMetrics): number {
  let score = 100;

  if (metrics.lcp > 2500) score -= Math.min(30, (metrics.lcp - 2500) / 100);
  if (metrics.fid > 100) score -= Math.min(30, (metrics.fid - 100) / 5);
  if (metrics.cls > 0.1) score -= Math.min(40, (metrics.cls - 0.1) * 200);

  return Math.max(0, Math.round(score));
}

export function isPerformanceGood(metrics: PerformanceMetrics): boolean {
  return metrics.lcp <= 2500 && metrics.fid <= 100 && metrics.cls <= 0.1 && metrics.tti <= 5000;
}
