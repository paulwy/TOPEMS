import React, { useState } from 'react';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: 'default' | 'pills';
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActive,
  onChange,
  variant = 'default',
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id);
  const activeTab = controlledActive ?? internalActive;

  const handleClick = (id: string) => {
    if (controlledActive === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
  };

  return (
    <div
      className={clsx('redesign-tabs', className)}
      role='tablist'
      style={{
        display: 'flex',
        gap: variant === 'pills' ? 'var(--space-1)' : 'var(--space-4)',
        borderBottom: variant === 'pills' ? 'none' : '1px solid var(--border-default)',
        ...style,
      }}
      {...rest}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type='button'
            role='tab'
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => handleClick(tab.id)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: '36px',
              padding: variant === 'pills' ? '0 var(--space-3)' : '0 var(--space-1)',
              fontFamily: 'var(--font-ui)',
              fontSize: variant === 'pills' ? 'var(--text-xs)' : 'var(--text-sm)',
              fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-medium)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: variant === 'pills' ? 'uppercase' : 'none',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: variant === 'pills' && isActive ? 'var(--surface-3)' : 'transparent',
              border: 'none',
              borderRadius: variant === 'pills' ? 'var(--radius-sm)' : '0',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              opacity: tab.disabled ? 0.5 : 1,
              transition:
                'color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out)',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 'var(--font-bold)',
                  color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--surface-3)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {tab.badge}
              </span>
            )}
            {variant === 'default' && isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--accent-primary)',
                  animation: 'tab-underline var(--duration-base) var(--ease-out) forwards',
                }}
                aria-hidden='true'
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
