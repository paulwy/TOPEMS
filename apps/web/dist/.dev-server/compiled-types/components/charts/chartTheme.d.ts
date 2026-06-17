export declare const BIChartColors: {
    readonly primary: {
        readonly blue: "#3B82F6";
        readonly cyan: "#06B6D4";
        readonly indigo: "#6366F1";
    };
    readonly semantic: {
        readonly success: "#10B981";
        readonly warning: "#F59E0B";
        readonly error: "#EF4444";
        readonly info: "#0EA5E9";
    };
    readonly neutral: {
        readonly slate: "#64748B";
        readonly slateLight: "#94A3B8";
        readonly slateDark: "#475569";
        readonly gray: "#6B7280";
    };
    readonly series: readonly ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];
    readonly gradients: {
        readonly blue: readonly ["#3B82F6", "#06B6D4"];
        readonly emerald: readonly ["#10B981", "#14B8A6"];
        readonly violet: readonly ["#8B5CF6", "#A855F7"];
        readonly rose: readonly ["#F43F5E", "#FB7185"];
        readonly amber: readonly ["#F59E0B", "#FBBF24"];
    };
};
export type ChartColor = (typeof BIChartColors.series)[number];
export declare const getChartColor: (index: number) => string;
export declare const getContrastingColor: (hexColor: string) => string;
export declare const createGradientId: (prefix: string, index: number) => string;
export default BIChartColors;
