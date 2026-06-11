import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getChartColor } from './chartTheme';
import { CustomTooltip } from './CustomTooltip';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color?: string; strokeWidth?: number; dashed?: boolean }[];
  height?: number;
  showLegend?: boolean;
  yDomain?: [number, number];
  animate?: boolean;
  showGrid?: boolean;
  showDot?: boolean;
  dotRadius?: number;
  strokeType?: 'solid' | 'dashed' | 'dotted';
  onLineClick?: (data: any) => void;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKeys,
  height = 300,
  showLegend = true,
  yDomain,
  animate = true,
  showGrid = true,
  showDot = true,
  dotRadius = 4,
  onLineClick,
}) => {
  const handleClick = (data: any) => {
    onLineClick?.(data);
  };

  const getStrokeDasharray = (dashed?: boolean) => {
    if (!dashed) return undefined;
    return '5 5';
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsLineChart data={data}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='#E2E8F0'
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#64748B', fontSize: 12 }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#64748B', fontSize: 12 }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={{ stroke: '#E2E8F0' }}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType='circle'
              iconSize={8}
              formatter={(value) => (
                <span className='text-sm text-slate-600'>{value}</span>
              )}
            />
          )}
          {yKeys.map((yKey, index) => (
            <Line
              key={yKey.key}
              type='monotone'
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color || getChartColor(index)}
              strokeWidth={yKey.strokeWidth || 2.5}
              strokeDasharray={getStrokeDasharray(yKey.dashed)}
              dot={{
                r: showDot ? dotRadius : 0,
                fill: yKey.color || getChartColor(index),
                strokeWidth: 0,
              }}
              activeDot={{
                r: 6,
                fill: yKey.color || getChartColor(index),
                stroke: '#fff',
                strokeWidth: 2,
              }}
              onClick={handleClick}
              cursor={onLineClick ? 'pointer' : 'default'}
              animationDuration={animate ? 1000 + index * 150 : 0}
              animationEasing='ease-out'
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
