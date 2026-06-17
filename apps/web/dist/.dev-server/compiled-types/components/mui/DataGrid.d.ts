import React from "react";
export interface DataGridColumn<T = any> {
    id: string;
    label: string;
    width?: number | string;
    minWidth?: number;
    align?: "left" | "center" | "right";
    sortable?: boolean;
    render?: (row: T, index: number) => React.ReactNode;
    renderHeader?: (column: DataGridColumn<T>, props: {
        sortDirection?: "asc" | "desc";
        sorted: boolean;
        onSort: () => void;
    }) => React.ReactNode;
}
export interface DataGridAction<T = any> {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    color?: "primary" | "secondary" | "error" | "warning" | "success" | "info" | "default";
    disabled?: (row: T) => boolean;
    divider?: boolean;
    show?: (row: T) => boolean;
}
export interface DataGridBulkAction<T = any> {
    label: string;
    icon?: React.ReactNode;
    onClick: (rows: T[]) => void;
    color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
}
export interface DataGridProps<T = any> {
    columns: DataGridColumn<T>[];
    data: T[];
    rowKey?: keyof T | ((row: T) => string | number);
    loading?: boolean;
    skeletonRows?: number;
    selectable?: boolean;
    actions?: DataGridAction<T>[];
    onRowClick?: (row: T) => void;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
        onPageSizeChange: (pageSize: number) => void;
    };
    sortable?: boolean;
    defaultSortBy?: string;
    defaultSortDirection?: "asc" | "desc";
    onSort?: (sortBy: string, sortDirection: "asc" | "desc") => void;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    bulkActions?: DataGridBulkAction<T>[];
    density?: "compact" | "standard" | "comfortable";
    stickyHeader?: boolean;
    maxHeight?: number | string;
    selected?: (string | number)[];
    onSelectionChange?: (selected: (string | number)[]) => void;
}
export declare function DataGrid<T extends Record<string, any>>({ columns, data, rowKey, loading, skeletonRows, selectable, actions, onRowClick, pagination, sortable, defaultSortBy, defaultSortDirection, onSort, emptyMessage, emptyIcon, bulkActions, density, stickyHeader, maxHeight, selected, onSelectionChange, }: DataGridProps<T>): React.JSX.Element;
export default DataGrid;
