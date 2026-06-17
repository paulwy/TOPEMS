import React from "react";
import type { LucideIcon } from "lucide-react";
interface ModuleStatsCardProps {
    title: string;
    total: number;
    active: number;
    icon: LucideIcon;
    iconBgColor: string;
    iconColor: string;
}
export declare const ModuleStatsCard: React.FC<ModuleStatsCardProps>;
export {};
