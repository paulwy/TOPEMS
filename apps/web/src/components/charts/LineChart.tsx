import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  _Legend,
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
  color = 'primary.main',
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
            stroke='border.default'
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'grey.600', fontSize: 12 }}
          />
          <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid border.default',
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
