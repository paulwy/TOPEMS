import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle, AlertTriangle } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

const icons: Record<
  ToastVariant,
  React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const colors: Record<ToastVariant, string> = {
  info: 'var(--info-500)',
  success: 'var(--success-500)',
  warning: 'var(--warning-500)',
  error: 'var(--error-500)',
};

export const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = icons[toast.variant];

  return (
    <div
      role='status'
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        width: '360px',
        maxWidth: 'calc(100vw - var(--space-8))',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${colors[toast.variant]}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeInUp var(--duration-base) var(--ease-out)',
      }}
    >
      <Icon
        size={20}
        color={colors[toast.variant]}
        style={{ flexShrink: 0, marginTop: '2px' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {toast.title && (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {toast.title}
          </span>
        )}
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {toast.message}
        </span>
      </div>
      <button
        type='button'
        onClick={() => onDismiss(toast.id)}
        aria-label='Dismiss notification'
        style={{
          flexShrink: 0,
          padding: 'var(--space-1)',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
}) => {
  const isTop = position.startsWith('top');
  const isCenter = position.endsWith('center');

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: isTop ? 'var(--space-4)' : undefined,
        bottom: isTop ? undefined : 'var(--space-4)',
        left: isCenter ? '50%' : position.includes('right') ? undefined : 'var(--space-4)',
        right: isCenter ? undefined : position.includes('right') ? 'var(--space-4)' : undefined,
        transform: isCenter ? 'translateX(-50%)' : undefined,
        zIndex: 'var(--z-toast)',
        display: 'flex',
        flexDirection: isTop ? 'column' : 'column-reverse',
        gap: 'var(--space-3)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{ pointerEvents: 'auto' }}
        >
          <ToastItem
            toast={toast}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};
