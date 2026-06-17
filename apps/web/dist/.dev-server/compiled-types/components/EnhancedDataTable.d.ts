import React from "react";
import type { ColumnDef, RowData } from "@tanstack/react-table";
export interface EnhancedDataTableProps<TData extends RowData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    loading?: boolean;
    onRowClick?: (_row: TData) => void;
    exportFileName?: string;
    enablePagination?: boolean;
    pageCount?: number;
    totalPages?: number;
    totalItems?: number;
    pageSize?: number;
    onPageChange?: (_page: number) => void;
    onPageSizeChange?: (_size: number) => void;
    currentPage?: number;
    responsive?: boolean;
    onRefresh?: () => void;
    enableSelection?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (_ids: string[]) => void;
    selectionKey?: keyof TData;
    enableAdvancedFilter?: boolean;
    advancedFilters?: {
        label: string;
        key: string;
        type: "text" | "select" | "date" | "number";
        options?: {
            value: string;
            label: string;
        }[];
        value?: string;
        onChange?: (_value: string) => void;
    }[];
    emptyState?: React.ReactNode;
    striped?: boolean;
    compact?: boolean;
}
export declare function EnhancedDataTable<TData extends RowData, TValue>({ columns, data, searchKey, searchPlaceholder, loading, onRowClick, exportFileName, enablePagination, pageCount, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, currentPage, responsive, onRefresh, enableSelection, selectedIds, onSelectionChange, selectionKey, enableAdvancedFilter, advancedFilters, emptyState, striped, compact, }: EnhancedDataTableProps<TData, TValue>): React.JSX.Element;
