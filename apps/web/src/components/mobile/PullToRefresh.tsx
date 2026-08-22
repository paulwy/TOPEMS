import { designTokens } from '@topems/tokens';
import React, { useState, useRef, useCallback } from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import i18n from '@/i18n';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 60,
  maxPullDistance = 120,
  disabled = false,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        const dampenedDiff = Math.min(diff * 0.5, maxPullDistance);
        setPullDistance(dampenedDiff);

        if (dampenedDiff > threshold && e.cancelable) {
          e.preventDefault();
        }
      }
    },
    [isPulling, disabled, isRefreshing, maxPullDistance, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setPullDistance(threshold);
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, handleRefresh]);

  const canRefresh = pullDistance >= threshold;

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: isRefreshing ? threshold : pullDistance,
          overflow: 'hidden',
          transition: isPulling ? 'none' : 'height 0.3s ease',
        }}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              opacity: Math.min(pullDistance / threshold, 1),
            }}
          >
            {isRefreshing ? (
              <CircularProgress
                size={24}
                thickness={3}
              />
            ) : (
              <RefreshCw
                style={{
                  width: 24,
                  height: 24,
                  color: canRefresh ? theme.palette.primary.main : theme.palette.text.secondary,
                  transform: `rotate(${pullDistance * 3}deg)`,
                  transition: 'color 0.2s',
                }}
              />
            )}
            <Typography
              variant='caption'
              sx={{
                color: canRefresh ? 'primary.main' : 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              }}
            >
              {isRefreshing
                ? i18n.t('components.pull_to_refresh.k0')
                : canRefresh
                  ? i18n.t('shared.pull_to_refresh.k1')
                  : i18n.t('shared.pull_to_refresh.k0')}
            </Typography>
          </Box>
        )}
      </Box>

      {children}
    </Box>
  );
};

export default PullToRefresh;
