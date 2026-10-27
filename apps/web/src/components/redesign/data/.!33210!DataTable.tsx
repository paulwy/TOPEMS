import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { EmptyState } from '../feedback';

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  width?: string | number;
  align?: DataTableAlign;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  loading?: boolean;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  onRowClick?: (row: T) => void;
  sort?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  sort,
  onSort,
  className,
  style,
