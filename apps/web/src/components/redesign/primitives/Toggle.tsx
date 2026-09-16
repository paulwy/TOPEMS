import React from 'react';

export interface ToggleProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, disabled = false, className, style, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
        {...rest}
      >
        <span
          aria-hidden='true'
          style={{
            position: 'relative',
            width: 36,
            height: 20,
            borderRadius: 10,
            backgroundColor: checked ? 'var(--success-500)' : 'var(--border-strong)',
            transition: 'background-color var(--duration-fast) var(--ease-out)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: checked ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'left var(--duration-fast) var(--ease-out)',
            }}
          />
        </span>
        {label && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{label}</span>
        )}
      </button>
    );
  }
);

Toggle.displayName = 'RedesignToggle';
