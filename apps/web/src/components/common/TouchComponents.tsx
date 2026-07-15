import React, { useCallback } from 'react';
import { IconButton, Card, CardActionArea, ListItem, Chip, Switch } from '@mui/material';
import { useTouchFeedback, type TouchFeedbackOptions } from '@/hooks/useTouchFeedback';
import { useSwipeGesture } from '@/hooks/useTouchFeedback';

interface TouchIconButtonProps extends React.ComponentProps<typeof IconButton>, TouchFeedbackOptions {
  children: React.ReactNode;
  onClick?: () => void;
}

export const TouchIconButton: React.FC<TouchIconButtonProps> = ({
  children,
  onClick,
  rippleColor,
  minTouchTarget = 48,
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
    <IconButton
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
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
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
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </IconButton>
  );
};

interface TouchCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  rippleColor?: string;
  enableSwipe?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const TouchCard: React.FC<TouchCardProps> = ({
  children,
  onClick,
  onLongPress,
  longPressDelay = 500,
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  enableSwipe = false,
  onSwipeLeft,
  onSwipeRight,
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
    minTouchTarget: 44,
    enableLongPress: !!onLongPress,
    longPressDelay,
    onLongPress,
  });

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: enableSwipe ? onSwipeLeft : undefined,
    onSwipeRight: enableSwipe ? onSwipeRight : undefined,
  });

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <Card
      {...props}
      onClick={handleClick}
      onTouchStart={(e) => {
        handleTouchStart(e);
        if (enableSwipe) swipeHandlers.handleTouchStart(e as React.TouchEvent);
      }}
      onTouchMove={(e) => {
        if (enableSwipe) swipeHandlers.handleTouchMove(e as React.TouchEvent);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd();
        if (enableSwipe) swipeHandlers.handleTouchEnd(e as React.TouchEvent);
      }}
      onTouchCancel={handleTouchCancel}
      sx={{
        ...getTouchStyles(),
        ...props.sx,
        position: 'relative',
        overflow: 'hidden',
        transform: isPressed ? 'scale(0.99)' : 'scale(1)',
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
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </Card>
  );
};

interface TouchListItemProps extends React.ComponentProps<typeof ListItem> {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  rippleColor?: string;
  enableSwipe?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const TouchListItem: React.FC<TouchListItemProps> = ({
  children,
  onClick,
  onLongPress,
  longPressDelay = 500,
  rippleColor = 'rgba(0, 0, 0, 0.08)',
  enableSwipe = false,
  onSwipeLeft,
  onSwipeRight,
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
    minTouchTarget: 48,
    enableLongPress: !!onLongPress,
    longPressDelay,
    onLongPress,
  });

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: enableSwipe ? onSwipeLeft : undefined,
    onSwipeRight: enableSwipe ? onSwipeRight : undefined,
  });

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <ListItem
      {...props}
      onClick={handleClick}
      onTouchStart={(e) => {
        handleTouchStart(e);
        if (enableSwipe) swipeHandlers.handleTouchStart(e as React.TouchEvent);
      }}
      onTouchMove={(e) => {
        if (enableSwipe) swipeHandlers.handleTouchMove(e as React.TouchEvent);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd();
        if (enableSwipe) swipeHandlers.handleTouchEnd(e as React.TouchEvent);
      }}
      onTouchCancel={handleTouchCancel}
      sx={{
        ...getTouchStyles(),
        ...props.sx,
        position: 'relative',
        overflow: 'hidden',
        transform: isPressed ? 'scale(0.995)' : 'scale(1)',
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
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </ListItem>
  );
};

interface TouchChipProps extends React.ComponentProps<typeof Chip> {
  onClick?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
}

export const TouchChip: React.FC<TouchChipProps> = ({
  onClick,
  onLongPress,
  longPressDelay = 500,
  ...props
}) => {
  const {
    isPressed,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  } = useTouchFeedback({
    minTouchTarget: 44,
    enableLongPress: !!onLongPress,
    longPressDelay,
    onLongPress,
    scaleOnPress: true,
  });

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <Chip
      {...props}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      sx={{
        ...props.sx,
        transform: isPressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.1s ease-out',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    />
  );
};

interface TouchSwitchProps extends React.ComponentProps<typeof Switch> {
  onChange?: (event: React.ChangeEvent<{}>, checked: boolean) => void;
}

export const TouchSwitch: React.FC<TouchSwitchProps> = ({
  onChange,
  ...props
}) => {
  const {
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  } = useTouchFeedback({
    minTouchTarget: 48,
    enableHapticFeedback: true,
    scaleOnPress: false,
  });

  const handleChange = useCallback(
    (event: React.ChangeEvent<{}>, checked: boolean) => {
      onChange?.(event, checked);
    },
    [onChange]
  );

  return (
    <Switch
      {...props}
      onChange={handleChange}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      sx={{
        ...props.sx,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    />
  );
};

export type { TouchFeedbackOptions };
