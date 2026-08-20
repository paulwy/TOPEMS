import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadEventEnd: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const observers: PerformanceObserver[] = [];

    const handleEntry = (entry: PerformanceEntry) => {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        logger.info(`[Performance] First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
      }
      if (entry.entryType === 'paint' && entry.name === 'first-paint') {
        logger.info(`[Performance] First Paint: ${entry.startTime.toFixed(2)}ms`);
      }
      if (entry.entryType === 'largest-contentful-paint') {
        logger.info(`[Performance] Largest Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
      }
      if (entry.entryType === 'layout-shift') {
        logger.info(
          `[Performance] Cumulative Layout Shift: ${(entry as PerformanceEntry & { value: number }).value.toFixed(2)}`
        );
      }
    };

    // Use PerformanceObserver.supportedEntryTypes + per-type observe() instead of
    // the deprecated entryTypes array option, which Chromium now warns about:
    // "Deprecated API for given entry type"
    const supported =
      typeof PerformanceObserver !== 'undefined' && 'supportedEntryTypes' in PerformanceObserver
        ? ((PerformanceObserver as any).supportedEntryTypes as string[])
        : [];

    const observeType = (type: string, buffered = true) => {
      if (!supported.includes(type)) return;
      try {
        const obs = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach(handleEntry);
        });
        obs.observe({ type, buffered });
        observers.push(obs);
      } catch {
        // unsupported type; skip silently
      }
    };

    observeType('paint');
    observeType('largest-contentful-paint');
    observeType('layout-shift');

    const loadMetrics = () => {
      const perf = performance.timing;
      const navigationStart = perf.navigationStart;
      const domContentLoaded = perf.domContentLoadedEventEnd - navigationStart;
      const loadEventEnd = perf.loadEventEnd - navigationStart;
      const firstPaint = performance.getEntriesByType('paint')[0]?.startTime || 0;
      const firstContentfulPaint = performance.getEntriesByType('paint')[1]?.startTime || 0;

      const metricsData: PerformanceMetrics = {
        navigationStart,
        domContentLoaded,
        loadEventEnd,
        firstPaint,
        firstContentfulPaint,
        timeToInteractive: 0,
      };

      setMetrics(metricsData);

      logger.info(`[Performance] DOM Content Loaded: ${domContentLoaded.toFixed(2)}ms`);
      logger.info(`[Performance] Load Event End: ${loadEventEnd.toFixed(2)}ms`);
    };

    if (window.performance) {
      if (document.readyState === 'complete') {
        loadMetrics();
      } else {
        window.addEventListener('load', loadMetrics);
      }
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('load', loadMetrics);
    };
  }, []);

  if (!metrics) {
    return null;
  }

  const getPerformanceColor = (ms: number) => {
    if (ms < 1000) return 'success';
    if (ms < 2500) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          minWidth: 280,
          backgroundColor: 'common.white',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography
          variant='caption'
          color='textSecondary'
          sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}
        >
          Performance Metrics
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Chip
            label={`FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms`}
            color={getPerformanceColor(metrics.firstContentfulPaint)}
            size='small'
          />
          <Chip
            label={`FP: ${metrics.firstPaint.toFixed(0)}ms`}
            color={getPerformanceColor(metrics.firstPaint)}
            size='small'
          />
          <Chip
            label={`DOM: ${metrics.domContentLoaded.toFixed(0)}ms`}
            color={getPerformanceColor(metrics.domContentLoaded)}
            size='small'
          />
          <Chip
            label={`Load: ${metrics.loadEventEnd.toFixed(0)}ms`}
            color={getPerformanceColor(metrics.loadEventEnd)}
            size='small'
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default PerformanceMonitor;
