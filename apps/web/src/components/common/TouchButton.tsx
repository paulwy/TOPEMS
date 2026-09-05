import React, { useCallback } from 'react';
import { Button } from '@mui/material';
import { useTouchFeedback, type TouchFeedbackOptions } from '@/hooks/useTouchFeedback';

interface TouchButtonProps extends React.ComponentProps<typeof Button>, TouchFeedbackOptions {
  children: React.ReactNode;
  onClick?: () => void;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  rippleColor,
  minTouchTarget = 44,
  enableLongPress,
  longPressDelay,
  onLongPress,
  ...props
}) => {
  const {
    isPressed,
    ripples,
    rippleStyle,
    getTouchStyles,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  } = useTouchFeedback({
    rippleColor,
    minTouchTarget,
    enableLongPress,
    longPressDelay,
    onLongPress,
  });

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <Button
      {...props}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      sx={{
        ...getTouchStyles(),
        ...props.sx,
        position: 'relative',
        overflow: 'hidden',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s ease-out',
      }}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            ...rippleStyle,
            left: ripple.x,
            top: ripple.y,
            width: '100%',
            height: '100%',
            marginLeft: '-50%',
            marginTop: '-50%',
            animation: 'ripple-effect 0.6s ease-out forwards',
          }}
        />
      ))}
      <style>{`
        @keyframes ripple-effect {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </Button>
  );
};
