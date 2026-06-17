import React from "react";
export interface StatCardProps {
    title: string;
    value: string | number;
    unit?: string;
    change?: number;
    changeLabel?: string;
    changeDirection?: "up" | "down" | "neutral";
    icon?: React.ReactNode;
    color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
    gradient?: boolean;
    onClick?: () => void;
    tooltip?: string;
    loading?: boolean;
    trendData?: number[];
    children?: React.ReactNode;
}
export declare const StatCard: React.FC<StatCardProps>;
export interface StatCardGroupProps {
    stats: Omit<StatCardProps, "">[];
    loading?: boolean;
    columns?: number;
}
export declare const StatCardGroup: React.FC<StatCardGroupProps>;
export default StatCard;
