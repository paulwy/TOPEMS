import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { ChartData } from './AreaChart';

interface BaseChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
}

interface BarChartProps extends BaseChartProps {
  type: 'bar';
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  barRadius?: number | [number, number, number, number];
}

interface LineChartProps extends BaseChartProps {
  type: 'line';
  xKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
}

interface PieChartProps {
  type: 'pie';
  data: { name: string; value: number; color?: string }[];
  title?: string;
  height?: number;
}

interface AreaChartProps extends BaseChartProps {
  type: 'area';
  xKey: string;
  yKeys: { key: string; name: string; color?: string }[];
}

type LazyChartProps = BarChartProps | LineChartProps | PieChartProps | AreaChartProps;

const ChartLoadingFallback: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height,
      width: '100%',
    }}
  >
    <CircularProgress size={24} />
  </Box>
);

const LazyBarChart = lazy(() => import('./BarChart'));
const LazyLineChart = lazy(() => import('./LineChart'));
const LazyPieChart = lazy(() => import('./PieChart'));
const LazyAreaChart = lazy(() => import('./AreaChart'));

export const LazyChart: React.FC<LazyChartProps> = (props) => {
  let chartElement: React.ReactNode = null;

  if (props.type === 'bar') {
    chartElement = <LazyBarChart {...props} />;
  } else if (props.type === 'line') {
    chartElement = <LazyLineChart {...props} />;
  } else if (props.type === 'pie') {
    chartElement = <LazyPieChart {...props} />;
  } else if (props.type === 'area') {
    chartElement = <LazyAreaChart {...props} />;
  }

  return (
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>
      {chartElement}
    </Suspense>
  );
};

export default LazyChart;
