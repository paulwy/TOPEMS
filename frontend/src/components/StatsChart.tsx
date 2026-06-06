import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface StatsChartProps {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  colorKey?: string;
  colors?: string[];
}

const defaultColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export const StatsChart: React.FC<StatsChartProps> = ({
  type,
  title,
  data,
  xKey = 'name',
  yKey = 'value',
  colorKey = 'color',
  colors = defaultColors,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className='bg-white rounded-xl shadow-sm p-6'>
        <h3 className='text-lg font-semibold text-slate-900 mb-4'>{title}</h3>
        <div className='flex items-center justify-center h-40 text-slate-400'>
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 rounded-lg shadow-lg border border-slate-200'>
          <p className='font-medium text-slate-900'>{payload[0].name}</p>
          <p className='text-sm text-slate-600'>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='bg-white rounded-xl shadow-sm p-6'>
      <h3 className='text-lg font-semibold text-slate-900 mb-4'>{title}</h3>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
          {type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx='50%'
                cy='50%'
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey={yKey}
                nameKey={xKey}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry[colorKey] || colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type='monotone' dataKey={yKey} stroke='#6366f1' strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={yKey} fill='#6366f1' radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry[colorKey] || colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;
