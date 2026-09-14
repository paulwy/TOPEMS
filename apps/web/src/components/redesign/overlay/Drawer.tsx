import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../primitives';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'right' | 'left';
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'right',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const widths: Record<string, string> = {
    sm: '360px',
    md: '480px',
    lg: '640px',
    xl: '800px',
    full: '100%',
  };

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isRight = position === 'right';

  return createPortal(
    <div
      role='presentation'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal-backdrop)',
        display: 'flex',
        flexDirection: isRight ? 'row-reverse' : 'row',
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn var(--duration-base) var(--ease-out)',
      }}
    >
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? 'redesign-drawer-title' : undefined}
        aria-describedby={description ? 'redesign-drawer-desc' : undefined}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: widths[size],
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-1)',
          borderLeft: isRight ? '1px solid var(--border-default)' : 'none',
          borderRight: isRight ? 'none' : '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
          animation: `slideIn${isRight ? 'Right' : 'Left'} var(--duration-base) var(--ease-out)`,
          outline: 'none',
        }}
      >
        {(title || description) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              padding: 'var(--space-5)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {title && (
                <h2
                  id='redesign-drawer-title'
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-brand)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id='redesign-drawer-desc'
                  style={{ margin: 0, color: 'var(--text-secondary)' }}
                >
                  {description}
                </p>
              )}
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={onClose}
              aria-label='Close drawer'
            >
              <X size={18} />
            </Button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-5)' }}>{children}</div>

        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--border-default)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
