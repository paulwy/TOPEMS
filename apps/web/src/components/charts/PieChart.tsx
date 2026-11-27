import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartTheme } from './chartTheme';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from './_vendors/recharts-polar';
import { designTokens } from '@topems/tokens';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
}

const DEFAULT_COLORS = [
  'primary.main', // Blue (primary)
  'success.main', // Emerald (success)
  'warning.main', // Amber (warning)
  'error.main', // Red (error)
  'secondary.main', // Violet
  designTokens.colors.cyan[500], // Cyan
  designTokens.colors.pink.main, // Pink
  designTokens.colors.neon.lime[500], // Lime
];

export const PieChartComponent: React.FC<PieChartProps> = ({ data, title }) => {
  const theme = useTheme();
  const chartTheme = useChartTheme();

  // Use MUI palette colors for the first slots, then fall back to defaults
  const COLORS = [
    chartTheme.primary,
    chartTheme.secondary,
    chartTheme.success,
    chartTheme.warning,
    chartTheme.error,
    chartTheme.info,
    ...DEFAULT_COLORS,
  ];

  return (
    <div>
      {title && (
        <h4 style={{ marginBottom: 16, color: theme.palette.text.primary, fontWeight: 600 }}>
          {title}
        </h4>
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
            outerRadius='68%'
            paddingAngle={2}
            dataKey='value'
            label={false}
            labelLine={false}
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
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.borderColor}`,
              borderRadius: 8,
              padding: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        {data.map((entry, index) => {
          const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
          const percent = total > 0 ? Math.round(((entry.value || 0) / total) * 100) : 0;
          return (
            <span
              key={`legend-${entry.name}-${index}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: designTokens.typography.fontSize.scale['0.8rem'],
                color: theme.palette.text.secondary,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: entry.color || COLORS[index % COLORS.length],
                  display: 'inline-block',
                }}
              />
              {entry.name} {entry.value}
              {` (${percent}%)`}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default PieChartComponent;
