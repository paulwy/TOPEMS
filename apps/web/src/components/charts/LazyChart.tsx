import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { ChartData } from './AreaChart';

export type { ChartData };

interface BaseChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
}

export interface BarChartProps extends BaseChartProps {
  type: 'bar';
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  barRadius?: number | [number, number, number, number];
  animate?: boolean;
  cellColors?: string[];
  tooltipFormatter?: (...args: any[]) => any;
}

export interface LineChartProps extends BaseChartProps {
  type: 'line';
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
}

export interface PieChartProps {
  type: 'pie';
  data: { name: string; value: number; color?: string }[];
  title?: string;
  height?: number;
}

export interface AreaChartProps extends BaseChartProps {
  type: 'area';
  xKey: string;
  yKeys: { key: string; name: string; color?: string }[];
  showLegend?: boolean;
  yDomain?: [number, number];
  animate?: boolean;
  showGrid?: boolean;
  strokeType?: 'solid' | 'dashed';
  fillOpacity?: number;
  onAreaClick?: (data: ChartData) => void;
}

export interface RadarChartProps {
  type: 'radar';
  data: ChartData[];
  dataKey?: string;
  yKeys: { key: string; name: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  animate?: boolean;
  onRadarClick?: (data: ChartData) => void;
}

export type LazyChartProps =
  | BarChartProps
  | LineChartProps
  | PieChartProps
  | AreaChartProps
  | RadarChartProps;

const ChartLoadingFallback: React.FC<{ height?: number }> = ({ height = 300 }) => (
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
const LazyRadarChart = lazy(() => import('./RadarChart'));

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
  } else if (props.type === 'radar') {
    chartElement = <LazyRadarChart {...props} />;
  }

  return (
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>{chartElement}</Suspense>
  );
};

export default LazyChart;
