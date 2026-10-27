import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, type PageHeaderProps } from '../layout';
import { DataTable, type DataTableProps, type DataTableColumn } from '../data';
import { EmptyState } from '../feedback';

export interface ListPageTemplateProps<T extends object> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  header: PageHeaderProps;
  toolbar?: React.ReactNode;
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  tableProps?: Omit<DataTableProps<T>, 'columns' | 'data' | 'rowKey'>;
  footer?: React.ReactNode;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export function ListPageTemplate<T extends object>({
  header,
  toolbar,
  columns,
  data,
  rowKey,
  loading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  emptyAction,
  tableProps,
  footer,
  className,
  style,
