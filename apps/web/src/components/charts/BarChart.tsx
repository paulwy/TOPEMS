import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartTheme } from './chartTheme';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from './_vendors/recharts-cartesian';
import type { ChartData } from './AreaChart';

interface BarChartProps {
  data: ChartData[];
  title?: string;
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  height?: number;
  barRadius?: number | [number, number, number, number];
  animate?: boolean;
  cellColors?: string[];
  tooltipFormatter?: (
    value: unknown,
    name: unknown,
    props: unknown
  ) => React.ReactNode | [React.ReactNode, unknown] | void;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  color,
  height = 200,
  barRadius = [4, 4, 0, 0],
  cellColors,
  tooltipFormatter,
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
        <BarChart data={data}>
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
            {...(tooltipFormatter ? { formatter: tooltipFormatter as never } : {})}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={item.color || resolvedColor}
              radius={Array.isArray(barRadius) ? barRadius : [barRadius, barRadius, 0, 0]}
            >
              {series.length === 1 &&
                cellColors &&
                cellColors.length > 0 &&
                data.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={cellColors[i % cellColors.length]}
                  />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartComponent;
