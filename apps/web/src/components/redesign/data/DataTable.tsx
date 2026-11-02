import React, { useState } from 'react';
import cx from 'clsx';
import styles from './DataTable.module.css';
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
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyTitle = emptyTitle ?? t('components.data_table.empty_title');
  const resolvedEmptyDescription = emptyDescription ?? t('components.data_table.empty_description');
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const currentSelected = selectedKeys ?? internalSelected;

  const getRowId = (row: T) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey as keyof T]);
  };

  const handleSelect = (id: string) => {
    const next = currentSelected.includes(id)
      ? currentSelected.filter((k) => k !== id)
      : [...currentSelected, id];
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelected(next);
    }
  };

  const handleSelectAll = () => {
    const allIds = data.map(getRowId);
    const next = currentSelected.length === allIds.length ? [] : allIds;
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelected(next);
    }
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    const current = sort?.key === column.key ? sort.direction : null;
    const nextDirection = current === 'asc' ? 'desc' : 'asc';
    onSort(column.key, nextDirection);
  };

  const alignStyle = (align?: DataTableAlign): React.CSSProperties => ({
    textAlign: align ?? 'left',
  });

  const cellPadding = { padding: 'var(--space-3) var(--space-4)' };

  return (
    <div
      className={cx(clsx('redesign-data-table', className), styles.il1)}
      {...rest}
    >
      <table className={styles.il2}>
        <thead>
          <tr className={styles.il3}>
            {selectable && (
              <th
                className={styles.il4}
              >
                <input
                  type='checkbox'
                  aria-label='Select all rows'
                  checked={data.length > 0 && currentSelected.length === data.length}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        currentSelected.length > 0 && currentSelected.length < data.length;
                  }}
                  onChange={handleSelectAll}
                  className={styles.il5}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...cellPadding,
                  width: column.width,
                  borderBottom: '1px solid var(--border-default)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  letterSpacing: 'var(--tracking-wider)',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  ...alignStyle(column.align),
                }}
                onClick={() => handleSort(column)}
              >
                <span
                  className={styles.il6}
                >
                  {column.header}
                  {column.sortable && (
                    <span className={styles.il7}>
                      {sort?.key === column.key ? (
                        sort.direction === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ArrowUpDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {selectable && (
                    <td className={styles.il8}>
                      <div
                        className={cx('skeleton', styles.il9)}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={styles.il10}
                    >
                      <div
                        className='skeleton'
                        style={{ width: `${60 + (i % 3) * 20}%`, height: '16px' }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, index) => {
                const id = getRowId(row);
                const isSelected = currentSelected.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      backgroundColor: isSelected ? 'var(--surface-3)' : undefined,
                      borderLeft: isSelected
                        ? '3px solid var(--accent-primary)'
                        : '3px solid transparent',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color var(--duration-fast) var(--ease-out)',
                    }}
                    className='redesign-data-table-row'
                    data-selected={isSelected}
                  >
                    {selectable && (
                      <td
                        className={styles.il11}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type='checkbox'
                          aria-label={`Select row ${id}`}
                          checked={isSelected}
                          onChange={() => handleSelect(id)}
                          className={styles.il12}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={styles.il13}
                      >
                        {column.render
                          ? column.render(row, index)
                          : String((row[column.key as keyof T] as React.ReactNode) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>

      {!loading && data.length === 0 && (
        <EmptyState
          variant='data'
          title={resolvedEmptyTitle}
          description={resolvedEmptyDescription}
          action={emptyAction}
        />
      )}
    </div>
  );
}
