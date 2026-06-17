import type { ColumnDef, SortingState, ColumnFiltersState, PaginationState, VisibilityState, RowData } from "@tanstack/react-table";
export interface UseDataTableOptions<TData extends RowData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialPageIndex?: number;
    initialPageSize?: number;
    enablePagination?: boolean;
}
export interface UseDataTableResult<TData extends RowData, TValue> {
    sorting: SortingState;
    setSorting: (sorting: SortingState) => void;
    columnFilters: ColumnFiltersState;
    setColumnFilters: (filters: ColumnFiltersState) => void;
    pagination: PaginationState;
    setPagination: (pagination: PaginationState) => void;
    columnVisibility: VisibilityState;
    setColumnVisibility: (visibility: VisibilityState) => void;
    tableOptions: any;
}
export declare function useDataTable<TData extends RowData>({ columns, data, initialPageIndex, initialPageSize, enablePagination, }: UseDataTableOptions<TData, any>): UseDataTableResult<TData, any>;
export interface ExportOptions {
    fileName?: string;
}
export declare function useExportData<TData extends RowData, TValue>(columns: ColumnDef<TData, TValue>[]): {
    exportToCSV: (data: TData[], fileName?: string) => {
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: unknown;
    };
    exportToExcel: (data: TData[], fileName?: string) => {
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: unknown;
    };
};
