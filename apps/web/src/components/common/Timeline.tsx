import React from 'react';
import { Box, Typography, Chip, Skeleton } from '@mui/material';
import { Circle, CheckCircle, XCircle, Clock, AlertCircle, type LucideIcon } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  status?: 'completed' | 'pending' | 'active' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  color?: string;
  content?: React.ReactNode;
  loading?: boolean;
}

export interface TimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  variant?: 'outlined' | 'filled' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  sx?: import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;
  onItemClick?: (item: TimelineItem) => void;
}

const statusIcon: Record<string, LucideIcon> = {
  completed: CheckCircle,
  pending: Clock,
  active: Circle,
  error: XCircle,
  warning: AlertCircle,
  info: Circle,
};

const statusColor: Record<string, string> = {
  completed: 'success.main',
  pending: 'grey.400',
  active: 'primary.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main',
};

const sizeConfig = {
  sm: {
    iconSize: 20,
    spacing: 2,
    titleVariant: 'body2' as const,
    descVariant: 'caption' as const,
    dotSize: 8,
  },
  md: {
    iconSize: 28,
    spacing: 3,
    titleVariant: 'body1' as const,
    descVariant: 'body2' as const,
    dotSize: 12,
  },
  lg: {
    iconSize: 36,
    spacing: 4,
    titleVariant: 'h6' as const,
    descVariant: 'body1' as const,
    dotSize: 16,
  },
};

export const Timeline: React.FC<TimelineProps> = ({
  items,
  orientation = 'vertical',
  variant = 'filled',
  size = 'md',
  sx,
  onItemClick,
}) => {
  const config = sizeConfig[size];

  if (orientation === 'horizontal') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          overflowX: 'auto',
          gap: config.spacing,
          ...sx,
        }}
      >
        {items.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 120,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: config.iconSize,
                height: config.iconSize,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor:
                  variant === 'soft'
                    ? `${statusColor[item.status || 'pending']}20`
                    : statusColor[item.status || 'pending'],
                color: variant === 'soft' ? statusColor[item.status || 'pending'] : '#fff',
                mb: 1,
                cursor: onItemClick ? 'pointer' : 'default',
                '&:hover': onItemClick
                  ? { transform: 'scale(1.1)', transition: 'transform 0.2s' }
                  : {},
              }}
              onClick={() => onItemClick?.(item)}
            >
              {item.loading ? (
                <Skeleton
                  variant='circular'
                  width={config.iconSize - 8}
                  height={config.iconSize - 8}
                />
              ) : (
                item.icon ||
                (() => {
                  const Icon = statusIcon[item.status || 'pending'];
                  return <Icon size={config.iconSize - 8} />;
                })()
              )}
            </Box>
            <Typography
              variant={config.titleVariant}
              sx={{ fontWeight: 600, textAlign: 'center' }}
            >
              {item.title}
            </Typography>
            {item.time && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {item.time}
              </Typography>
            )}
            {index < items.length - 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: config.iconSize / 2,
                  left: `calc(50% + ${config.iconSize / 2}px)`,
                  width: config.spacing * 8,
                  height: 2,
                  bgcolor: 'divider',
                }}
              />
            )}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ ...sx }}>
      {items.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            gap: config.spacing,
            position: 'relative',
            pb: index < items.length - 1 ? config.spacing : 0,
          }}
        >
          {/* 连接线 */}
          {index < items.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                left: (config.iconSize - 2) / 2,
                top: config.iconSize,
                width: 2,
                height: `calc(100% - ${config.iconSize}px)`,
                bgcolor: 'divider',
              }}
            />
          )}
          {/* 图标 */}
          <Box
            sx={{
              width: config.iconSize,
              height: config.iconSize,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor:
                variant === 'outlined'
                  ? 'background.paper'
                  : variant === 'soft'
                    ? `${statusColor[item.status || 'pending']}20`
                    : statusColor[item.status || 'pending'],
              color:
                variant === 'outlined' || variant === 'soft'
                  ? statusColor[item.status || 'pending']
                  : '#fff',
              border:
                variant === 'outlined'
                  ? `2px solid ${statusColor[item.status || 'pending']}`
                  : 'none',
              zIndex: 1,
              cursor: onItemClick ? 'pointer' : 'default',
              '&:hover': onItemClick
                ? { transform: 'scale(1.1)', transition: 'transform 0.2s' }
                : {},
            }}
            onClick={() => onItemClick?.(item)}
          >
            {item.loading ? (
              <Skeleton
                variant='circular'
                width={config.iconSize - 8}
                height={config.iconSize - 8}
              />
            ) : (
              item.icon ||
              (() => {
                const Icon = statusIcon[item.status || 'pending'];
                return <Icon size={config.iconSize - 8} />;
              })()
            )}
          </Box>
          {/* 内容 */}
          <Box sx={{ flex: 1, pt: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography
                variant={config.titleVariant}
                sx={{ fontWeight: 600 }}
              >
                {item.title}
              </Typography>
              {item.status && (
                <Chip
                  label={item.status}
                  size='small'
                  sx={{
                    height: 18,
                    fontSize: '0.625rem',
                    bgcolor: `${statusColor[item.status]}20`,
                    color: statusColor[item.status],
                  }}
                />
              )}
            </Box>
            {item.description && (
              <Typography
                variant={config.descVariant}
                color='text.secondary'
                sx={{ mb: 0.5 }}
              >
                {item.description}
              </Typography>
            )}
            {item.time && (
              <Typography
                variant='caption'
                color='text.disabled'
              >
                {item.time}
              </Typography>
            )}
            {item.content && <Box sx={{ mt: 1 }}>{item.content}</Box>}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Timeline;
