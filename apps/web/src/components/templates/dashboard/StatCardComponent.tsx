import React from 'react';
import { Box, Card, CardContent, Skeleton, Typography, Chip, Stack } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatCard as StatCardType } from './types';

const colorMap: Record<string, string> = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.dark',
  warning: 'warning.main',
  error: 'error.main',
  info: 'info.main',
};

const sizeStyles = {
  small: { padding: 1.5, iconSize: 36, titleSize: 'body2' as const, valueSize: 'h5' as const },
  medium: { padding: 2, iconSize: 48, titleSize: 'body2' as const, valueSize: 'h4' as const },
  large: { padding: 3, iconSize: 56, titleSize: 'body1' as const, valueSize: 'h3' as const },
};

const MiniTrendChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      width='100%'
      height='100%'
      preserveAspectRatio='none'
    >
      <polyline
        points={points}
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

export const StatCardComponent: React.FC<StatCardType & { loading?: boolean }> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  color = 'primary',
  onClick,
  loading,
  trend,
  progress,
  progressLabel,
  subtitle,
  tags,
  variant = 'elevation',
  size = 'medium',
  customGradient,
}) => {
  const bgColor = colorMap[color] || colorMap.primary;
  const currentSize = sizeStyles[size];

  return (
    <Card
      variant={variant}
      sx={{
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ padding: currentSize.padding }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant={currentSize.titleSize}
                color='text.secondary'
              >
                {title}
              </Typography>
              {tags && tags.length > 0 && (
                <Stack
                  direction='row'
                  spacing={0.5}
                >
                  {tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag.label}
                      size='small'
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: tag.color || `${bgColor}20`,
                        color: tag.color || bgColor,
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
            {subtitle && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
            {loading ? (
              <>
                <Skeleton
                  width={80}
                  height={32}
                />
                <Skeleton
                  width={60}
                  height={20}
                />
              </>
            ) : (
              <>
                <Typography
                  variant={currentSize.valueSize}
                  sx={{ fontWeight: 700 }}
                >
                  {value}
                  {unit && (
                    <Typography
                      component='span'
                      variant='body2'
                      color='text.secondary'
                      sx={{ ml: 0.5 }}
                    >
                      {unit}
                    </Typography>
                  )}
                </Typography>
                {change !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {change > 0 ? (
                      <TrendingUp style={{ width: 14, height: 14, color: 'success.dark' }} />
                    ) : change < 0 ? (
                      <TrendingDown style={{ width: 14, height: 14, color: 'error.main' }} />
                    ) : (
                      <Minus style={{ width: 14, height: 14, color: 'text.disabled' }} />
                    )}
                    <Typography
                      variant='caption'
                      sx={{
                        color:
                          change > 0
                            ? 'success.main'
                            : change < 0
                              ? 'error.main'
                              : 'text.secondary',
                      }}
                    >
                      {change > 0 ? '+' : ''}
                      {change}
                      {changeLabel && ` ${changeLabel}`}
                    </Typography>
                  </Box>
                )}
                {progress !== undefined && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {progressLabel || '进度'}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {progress}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'grey.200',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${progress}%`,
                          height: '100%',
                          bgcolor: bgColor,
                          ...(customGradient
                            ? { background: customGradient, bgcolor: 'unset' }
                            : {}),
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: currentSize.iconSize,
                height: currentSize.iconSize,
                borderRadius: 2,
                ...(customGradient
                  ? { background: customGradient, color: 'common.white' }
                  : { bgcolor: `${bgColor}15`, color: bgColor }),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        {trend && trend.length > 0 && !loading && (
          <Box sx={{ mt: 2, height: 40 }}>
            <MiniTrendChart
              data={trend}
              color={bgColor}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
