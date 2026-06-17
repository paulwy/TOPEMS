import React from "react";
import type { ModuleStatus } from "./StatusBadge";
type IconComponent = React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
}>;
export interface ModuleItem {
    title: string;
    icon: IconComponent;
    description: string;
    path: string;
    color: string;
    status: ModuleStatus;
    permission?: string | null;
    module?: string | null;
    adminOnly?: boolean;
}
interface ModuleCardProps {
    item: ModuleItem;
    onClick: () => void;
    size?: "large" | "medium" | "small";
}
export declare const ModuleCard: React.FC<ModuleCardProps>;
export {};
