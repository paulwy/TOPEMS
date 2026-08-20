import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  domContentLoaded: number;
  resourceLoadTimes: Record<string, number>;
  apiCallTimes: Record<string, number>;
  memoryUsage: number;
  memoryLimit: number;
}

interface ApiCallMetrics {
  endpoint: string;
  duration: number;
  status: 'success' | 'error';
  timestamp: number;
}

interface ComponentRenderMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastRenderTime: number;
}

interface ComponentLoadMetrics {
  componentName: string;
  loadTime: number;
  timestamp: number;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    domContentLoaded: 0,
    resourceLoadTimes: {},
    apiCallTimes: {},
    memoryUsage: 0,
    memoryLimit: 0,
  };

  private apiCalls: ApiCallMetrics[] = [];
  private componentRenderMetrics: Map<string, ComponentRenderMetrics> = new Map();
  private componentLoadMetrics: ComponentLoadMetrics[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initPerformanceObservers();
      this.initMemoryMonitoring();
    }
  }

  private initPerformanceObservers() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        this.metrics.pageLoadTime = perfData.loadEventEnd - perfData.startTime;
        this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.startTime;
      }
    });

    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-paint') {
          this.metrics.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
      }
    });

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch (e: unknown) {
      logger.warn('Paint observer not supported');
    }

    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        this.metrics.resourceLoadTimes[resource.name] = resource.responseEnd - resource.startTime;
      }
    });

    try {
      resourceObserver.observe({ type: 'resource', buffered: true });
    } catch (e: unknown) {
      logger.warn('Resource observer not supported');
    }

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        logger.info(`LCP: ${lcpEntry.startTime.toFixed(2)}ms`);
      }
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e: unknown) {
      logger.warn('LCP observer not supported');
    }

    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        logger.info(`FID: ${fidEntry.processingStart - fidEntry.startTime}ms`);
      }
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e: unknown) {
      logger.warn('FID observer not supported');
    }
  }

  private initMemoryMonitoring() {
    const updateMemory = () => {
      if (typeof performance !== 'undefined' && (performance as PerformanceWithMemory).memory) {
        const memory = (performance as PerformanceWithMemory).memory!;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        this.metrics.memoryLimit = memory.totalJSHeapSize;
      }
    };

    updateMemory();
    setInterval(updateMemory, 10000);
  }

  recordApiCall(endpoint: string, duration: number, status: 'success' | 'error') {
    const metric: ApiCallMetrics = {
      endpoint,
      duration,
      status,
      timestamp: Date.now(),
    };

    this.apiCalls.push(metric);
    this.metrics.apiCallTimes[endpoint] = duration;

    if (this.apiCalls.length > 100) {
      this.apiCalls.shift();
    }
  }

  recordComponentRender(componentName: string, renderTime: number, isMount: boolean) {
    const existing = this.componentRenderMetrics.get(componentName);

    if (isMount) {
      this.componentRenderMetrics.set(componentName, {
        componentName,
        renderTime,
        mountTime: Date.now(),
        updateCount: 0,
        lastRenderTime: Date.now(),
      });
    } else {
      this.componentRenderMetrics.set(componentName, {
        componentName,
        renderTime: existing ? (existing.renderTime + renderTime) / 2 : renderTime,
        mountTime: existing?.mountTime || Date.now(),
        updateCount: (existing?.updateCount || 0) + 1,
        lastRenderTime: Date.now(),
      });
    }
  }

  recordComponentLoad(componentName: string, loadTime: number) {
    const metric: ComponentLoadMetrics = {
      componentName,
      loadTime,
      timestamp: Date.now(),
    };

    this.componentLoadMetrics.push(metric);

    if (this.componentLoadMetrics.length > 50) {
      this.componentLoadMetrics.shift();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getApiCallHistory(): ApiCallMetrics[] {
    return [...this.apiCalls];
  }

  getComponentRenderMetrics(): ComponentRenderMetrics[] {
    return Array.from(this.componentRenderMetrics.values());
  }

  getComponentLoadMetrics(): ComponentLoadMetrics[] {
    return [...this.componentLoadMetrics];
  }

  getAverageApiResponseTime(endpoint?: string): number {
    if (endpoint) {
      const calls = this.apiCalls.filter((c) => c.endpoint === endpoint);
      if (calls.length === 0) return 0;
      return calls.reduce((sum, c) => sum + c.duration, 0) / calls.length;
    }

    if (this.apiCalls.length === 0) return 0;
    return this.apiCalls.reduce((sum, c) => sum + c.duration, 0) / this.apiCalls.length;
  }

  getApiSuccessRate(): number {
    if (this.apiCalls.length === 0) return 100;
    const successCalls = this.apiCalls.filter((c) => c.status === 'success').length;
    return (successCalls / this.apiCalls.length) * 100;
  }

  getSlowApiCalls(thresholdMs: number = 1000): ApiCallMetrics[] {
    return this.apiCalls.filter((c) => c.duration > thresholdMs);
  }

  getSlowComponents(thresholdMs: number = 50): ComponentRenderMetrics[] {
    return Array.from(this.componentRenderMetrics.values()).filter(
      (m) => m.renderTime > thresholdMs
    );
  }

  getMemoryUsagePercent(): number {
    if (this.metrics.memoryLimit === 0) return 0;
    return (this.metrics.memoryUsage / this.metrics.memoryLimit) * 100;
  }

  clear() {
    this.apiCalls = [];
    this.metrics.apiCallTimes = {};
    this.metrics.resourceLoadTimes = {};
    this.componentRenderMetrics.clear();
    this.componentLoadMetrics = [];
  }

  exportReport(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        apiCalls: this.apiCalls,
        componentRenderMetrics: this.getComponentRenderMetrics(),
        componentLoadMetrics: this.getComponentLoadMetrics(),
        summary: {
          averageApiResponseTime: this.getAverageApiResponseTime(),
          apiSuccessRate: this.getApiSuccessRate(),
          slowApiCalls: this.getSlowApiCalls().length,
          slowComponents: this.getSlowComponents().length,
          memoryUsagePercent: this.getMemoryUsagePercent(),
        },
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  logPerformanceReport() {
    const report = JSON.parse(this.exportReport());
    logger.info('Performance Report:', report.summary);

    if (report.summary.slowComponents > 0) {
      logger.warn(
        'Slow components detected:',
        report.componentRenderMetrics.filter((m: ComponentRenderMetrics) => m.renderTime > 50)
      );
    }

    if (report.summary.slowApiCalls > 0) {
      logger.warn('Slow API calls detected:', report.summary.slowApiCalls);
    }

    if (report.summary.memoryUsagePercent > 80) {
      logger.warn(`High memory usage: ${report.summary.memoryUsagePercent.toFixed(1)}%`);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());
  const [apiHistory, setApiHistory] = useState<ApiCallMetrics[]>([]);
  const [componentMetrics, setComponentMetrics] = useState<ComponentRenderMetrics[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setApiHistory(performanceMonitor.getApiCallHistory());
      setComponentMetrics(performanceMonitor.getComponentRenderMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    apiHistory,
    componentMetrics,
    recordApiCall: performanceMonitor.recordApiCall.bind(performanceMonitor),
    getApiCallHistory: performanceMonitor.getApiCallHistory.bind(performanceMonitor),
    getAverageApiResponseTime:
      performanceMonitor.getAverageApiResponseTime.bind(performanceMonitor),
    getApiSuccessRate: performanceMonitor.getApiSuccessRate.bind(performanceMonitor),
    getSlowApiCalls: performanceMonitor.getSlowApiCalls.bind(performanceMonitor),
    getSlowComponents: performanceMonitor.getSlowComponents.bind(performanceMonitor),
    getMemoryUsagePercent: performanceMonitor.getMemoryUsagePercent.bind(performanceMonitor),
    exportReport: performanceMonitor.exportReport.bind(performanceMonitor),
    logPerformanceReport: performanceMonitor.logPerformanceReport.bind(performanceMonitor),
    clear: performanceMonitor.clear.bind(performanceMonitor),
  };
}

export async function measureApiCall<T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;
    performanceMonitor.recordApiCall(endpoint, duration, 'success');
    return result;
  } catch (error: unknown) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordApiCall(endpoint, duration, 'error');
    throw error;
  }
}

function useApiCall<T, A extends unknown[] = unknown[]>(
  apiCall: (...args: A) => Promise<T>,
  _deps: React.DependencyList = []
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const callApi = useRef(apiCall);

  useEffect(() => {
    callApi.current = apiCall;
  }, [apiCall]);

  const execute = async (...args: A) => {
    setLoading(true);
    setError(null);

    try {
      const result = await measureApiCall(callApi.current.name || 'api-call', () =>
        callApi.current(...args)
      );
      setData(result);
      return result;
    } catch (err: unknown) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, execute };
}

function useComponentPerformance(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const isMount = useRef(true);

  const onRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const onRenderComplete = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.recordComponentRender(componentName, renderTime, isMount.current);
    isMount.current = false;
  }, [componentName]);

  return { onRender, onRenderComplete };
}

