import React from 'react';
import cx from 'clsx';
import css from './Badge.module.css';
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
        // bg 保持更透明（贴近底色）以提升 info 文字对比度（WCAG 1.4.3）
        backgroundColor: 'color-mix(in srgb, var(--info-500) 8%, transparent)',
        color: 'var(--info-500)',
      },
    };

    return (
      <span
        ref={ref}
        className={cx(clsx('redesign-badge', className), css.il1)}
        {...rest}
      >
        {dot && (
          <span
            className={cx(pulse ? 'animate-pulse-dot' : '', css.il2)}
            aria-hidden='true'
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'RedesignBadge';
