import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'amber' | 'cyan' | 'success' | 'warning' | 'error' | 'info';
  dot?: boolean;
  pulse?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      dot = false,
      pulse = false,
      className,
      style,
      action: _action,
      ...rest
    },
    ref
  ) => {
    const styles: Record<string, React.CSSProperties> = {
      default: { backgroundColor: 'var(--surface-3)', color: 'var(--text-secondary)' },
      amber: {
        backgroundColor: 'color-mix(in srgb, var(--amber-500) 12%, transparent)',
        color: 'var(--amber-400)',
      },
      cyan: {
        backgroundColor: 'color-mix(in srgb, var(--cyan-500) 12%, transparent)',
        color: 'var(--cyan-400)',
      },
      success: {
        backgroundColor: 'color-mix(in srgb, var(--success-500) 12%, transparent)',
        color: 'var(--success-500)',
      },
      warning: {
        backgroundColor: 'color-mix(in srgb, var(--warning-500) 12%, transparent)',
        color: 'var(--warning-500)',
      },
      error: {
        backgroundColor: 'color-mix(in srgb, var(--error-500) 12%, transparent)',
        color: 'var(--error-500)',
      },
      info: {
        backgroundColor: 'color-mix(in srgb, var(--info-500) 12%, transparent)',
        color: 'var(--info-500)',
      },
    };

    return (
      <span
        ref={ref}
        className={clsx('redesign-badge', className)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          height: '20px',
          padding: '0 var(--space-2)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          borderRadius: 'var(--radius-none)',
          ...styles[variant],
          ...style,
        }}
        {...rest}
      >
        {dot && (
          <span
            className={pulse ? 'animate-pulse-dot' : ''}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
            aria-hidden='true'
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'RedesignBadge';
