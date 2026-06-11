import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getChartColor } from './chartTheme';

interface RadarChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  yKeys: { key: string; name: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  animate?: boolean;
  onRadarClick?: (data: any) => void;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  dataKey = 'subject',
  nameKey,
  yKeys,
  height = 300,
  showLegend = true,
  animate = true,
  onRadarClick,
}) => {
  const handleClick = (data: any) => {
    onRadarClick?.(data);
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsRadarChart data={data}>
          <PolarGrid stroke='#E2E8F0' />
          <PolarAngleAxis
            dataKey={dataKey}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'auto']}
            tick={{ fill: '#64748B', fontSize: 10 }}
            stroke='#E2E8F0'
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType='circle'
              iconSize={8}
              formatter={(value) => (
                <span className='text-sm text-slate-600'>{value}</span>
              )}
            />
          )}
          {yKeys.map((yKey, index) => (
            <Radar
              key={yKey.key}
              name={yKey.name}
              dataKey={yKey.key}
              stroke={yKey.color || getChartColor(index)}
              fill={yKey.color || getChartColor(index)}
              fillOpacity={0.2}
              strokeWidth={2}
              onClick={handleClick}
              cursor={onRadarClick ? 'pointer' : 'default'}
              animationDuration={animate ? 800 + index * 100 : 0}
              animationEasing='ease-out'
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChart;
