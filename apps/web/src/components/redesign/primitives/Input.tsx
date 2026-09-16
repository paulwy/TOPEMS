import React, { useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, style, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div
        className={clsx('redesign-input-wrapper', className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          width: '100%',
          ...style,
        }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </label>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            height: '40px',
            padding: '0 var(--space-3)',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            transition:
              'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
          }}
          data-error={!!error}
        >
          {leftIcon && (
            <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              padding: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-base)',
            }}
            {...rest}
          />
          {rightIcon && (
            <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}>
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--error-500)',
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'RedesignInput';