function useComponentLoadTime(componentName: string) {
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();

    const observer = new MutationObserver(() => {
      const element = document.querySelector(`[data-component="${componentName}"]`);
      if (element) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        setLoadTime(duration);
        performanceMonitor.recordComponentLoad(componentName, duration);
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [componentName]);

  return loadTime;
}

function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const name = componentName || Component.displayName || Component.name || 'UnknownComponent';

  const WrappedComponent: React.FC<P> = (props) => {
    const startTime = useRef<number>(performance.now());
    const mountedRef = useRef(false);

    useEffect(() => {
      const mountTime = performance.now() - startTime.current;
      performanceMonitor.recordComponentRender(name, mountTime, !mountedRef.current);
      mountedRef.current = true;
      return () => {
        const unmountTime = performance.now() - startTime.current;
        performanceMonitor.recordComponentRender(name, unmountTime, false);
      };
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceTracking(${name})`;

  return WrappedComponent;
}

function PerformanceWarnings() {
  const { getSlowApiCalls, getApiSuccessRate, getSlowComponents, getMemoryUsagePercent } =
    usePerformanceMonitor();

  const slowCalls = getSlowApiCalls();
  const successRate = getApiSuccessRate();
  const slowComponents = getSlowComponents();
  const memoryPercent = getMemoryUsagePercent();

  if (
    slowCalls.length === 0 &&
    successRate >= 95 &&
    slowComponents.length === 0 &&
    memoryPercent < 80
  ) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        backgroundColor: 'warning.light',
        border: '1px solid var(--color-warning-light, #fde68a)',
        borderRadius: 3,
        p: 4,
        maxWidth: 450,
        boxShadow: 3,
        zIndex: 1000,
      }}
    >
      <Typography sx={{ fontWeight: 600, color: 'warning.800', mb: 3 }}>
        {i18n.t('hooks:use_performance_monitor.k3')}
      </Typography>

      {successRate < 95 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`${i18n.t('shared.use_performance_monitor.api_0')}${successRate.toFixed(1)}%`}
            color='error'
            size='small'
            sx={{ mr: 2 }}
          />
        </Box>
      )}

      {memoryPercent >= 80 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`${i18n.t('shared.use_performance_monitor.k1')}${memoryPercent.toFixed(1)}%`}
            color={memoryPercent >= 90 ? 'error' : 'warning'}
            size='small'
            sx={{ mr: 2 }}
          />
        </Box>
      )}

      {slowCalls.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 500, color: 'warning.700', mb: 1 }}>
            {i18n.t('hooks:use_performance_monitor.k2', { v0: slowCalls.length })}
          </Typography>
          <Box sx={{ pl: 2 }}>
            {slowCalls.slice(0, 3).map((call, idx) => (
              <Typography
                key={idx}
                sx={{ fontSize: '0.75rem', color: 'warning.600' }}
              >
                {call.endpoint}: {(call.duration / 1000).toFixed(2)}s
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {slowComponents.length > 0 && (
        <Box>
          <Typography sx={{ fontWeight: 500, color: 'warning.700', mb: 1 }}>
            {i18n.t('hooks:use_performance_monitor.v0_1', { v0: slowComponents.length })}
          </Typography>
          <Box sx={{ pl: 2 }}>
            {slowComponents.slice(0, 3).map((comp, idx) => (
              <Typography
                key={idx}
                sx={{ fontSize: '0.75rem', color: 'warning.600' }}
              >
                {i18n.t('hooks:use_performance_monitor.k0', {
                  v0: comp.componentName,
                  v1: comp.renderTime.toFixed(2),
                  v2: comp.updateCount,
                })}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default performanceMonitor;
