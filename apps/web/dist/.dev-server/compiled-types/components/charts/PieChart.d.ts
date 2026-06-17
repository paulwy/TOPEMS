import React from "react";
interface PieChartProps {
    data: {
        name: string;
        value: number;
        color?: string;
    }[];
    height?: number;
    showLegend?: boolean;
    showLabel?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    animate?: boolean;
    donut?: boolean;
    labelType?: "percent" | "value" | "name" | "none";
    onPieClick?: (data: any) => void;
}
export declare const PieChart: React.FC<PieChartProps>;
export default PieChart;
