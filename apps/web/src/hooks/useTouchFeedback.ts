import { useState, useCallback, useRef, useEffect } from 'react';
import { designTokens } from '@topems/tokens';

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
    rippleColor = designTokens.colors.cyber.glass.bgLight,
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

  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (enableHapticFeedback && 'vibrate' in navigator) {
        const patterns: Record<string, number | number[]> = {
          light: 10,
          medium: 20,
          heavy: [30, 50, 30],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [enableHapticFeedback]
  );

  const createRipple = useCallback(
    (clientX: number, clientY: number, element: HTMLElement) => {
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
    },
    [triggerHapticFeedback]
  );

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
