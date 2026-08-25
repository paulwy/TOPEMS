import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from '../charts/_vendors/recharts-polar';
import { designTokens } from '@topems/tokens';

export interface ChartDataPoint {
  [key: string]: string | number | boolean;
}

interface TooltipPayload {
  name?: string;
  value?: unknown;
  dataKey?: string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltipPolar: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'common.white',
          padding: `${designTokens.spacing.md} ${designTokens.spacing.md}px`,
          borderRadius: 'md',
          boxShadow: designTokens.shadows.md,
          border: '1px solid border.default',
          minWidth: '120px',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--mui-palette-text-primary)', marginBottom: 2 }}>
          {payload[0].name}
        </p>
        {payload.map((item, index) => (
          <p
            key={index}
            style={{
              fontSize: '14px',
              color: 'var(--mui-palette-text-secondary)',
              margin: `${designTokens.spacing.xs} 0`,
            }}
          >
            <span style={{ color: item.color || 'primary.light' }}>●</span>
            {item.dataKey}: {String(item.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface PolarCaseProps {
  type: 'pie' | 'radar';
  data: ChartDataPoint[];
  chartWidth: number;
  chartHeight: number;
  xKey: string;
  yKey: string;
  dataKey?: string;
  nameKey?: string;
  colors: string[];
  colorKey: string;
  showLegend: boolean;
  showTooltip: boolean;
}

export const PolarCases: React.FC<PolarCaseProps> = (p) => {
  if (p.type === 'pie') {
    return (
      <PieChart
        width={p.chartWidth}
        height={p.chartHeight}
      >
        <Pie
          data={p.data}
          cx='50%'
          cy='50%'
          innerRadius={40}
          outerRadius={80}
          paddingAngle={2}
          dataKey={p.dataKey || p.yKey}
          nameKey={p.nameKey || p.xKey}
        >
          {p.data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry[p.colorKey] as string) || p.colors[index % p.colors.length]}
            />
          ))}
        </Pie>
        {p.showTooltip && <Tooltip content={<CustomTooltipPolar />} />}
        {p.showLegend && <Legend />}
      </PieChart>
    );
  }
  // radar
  return (
    <RadarChart
      width={p.chartWidth}
      height={p.chartHeight}
      data={p.data}
    >
      <PolarGrid stroke='border.default' />
      <PolarAngleAxis
        dataKey={p.xKey}
        tick={{ fill: 'grey.600', fontSize: 11 }}
      />
      <PolarRadiusAxis
        angle={30}
        domain={[0, 'dataMax']}
      />
      {p.showTooltip && <Tooltip content={<CustomTooltipPolar />} />}
      {p.showLegend && <Legend />}
      <Radar
        dataKey={p.yKey}
        stroke={p.colors[0]}
        fill={p.colors[0]}
        fillOpacity={0.3}
      />
    </RadarChart>
  );
};

export default PolarCases;
