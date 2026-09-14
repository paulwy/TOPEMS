import React from 'react';
import clsx from 'clsx';
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
      title = '出错了',
      message = '系统遇到意外问题，请稍后重试或联系支持团队。',
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
    return (
      <div
        ref={ref}
        className={clsx('redesign-error-state', className)}
        role='alert'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-5)',
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
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-4xl)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--error-500)',
                lineHeight: 'var(--leading-none)',
              }}
            >
              {code}
            </span>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-brand)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{message}</p>
          {traceId && (
            <code
              style={{
                display: 'inline-block',
                marginTop: 'var(--space-2)',
                padding: 'var(--space-1) var(--space-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Trace ID: {traceId}
            </code>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {onRetry && (
            <Button
              variant='primary'
              leftIcon={<RefreshCw size={16} />}
              onClick={onRetry}
            >
              重试
            </Button>
          )}
          {onFeedback && (
            <Button
              variant='secondary'
              onClick={onFeedback}
            >
              反馈问题
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'RedesignErrorState';
