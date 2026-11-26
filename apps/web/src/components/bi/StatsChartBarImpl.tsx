import React from 'react';
import styles from './StatsChartBarImpl.module.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Cell,
} from '../charts/_vendors/recharts-cartesian';
import type { ChartData } from '../charts/AreaChart';
import { designTokens } from '@topems/tokens';

interface StatsChartBarProps {
  type: 'bar' | 'line';
  title?: string;
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
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

export const StatsChartBarImpl: React.FC<StatsChartBarProps> = ({
  type,
  title,
  data,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  colorKey = 'color',
  colors = defaultColors,
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
        {type === 'line' ? (
          <LineChart
            width={CHART_WIDTH}
            height={height}
            data={data}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type='monotone'
              dataKey={yKey}
              stroke='primary.light'
              strokeWidth={2}
            />
          </LineChart>
        ) : (
          <BarChart
            width={CHART_WIDTH}
            height={height}
            data={data}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {yKeys && yKeys.length > 0 ? (
              <>
                {yKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </>
            ) : (
              <Bar
                dataKey={yKey}
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
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
              </Bar>
            )}
            <Legend
              formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
            />
          </BarChart>
        )}
      </div>
    </div>
  );
};

export default StatsChartBarImpl;
