import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartTheme } from './chartTheme';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from './_vendors/recharts-polar';
import { designTokens, semanticTokens } from '@topems/tokens';

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
  'colors.cyan.500', // Cyan
  designTokens.colors.pink.main, // Pink
  '#84CC16', // Lime
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
            outerRadius={80}
            paddingAngle={2}
            dataKey='value'
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: chartTheme.gridColor }}
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
    </div>
  );
};

export default PieChartComponent;
