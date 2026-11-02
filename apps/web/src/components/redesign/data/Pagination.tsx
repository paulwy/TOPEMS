import React, { useMemo } from 'react';
import styles from './Pagination.module.css';
import { clsx as cx, clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  /** 当前页码（从1开始） */
  current: number;
  /** 总页数 */
  total: number;
  /** 每页显示条数 */
  pageSize?: number;
  /** 总数据量 */
  totalItems?: number;
  /** 页码变化回调 */
  onChange: (page: number) => void;
  /** 是否显示每页条数选择 */
  showSizeChanger?: boolean;
  /** 每页条数选项 */
  pageSizeOptions?: number[];
  /** 每页条数变化回调 */
  onPageSizeChange?: (size: number) => void;
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean;
  /** 是否显示总数 */
  showTotal?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 生成页码数组，包含省略号 */
const getPageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  pages.push(1);

  if (left > 2) {
    pages.push('...');
  }

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < total - 1) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
};

export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize = 10,
  totalItems,
  onChange,
  showSizeChanger = false,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  showQuickJumper = false,
  showTotal = true,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  const pages = useMemo(() => getPageNumbers(current, total), [current, total]);

  const handlePageClick = (page: number) => {
    if (disabled || page < 1 || page > total || page === current) return;
    onChange(page);
  };

  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 32,
    padding: '0 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--surface-1)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all var(--duration-fast) var(--ease-out)',
    userSelect: 'none',
  };

  return (
    <div className={cx(clsx('redesign-pagination', className), styles.il1)}>
      {/* 左侧：总数信息 */}
      {showTotal && totalItems !== undefined && (
        <span className={styles.il2}>
          {t('components.pagination.total', { total: totalItems, current, pageCount: total })}
        </span>
      )}

      {/* 右侧：分页控件 */}
      <div className={styles.il3}>
        {/* 首页 */}
        <button
          data-testid='pagination-first'
          type='button'
          style={buttonBaseStyle}
          disabled={disabled || current === 1}
          onClick={() => handlePageClick(1)}
          aria-label={t('components.pagination.first_page')}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* 上一页 */}
        <button
          data-testid='pagination-prev'
          type='button'
          style={buttonBaseStyle}
          disabled={disabled || current === 1}
          onClick={() => handlePageClick(current - 1)}
          aria-label={t('components.pagination.prev_page')}
        >
          <ChevronLeft size={16} />
        </button>

        {/* 页码 */}
        {pages.map((page, index) =>
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className={styles.il4}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              data-testid={`pagination-page-${page}`}
              type='button'
              style={{
                ...buttonBaseStyle,
                backgroundColor: page === current ? 'var(--accent-primary)' : 'var(--surface-1)',
                color: page === current ? 'var(--text-inverse)' : 'var(--text-primary)',
                borderColor: page === current ? 'var(--accent-primary)' : 'var(--border-default)',
                fontWeight: page === current ? 'var(--font-semibold)' : 'var(--font-regular)',
              }}
              disabled={disabled}
              onClick={() => handlePageClick(page)}
              aria-current={page === current ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* 下一页 */}
        <button
          data-testid='pagination-next'
          type='button'
          style={buttonBaseStyle}
          disabled={disabled || current === total}
          onClick={() => handlePageClick(current + 1)}
          aria-label={t('components.pagination.next_page')}
        >
          <ChevronRight size={16} />
        </button>

        {/* 末页 */}
        <button
          data-testid='pagination-last'
          type='button'
          style={buttonBaseStyle}
          disabled={disabled || current === total}
          onClick={() => handlePageClick(total)}
          aria-label={t('components.pagination.last_page')}
        >
          <ChevronsRight size={16} />
        </button>

        {/* 每页条数选择 */}
        {showSizeChanger && onPageSizeChange && (
          <select
            data-testid='pagination-page-size'
            aria-label={t('components.pagination.page_size')}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            style={{
              height: 32,
              padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-1)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {pageSizeOptions.map((size) => (
              <option
                key={size}
                value={size}
              >
                {t('components.pagination.rows_per_page', { count: size })}
              </option>
            ))}
          </select>
        )}

        {/* 快速跳转 */}
        {showQuickJumper && (
          <div className={styles.il5}>
            <span className={styles.il6}>{t('components.pagination.jump_to')}</span>
            <input
              type='number'
              min={1}
              max={total}
              defaultValue={current}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = Number((e.target as HTMLInputElement).value);
                  if (value >= 1 && value <= total) {
                    handlePageClick(value);
                  }
                }
              }}
              className={styles.il7}
            />
            <span className={styles.il8}>{t('components.pagination.page')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

Pagination.displayName = 'RedesignPagination';
