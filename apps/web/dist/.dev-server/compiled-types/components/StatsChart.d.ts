import React from "react";
interface StatsChartProps {
    type: "bar" | "pie" | "line";
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
export declare const StatsChart: React.FC<StatsChartProps>;
export default StatsChart;
