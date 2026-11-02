import React from 'react';
import styles from './EmptyState.module.css';
import { clsx as cx, clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
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

      children,
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const Icon = IconProp ?? defaultIcons[variant];
    const defaultTitles: Record<EmptyStateVariant, string> = {
      default: t('components.empty_state.default_title'),
      search: t('components.empty_state.search_title'),
      data: t('components.empty_state.data_title'),
    };

    return (
      <div
        ref={ref}
        className={cx(clsx('redesign-empty-state', className), styles.il1)}
        {...rest}
      >
        <div className={styles.il2}>
          <Icon
            size={32}
            strokeWidth={1.5}
          />
        </div>
        <div className={styles.il3}>
          <h3 className={styles.il4}>{title ?? defaultTitles[variant]}</h3>
          {description && <p className={styles.il5}>{description}</p>}
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
