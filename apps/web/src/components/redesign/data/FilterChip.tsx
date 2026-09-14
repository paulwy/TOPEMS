import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface FilterChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  onRemove?: () => void;
  active?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  onRemove,
  active = false,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  return (
    <span
      className={clsx('redesign-filter-chip', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: '28px',
        padding: '0 var(--space-3)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-semibold)',
        letterSpacing: 'var(--tracking-wide)',
        color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
        backgroundColor: active ? 'var(--accent-primary)' : 'var(--surface-2)',
        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: onRemove ? 'pointer' : 'default',
        userSelect: 'none',
        transition:
          'background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      {label}
      {onRemove && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label} filter`}
          style={{
            display: 'inline-flex',
            padding: '2px',
            marginRight: 'calc(var(--space-1) * -1)',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};
