import React from "react";
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
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ComposedChart,
  Brush,
} from "recharts";

export type ChartType = "bar" | "pie" | "line" | "area" | "radar" | "scatter" | "composed";

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
  height?: number;
  width?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  smooth?: boolean;
}

const defaultColors = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
];

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "12px 16px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          minWidth: "120px",
        }}
      >
        <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
          {payload[0].name}
        </p>
        {payload.map((item, index) => (
          <p key={index} style={{ fontSize: "14px", color: "#64748b", margin: "4px 0" }}>
            <span style={{ color: item.color || "#6366f1" }}>●</span>
            {item.dataKey}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartComponent: React.FC<ChartConfig> = ({
  type,
  title,
  data,
  xKey = "name",
  yKey = "value",
  yKeys,
  colorKey = "color",
  colors = defaultColors,
  dataKey,
  nameKey,
  height,
  width,
  showLegend = true,
  showTooltip = true,
  stacked = false,
  smooth = false,
}) => {
  const chartWidth = width || CHART_WIDTH;
  const chartHeight = height || CHART_HEIGHT;

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          padding: "24px",
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "16px",
            }}
          >
            {title}
          </h3>
        )}
        <div style={{ color: "#94a3b8", textAlign: "center" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ marginTop: "8px" }}>暂无数据</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case "pie":
        return (
          <PieChart width={chartWidth} height={chartHeight}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={type === "pie" ? 40 : 0}
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
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
          </PieChart>
        );

      case "line":
        return (
          <LineChart width={chartWidth} height={chartHeight} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {yKeys && yKeys.length > 0 ? (
              yKeys.map((key, index) => (
                <Line
                  key={key}
                  type={smooth ? "monotone" : "linear"}
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type={smooth ? "monotone" : "linear"}
                dataKey={yKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart width={chartWidth} height={chartHeight} data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colors[0]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Area
              type={smooth ? "monotone" : "linear"}
              dataKey={yKey}
              stroke={colors[0]}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        );

      case "radar":
        return (
          <RadarChart width={chartWidth} height={chartHeight} data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey={xKey}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, "dataMax"]} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Radar
              nameKey={nameKey || xKey}
              dataKey={yKey}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
            />
          </RadarChart>
        );

      case "scatter":
        return (
          <ScatterChart width={chartWidth} height={chartHeight} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey={xKey}
              name={xKey}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yKey}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Scatter name={nameKey || "data"} dataKey={yKey} fill={colors[0]} />
          </ScatterChart>
        );

      case "composed":
        return (
          <ComposedChart width={chartWidth} height={chartHeight} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Bar dataKey={yKeys?.[0] || yKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey={yKeys?.[1] || yKey} stroke={colors[1]} />
            <Brush dataKey={xKey} height={30} stroke="#6366f1" />
          </ComposedChart>
        );

      case "bar":
      default:
        return (
          <BarChart width={chartWidth} height={chartHeight} data={data} stackOffset={stacked ? "expand" : undefined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {yKeys && yKeys.length > 0 ? (
              yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={stacked ? "stack" : undefined}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar dataKey={yKey} fill={colors[0]} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry[colorKey] || colors[index % colors.length]}
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
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        padding: "24px",
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: "16px",
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ width: chartWidth, height: chartHeight }}>
        {renderChart()}
      </div>
    </div>
  );
};

export const BarChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="bar" {...props} />
);

export const LineChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="line" {...props} />
);

export const PieChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="pie" {...props} />
);

export const AreaChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="area" {...props} />
);

export const RadarChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="radar" {...props} />
);

export const ScatterChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="scatter" {...props} />
);

export const ComposedChartComponent: React.FC<Omit<ChartConfig, "type">> = (props) => (
  <ChartComponent type="composed" {...props} />
);

export default ChartComponent;
