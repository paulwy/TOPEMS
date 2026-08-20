import { useState, useCallback, useMemo } from 'react';
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
  RowData,
} from '@tanstack/react-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';

interface UseDataTableOptions<TData extends RowData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialPageIndex?: number;
  initialPageSize?: number;
  enablePagination?: boolean;
}

interface UseDataTableResult<TData extends RowData, TValue> {
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: (visibility: VisibilityState) => void;
  tableOptions: {
    getCoreRowModel: typeof getCoreRowModel;
    getSortedRowModel: typeof getSortedRowModel;
    getFilteredRowModel: typeof getFilteredRowModel;
    getPaginationRowModel: typeof getPaginationRowModel;
    onSortingChange: (sorting: SortingState) => void;
    onColumnFiltersChange: (filters: ColumnFiltersState) => void;
    onPaginationChange: (pagination: PaginationState) => void;
    onColumnVisibilityChange: (visibility: VisibilityState) => void;
    state: {
      sorting: SortingState;
      columnFilters: ColumnFiltersState;
      pagination: PaginationState;
      columnVisibility: VisibilityState;
    };
  };
}

export function useDataTable<TData extends RowData, TValue = unknown>({
  columns,
  data,
  initialPageIndex = 0,
  initialPageSize = 10,
  enablePagination = true,
}: UseDataTableOptions<TData, TValue>): UseDataTableResult<TData, TValue> {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const tableOptions = useMemo(
    () => ({
      getCoreRowModel,
      getSortedRowModel,
      getFilteredRowModel,
      getPaginationRowModel,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onPaginationChange: setPagination,
      onColumnVisibilityChange: setColumnVisibility,
      state: {
        sorting,
        columnFilters,
        pagination,
        columnVisibility,
      },
    }),
    [sorting, columnFilters, pagination, columnVisibility]
  );

  return {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    columnVisibility,
    setColumnVisibility,
    tableOptions,
  };
}

export interface ExportOptions {
  fileName?: string;
}

export function useExportData<TData extends RowData, TValue>(columns: ColumnDef<TData, TValue>[]) {
  const exportToCSV = useCallback(
    (data: TData[], fileName: string = 'export') => {
      try {
        const headers = columns.map((col) => (col.header as string) || col.id);

        const csvData = [
          headers.join(','),
          ...data.map((row) =>
            columns
              .map((col) => {
                const value = row[col.id as keyof TData];
                if (typeof value === 'string') {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value ?? '');
              })
              .join(',')
          ),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvData}`], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true };
      } catch (error: unknown) {
        return { success: false, error };
      }
    },
    [columns]
  );

  const exportToExcel = useCallback(
    (data: TData[], fileName: string = 'export') => {
      try {
        const headers = columns.map((col) => (col.header as string) || col.id);

        const rows = data.map((row) =>
          columns.map((col) => {
            const value = row[col.id as keyof TData];
            return typeof value === 'string' ? value : JSON.stringify(value);
          })
        );

        const worksheetData = [headers, ...rows];
        const csvContent = worksheetData.map((row) => row.join('\t')).join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], {
          type: 'application/vnd.ms-excel;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true };
      } catch (error: unknown) {
        return { success: false, error };
      }
    },
    [columns]
  );

  return {
    exportToCSV,
    exportToExcel,
  };
}
