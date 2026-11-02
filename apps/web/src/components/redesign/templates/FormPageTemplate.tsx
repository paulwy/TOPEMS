import React from 'react';
import cx from 'clsx';
import styles from './FormPageTemplate.module.css';
import { useTranslation } from 'react-i18next';
import { PageHeader, type PageHeaderProps } from '../layout';
import { Button } from '../primitives';

export interface FormPageTemplateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  header: PageHeaderProps;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  actions?: React.ReactNode;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const FormPageTemplate: React.FC<FormPageTemplateProps> = ({
  header,
  children,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  loading = false,
  actions,
  className,

  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  const { t } = useTranslation();
  const resolvedSubmitLabel = submitLabel ?? t('components.form_page_template.submit');
  const resolvedCancelLabel = cancelLabel ?? t('components.form_page_template.cancel');
  return (
    <div
      className={cx(className, styles.il1)}
      {...rest}
    >
      <PageHeader {...header} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className={styles.il2}
      >
        <div className={styles.il3}>{children}</div>

        <div className={styles.il4}>
          {actions}
          {onCancel && (
            <Button
              variant='secondary'
              type='button'
              onClick={onCancel}
            >
              {resolvedCancelLabel}
            </Button>
          )}
          {onSubmit && (
            <Button
              variant='primary'
              type='submit'
              loading={loading}
            >
              {resolvedSubmitLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
