import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { Minimize, Maximize, X, Square } from 'lucide-react';
import type { WindowState } from '@/hooks/useWindowManager';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface DraggableWindowProps {
  window: WindowState;
  onActivate: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  window: windowState,
  onActivate,
  onMinimize,
  onMaximize,
  onClose,
  onMove,
  onResize,
}) => {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = useState<'bottom' | 'right' | 'bottom-right'>(
    'bottom-right'
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const x = windowState.x ?? 0;
  const y = windowState.y ?? 0;
  const width = windowState.width ?? 600;
  const height = windowState.height ?? 400;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof HTMLButtonElement || (e.target as HTMLElement).closest('button')) {
        return;
      }
      onActivate();
      if (!windowState.isDraggable) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX - x,
        y: e.clientY - y,
      });
    },
    [x, y, windowState.isDraggable, onActivate]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x);
        const newY = Math.max(0, e.clientY - dragStart.y);
        onMove(newX, newY);
      }

      if (isResizing) {
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;

        if (resizeDirection === 'right' || resizeDirection === 'bottom-right') {
          newWidth = Math.max(300, resizeStart.width + e.clientX - resizeStart.x);
        }
        if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right') {
          newHeight = Math.max(200, resizeStart.height + e.clientY - resizeStart.y);
        }

        onResize(newWidth, newHeight);
      }
    },
    [isDragging, isResizing, dragStart, resizeStart, resizeDirection, onMove, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      globalThis.addEventListener('mousemove', handleMouseMove);
      globalThis.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: 'bottom' | 'right' | 'bottom-right') => {
      e.preventDefault();
      e.stopPropagation();
      onActivate();
      if (!windowState.isResizable) return;

      setIsResizing(true);
      setResizeDirection(direction);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width,
        height,
      });
    },
    [width, height, windowState.isResizable, onActivate]
  );

  if (windowState.isMinimized) return null;

  const windowStyle: React.CSSProperties = {
    position: 'absolute',
    left: windowState.isMaximized ? 0 : x,
    top: windowState.isMaximized ? 0 : y,
    width: windowState.isMaximized ? '100%' : width,
    height: windowState.isMaximized ? '100%' : height,
    zIndex: windowState.zIndex,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: windowState.isMaximized ? 0 : 8,
    boxShadow: theme.shadows[10],
    overflow: 'hidden',
    border: `1px solid ${theme.palette.divider}`,
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={containerRef}
      style={windowStyle}
      onMouseDown={handleMouseDown}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${designTokens.spacing.sm} 12px`,
          backgroundColor:
            windowState.zIndex >= 200 ? theme.palette.primary.light : theme.palette.grey[100],
          borderBottom: `1px solid ${theme.palette.divider}`,
          cursor: windowState.isDraggable ? 'grab' : 'default',
          '&:active': {
            cursor: windowState.isDraggable ? 'grabbing' : 'default',
          },
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 500, color: 'text.primary', whiteSpace: 'nowrap' }}
        >
          {windowState.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {windowState.isMinimizable && (
            <IconButton
              size='small'
              onClick={onMinimize}
              sx={{
                width: 24,
                height: 24,
                '&:hover': { backgroundColor: theme.palette.grey[200] },
              }}
              aria-label={i18n.t('shared.draggable_window.k0')}
            >
              <Minimize size={14} />
            </IconButton>
          )}
          {windowState.isMaximizable && (
            <IconButton
              size='small'
              onClick={onMaximize}
              sx={{
                width: 24,
                height: 24,
                '&:hover': { backgroundColor: theme.palette.grey[200] },
              }}
              aria-label={i18n.t('shared.draggable_window.k1')}
            >
              {windowState.isMaximized ? <Square size={14} /> : <Maximize size={14} />}
            </IconButton>
          )}
          {windowState.isClosable && (
            <IconButton
              size='small'
              onClick={onClose}
              sx={{
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: theme.palette.error.light,
                  color: 'common.white',
                },
              }}
              aria-label={i18n.t('shared.draggable_window.k2')}
            >
              <X size={14} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: 2,
        }}
      >
        {windowState.component as any}
      </Box>

      {windowState.isResizable && !windowState.isMaximized && (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className='resize-handle-bottom'
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 8,
              cursor: 'ns-resize',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className='resize-handle-right'
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              top: 0,
              width: 8,
              cursor: 'ew-resize',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className='resize-handle-bottom-right'
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              cursor: 'nwse-resize',
              backgroundColor: theme.palette.primary.main,
              borderRadius: 0,
            }}
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
        </>
      )}
    </div>
  );
};

export default DraggableWindow;
