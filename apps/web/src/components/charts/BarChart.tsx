import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color: string }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  stacked?: boolean;
  onBarClick?: (data: any) => void;
}

export const BarChart = ({
  data,
  xKey,
  yKeys,
  height = 300,
  showLegend = true,
  stacked = false,
  onBarClick,
}: BarChartProps) => {
  const handleClick = (data: any) => {
    onBarClick?.(data);
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsBarChart data={data} layout={stacked ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis type='number' />
          <YAxis dataKey={xKey} type='category' width={60} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((yKey) => (
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.name}
              fill={yKey.color}
              stackId={stacked ? 'a' : undefined}
              onClick={handleClick}
              cursor={onBarClick ? 'pointer' : 'default'}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
