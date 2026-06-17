import React from "react";
export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React.ReactNode;
}
export interface PageHeaderAction {
    /** 按钮标签 */
    label: string;
    /** 按钮图标 */
    icon?: React.ReactNode;
    /** 点击回调 */
    onClick?: () => void;
    /** 跳转链接 */
    href?: string;
    /** 按钮变体 */
    variant?: "contained" | "outlined" | "text";
    /** 按钮颜色 */
    color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否加载中 */
    loading?: boolean;
    /** 提示文字 */
    tooltip?: string;
}
export interface PageHeaderProps {
    /** 页面标题 */
    title: string;
    /** 副标题 */
    subtitle?: string;
    /** 面包屑导航 */
    breadcrumbs?: BreadcrumbItem[];
    /**
     * 自定义图标（仅用于展示，兼容旧 API）
     * @deprecated 该字段当前未在头部渲染，如需图标请使用 actions 中的按钮
     */
    icon?: React.ReactNode;
    /** 返回按钮配置 */
    backButton?: {
        href?: string;
        onClick?: () => void;
        tooltip?: string;
    };
    /**
     * 是否显示返回按钮（兼容旧 API，等价于 backButton）
     * @deprecated 请使用 backButton
     */
    showBack?: boolean;
    /**
     * 返回按钮点击回调（兼容旧 API，等价于 backButton.onClick）
     * @deprecated 请使用 backButton.onClick
     */
    onBack?: () => void;
    /** 搜索框配置 */
    searchBox?: {
        value?: string;
        onChange?: (value: string) => void;
        onSearch?: (value: string) => void;
        placeholder?: string;
    };
    /** 新建按钮配置 */
    createButton?: {
        label?: string;
        onClick?: () => void;
        href?: string;
        disabled?: boolean;
    };
    /** 操作按钮列表（支持配置对象数组或自定义 JSX） */
    actions?: PageHeaderAction[] | React.ReactNode;
    /** 帮助内容 */
    helpContent?: React.ReactNode;
    /** 帮助标题 */
    helpTitle?: string;
    /** 自定义右侧内容 */
    rightContent?: React.ReactNode;
    /** 是否显示加载状态 */
    loading?: boolean;
    /** 自定义样式 */
    sx?: object;
}
export declare const PageHeader: React.FC<PageHeaderProps>;
export default PageHeader;
