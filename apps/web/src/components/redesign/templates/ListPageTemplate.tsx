import React from 'react';
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
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}: ListPageTemplateProps<T>) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        ...style,
      }}
      {...rest}
    >
      <PageHeader {...header} />

      {error && (
        <div
          style={{
            padding: 'var(--space-4)',
            color: 'var(--error-500)',
            backgroundColor: 'color-mix(in srgb, var(--error-500) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--error-500) 30%, transparent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {error}
        </div>
      )}

      {toolbar && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          {toolbar}
        </div>
      )}

      {data.length === 0 && !loading && !error ? (
        <EmptyState
          variant='data'
          title={emptyTitle ?? '暂无数据'}
          description={emptyDescription ?? '当前列表为空'}
          action={emptyAction}
        />
      ) : (
        <DataTable<T>
          columns={columns}
          data={data}
          rowKey={rowKey}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          {...tableProps}
        />
      )}

      {footer}
    </div>
  );
}
