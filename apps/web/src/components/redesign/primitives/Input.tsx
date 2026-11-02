import React, { useId } from 'react';
import styles from './Input.module.css';
import { clsx as cx, clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div className={cx(clsx('redesign-input-wrapper', className), styles.il1)}>
        {label && (
          <label
            htmlFor={inputId}
            className={styles.il2}
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
          {leftIcon && <span className={styles.il3}>{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={styles.il4}
            {...rest}
          />
          {rightIcon && <span className={styles.il5}>{rightIcon}</span>}
        </div>
        {error && <span className={styles.il6}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'RedesignInput';
