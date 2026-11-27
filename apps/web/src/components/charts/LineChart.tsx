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
  Legend,
  ResponsiveContainer,
} from './_vendors/recharts-cartesian';
import type { ChartData } from './AreaChart';

interface LineChartProps {
  data: ChartData[];
  title?: string;
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  height?: number;
  /** 两条以上系列时显示图例（默认关闭，保持既有页面观感不变） */
  showLegend?: boolean;
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  title,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  color,
  height = 200,
  showLegend = false,
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
          {showLegend && (
            <Legend
              verticalAlign='top'
              align='right'
              wrapperStyle={{ fontSize: 12, color: chartTheme.textColor }}
            />
          )}
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
