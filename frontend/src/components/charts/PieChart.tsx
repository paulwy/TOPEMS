import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  showLegend?: boolean;
  showLabel?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const PieChart = ({
  data,
  height = 300,
  showLegend = true,
  showLabel = true,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={showLabel ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey='value'
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;
