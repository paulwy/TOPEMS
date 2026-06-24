import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: any[];
  title?: string;
  xKey?: string;
  yKey?: string;
  yKeys?: { key: string; name: string; color?: string }[];
  color?: string;
  height?: number;
  barRadius?: number | [number, number, number, number];
  animate?: boolean;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  color = '#3b82f6',
  height = 200,
  barRadius = [4, 4, 0, 0],
}) => {
  const series = yKeys || [{ key: yKey, name: yKey, color }];

  return (
    <div>
      {title && (
        <h4 style={{ marginBottom: '16px', color: '#1e293b', fontWeight: 600 }}>{title}</h4>
      )}
      <ResponsiveContainer
        width='100%'
        height={height}
      >
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke='#e2e8f0'
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
            }}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={item.color || color}
              radius={Array.isArray(barRadius) ? barRadius : [barRadius, barRadius, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartComponent;
