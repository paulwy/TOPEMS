import React from "react";
import type { BoxProps } from "@mui/material";
import type { BreadcrumbItem, PageAction } from "./PageHeader";
export interface TabConfig {
    id: string;
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
    badge?: number | string;
    disabled?: boolean;
}
export interface SectionConfig {
    id: string;
    title?: string;
    description?: string;
    content: React.ReactNode;
    collapsible?: boolean;
    defaultExpanded?: boolean;
}
export interface DetailField {
    label: string;
    value: React.ReactNode;
    span?: number;
    copyable?: boolean;
}
export interface DetailPageTemplateProps extends BoxProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    loading?: boolean;
    error?: string;
    backHref?: string;
    onBack?: () => void;
    actions?: PageAction[];
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    onPrint?: () => void;
    onDownload?: () => void;
    tabs?: TabConfig[];
    defaultTab?: string;
    sections?: SectionConfig[];
    sidebar?: React.ReactNode;
    sidebarWidth?: number;
    infoCard?: {
        avatar?: React.ReactNode;
        title?: string;
        subtitle?: string;
        tags?: string[];
        stats?: Array<{
            label: string;
            value: string | number;
        }>;
    };
    headerContent?: React.ReactNode;
    children?: React.ReactNode;
}
export declare const DetailPageTemplate: React.FC<DetailPageTemplateProps>;
export default DetailPageTemplate;
