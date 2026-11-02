import React from 'react';
import styles from './Card.module.css';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: 'none' | 'amber' | 'cyan' | 'success' | 'warning' | 'error';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  /** 标题（字符串，HTMLAttributes.title 已声明 string 类型） */
  subtitle?: React.ReactNode;
  /** 操作区（不传递给 DOM） */
  action?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      accent = 'none',
      padding = 'md',
      interactive = false,
      title,
      subtitle,
      action,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const accentColors: Record<string, string> = {
      none: 'transparent',
      amber: 'var(--accent-primary)',
      cyan: 'var(--accent-secondary)',
      success: 'var(--success-500)',
      warning: 'var(--warning-500)',
      error: 'var(--error-500)',
    };

    const paddings: Record<string, string> = {
      none: '0',
      sm: 'var(--space-3)',
      md: 'var(--space-4)',
      lg: 'var(--space-5)',
    };

    return (
      <div
        ref={ref}
        className={clsx('redesign-card', interactive && 'redesign-card-interactive', className)}
        style={{
          position: 'relative',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: paddings[padding],
          overflow: 'hidden',
          transition:
            'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
          cursor: interactive ? 'pointer' : 'default',
          ...style,
        }}
        data-accent={accent}
        {...rest}
      >
        {accent !== 'none' && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              backgroundColor: accentColors[accent],
              opacity: 0.9,
            }}
            aria-hidden='true'
          />
        )}
        {(title || subtitle || action) && (
          <div className={styles.il1}>
            <div className={styles.il2}>
              {title && <div className={styles.il3}>{title}</div>}
              {subtitle && <div className={styles.il4}>{subtitle}</div>}
            </div>
            {action && <div className={styles.il5}>{action}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'RedesignCard';
