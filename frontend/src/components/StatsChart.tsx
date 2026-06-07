import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface StatsChartProps {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}

const defaultColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;

export const StatsChart: React.FC<StatsChartProps> = ({
  type,
  title,
  data,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  colorKey = 'color',
  colors = defaultColors,
  dataKey,
  nameKey,
  height,
}) => {
  const chartHeight = height || CHART_HEIGHT;
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
      <div style={{ width: CHART_WIDTH, height: chartHeight }}>
        {type === 'pie' ? (
          <PieChart width={CHART_WIDTH} height={chartHeight}>
            <Pie
              data={data}
              cx='50%'
              cy='50%'
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey={dataKey || yKey}
              nameKey={nameKey || xKey}
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
          <LineChart width={CHART_WIDTH} height={chartHeight} data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line type='monotone' dataKey={yKey} stroke='#6366f1' strokeWidth={2} />
          </LineChart>
        ) : (
          <BarChart width={CHART_WIDTH} height={chartHeight} data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {yKeys && yKeys.length > 0 ? (
              <>
                {yKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </>
            ) : (
              <Bar dataKey={yKey} fill={colors[0]} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry[colorKey] || colors[index % colors.length]} />
                ))}
              </Bar>
            )}
            <Legend />
          </BarChart>
        )}
      </div>
    </div>
  );
};

export default StatsChart;