import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getChartColor } from './chartTheme';
import { CustomTooltip } from './CustomTooltip';

interface AreaChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  yDomain?: [number, number];
  animate?: boolean;
  showGrid?: boolean;
  strokeType?: 'solid' | 'dashed';
  fillOpacity?: number;
  onAreaClick?: (data: any) => void;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKeys,
  height = 300,
  showLegend = true,
  yDomain,
  animate = true,
  showGrid = true,
  strokeType = 'solid',
  fillOpacity = 0.3,
  onAreaClick,
}) => {
  const handleClick = (data: any) => {
    onAreaClick?.(data);
  };

  return (
    <Box sx={{ height }}>
      <ResponsiveContainer
        width='100%'
        height='100%'
        minWidth={0}
        minHeight={0}
      >
        <RechartsAreaChart data={data}>
          <defs>
            {yKeys.map((yKey, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`area-gradient-${index}`}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='0%'
                  stopColor={yKey.color || getChartColor(index)}
                  stopOpacity={fillOpacity}
                />
                <stop
                  offset='95%'
                  stopColor={yKey.color || getChartColor(index)}
                  stopOpacity={0.05}
                />
              </linearGradient>
            ))}
          </defs>
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
            cursor={{
              stroke: '#94A3B8',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType='circle'
              iconSize={8}
              formatter={(value) => (
                <Typography sx={{ fontSize: '0.875rem', color: '#475569' }}>{value}</Typography>
              )}
            />
          )}
          {yKeys.map((yKey, index) => (
            <Area
              key={yKey.key}
              type='monotone'
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color || getChartColor(index)}
              strokeWidth={2}
              strokeDasharray={strokeType === 'dashed' ? '5 5' : undefined}
              fill={`url(#area-gradient-${index})`}
              onClick={handleClick}
              cursor={onAreaClick ? 'pointer' : 'default'}
              animationDuration={animate ? 1000 + index * 150 : 0}
              animationEasing='ease-out'
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AreaChart;
