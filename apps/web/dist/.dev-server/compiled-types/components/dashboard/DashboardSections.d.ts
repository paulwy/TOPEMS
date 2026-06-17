import React from "react";
export interface DashboardSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    collapsible?: boolean;
    headerRight?: React.ReactNode;
    sx?: object;
}
export declare const DashboardSection: React.FC<DashboardSectionProps>;
export interface TodayOverviewSectionProps {
    children: React.ReactNode;
}
export declare const TodayOverviewSection: React.FC<TodayOverviewSectionProps>;
export interface QuickAccessSectionProps {
    children: React.ReactNode;
    defaultExpanded?: boolean;
}
export declare const QuickAccessSection: React.FC<QuickAccessSectionProps>;
export interface TodoListSectionProps {
    children: React.ReactNode;
}
export declare const TodoListSection: React.FC<TodoListSectionProps>;
export interface ModuleNavigationSectionProps {
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
}
export declare const ModuleNavigationSection: React.FC<ModuleNavigationSectionProps>;
export interface ServiceMonitorSectionProps {
    children: React.ReactNode;
    collapsible?: boolean;
    defaultExpanded?: boolean;
}
export declare const ServiceMonitorSection: React.FC<ServiceMonitorSectionProps>;
export interface RecentActivitySectionProps {
    children: React.ReactNode;
    headerRight?: React.ReactNode;
    defaultExpanded?: boolean;
}
export declare const RecentActivitySection: React.FC<RecentActivitySectionProps>;
