import React, { useState } from 'react';
import clsx from 'clsx';
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
  emptyTitle = '暂无数据',
  emptyDescription = '当前列表为空',
  emptyAction,
  onRowClick,
  sort,
  onSort,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}: DataTableProps<T>) {
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
      className={clsx('redesign-data-table', className)}
      style={{
        width: '100%',
        overflow: 'auto',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--surface-1)',
        ...style,
      }}
      {...rest}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--surface-2)' }}>
            {selectable && (
              <th
                style={{
                  ...cellPadding,
                  width: '48px',
                  borderBottom: '1px solid var(--border-default)',
                }}
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
                  style={{ cursor: 'pointer' }}
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
                >
                  {column.header}
                  {column.sortable && (
                    <span style={{ display: 'inline-flex', color: 'var(--text-tertiary)' }}>
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
                    <td style={{ ...cellPadding, borderBottom: '1px solid var(--border-default)' }}>
                      <div
                        className='skeleton'
                        style={{ width: '16px', height: '16px' }}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        ...cellPadding,
                        borderBottom: '1px solid var(--border-default)',
                        ...alignStyle(column.align),
                      }}
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
                        style={{ ...cellPadding, borderBottom: '1px solid var(--border-default)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type='checkbox'
                          aria-label={`Select row ${id}`}
                          checked={isSelected}
                          onChange={() => handleSelect(id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={{
                          ...cellPadding,
                          borderBottom: '1px solid var(--border-default)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--text-primary)',
                          ...alignStyle(column.align),
                        }}
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
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
    </div>
  );
}
