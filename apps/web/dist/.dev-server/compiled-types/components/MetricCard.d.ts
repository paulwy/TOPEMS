import React from "react";
import type { LucideIcon } from "lucide-react";
interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    unit?: string;
    suffix?: string;
    change?: number;
    icon?: LucideIcon | React.ReactNode;
    color?: string;
    gradient?: [string, string];
    trend?: "up" | "down" | "stable" | "neutral" | null;
    sparklineData?: number[];
    animate?: boolean;
}
export declare const MetricCard: React.FC<MetricCardProps>;
export default MetricCard;
