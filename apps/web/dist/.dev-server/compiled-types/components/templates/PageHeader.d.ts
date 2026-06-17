import React from "react";
export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React.ReactNode;
}
export interface PageAction {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    variant?: "contained" | "outlined" | "text";
    color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
    disabled?: boolean;
    loading?: boolean;
    tooltip?: string;
    size?: "small" | "medium" | "large";
}
export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: PageAction[];
    backButton?: {
        href?: string;
        onClick?: () => void;
        visible?: boolean;
    };
    onRefresh?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
    pageIcon?: React.ReactNode;
    pageColor?: string;
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        size?: "small" | "medium";
    };
    stats?: {
        label: string;
        value: string | number;
        color?: string;
        icon?: React.ReactElement;
    }[];
    tabs?: {
        label: string;
        value: string;
        active?: boolean;
        disabled?: boolean;
    }[];
    onTabChange?: (value: string) => void;
    badge?: {
        label: string;
        color?: "primary" | "secondary" | "success" | "error" | "warning";
        variant?: "standard" | "dot";
    };
    maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
    compact?: boolean;
    showDivider?: boolean;
    customToolbar?: React.ReactNode;
}
export declare const PageHeader: React.FC<PageHeaderProps>;
export default PageHeader;
