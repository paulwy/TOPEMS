import { useState, useCallback, useRef, useEffect } from 'react';

export interface TouchFeedbackOptions {
  rippleColor?: string;
  minTouchTarget?: number;
  enableLongPress?: boolean;
  longPressDelay?: number;
  onLongPress?: () => void;
}

export interface TouchRipple {
  id: number;
  x: number;
  y: number;
}

export function useTouchFeedback(options: TouchFeedbackOptions = {}) {
  const {
    rippleColor = 'rgba(0, 0, 0, 0.1)',
    minTouchTarget = 44,
    enableLongPress = false,
    longPressDelay = 500,
    onLongPress,
  } = options;

  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const rippleId = useRef(0);

  const createRipple = useCallback((clientX: number, clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newRipple: TouchRipple = {
      id: rippleId.current++,
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      setIsPressed(true);

      if ('touches' in e && e.touches.length > 0) {
        const touch = e.touches[0];
        const target = e.currentTarget as HTMLElement;
        createRipple(touch.clientX, touch.clientY, target);
      }

      if (enableLongPress && onLongPress) {
        longPressTimer.current = window.setTimeout(() => {
          onLongPress();
        }, longPressDelay);
      }
    },
    [createRipple, enableLongPress, longPressDelay, onLongPress]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const getTouchStyles = useCallback(() => {
    return {
      minHeight: minTouchTarget,
      minWidth: minTouchTarget,
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      cursor: 'pointer',
      userSelect: 'none' as const,
    };
  }, [minTouchTarget]);

  const rippleStyle = {
    position: 'absolute' as const,
    borderRadius: '50%' as const,
    background: rippleColor,
    transform: 'scale(0)' as const,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out' as const,
  };

  const pressedStyle = {
    transform: isPressed ? 'scale(0.98)' : 'scale(1)',
    transition: 'transform 0.1s ease-out',
  };

  return {
    isPressed,
    ripples,
    rippleStyle,
    pressedStyle,
    getTouchStyles,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  };
}

export function useSwipeGesture(options?: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}) {
  const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = options || {};
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < threshold) {
      return;
    }

    if (absDeltaX > absDeltaY) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    handleTouchStart,
    handleTouchEnd,
  };
}

export function useDoubleTap(callback?: () => void, delay: number = 300) {
  const lastTapTime = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < delay) {
      callback?.();
    }
    lastTapTime.current = now;
  }, [callback, delay]);

  return handleTap;
}