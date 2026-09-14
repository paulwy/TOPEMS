import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 200,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 8;
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
    }

    setPosition({ top, left });
  };

  const show = () => {
    timerRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  const transform =
    placement === 'top'
      ? 'translate(-50%, -100%)'
      : placement === 'bottom'
        ? 'translate(-50%, 0)'
        : placement === 'left'
          ? 'translate(-100%, -50%)'
          : 'translate(0, -50%)';

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            role='tooltip'
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform,
              zIndex: 'var(--z-tooltip)',
              maxWidth: '240px',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-inverse)',
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};
