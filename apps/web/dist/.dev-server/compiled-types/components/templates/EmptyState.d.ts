import React from "react";
import type { BoxProps } from "@mui/material";
/**
 * 空状态类型
 */
export type EmptyStateType = "default" | "no-data" | "no-results" | "search-empty" | "filter-empty" | "folder-empty" | "database-empty" | "error" | "custom";
/**
 * 空状态操作按钮接口
 */
export interface EmptyStateAction {
    /** 按钮文本 */
    label: string;
    /** 点击回调 */
    onClick?: () => void;
    /** 按钮变体 */
    variant?: "contained" | "outlined" | "text";
    /** 按钮颜色 */
    color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
    /** 图标 */
    icon?: React.ReactNode;
    /** 是否禁用 */
    disabled?: boolean;
}
/**
 * 空状态组件属性
 */
export interface EmptyStateProps extends Omit<BoxProps, "children"> {
    /** 空状态类型 */
    type?: EmptyStateType;
    /** 主标题 */
    title?: string;
    /** 描述文本 */
    description?: string;
    /** 自定义图标 */
    icon?: React.ReactNode;
    /** 操作按钮列表 */
    actions?: EmptyStateAction[];
    /** 自定义内容（当type为custom时使用） */
    children?: React.ReactNode;
    /** 图标尺寸 */
    iconSize?: number;
    /** 是否居中显示 */
    centered?: boolean;
}
/**
 * 空状态组件
 * 用于显示列表、搜索、筛选等场景的空状态提示
 *
 * @example
 * ```tsx
 * // 默认空状态
 * <EmptyState />
 *
 * // 搜索结果为空
 * <EmptyState type="search-empty" title="没有找到用户" />
 *
 * // 带操作按钮
 * <EmptyState
 *   type="no-data"
 *   description="还没有创建任何项目"
 *   actions={[
 *     { label: "创建项目", onClick: handleCreate, variant: "contained" },
 *   ]}
 * />
 *
 * // 自定义图标和内容
 * <EmptyState type="custom" icon={<MyIcon />}>
 *   <div>自定义内容</div>
 * </EmptyState>
 * ```
 */
export declare const EmptyState: React.FC<EmptyStateProps>;
/**
 * 无数据空状态
 */
export declare const NoDataEmptyState: React.FC<Omit<EmptyStateProps, "type">>;
/**
 * 搜索结果为空
 */
export declare const SearchEmptyState: React.FC<Omit<EmptyStateProps, "type">>;
/**
 * 筛选结果为空
 */
export declare const FilterEmptyState: React.FC<Omit<EmptyStateProps, "type">>;
/**
 * 文件夹为空
 */
export declare const FolderEmptyState: React.FC<Omit<EmptyStateProps, "type">>;
/**
 * 错误状态
 */
export declare const ErrorEmptyState: React.FC<Omit<EmptyStateProps, "type">>;
export default EmptyState;
