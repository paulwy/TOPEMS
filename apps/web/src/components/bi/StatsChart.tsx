import React, { Suspense, lazy } from 'react';
import type { StatsChartProps } from './StatsChart.impl';

export type { StatsChartProps };

const ChartFallback: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height, borderRadius: 12 }} />
);

const StatsChartLazy = lazy(() => import('./StatsChart.impl').then(m => ({ default: m.StatsChartImpl })));

export const StatsChart: React.FC<StatsChartProps> = (props) => (
  <Suspense fallback={<ChartFallback height={props.height} />}>
    <StatsChartLazy {...props} />
  </Suspense>
);

export default StatsChart;
