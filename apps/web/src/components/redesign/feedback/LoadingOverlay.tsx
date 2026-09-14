import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  visible: boolean;
  label?: string;
  global?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  label = '加载中...',
  global = false,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  if (!visible) return null;

  const content = (
    <div
      className={clsx('redesign-loading-overlay', className)}
      style={{
        position: global ? 'fixed' : 'absolute',
        inset: 0,
        zIndex: 'var(--z-loading-overlay)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 70%, transparent)',
        backdropFilter: 'blur(2px)',
        ...style,
      }}
      {...rest}
    >
      <span
        className='animate-spin'
        style={{
          width: '32px',
          height: '32px',
          border: '2px solid var(--accent-primary)',
          borderRightColor: 'transparent',
          borderRadius: '50%',
        }}
        aria-hidden='true'
      />
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--text-secondary)',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        {label}
      </span>
    </div>
  );

  return global ? createPortal(content, document.body) : content;
};
