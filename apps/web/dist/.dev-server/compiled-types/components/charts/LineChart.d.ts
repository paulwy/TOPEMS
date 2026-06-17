import React from "react";
interface LineChartProps {
    data: any[];
    xKey: string;
    yKeys: {
        key: string;
        name: string;
        color?: string;
        strokeWidth?: number;
        dashed?: boolean;
    }[];
    height?: number;
    showLegend?: boolean;
    yDomain?: [number, number];
    animate?: boolean;
    showGrid?: boolean;
    showDot?: boolean;
    dotRadius?: number;
    strokeType?: "solid" | "dashed" | "dotted";
    onLineClick?: (data: any) => void;
}
export declare const LineChart: React.FC<LineChartProps>;
export default LineChart;
