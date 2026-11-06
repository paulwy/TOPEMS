import React from 'react';
import cx from 'clsx';
import styles from './ListPageTemplate.module.css';
import { useTranslation } from 'react-i18next';
import { PageHeader, type PageHeaderProps } from '../layout';
import { DataTable, type DataTableProps, type DataTableColumn } from '../data';
import { EmptyState } from '../feedback';
import { useOptionalPermission } from '@/hooks/useOptionalPermission';

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
  /**
   * 写操作权限码（批 12）：提供时按 checkPermission 判定，
   * 无权限则隐藏所有 writeOnly 列（操作列），未提供时不过滤（默认行为不变）。
   */
  writePermission?: string;
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

  action: _action, // 显式排除 action，避免传递给非 form 元素
  writePermission,
  ...rest
}: ListPageTemplateProps<T>) {
  const { t } = useTranslation();
  // 批 14：改用无 AuthProvider 依赖的判定（无权限信息时放行），避免模板级 hook 把
  // 所有使用 ListPageTemplate 的页面测试打成必须挂 Provider。
  const { checkPermission } = { checkPermission: useOptionalPermission() };
  // 批 12：写操作列按权限收敛。writePermission 未提供 → canWrite 恒 true → 不过滤，
  // 保证存量页面零回归。
  const canWrite = !writePermission || checkPermission(writePermission);
  const visibleColumns = canWrite ? columns : columns.filter((c) => !c.writeOnly);
  return (
    <div
      className={cx(className, styles.il1)}
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

      {toolbar && <div className={styles.il2}>{toolbar}</div>}

      {data.length === 0 && !loading && !error ? (
        <EmptyState
          variant='data'
          title={emptyTitle ?? t('components.data_table.empty_title')}
          description={emptyDescription ?? t('components.data_table.empty_description')}
          action={emptyAction}
        />
      ) : (
        <DataTable<T>
          columns={visibleColumns}
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
