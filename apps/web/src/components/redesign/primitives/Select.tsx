import React from 'react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, style, ...rest }, ref) => {
    return (
      <div
        className={clsx('redesign-select-wrapper', className)}
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
          <select
            ref={ref}
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
              cursor: 'pointer',
              appearance: 'none',
            }}
            {...rest}
          >
            {placeholder && (
              <option
                value=''
                disabled
              >
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <svg
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
            style={{ marginLeft: 'var(--space-2)', color: 'var(--text-tertiary)' }}
          >
            <path
              d='M2.5 4.5L6 8L9.5 4.5'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
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

Select.displayName = 'RedesignSelect';
