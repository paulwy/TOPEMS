import React, { Suspense, lazy } from 'react';
import styles from './StatsChart.module.css';
import type { StatsChartProps } from './StatsChartImpl';

export type { StatsChartProps };

const ChartFallback: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div
    className={styles.il1}
  />
);

const StatsChartLazy = lazy(() =>
  import('./StatsChartImpl').then((m) => ({ default: m.StatsChartImpl }))
);

export const StatsChart: React.FC<StatsChartProps> = (props) => (
  <Suspense fallback={<ChartFallback height={props.height} />}>
    <StatsChartLazy {...props} />
  </Suspense>
);

export default StatsChart;
