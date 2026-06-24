import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: any[];
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
  color = '#3b82f6',
  height = 200,
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
        <LineChart data={data}>
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
            <Line
              key={item.key}
              type='monotone'
              dataKey={item.key}
              name={item.name}
              stroke={item.color || color}
              strokeWidth={2}
              dot={{ r: 4, fill: item.color || color }}
              activeDot={{ r: 6, fill: item.color || color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
