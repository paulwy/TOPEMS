import React from 'react';
import clsx from 'clsx';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'amber' | 'cyan' | 'success' | 'warning' | 'error';
  onRemove?: () => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  (
    { children, variant = 'default', onRemove, className, style, action: _action, ...rest },
    ref
  ) => {
    const styles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: 'var(--surface-3)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--border-default)',
      },
      amber: {
        backgroundColor: 'color-mix(in srgb, var(--amber-500) 8%, transparent)',
        color: 'var(--amber-400)',
        borderColor: 'color-mix(in srgb, var(--amber-500) 25%, transparent)',
      },
      cyan: {
        backgroundColor: 'color-mix(in srgb, var(--cyan-500) 8%, transparent)',
        color: 'var(--cyan-400)',
        borderColor: 'color-mix(in srgb, var(--cyan-500) 25%, transparent)',
      },
      success: {
        backgroundColor: 'color-mix(in srgb, var(--success-500) 8%, transparent)',
        color: 'var(--success-500)',
        borderColor: 'color-mix(in srgb, var(--success-500) 25%, transparent)',
      },
      warning: {
        backgroundColor: 'color-mix(in srgb, var(--warning-500) 8%, transparent)',
        color: 'var(--warning-500)',
        borderColor: 'color-mix(in srgb, var(--warning-500) 25%, transparent)',
      },
      error: {
        backgroundColor: 'color-mix(in srgb, var(--error-500) 8%, transparent)',
        color: 'var(--error-500)',
        borderColor: 'color-mix(in srgb, var(--error-500) 25%, transparent)',
      },
    };

    return (
      <span
        ref={ref}
        className={clsx('redesign-tag', className)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          height: '24px',
          padding: '0 var(--space-2)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-medium)',
          letterSpacing: 'var(--tracking-wide)',
          border: '1px solid',
          borderRadius: 'var(--radius-none)',
          ...styles[variant],
          ...style,
        }}
        {...rest}
      >
        {children}
        {onRemove && (
          <button
            type='button'
            onClick={onRemove}
            aria-label='Remove tag'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '14px',
              height: '14px',
              marginLeft: '2px',
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'currentColor',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = 'RedesignTag';
