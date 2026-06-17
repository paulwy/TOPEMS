import React from "react";
type IconComponent = React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
}>;
interface QuickAction {
    label: string;
    icon: IconComponent;
    path: string;
    color: string;
    bgColor: string;
    hoverColor: string;
    service?: string | null;
}
interface DashboardQuickActionsProps {
    quickActions: QuickAction[];
    serviceStatuses: Record<string, boolean>;
    onQuickAccess: (path: string) => void;
}
export declare const DashboardQuickActions: React.FC<DashboardQuickActionsProps>;
export declare const defaultQuickActions: QuickAction[];
export {};
