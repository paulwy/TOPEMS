import React from 'react';
import cx from 'clsx';
import styles from './ErrorState.module.css';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../primitives';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  code?: string | number;
  title?: string;
  message?: string;
  traceId?: string;
  onRetry?: () => void;
  onFeedback?: () => void;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      code = 500,
      title,
      message,
      traceId,
      onRetry,
      onFeedback,
      className,
      style,
      action: _action, // 显式排除 action，避免传递给非 form 元素
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('components.error_state.title');
    const resolvedMessage = message ?? t('components.error_state.message');
    return (
      <div
        ref={ref}
        role='alert'
        className={cx(clsx('redesign-error-state', className), styles.il1)}
        {...rest}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 'var(--space-4)',
            color: 'var(--error-500)',
            backgroundColor: 'color-mix(in srgb, var(--error-500) 8%, transparent)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--glow-error)',
          }}
        >
          <AlertTriangle
            size={40}
            strokeWidth={1.5}
          />
        </div>

        <div
          className={styles.il2}
        >
          <div
            className={styles.il3}
          >
            <span
              className={styles.il4}
            >
              {code}
            </span>
            <h1
              className={styles.il5}
            >
              {resolvedTitle}
            </h1>
          </div>
          <p className={styles.il6}>{resolvedMessage}</p>
          {traceId && (
            <code
              className={styles.il7}
            >
              Trace ID: {traceId}
            </code>
          )}
        </div>

        <div className={styles.il8}>
          {onRetry && (
            <Button
              variant='primary'
              leftIcon={<RefreshCw size={16} />}
              onClick={onRetry}
            >
              {t('components.error_state.retry')}
            </Button>
          )}
          {onFeedback && (
            <Button
              variant='secondary'
              onClick={onFeedback}
            >
              {t('components.error_state.feedback')}
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'RedesignErrorState';
