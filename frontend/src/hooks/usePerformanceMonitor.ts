import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  navigationStart: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

interface PerformanceMonitorProps {
  onMetrics?: (metrics: PerformanceMetrics) => void;
  enabled?: boolean;
}

export const usePerformanceMonitor = ({ onMetrics, enabled = true }: PerformanceMonitorProps) => {
  const observerRef = useRef<PerformanceObserver | null>(null);

  const reportMetrics = useCallback((metrics: PerformanceMetrics) => {
    if (onMetrics) {
      onMetrics(metrics);
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log('Performance Metrics:', metrics);
    }
  }, [onMetrics]);

  useEffect(() => {
    if (!enabled) return;

    const metrics: Partial<PerformanceMetrics> = {
      navigationStart: performance.timing.navigationStart,
    };

    // First Contentful Paint
    observerRef.current = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = (entry as PerformancePaintTiming).startTime;
          }
        } else if (entry.entryType === 'largest-contentful-paint') {
          metrics.largestContentfulPaint = (entry as LCPMetric).renderTime || 0;
        } else if (entry.entryType === 'layout-shift') {
          const shiftEntry = entry as LayoutShift;
          if (!shiftEntry.hadRecentInput) {
            metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + shiftEntry.value;
          }
        }
      });

      if (metrics.firstContentfulPaint && metrics.largestContentfulPaint) {
        reportMetrics(metrics as PerformanceMetrics);
      }
    });

    observerRef.current.observe({
      type: 'paint',
      buffered: true,
    });

    observerRef.current.observe({
      type: 'largest-contentful-paint',
      buffered: true,
    });

    observerRef.current.observe({
      type: 'layout-shift',
      buffered: true,
    });

    // Time to Interactive
    const handleLoad = () => {
      metrics.timeToInteractive = performance.timing.domInteractive - performance.timing.navigationStart;
      reportMetrics(metrics as PerformanceMetrics);
    };

    window.addEventListener('load', handleLoad);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('load', handleLoad);
    };
  }, [enabled, reportMetrics]);

  return null;
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = (props) => {
  usePerformanceMonitor(props);
  return null;
};

export const logPerformance = (label: string, start: number) => {
  const duration = performance.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
  }
  
  return duration;
};

export const useLogPerformance = () => {
  const startTimes = useRef<Map<string, number>>(new Map());

  const start = useCallback((label: string) => {
    startTimes.current.set(label, performance.now());
  }, []);

  const end = useCallback((label: string): number => {
    const start = startTimes.current.get(label);
    if (start) {
      const duration = logPerformance(label, start);
      startTimes.current.delete(label);
      return duration;
    }
    return 0;
  }, []);

  return { start, end };
};

export default PerformanceMonitor;
