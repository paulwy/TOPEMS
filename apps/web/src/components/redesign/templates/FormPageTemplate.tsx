import React from 'react';
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
  submitLabel = '保存',
  cancelLabel = '取消',
  loading = false,
  actions,
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
        maxWidth: '960px',
        ...style,
      }}
      {...rest}
    >
      <PageHeader {...header} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          padding: 'var(--space-6)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {children}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          {actions}
          {onCancel && (
            <Button
              variant='secondary'
              type='button'
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          {onSubmit && (
            <Button
              variant='primary'
              type='submit'
              loading={loading}
            >
              {submitLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
