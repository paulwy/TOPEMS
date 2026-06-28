/**
 * 无障碍（a11y）工具组件和 hooks
 *
 * NOTE: 当前导出的 useAriaLiveRegion、useKeyboardNavigation、VisuallyHidden
 * 尚未被任何组件使用。保留作为无障碍基础设施，鼓励在新组件开发时采用。
 * 可通过 `import { useAriaLiveRegion, useKeyboardNavigation, VisuallyHidden } from '@/lib/a11y'` 使用。
 */
import React from 'react';

export const useAriaLiveRegion = (): [(message: string) => void, React.ReactNode] => {
  const [message, setMessage] = React.useState('');
  const announce = React.useCallback((msg: string) => {
    setMessage('');
    setTimeout(() => setMessage(msg), 100);
  }, []);
  const liveRegion = (
    <div
      aria-live='polite'
      aria-atomic='true'
      className='sr-only'
    >
      {message}
    </div>
  );
  return [announce, liveRegion];
};

export const useKeyboardNavigation = (
  callbacks: {
    onEscape?: () => void;
    onEnter?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onSpace?: () => void;
  },
  deps: React.DependencyList = []
) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          callbacks.onEscape?.();
          break;
        case 'Enter':
          callbacks.onEnter?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          callbacks.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          callbacks.onArrowDown?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          callbacks.onArrowLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          callbacks.onArrowRight?.();
          break;
        case ' ':
          e.preventDefault();
          callbacks.onSpace?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, deps);
};

export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <span className='sr-only'>{children}</span>;
};
