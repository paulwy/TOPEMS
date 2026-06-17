interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number | string;
        color: string;
        dataKey: string;
    }>;
    label?: string;
    formatter?: (value: number | string, name: string) => [string, string];
}
export declare const CustomTooltip: React.FC<CustomTooltipProps>;
export declare const formatPercent: (value: number) => string;
export declare const formatCurrency: (value: number) => string;
export declare const formatWithUnit: (value: number, unit: string) => string;
export default CustomTooltip;
