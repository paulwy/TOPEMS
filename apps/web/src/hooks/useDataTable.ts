import { useState, useCallback, useMemo } from 'react';
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
  RowData,
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

interface UseDataTableResult {
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

export interface ExportOptions {
  fileName?: string;
}
