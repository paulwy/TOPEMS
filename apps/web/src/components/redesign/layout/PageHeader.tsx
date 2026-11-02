import React from 'react';
import cx from 'clsx';
import styles from './PageHeader.module.css';
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
  breadcrumbs: _breadcrumbs, // G1: 面包屑统一由 AppShell 自动面包屑渲染，页面级 breadcrumbs 不再渲染
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  const { t } = useTranslation();
  return (
    <header
      className={cx(clsx('redesign-page-header', className), styles.il1)}
      {...rest}
    >
      <div
        className={styles.il2}
      >
        <div className={styles.il3}>
          {backButton && (
            <Button
              variant='ghost'
              size='sm'
              onClick={backButton.onClick}
            >
              ← {backButton.label || t('components.page_header.back')}
            </Button>
          )}
          {title && (
            <h1
              className={styles.il4}
            >
              {title}
            </h1>
          )}
          {subtitle && <p className={styles.il5}>{subtitle}</p>}
        </div>

        {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
          <div className={styles.il6}>
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
