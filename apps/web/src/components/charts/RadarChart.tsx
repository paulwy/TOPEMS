import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface RadarChartProps {
  data: any[];
  height?: number;
  showLegend?: boolean;
}

export const RadarChart = ({ data, height = 300, showLegend = true }: RadarChartProps) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const keys = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'subject') : [];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsRadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey='subject' />
          <PolarRadiusAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {keys.map((key, index) => (
            <Radar
              key={key}
              name={key}
              dataKey={key}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.3}
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChart;
