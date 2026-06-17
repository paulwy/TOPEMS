import React from "react";
export type ModuleStatus = "online" | "beta" | "plan" | "new";
interface StatusBadgeProps {
    status: ModuleStatus;
    mobile?: boolean;
    isDarkMode?: boolean;
}
export declare const StatusBadge: React.FC<StatusBadgeProps>;
export {};
