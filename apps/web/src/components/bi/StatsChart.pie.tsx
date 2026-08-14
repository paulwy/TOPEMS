import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from '../charts/_vendors/recharts-polar';
import type { ChartData } from '../charts/AreaChart';
import { designTokens, semanticTokens } from '@topems/tokens';

export interface StatsChartPieProps {
  title?: string;
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}

const defaultColors = [
  'primary.light',
  'secondary.main',
  'colors.purple.500',
  designTokens.colors.pink[500],
  designTokens.colors.pink.main,
  designTokens.colors.error[500],
];

const CHART_WIDTH = 400;

interface TooltipPayload {
  name?: string;
  value?: unknown;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'common.white',
          padding: 3,
          borderRadius: 'md',
          boxShadow: designTokens.shadows.md,
          border: '1px solid border.default',
        }}
      >
        <p style={{ fontWeight: 500, color: 'var(--mui-palette-text-primary)' }}>
          {payload[0].name}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--mui-palette-text-secondary)' }}>
          {String(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const StatsChartPieImpl: React.FC<StatsChartPieProps> = ({
  title,
  data,
  xKey = 'name',
  yKey = 'value',
  colorKey = 'color',
  colors = defaultColors,
  dataKey,
  nameKey,
  height = 200,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'common.white',
        borderRadius: 'lg',
        boxShadow: designTokens.shadows.sm,
        padding: 6,
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'grey.900',
          marginBottom: 4,
        }}
      >
        {title}
      </h3>
      <div style={{ width: CHART_WIDTH, height }}>
        <PieChart width={CHART_WIDTH} height={height}>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey={dataKey || yKey}
            nameKey={(nameKey || xKey) as string}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  ((entry as unknown as Record<string, unknown>)[colorKey] as string) ||
                  colors[index % colors.length]
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </div>
    </div>
  );
};

export default StatsChartPieImpl;
