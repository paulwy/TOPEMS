import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

export interface StatsChartProps {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}

const defaultColors = [
  'primary.light',
  'secondary.main',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
];

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;

export const StatsChart: React.FC<StatsChartProps> = ({
  type,
  title,
  data,
  xKey = 'name',
  yKey = 'value',
  yKeys,
  colorKey = 'color',
  colors = defaultColors,
  dataKey,
  nameKey,
  height,
}) => {
  const chartHeight = height || CHART_HEIGHT;
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '24px',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'grey.900',
            marginBottom: '16px',
          }}
        >
          {title}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '160px',
            color: '#94a3b8',
          }}
        >
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid border.default',
          }}
        >
          <p style={{ fontWeight: 500, color: 'grey.900' }}>{payload[0].name}</p>
          <p style={{ fontSize: '14px', color: 'grey.600' }}>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '24px',
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'grey.900',
          marginBottom: '16px',
        }}
      >
        {title}
      </h3>
      <div style={{ width: CHART_WIDTH, height: chartHeight }}>
        {type === 'pie' ? (
          <PieChart
            width={CHART_WIDTH}
            height={chartHeight}
          >
            <Pie
              data={data}
              cx='50%'
              cy='50%'
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey={dataKey || yKey}
              nameKey={nameKey || xKey}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry[colorKey] || colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart
            width={CHART_WIDTH}
            height={chartHeight}
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
            height={chartHeight}
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
                    fill={entry[colorKey] || colors[index % colors.length]}
                  />
                ))}
              </Bar>
            )}
            <Legend />
          </BarChart>
        )}
      </div>
    </div>
  );
};

export default StatsChart;
