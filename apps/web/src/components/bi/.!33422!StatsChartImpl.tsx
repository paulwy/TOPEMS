import React, { Suspense, lazy } from 'react';
import type { ChartData } from '../charts/AreaChart';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface StatsChartProps {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}

const StatsChartBarImpl = lazy(() =>
  import('./StatsChartBarImpl').then((m) => ({ default: m.StatsChartBarImpl }))
);
const StatsChartPieImpl = lazy(() =>
  import('./StatsChartPieImpl').then((m) => ({ default: m.StatsChartPieImpl }))
);

const EmptyFallback: React.FC<{ title?: string }> = ({ title }) => (
  <div
    style={{
      backgroundColor: 'common.white',
      borderRadius: 'lg',
      boxShadow: designTokens.shadows.sm,
      padding: 6,
    }}
  >
    <h3
      style={{
        fontSize: '18px',
        fontWeight: 600,
        color: 'grey.900',
        marginBottom: 4,
      }}
    >
      {title}
    </h3>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '160px',
        color: 'grey.400',
      }}
    >
      <p>{i18n.t('shared.stats_chart.impl.k0')}</p>
    </div>
  </div>
);

/**
