interface BarChartProps {
    data: any[];
    xKey: string;
    yKeys: {
        key: string;
        name: string;
        color?: string;
    }[];
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
export declare const BarChart: React.FC<BarChartProps>;
export default BarChart;
