import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { BIChartColors, getChartColor } from "./chartTheme";
import { CustomTooltip } from "./CustomTooltip";

interface BarChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color?: string }[];
  height?: number;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  onBarClick?: (data: any) => void;
  animate?: boolean;
  showGrid?: boolean;
  showValue?: boolean;
  barRadius?: number | [number, number, number, number];
  barWidth?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKeys,
  height = 300,
  showLegend = true,
  stacked = false,
  horizontal = false,
  onBarClick,
  animate = true,
  showGrid = true,
  showValue = false,
  barRadius = 4,
  barWidth,
}) => {
  const handleClick = (data: any) => {
    onBarClick?.(data);
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
      >
        <RechartsBarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={horizontal}
              horizontal={!horizontal}
            />
          )}
          <XAxis
            type={horizontal ? "number" : "category"}
            dataKey={horizontal ? undefined : xKey}
            tick={{ fill: "#64748B", fontSize: 12 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={{ stroke: "#E2E8F0" }}
          />
          <YAxis
            type={horizontal ? "category" : "number"}
            dataKey={horizontal ? xKey : undefined}
            tick={{ fill: "#64748B", fontSize: 12 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={{ stroke: "#E2E8F0" }}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-sm text-slate-600">{value}</span>
              )}
            />
          )}
          {yKeys.map((yKey, index) => (
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.name}
              fill={yKey.color || getChartColor(index)}
              stackId={stacked ? "a" : undefined}
              onClick={handleClick}
              cursor={onBarClick ? "pointer" : "default"}
              radius={barRadius}
              maxBarSize={barWidth || 40}
              animationDuration={animate ? 800 + index * 100 : 0}
              animationEasing="ease-out"
            >
              {showValue &&
                data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={yKey.color || getChartColor(index)}
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
