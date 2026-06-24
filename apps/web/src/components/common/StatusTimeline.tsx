import React from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  time?: string;
  user?: string;
  icon?: React.ReactNode;
}

export interface StatusTimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  showLabels?: boolean;
  showIcons?: boolean;
}

const statusConfig = {
  completed: {
    icon: <CheckCircle2 size={18} />,
    color: '#22c55e',
    bgColor: '#f0fdf4',
    label: '已完成',
  },
  current: {
    icon: <Clock size={18} />,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    label: '进行中',
  },
  pending: {
    icon: <Circle size={18} />,
    color: '#9ca3af',
    bgColor: '#f9fafb',
    label: '待处理',
  },
  failed: {
    icon: <AlertCircle size={18} />,
    color: '#ef4444',
    bgColor: '#fef2f2',
    label: '失败',
  },
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  items,
  orientation = 'vertical',
  showLabels = true,
  showIcons = true,
}) => {
  const theme = useTheme();

  if (orientation === 'horizontal') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {items.map((item, index) => {
          const config = statusConfig[item.status];
          return (
            <React.Fragment key={item.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'column',
                  minWidth: 80,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: config.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  <Box sx={{ color: config.color }}>{item.icon || (showIcons && config.icon)}</Box>
                </Box>
                {showLabels && (
                  <Typography
                    variant='caption'
                    sx={{
                      textAlign: 'center',
                      color: item.status === 'current' ? 'primary.main' : 'text.secondary',
                      fontWeight: item.status === 'current' ? 600 : 400,
                    }}
                  >
                    {item.title}
                  </Typography>
                )}
                {item.time && (
                  <Typography
                    variant='caption'
                    color='text.disabled'
                    sx={{ mt: 0.5 }}
                  >
                    {item.time}
                  </Typography>
                )}
              </Box>
              {index < items.length - 1 && (
                <Box sx={{ mx: 1, color: 'divider' }}>
                  <ArrowRight size={16} />
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {items.map((item, index) => {
        const config = statusConfig[item.status];
        return (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              gap: 2,
              pb: index < items.length - 1 ? 3 : 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 32,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: item.status === 'current' ? '50%' : '4px',
                  bgcolor: config.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: item.status === 'current' ? `2px solid ${config.color}` : 'none',
                  boxShadow: item.status === 'current' ? `0 0 0 4px ${config.bgColor}` : 'none',
                }}
              >
                <Box sx={{ color: config.color }}>{item.icon || (showIcons && config.icon)}</Box>
              </Box>
              {index < items.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 40,
                    bgColor:
                      items[index + 1].status === 'completed' || item.status === 'completed'
                        ? config.color
                        : 'divider',
                    mt: 1,
                  }}
                />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant='body1'
                  sx={{
                    fontWeight: item.status === 'current' ? 600 : 500,
                    color: item.status === 'current' ? 'primary.main' : 'text.primary',
                  }}
                >
                  {item.title}
                </Typography>
                {showLabels && (
                  <Chip
                    size='small'
                    label={config.label}
                    sx={{
                      bgcolor: config.bgColor,
                      color: config.color,
                      fontSize: '0.7rem',
                    }}
                  />
                )}
              </Box>
              {item.description && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 0.5 }}
                >
                  {item.description}
                </Typography>
              )}
              {(item.time || item.user) && (
                <Typography
                  variant='caption'
                  color='text.disabled'
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {item.user && `${item.user} · `}
                  {item.time}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default StatusTimeline;
