import React from 'react';
import clsx from 'clsx';
import { Search, Inbox, FileQuestion, type LucideIcon } from 'lucide-react';
import { Button } from '../primitives';

export type EmptyStateVariant = 'default' | 'search' | 'data';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
}

const defaultIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: Inbox,
  search: Search,
  data: FileQuestion,
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      variant = 'default',
      icon: IconProp,
      title,
      description,
      action,
      className,
      style,
      children,
      ...rest
    },
    ref
  ) => {
    const Icon = IconProp ?? defaultIcons[variant];
    const defaultTitles: Record<EmptyStateVariant, string> = {
      default: '暂无数据',
      search: '未找到结果',
      data: '没有相关记录',
    };

    return (
      <div
        ref={ref}
        className={clsx('redesign-empty-state', className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
          ...style,
        }}
        {...rest}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 'var(--space-4)',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <Icon
            size={32}
            strokeWidth={1.5}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxWidth: '320px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-brand)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
            }}
          >
            {title ?? defaultTitles[variant]}
          </h3>
          {description && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{description}</p>
          )}
          {children}
        </div>
        {action && (
          <Button
            variant='primary'
            leftIcon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'RedesignEmptyState';
