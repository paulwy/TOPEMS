import { useState, useCallback, useRef, useEffect } from 'react';

export interface TouchFeedbackOptions {
  rippleColor?: string;
  minTouchTarget?: number;
  enableLongPress?: boolean;
  longPressDelay?: number;
  onLongPress?: () => void;
  enableHapticFeedback?: boolean;
  scaleOnPress?: boolean;
  pressScale?: number;
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
    enableHapticFeedback = true,
    scaleOnPress = true,
    pressScale = 0.98,
  } = options;

  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const rippleId = useRef(0);

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: [30, 50, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, [enableHapticFeedback]);

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
    triggerHapticFeedback('light');

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, [triggerHapticFeedback]);

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
          triggerHapticFeedback('medium');
          onLongPress();
        }, longPressDelay);
      }
    },
    [createRipple, enableLongPress, longPressDelay, onLongPress, triggerHapticFeedback]
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
      WebkitUserSelect: 'none' as const,
      msUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const,
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
    transform: isPressed && scaleOnPress ? `scale(${pressScale})` : 'scale(1)',
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
    triggerHapticFeedback,
  };
}

export function useSwipeGesture(options?: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  enableHapticFeedback?: boolean;
}) {
  const { 
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown, 
    threshold = 50,
    onSwipeStart,
    onSwipeEnd,
    enableHapticFeedback = true,
  } = options || {};
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [enableHapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (!isSwiping.current && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= threshold) {
      isSwiping.current = true;
      onSwipeStart?.();
    }
  }, [threshold, onSwipeStart]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (Math.max(absDeltaX, absDeltaY) < threshold) {
        onSwipeEnd?.();
        return;
      }

      triggerHaptic();

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

      onSwipeEnd?.();
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, onSwipeEnd, triggerHaptic]
  );

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

export function useDoubleTap(callback?: () => void, delay: number = 300) {
  const lastTapTime = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < delay) {
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      callback?.();
    }
    lastTapTime.current = now;
  }, [callback, delay]);

  return handleTap;
}

export function usePinchGesture(options?: {
  onPinchStart?: () => void;
  onPinch?: (scale: number) => void;
  onPinchEnd?: () => void;
  minScale?: number;
  maxScale?: number;
  enableHapticFeedback?: boolean;
}) {
  const {
    onPinchStart,
    onPinch,
    onPinchEnd,
    minScale = 0.5,
    maxScale = 3,
    enableHapticFeedback = true,
  } = options || {};

  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const currentScale = useRef(1);
  const isPinching = useRef(false);

  const triggerHaptic = useCallback((type: 'start' | 'end') => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(type === 'start' ? 15 : [10, 5, 10]);
    }
  }, [enableHapticFeedback]);

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;

    initialDistance.current = getDistance(e.touches[0], e.touches[1]);
    initialScale.current = currentScale.current;
    isPinching.current = true;

    triggerHaptic('start');
    onPinchStart?.();
  }, [onPinchStart, triggerHaptic]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !isPinching.current) return;

    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleDelta = currentDistance / initialDistance.current;
    let newScale = initialScale.current * scaleDelta;

    newScale = Math.max(minScale, Math.min(maxScale, newScale));
    currentScale.current = newScale;

    onPinch?.(newScale);
  }, [minScale, maxScale, onPinch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2 && isPinching.current) {
      isPinching.current = false;
      triggerHaptic('end');
      onPinchEnd?.();
    }
  }, [onPinchEnd, triggerHaptic]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getCurrentScale: () => currentScale.current,
    resetScale: useCallback(() => {
      currentScale.current = 1;
    }, []),
  };
}

export function useTouchScale(options?: {
  minScale?: number;
  maxScale?: number;
  onScaleChange?: (scale: number) => void;
}) {
  const { minScale = 1, maxScale = 2, onScaleChange } = options || {};
  const [scale, setScale] = useState(1);
  const startDistance = useRef(0);
  const startScale = useRef(1);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      startDistance.current = Math.sqrt(dx * dx + dy * dy);
      startScale.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = startScale.current * (distance / startDistance.current);
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
      setScale(clampedScale);
      onScaleChange?.(clampedScale);
    }
  }, [minScale, maxScale, onScaleChange]);

  const resetScale = useCallback(() => {
    setScale(1);
    onScaleChange?.(1);
  }, [onScaleChange]);

  return {
    scale,
    handleTouchStart,
    handleTouchMove,
    resetScale,
  };
}
