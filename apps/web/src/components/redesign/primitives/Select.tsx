import React, { useId } from 'react';
import styles from './Select.module.css';
import { clsx as cx, clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  /** 显式指定 testid；缺省时按 label 生成（select-{label}） */
  'data-testid'?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      className,

      'aria-label': ariaLabel,
      'data-testid': dataTestId,
      ...rest
    },
    ref
  ) => {
    const selectId = useId();
    // 2026-10-17 D4 遗留：通用 Select 补 testid——父级显式传入优先，否则按 label
    // 生成唯一 id（多实例可用 label 区分；中文 label 保留，空格/符号归一为 '-'）
    const resolvedTestId =
      dataTestId ??
      (label
        ? `select-${label.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')}`
        : undefined);
    return (
      <div className={cx(clsx('redesign-select-wrapper', className), styles.il1)}>
        {label && (
          <label
            htmlFor={selectId}
            className={styles.il2}
          >
            {label}
          </label>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            padding: '0 var(--space-3)',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            transition:
              'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
          }}
          data-error={!!error}
        >
          <select
            ref={ref}
            id={selectId}
            aria-label={ariaLabel ?? label ?? placeholder ?? undefined}
            data-testid={resolvedTestId}
            className={styles.il3}
            {...rest}
          >
            {placeholder && (
              <option
                value=''
                disabled
              >
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <svg
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
            className={styles.il4}
          >
            <path
              d='M2.5 4.5L6 8L9.5 4.5'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>
        {error && <span className={styles.il5}>{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'RedesignSelect';
