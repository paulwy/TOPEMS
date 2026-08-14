import React, { Suspense, lazy } from 'react';
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  Brush,
  ResponsiveContainer,
  Cell,
} from '../charts/_vendors/recharts-cartesian';
import { designTokens, semanticTokens } from '@topems/tokens';

const PolarCasesLazy = lazy(() => import('./ChartLibrary.polar').then(m => ({ default: m.PolarCases })));

export type ChartType =
  'bar' | 'pie' | 'line' | 'area' | 'radar' | 'scatter' | 'composed' | 'histogram' | 'gauge';

export interface ChartDataPoint {
  [key: string]: string | number | boolean;
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  data: ChartDataPoint[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  chartHeight?: number;
  chartWidth?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  gaugeMin?: number;
  gaugeMax?: number;
  gaugeValue?: number;
  gaugeLabel?: string;
}

const defaultColors = [
  'primary.light',
  'secondary.main',
  'colors.purple.500',
  '#d946ef',
  designTokens.colors.pink.main,
  '#f43f5e',
  'colors.orange.500',
  'warning.main',
  'success.dark',
  'colors.teal.500',
];

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;

interface TooltipPayload {
  name?: string;
  value?: unknown;
  dataKey?: string;
  color?: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'common.white',
          padding: '12px 16px',
          borderRadius: 'md',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          border: '1px solid border.default',
          minWidth: '120px',
        }}
      >
        <p
          style={{ fontWeight: 600, color: 'var(--mui-palette-text-primary)', marginBottom: 2 }}
        >
          {payload[0].name}
        </p>
        {payload.map((item, index) => (
          <p
            key={index}
            style={{
              fontSize: '14px',
              color: 'var(--mui-palette-text-secondary)',
              margin: '4px 0',
            }}
          >
            <span style={{ color: item.color || 'primary.light' }}>●</span>
            {item.dataKey}: {String(item.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const GaugeChart = ({
  value = 0,
  min = 0,
  max = 100,
  label,
  color = 'primary.light',
}: {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  color?: string;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const circumference = 270;
  const radius = 80;
  const strokeWidth = 12;
  const offset = circumference * ((100 - percentage) / 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <svg
        width='200'
        height='160'
        viewBox='0 0 200 160'
      >
        <defs>
          <linearGradient
            id='gaugeGradient'
            x1='0%'
            y1='0%'
            x2='100%'
            y2='100%'
          >
            <stop
              offset='0%'
              stopColor={color}
            />
            <stop
              offset='100%'
              stopColor={color}
              stopOpacity={0.6}
            />
          </linearGradient>
          <linearGradient
            id='gaugeBgGradient'
            x1='0%'
            y1='0%'
            x2='100%'
            y2='100%'
          >
            <stop
              offset='0%'
              stopColor='border.default'
            />
            <stop
              offset='100%'
              stopColor='grey.100'
            />
          </linearGradient>
        </defs>
        <path
          d={`M 20 120 A ${radius} ${radius} 0 0 1 180 120`}
          fill='none'
          stroke='url(#gaugeBgGradient)'
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={`${circumference} ${circumference}`}
          transform='rotate(-135 100 120)'
        />
        <path
          d={`M 20 120 A ${radius} ${radius} 0 0 1 180 120`}
          fill='none'
          stroke='url(#gaugeGradient)'
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform='rotate(-135 100 120)'
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <g transform={`translate(100, ${120 - radius + 20})`}>
          <text
            x='0'
            y='0'
            textAnchor='middle'
            fill='grey.900'
            fontSize='36'
            fontWeight='700'
          >
            {value.toFixed(1)}
          </text>
          <text
            x='0'
            y='24'
            textAnchor='middle'
            fill='grey.600'
            fontSize='14'
          >
            {label || ''}
          </text>
        </g>
        <text
          x='25'
          y='140'
          textAnchor='middle'
          fill='grey.400'
          fontSize='12'
        >
          {min}
        </text>
        <text
          x='175'
          y='140'
          textAnchor='middle'
          fill='grey.400'
          fontSize='12'
        >
          {max}
        </text>
      </svg>
    </div>
  );
};

export const ChartComponent: React.FC<ChartConfig> = ({
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
  chartHeight: heightProp,
  chartWidth: widthProp,
  showLegend = true,
  showTooltip = true,
  stacked = false,
  smooth = false,
  gaugeMin = 0,
  gaugeMax = 100,
  gaugeValue,
  gaugeLabel,
}) => {
  const chartWidth = widthProp || CHART_WIDTH;
  const chartHeight = heightProp || CHART_HEIGHT;

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 'lg',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: 6,
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'grey.900',
              marginBottom: 4,
            }}
          >
            {title}
          </h3>
        )}
        <div style={{ color: 'text.muted', textAlign: 'center' }}>
          <svg
            width='48'
            height='48'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle
              cx='12'
              cy='12'
              r='10'
            />
            <line
              x1='12'
              y1='8'
              x2='12'
              y2='12'
            />
            <line
              x1='12'
              y1='16'
              x2='12.01'
              y2='16'
            />
          </svg>
          <p style={{ marginTop: 2 }}>暂无数据</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return (
          <Suspense fallback={<div style={{ width: chartWidth, height: chartHeight }} />}>
            <PolarCasesLazy
              type='pie'
              data={data}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              xKey={xKey}
              yKey={yKey}
              dataKey={dataKey}
              nameKey={nameKey}
              colors={colors}
              colorKey={colorKey}
              showLegend={showLegend}
              showTooltip={showTooltip}
            />
          </Suspense>
        );

      case 'line':
        return (
          <LineChart
            width={chartWidth}
            height={chartHeight}
            data={data}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {yKeys && yKeys.length > 0 ? (
              yKeys.map((key, index) => (
                <Line
                  key={key}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type={smooth ? 'monotone' : 'linear'}
                dataKey={yKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart
            width={chartWidth}
            height={chartHeight}
            data={data}
          >
            <defs>
              {yKeys && yKeys.length > 0 ? (
                yKeys.map((key, index) => (
                  <linearGradient
                    key={key}
                    id={`colorGradient-${key}`}
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset='100%'
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                ))
              ) : (
                <linearGradient
                  id='colorGradient'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'
                >
                  <stop
                    offset='0%'
                    stopColor={colors[0]}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset='100%'
                    stopColor={colors[0]}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {yKeys && yKeys.length > 0 ? (
              yKeys.map((key, index) => (
                <Area
                  key={key}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={`url(#colorGradient-${key})`}
                />
              ))
            ) : (
              <Area
                type={smooth ? 'monotone' : 'linear'}
                dataKey={yKey}
                stroke={colors[0]}
                fill='url(#colorGradient)'
              />
            )}
          </AreaChart>
        );

      case 'radar':
        return (
          <Suspense fallback={<div style={{ width: chartWidth, height: chartHeight }} />}>
            <PolarCasesLazy
              type='radar'
              data={data}
              chartWidth={chartWidth}
              chartHeight={chartHeight}
              xKey={xKey}
              yKey={yKey}
              colors={colors}
              colorKey={colorKey}
              showLegend={showLegend}
              showTooltip={showTooltip}
            />
          </Suspense>
        );

      case 'scatter':
        return (
          <ScatterChart
            width={chartWidth}
            height={chartHeight}
            data={data}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              type='number'
              dataKey={xKey}
              name={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis
              type='number'
              dataKey={yKey}
              name={yKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Scatter
              name={nameKey || 'data'}
              dataKey={yKey}
              fill={colors[0]}
            />
          </ScatterChart>
        );

      case 'composed':
        return (
          <ComposedChart
            width={chartWidth}
            height={chartHeight}
            data={data}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Bar
              dataKey={yKeys?.[0] || yKey}
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
            />
            <Line
              type='monotone'
              dataKey={yKeys?.[1] || yKey}
              stroke={colors[1]}
            />
            <Brush
              dataKey={xKey}
              height={30}
              stroke='primary.light'
            />
          </ComposedChart>
        );

      case 'histogram':
        return (
          <BarChart
            width={chartWidth}
            height={chartHeight}
            data={data}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Bar
              dataKey={yKey}
              fill={colors[0]}
              radius={[0, 0, 0, 0]}
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        );

      case 'gauge':
        return (
          <div style={{ width: chartWidth, height: chartHeight }}>
            <GaugeChart
              value={gaugeValue || (data[0]?.[yKey] as number) || 0}
              min={gaugeMin}
              max={gaugeMax}
              label={gaugeLabel}
              color={colors[0]}
            />
          </div>
        );

      case 'bar':
      default:
        return (
          <BarChart
            width={chartWidth}
            height={chartHeight}
            data={data}
            stackOffset={stacked ? 'expand' : undefined}
          >
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='border.default'
            />
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'grey.600', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'grey.600', fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {yKeys && yKeys.length > 0 ? (
              yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={stacked ? 'stack' : undefined}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar
                dataKey={yKey}
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={(entry[colorKey] as string) || colors[index % colors.length]}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'common.white',
        borderRadius: 'lg',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: 6,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'grey.900',
            marginBottom: 4,
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ width: chartWidth, height: chartHeight }}>{renderChart()}</div>
    </div>
  );
};

export const BarChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='bar'
    {...props}
  />
);

export const LineChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='line'
    {...props}
  />
);

export const PieChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='pie'
    {...props}
  />
);

export const AreaChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='area'
    {...props}
  />
);

export const RadarChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='radar'
    {...props}
  />
);

export const ScatterChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='scatter'
    {...props}
  />
);

export const ComposedChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='composed'
    {...props}
  />
);

export const HistogramChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='histogram'
    {...props}
  />
);

export const GaugeChartComponent: React.FC<Omit<ChartConfig, 'type'>> = (props) => (
  <ChartComponent
    type='gauge'
    {...props}
  />
);

export default ChartComponent;
