import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color: string; strokeWidth?: number }[];
  height?: number;
  showLegend?: boolean;
  area?: boolean;
  yDomain?: [number, number];
}

export const LineChart = ({
  data,
  xKey,
  yKeys,
  height = 300,
  showLegend = true,
  area = false,
  yDomain,
}: LineChartProps) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis domain={yDomain} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((yKey) => (
            <Line
              key={yKey.key}
              type="monotone"
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color}
              strokeWidth={yKey.strokeWidth || 2}
              fill={area ? yKey.color : 'none'}
              fillOpacity={area ? 0.1 : 0}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
