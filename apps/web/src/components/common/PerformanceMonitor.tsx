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
    const performanceObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find(
        (entry) => entry.entryType === 'paint' && entry.name === 'first-contentful-paint'
      );
      const fpEntry = entries.find(
        (entry) => entry.entryType === 'paint' && entry.name === 'first-paint'
      );
      const lcpEntry = entries.find((entry) => entry.entryType === 'largest-contentful-paint');
      const clsEntry = entries.find((entry) => entry.entryType === 'layout-shift');

      if (fcpEntry) {
        logger.info(`[Performance] First Contentful Paint: ${fcpEntry.startTime.toFixed(2)}ms`);
      }
      if (fpEntry) {
        logger.info(`[Performance] First Paint: ${fpEntry.startTime.toFixed(2)}ms`);
      }
      if (lcpEntry) {
        logger.info(`[Performance] Largest Contentful Paint: ${lcpEntry.startTime.toFixed(2)}ms`);
      }
      if (clsEntry) {
        logger.info(
          `[Performance] Cumulative Layout Shift: ${(clsEntry as PerformanceEntry & { value: number }).value.toFixed(2)}`
        );
      }
    });

    performanceObserver.observe({
      entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'],
    });

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
      performanceObserver.disconnect();
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
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
