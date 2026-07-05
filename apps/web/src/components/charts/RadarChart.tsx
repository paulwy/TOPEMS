import React from 'react';
import { Box, Typography } from '@mui/material';
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
import { useChartTheme, getChartColor } from './chartTheme';
import type { ChartData } from './AreaChart';

interface RadarChartProps {
  data: ChartData[];
  dataKey?: string;
  yKeys: { key: string; name: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  animate?: boolean;
  onRadarClick?: (data: ChartData) => void;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  dataKey = 'subject',
  yKeys,
  height = 300,
  showLegend = true,
  animate = true,
  onRadarClick,
}) => {
  const chartTheme = useChartTheme();

  const handleClick = (_data: unknown) => {
    // onRadarClick is handled differently in Recharts Radar
  };

  return (
    <Box sx={{ height }}>
      <ResponsiveContainer
        width='100%'
        height='100%'
        minWidth={0}
        minHeight={0}
      >
        <RechartsRadarChart data={data}>
          <PolarGrid stroke={chartTheme.gridColor} />
          <PolarAngleAxis
            dataKey={dataKey}
            tick={{ fill: chartTheme.textColor, fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'auto']}
            tick={{ fill: chartTheme.textColor, fontSize: 10 }}
            stroke={chartTheme.gridColor}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.borderColor}`,
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType='circle'
              iconSize={8}
              formatter={(value) => (
                <Typography sx={{ fontSize: '0.875rem', color: chartTheme.textColor }}>
                  {value}
                </Typography>
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
    </Box>
  );
};

export default RadarChart;
