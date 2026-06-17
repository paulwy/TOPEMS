import React from "react";
export interface Action {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    variant?: "contained" | "outlined" | "text";
    color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
    disabled?: boolean;
    loading?: boolean;
    tooltip?: string;
    dividerBefore?: boolean;
}
export interface ActionBarProps {
    primaryAction?: Action;
    secondaryActions?: Action[];
    moreActions?: Action[];
    title?: string;
    subtitle?: string;
    loading?: boolean;
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
    density?: "compact" | "standard";
}
export declare const ActionBar: React.FC<ActionBarProps>;
export interface QuickActionBarProps {
    actions: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick?: () => void;
        color?: string;
    }>;
    loading?: boolean;
}
export declare const QuickActionBar: React.FC<QuickActionBarProps>;
export default ActionBar;
