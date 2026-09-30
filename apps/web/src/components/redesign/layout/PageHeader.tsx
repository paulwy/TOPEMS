import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '../primitives';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  backButton?: { label?: string; onClick: () => void };
  primaryAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondaryActions?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backButton,
  primaryAction,
  secondaryActions,
  breadcrumbs,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  const { t } = useTranslation();
  return (
    <header
      className={clsx('redesign-page-header', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
        ...style,
      }}
      {...rest}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={t('shared.header_breadcrumbs.k0')}>
          <ol
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            {breadcrumbs.map((crumb, index) => (
              <li
                key={index}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                {index > 0 && <span aria-hidden='true'>/</span>}
                {crumb.href || crumb.onClick ? (
                  <a
                    href={crumb.href}
                    onClick={(e) => {
                      if (crumb.onClick) {
                        e.preventDefault();
                        crumb.onClick();
                      }
                    }}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {backButton && (
            <Button
              variant='ghost'
              size='sm'
              onClick={backButton.onClick}
            >
              ← {backButton.label || t('components.page_header.back')}
            </Button>
          )}
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-brand)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)',
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--text-primary)',
              lineHeight: 'var(--leading-tight)',
            }}
          >
            {title}
          </h1>
          {subtitle && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>

        {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {secondaryActions?.map((action, index) => (
              <Button
                key={index}
                variant='secondary'
                leftIcon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
            {primaryAction && (
              <Button
                variant='primary'
                leftIcon={primaryAction.icon}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
