import React from "react";
export interface BreadcrumbItem {
    /** 显示标签 */
    label: string;
    /** 跳转链接 */
    href?: string;
    /** 自定义图标 */
    icon?: React.ReactNode;
    /** 点击回调 */
    onClick?: () => void;
}
export interface PageBreadcrumbProps {
    /** 面包屑项列表 */
    items: BreadcrumbItem[];
    /** 是否显示首页图标 */
    showHome?: boolean;
    /** 首页链接 */
    homeHref?: string;
    /** 首页点击回调 */
    onHomeClick?: () => void;
    /** 自定义分隔符 */
    separator?: React.ReactNode;
    /** 最大显示项数 */
    maxItems?: number;
    /** 自定义样式 */
    sx?: object;
}
export declare const PageBreadcrumb: React.FC<PageBreadcrumbProps>;
export default PageBreadcrumb;
