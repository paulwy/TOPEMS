import React, { useState, useRef, useCallback } from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';

export interface SwipeActionItem {
  id: string;
  icon: React.ReactNode;
  label?: string;
  color: string;
  onClick: () => void;
}

export interface SwipeActionProps {
  children: React.ReactNode;
  leftActions?: SwipeActionItem[];
  rightActions?: SwipeActionItem[];
  onOpen?: () => void;
  onClose?: () => void;
}

export const SwipeAction: React.FC<SwipeActionProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onOpen,
  onClose,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const actionWidth = 72;
  const threshold = actionWidth / 2;
  const maxLeftSwipe = rightActions.length * actionWidth;
  const maxRightSwipe = leftActions.length * actionWidth;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - startXRef.current;

      let newTranslate = diff;

      if (isOpen) {
        if (translateX < 0) {
          newTranslate = diff + maxLeftSwipe * -1;
        } else if (translateX > 0) {
          newTranslate = diff + maxRightSwipe;
        }
      }

      if (newTranslate > 0 && leftActions.length === 0) {
        newTranslate = 0;
      }
      if (newTranslate < 0 && rightActions.length === 0) {
        newTranslate = 0;
      }

      if (newTranslate > maxRightSwipe) {
        newTranslate = maxRightSwipe + (newTranslate - maxRightSwipe) * 0.3;
      }
      if (newTranslate < -maxLeftSwipe) {
        newTranslate = -maxLeftSwipe + (newTranslate + maxLeftSwipe) * 0.3;
      }

      setTranslateX(newTranslate);
    },
    [
      isDragging,
      isOpen,
      translateX,
      maxLeftSwipe,
      maxRightSwipe,
      leftActions.length,
      rightActions.length,
    ]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    if (translateX < -threshold && rightActions.length > 0) {
      setTranslateX(-maxLeftSwipe);
      setIsOpen(true);
      onOpen?.();
    } else if (translateX > threshold && leftActions.length > 0) {
      setTranslateX(maxRightSwipe);
      setIsOpen(true);
      onOpen?.();
    } else {
      setTranslateX(0);
      setIsOpen(false);
      onClose?.();
    }
  }, [
    translateX,
    threshold,
    rightActions.length,
    leftActions.length,
    maxLeftSwipe,
    maxRightSwipe,
    onOpen,
    onClose,
  ]);

  const handleActionClick = useCallback((action: SwipeActionItem) => {
    action.onClick();
    setTranslateX(0);
    setIsOpen(false);
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {leftActions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            display: 'flex',
            zIndex: 0,
          }}
        >
          {leftActions.map((action) => (
            <Box
              key={action.id}
              sx={{
                width: actionWidth,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: action.color,
                color: 'white',
              }}
              onClick={() => handleActionClick(action)}
            >
              <IconButton
                sx={{ color: 'white' }}
                size='small'
              >
                {action.icon}
              </IconButton>
              {action.label && (
                <Typography
                  variant='caption'
                  sx={{ color: 'white', mt: 0.5 }}
                >
                  {action.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {rightActions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            zIndex: 0,
          }}
        >
          {rightActions.map((action) => (
            <Box
              key={action.id}
              sx={{
                width: actionWidth,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: action.color,
                color: 'white',
              }}
              onClick={() => handleActionClick(action)}
            >
              <IconButton
                sx={{ color: 'white' }}
                size='small'
              >
                {action.icon}
              </IconButton>
              {action.label && (
                <Typography
                  variant='caption'
                  sx={{ color: 'white', mt: 0.5 }}
                >
                  {action.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'background.paper',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SwipeAction;
