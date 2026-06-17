import React from "react";
import type { BoxProps } from "@mui/material";
import type { FilterConfig } from "../mui/FilterBar";
/**
 * 列定义接口
 * @template T - 数据行类型
 */
export interface ColumnDef<T = any> {
    /** 列唯一标识 */
    id: string;
    /** 列标题 */
    label?: string;
    /** @deprecated 请使用 label 字段 */
    header?: string;
    /** @deprecated 字段已通过 id 标识，无需额外配置 */
    accessor?: string;
    /** 列宽度 */
    width?: number | string;
    /** 最小宽度 */
    minWidth?: number;
    /** 文本对齐方式 */
    align?: "left" | "center" | "right";
    /** 是否可排序 */
    sortable?: boolean;
    /** 自定义单元格渲染 */
    render?: (row: T, index: number) => React.ReactNode;
    /** 自定义表头渲染 */
    renderHeader?: (column: ColumnDef<T>) => React.ReactNode;
    /** 是否可配置显示/隐藏 */
    configurable?: boolean;
}
/**
 * 筛选选项接口
 */
export interface FilterOption {
    /** 显示标签 */
    label: string;
    /** 选项值 */
    value: string | number;
}
export type { FilterConfig } from "../mui/FilterBar";
/**
 * 行操作接口
 * @template T - 数据行类型
 */
export interface RowAction<T = any> {
    /** 操作标签 */
    label: string;
    /** 操作图标 */
    icon?: React.ReactNode;
    /** 点击回调 */
    onClick?: (row: T) => void;
    /** 跳转链接 */
    href?: string;
    /** 按钮颜色 */
    color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
    /** 条件显示 */
    show?: (row: T) => boolean;
    /** 是否显示分隔线 */
    divider?: boolean;
}
/**
 * 展开行渲染属性
 * @template T - 数据行类型
 */
export interface ExpandedRowRenderProps<T = any> {
    /** 当前行数据 */
    row: T;
    /** 行索引 */
    index: number;
}
/**
 * 列配置接口（用于列显示/隐藏配置）
 */
export interface ColumnConfig {
    /** 列ID */
    id: string;
    /** 是否显示 */
    visible: boolean;
}
export interface ListPageTemplateProps<T = any> extends BoxProps {
    title?: string;
    subtitle?: string;
    breadcrumbs?: Array<{
        label: string;
        href?: string;
    }>;
    /** 返回按钮配置 */
    backButton?: {
        href?: string;
        onClick?: () => void;
    };
    columns: ColumnDef<T>[];
    data: T[];
    loading?: boolean;
    error?: string;
    getRowId?: (row: T) => string | number;
    onRowClick?: (row: T) => void;
    selectable?: boolean;
    selectedIds?: (string | number)[];
    onSelectionChange?: (ids: (string | number)[]) => void;
    /** 批量选择配置 */
    selection?: {
        selected?: (string | number)[];
        onChange?: (ids: (string | number)[]) => void;
    };
    sortable?: boolean;
    defaultSortBy?: string;
    defaultSortOrder?: "asc" | "desc";
    onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
        onPageSizeChange?: (pageSize: number) => void;
    };
    searchable?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearch?: (value: string) => void;
    filters?: FilterConfig[];
    /** 受控的筛选值（与 onFilterChange 配合使用） */
    filtersValue?: Record<string, any>;
    onFilterChange?: (filters: Record<string, any>) => void;
    actions?: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick?: () => void;
        variant?: "contained" | "outlined" | "text";
    }>;
    rowActions?: RowAction<T>[];
    /**
     * 自定义行操作渲染函数（与 rowActions 二选一，优先级更高）
     */
    renderRowActions?: (row: T, index: number) => React.ReactNode;
    /**
     * 自定义操作按钮区域（渲染在筛选栏下方、表格上方）
     * @deprecated 推荐使用 headerContent
     */
    customActions?: React.ReactNode;
    onRefresh?: () => void;
    /** 批量操作按钮 */
    batchActions?: Array<{
        label: string;
        icon?: React.ReactNode;
        color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
        onClick?: () => void;
    }>;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    headerContent?: React.ReactNode;
    footerContent?: React.ReactNode;
    /**
     * 行展开配置
     * 设置为 true 启用行展开功能，或传入自定义渲染函数
     */
    expandable?: boolean | ((row: T, index: number) => React.ReactNode);
    /** 默认展开的行ID数组 */
    defaultExpandedIds?: (string | number)[];
    /** 展开状态变化回调 */
    onExpandedChange?: (expandedIds: (string | number)[]) => void;
    /**
     * 列配置功能
     * 设置为 true 显示列配置按钮，允许用户显示/隐藏列
     */
    columnConfigurable?: boolean;
    /** 默认列配置 */
    defaultColumnConfig?: ColumnConfig[];
    /** 列配置变化回调 */
    onColumnConfigChange?: (config: ColumnConfig[]) => void;
}
/**
 * 列表页模板组件
 * 提供完整的列表页面布局，包括搜索、筛选、排序、分页、行操作等功能
 *
 * @example
 * ```tsx
 * <ListPageTemplate
 *   title="用户列表"
 *   columns={[
 *     { id: 'name', label: '姓名', sortable: true },
 *     { id: 'email', label: '邮箱' },
 *   ]}
 *   data={users}
 *   expandable
 *   columnConfigurable
 *   filters={[
 *     { id: 'status', label: '状态', type: 'multiselect', options: statusOptions },
 *   ]}
 * />
 * ```
 */
export declare function ListPageTemplate<T>({ title, subtitle, breadcrumbs, backButton, columns, data, loading, error, getRowId, onRowClick, selectable, selectedIds, onSelectionChange, selection, sortable, defaultSortBy, defaultSortOrder, onSort, pagination, searchable, searchPlaceholder, searchValue, onSearch, filters, onFilterChange, actions, rowActions, onRefresh, batchActions, emptyMessage, emptyIcon, headerContent, footerContent, expandable, defaultExpandedIds, onExpandedChange, columnConfigurable, defaultColumnConfig, onColumnConfigChange, ...props }: ListPageTemplateProps<T>): React.JSX.Element;
export default ListPageTemplate;
