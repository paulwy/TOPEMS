import React from 'react';
import css from './Tag.module.css';
import { clsx as cx, clsx } from 'clsx';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'amber' | 'cyan' | 'success' | 'warning' | 'error';
  onRemove?: () => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ children, onRemove, className, action: _action, ...rest }, ref) => {
    const _styles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: 'var(--surface-3)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--border-default)',
      },
      amber: {
        backgroundColor: 'color-mix(in srgb, var(--amber-500) 8%, transparent)',
        color: 'var(--accent-primary-text)',
        borderColor: 'color-mix(in srgb, var(--amber-500) 25%, transparent)',
      },
      cyan: {
        backgroundColor: 'color-mix(in srgb, var(--cyan-500) 8%, transparent)',
        color: 'var(--accent-secondary-text)',
        borderColor: 'color-mix(in srgb, var(--cyan-500) 25%, transparent)',
      },
      success: {
        backgroundColor: 'color-mix(in srgb, var(--success-500) 8%, transparent)',
        color: 'var(--success-text)',
        borderColor: 'color-mix(in srgb, var(--success-500) 25%, transparent)',
      },
      warning: {
        backgroundColor: 'color-mix(in srgb, var(--warning-500) 8%, transparent)',
        color: 'var(--warning-text)',
        borderColor: 'color-mix(in srgb, var(--warning-500) 25%, transparent)',
      },
      error: {
        backgroundColor: 'color-mix(in srgb, var(--error-500) 8%, transparent)',
        color: 'var(--error-text)',
        borderColor: 'color-mix(in srgb, var(--error-500) 25%, transparent)',
      },
    };

    return (
      <span
        ref={ref}
        className={cx(clsx('redesign-tag', className), css.il1)}
        {...rest}
      >
        {children}
        {onRemove && (
          <button
            type='button'
            onClick={onRemove}
            aria-label='Remove tag'
            className={css.il2}
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = 'RedesignTag';
