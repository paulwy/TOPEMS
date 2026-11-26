import React from 'react';
import styles from './StatsChartPieImpl.module.css';
import { PieChart, Pie, Cell, Tooltip, Legend } from '../charts/_vendors/recharts-polar';
import type { ChartData } from '../charts/AreaChart';
import { designTokens } from '@topems/tokens';

interface StatsChartPieProps {
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
          backgroundColor: 'var(--bg-elevated)',
          padding: 3,
          borderRadius: 'var(--radius-md)',
          boxShadow: designTokens.shadows.md,
          border: '1px solid border.default',
        }}
      >
        <p className={styles.il1}>{payload[0].name}</p>
        <p className={styles.il2}>{String(payload[0].value)}</p>
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
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: designTokens.shadows.sm,
        padding: 6,
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}
      >
        {title}
      </h3>
      <div style={{ width: CHART_WIDTH, height }}>
        <PieChart
          width={CHART_WIDTH}
          height={height}
        >
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
          <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>} />
        </PieChart>
      </div>
    </div>
  );
};

export default StatsChartPieImpl;
