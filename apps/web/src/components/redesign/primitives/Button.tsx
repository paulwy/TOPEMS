import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-ui)',
      fontWeight: 'var(--font-semibold)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      borderRadius: 'var(--radius-none)',
      border: '1px solid transparent',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      transition:
        'background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-instant) var(--ease-out)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { height: '28px', padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' },
      md: { height: '36px', padding: '0 var(--space-4)', fontSize: 'var(--text-xs)' },
      lg: { height: '44px', padding: '0 var(--space-5)', fontSize: 'var(--text-sm)' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--text-inverse)',
        borderColor: 'var(--accent-primary)',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-default)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        borderColor: 'transparent',
      },
      danger: {
        backgroundColor: 'var(--error-600)',
        color: 'var(--text-inverse)',
        borderColor: 'var(--error-600)',
      },
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx('redesign-button', className)}
        style={{
          ...baseStyles,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...style,
        }}
        data-variant={variant}
        data-size={size}
        {...rest}
      >
        {loading && (
          <span
            className='animate-spin'
            style={{
              width: '1em',
              height: '1em',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
            }}
            aria-hidden='true'
          />
        )}
        {!loading && leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'RedesignButton';
