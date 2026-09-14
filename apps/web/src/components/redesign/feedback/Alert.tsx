import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      children,
      variant = 'info',
      title,
      dismissible = false,
      onDismiss,
      className,
      style,
      action: _action, // 显式排除 action，避免传递给非 form 元素
      ...rest
    },
    ref
  ) => {
    const icons: Record<
      AlertVariant,
      React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>
    > = {
      info: Info,
      success: CheckCircle2,
      warning: AlertTriangle,
      error: XCircle,
    };

    const colors: Record<AlertVariant, { border: string; bg: string; icon: string }> = {
      info: {
        border: 'color-mix(in srgb, var(--info-500) 30%, transparent)',
        bg: 'color-mix(in srgb, var(--info-500) 8%, transparent)',
        icon: 'var(--info-500)',
      },
      success: {
        border: 'color-mix(in srgb, var(--success-500) 30%, transparent)',
        bg: 'color-mix(in srgb, var(--success-500) 8%, transparent)',
        icon: 'var(--success-500)',
      },
      warning: {
        border: 'color-mix(in srgb, var(--warning-500) 30%, transparent)',
        bg: 'color-mix(in srgb, var(--warning-500) 8%, transparent)',
        icon: 'var(--warning-500)',
      },
      error: {
        border: 'color-mix(in srgb, var(--error-500) 30%, transparent)',
        bg: 'color-mix(in srgb, var(--error-500) 8%, transparent)',
        icon: 'var(--error-500)',
      },
    };

    const Icon = icons[variant];
    const theme = colors[variant];

    return (
      <div
        ref={ref}
        role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
        className={clsx('redesign-alert', className)}
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 'var(--radius-sm)',
          ...style,
        }}
        {...rest}
      >
        <Icon
          size={20}
          color={theme.icon}
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {title && (
            <span
              style={{
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}>{children}</span>
        </div>
        {dismissible && (
          <button
            type='button'
            onClick={onDismiss}
            aria-label='Dismiss alert'
            style={{
              flexShrink: 0,
              padding: 'var(--space-1)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'RedesignAlert';
