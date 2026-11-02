import React from 'react';
import styles from './StatusLight.module.css';
import { clsx as cx, clsx } from 'clsx';

export type StatusLightState = 'running' | 'idle' | 'warning' | 'error' | 'offline';

export interface StatusLightProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: StatusLightState;
  label?: string;
  pulse?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const StatusLight = React.forwardRef<HTMLSpanElement, StatusLightProps>(
  ({ state, label, pulse = false, className, action: _action, ...rest }, ref) => {
    const colors: Record<StatusLightState, string> = {
      running: 'var(--success-500)',
      idle: 'var(--cyan-500)',
      warning: 'var(--warning-500)',
      error: 'var(--error-500)',
      offline: 'var(--text-disabled)',
    };

    return (
      <span
        ref={ref}
        className={cx(clsx('redesign-status-light', className), styles.il1)}
        {...rest}
      >
        <span
          className={
            pulse && (state === 'running' || state === 'warning' || state === 'error')
              ? 'animate-pulse-dot'
              : ''
          }
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: colors[state],
            boxShadow: `0 0 8px ${colors[state]}80`,
          }}
          aria-hidden='true'
        />
        {label && <span>{label}</span>}
      </span>
    );
  }
);

StatusLight.displayName = 'RedesignStatusLight';
