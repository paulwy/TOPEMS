import React from "react";
import type { BoxProps } from "@mui/material";
import type { BreadcrumbItem } from "./PageHeader";
export interface StatCard {
    id: string;
    title: string;
    value: string | number;
    unit?: string;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
    onClick?: () => void;
}
export interface ChartCard {
    id: string;
    title: string;
    subtitle?: string;
    chart: React.ReactNode;
    height?: number;
    actions?: React.ReactNode;
}
export interface RecentItem {
    id: string;
    title: string;
    description?: string;
    time?: string;
    avatar?: React.ReactNode;
    onClick?: () => void;
}
export interface QuickAction {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    color?: string;
}
export interface DashboardTemplateProps extends BoxProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    stats?: StatCard[];
    charts?: ChartCard[];
    recentItems?: RecentItem[];
    recentTitle?: string;
    quickActions?: QuickAction[];
    quickActionsTitle?: string;
    loading?: boolean;
    headerContent?: React.ReactNode;
    children?: React.ReactNode;
}
export declare const DashboardTemplate: React.FC<DashboardTemplateProps>;
export default DashboardTemplate;
