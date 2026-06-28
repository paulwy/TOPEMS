import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
}

const COLORS = [
  'primary.main',
  'secondary.main',
  'success.main',
  'warning.main',
  'error.main',
  'info.main',
];

export const PieChartComponent: React.FC<PieChartProps> = ({ data, title }) => {
  return (
    <div>
      {title && (
        <h4 style={{ marginBottom: '16px', color: '#1e293b', fontWeight: 600 }}>{title}</h4>
      )}
      <ResponsiveContainer
        width='100%'
        height={200}
      >
        <PieChart>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey='value'
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            labelLine={{ stroke: 'grey.400' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid border.default',
              borderRadius: '8px',
              padding: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChartComponent;
