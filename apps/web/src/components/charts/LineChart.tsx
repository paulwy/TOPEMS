import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartTheme } from './chartTheme';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartData } from './AreaChart';

interface LineChartProps {
  data: ChartData[];
  title?: string;
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  height?: number;
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  title,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  color,
  height = 200,
}) => {
  const theme = useTheme();
  const chartTheme = useChartTheme();
  const resolvedColor = color || chartTheme.primary;
  const series = yKeys || [{ key: yKey, name: yKey, color: resolvedColor }];

  return (
    <div>
      {title && (
        <h4 style={{ marginBottom: 16, color: theme.palette.text.primary, fontWeight: 600 }}>
          {title}
        </h4>
      )}
      <ResponsiveContainer
        width='100%'
        height={height}
      >
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={chartTheme.gridColor}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: chartTheme.textColor, fontSize: 12 }}
          />
          <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.borderColor}`,
              borderRadius: 8,
              padding: 12,
            }}
          />
          {series.map((item) => {
            const strokeColor = item.color || resolvedColor;
            return (
              <Line
                key={item.key}
                type='monotone'
                dataKey={item.key}
                name={item.name}
                stroke={strokeColor}
                strokeWidth={2}
                dot={{ r: 4, fill: strokeColor }}
                activeDot={{ r: 6, fill: strokeColor }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
