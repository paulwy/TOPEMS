import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
interface DataTableProps<TData, TValue> {
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
}
export declare function DataTable<TData, TValue>({ columns, data, searchKey, searchPlaceholder, loading, onRowClick, exportFileName, enablePagination, pageCount, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, currentPage, responsive, }: DataTableProps<TData, TValue>): React.JSX.Element;
export {};
