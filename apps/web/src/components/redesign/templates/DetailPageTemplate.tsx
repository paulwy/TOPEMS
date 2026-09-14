import React from 'react';
import { PageHeader, type PageHeaderProps } from '../layout';
import { Tabs, type TabItem } from '../primitives';

export interface DetailSection {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

export interface DetailPageTemplateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  header: PageHeaderProps;
  sections?: DetailSection[];
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: string;
  loading?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const DetailPageTemplate: React.FC<DetailPageTemplateProps> = ({
  header,
  sections,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  sidebarWidth = '320px',
  loading = false,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        ...style,
      }}
      {...rest}
    >
      <PageHeader {...header} />

      {sections && sections.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
            gap: 'var(--space-4)',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {sections.map((section, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
                gridColumn: section.fullWidth ? '1 / -1' : undefined,
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-medium)',
                  letterSpacing: 'var(--tracking-wide)',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                {section.label}
              </span>
              {loading ? (
                <div
                  style={{
                    height: '20px',
                    width: '60%',
                    backgroundColor: 'var(--surface-3)',
                    borderRadius: 'var(--radius-sm)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {section.value}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
          }}
        >
          {tabs && tabs.length > 0 && (
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={onTabChange}
            />
          )}

          {children}
        </div>

        {sidebar && (
          <aside
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
};
