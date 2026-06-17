import React from "react";
type ChartType = "bar" | "line" | "area" | "pie";
interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    height?: number;
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
    onExport?: () => void;
    onFullscreen?: () => void;
    chartTypes?: ChartType[];
    activeChartType?: ChartType;
    onChartTypeChange?: (_type: ChartType) => void;
    timeRange?: string;
    onTimeRangeChange?: (_range: string) => void;
    showTimeRange?: boolean;
    showChartType?: boolean;
    showExport?: boolean;
    showFullscreen?: boolean;
    showRefresh?: boolean;
    className?: string;
    trend?: "up" | "down" | "stable";
    trendValue?: string;
}
export declare const ChartCard: React.FC<ChartCardProps>;
export {};
