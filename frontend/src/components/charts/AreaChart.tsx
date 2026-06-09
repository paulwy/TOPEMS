import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AreaChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color: string }[];
  height?: number;
  showLegend?: boolean;
  yDomain?: [number, number];
}

export const AreaChart = ({ data, xKey, yKeys, height = 300, showLegend = true, yDomain }: AreaChartProps) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsAreaChart data={data}>
          <defs>
            {yKeys.map((yKey, index) => (
              <linearGradient key={`gradient-${index}`} id={`color${index}`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor={yKey.color} stopOpacity={0.1} />
                <stop offset='95%' stopColor={yKey.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey={xKey} />
          <YAxis domain={yDomain} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((yKey, index) => (
            <Area
              key={yKey.key}
              type='monotone'
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color}
              fill={`url(#color${index})`}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;
