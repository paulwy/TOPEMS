import React from 'react';
import { Card, CardContent, Box, Typography, Skeleton, Tooltip, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============ 类型定义 ============

export interface StatCardProps {
  // 基本信息
  title: string;
  value: string | number;
  unit?: string;

  // 变化趋势
  change?: number;
  changeLabel?: string;
  changeDirection?: 'up' | 'down' | 'neutral';

  // 样式
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  gradient?: boolean;
  customGradient?: string;

  // 交互
  onClick?: () => void;
  tooltip?: string;

  // 状态
  loading?: boolean;
  trendData?: number[];

  // 子内容
  children?: React.ReactNode;
}

// ============ StatCard 组件 ============

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  changeDirection,
  icon,
  color = 'primary',
  gradient = false,
  customGradient,
  onClick,
  tooltip,
  loading,
  children,
}) => {
  const theme = useTheme();

  // 颜色映射
  const colorMap: Record<string, { main: string; light: string; dark: string }> = {
    primary: { main: 'primary.main', light: '#60a5fa', dark: 'primary.dark' },
    secondary: { main: 'secondary.main', light: 'secondary.light', dark: 'secondary.dark' },
    success: { main: 'success.dark', light: '#4ade80', dark: 'success.dark' },
    warning: { main: 'warning.main', light: 'warning.light', dark: 'warning.dark' },
    error: { main: 'error.main', light: 'error.light', dark: 'error.dark' },
    info: { main: 'info.main', light: '#22d3ee', dark: '#0891b2' },
  };

  const colors = colorMap[color];

  // 趋势方向
  const trend =
    changeDirection || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral');

  // 趋势图标
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // 趋势颜色
  const trendColor =
    trend === 'up'
      ? theme.palette.success.main
      : trend === 'down'
        ? theme.palette.error.main
        : theme.palette.text.secondary;

  const content = (
    <Card
      sx={{
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            }
          : {},
        ...(gradient && {
          background: customGradient || `linear-gradient(135deg, ${colors.main} 0%, ${colors.dark} 100%)`,
          color: 'white',
        }),
      }}
      onClick={onClick}
    >
      {gradient && (
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `rgba(255, 255, 255, 0.1)`,
          }}
        />
      )}

      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ flex: 1 }}>
            {/* 标题 */}
            <Typography
              variant='body2'
              sx={{
                color: gradient ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                mb: 1,
                fontWeight: 500,
              }}
            >
              {title}
            </Typography>

            {/* 数值 */}
            {loading ? (
              <>
                <Skeleton
                  width={100}
                  height={40}
                />
                <Skeleton
                  width={60}
                  height={20}
                  sx={{ mt: 0.5 }}
                />
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography
                    variant='h4'
                    sx={{
                      fontWeight: 700,
                      color: gradient ? 'white' : 'text.primary',
                      lineHeight: 1.2,
                    }}
                  >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </Typography>
                  {unit && (
                    <Typography
                      variant='body2'
                      sx={{
                        color: gradient ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      }}
                    >
                      {unit}
                    </Typography>
                  )}
                </Box>

                {/* 变化趋势 */}
                {change !== undefined && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 1,
                    }}
                  >
                    <TrendIcon style={{ width: 14, height: 14, color: trendColor }} />
                    <Typography
                      variant='caption'
                      sx={{
                        color: gradient ? 'rgba(255,255,255,0.9)' : trendColor,
                        fontWeight: 500,
                      }}
                    >
                      {change > 0 ? '+' : ''}
                      {change}%{changeLabel && ` ${changeLabel}`}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* 图标 */}
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : customGradient ? undefined : `${colors.main}15`,
                color: gradient ? 'white' : colors.main,
                ...(customGradient && !gradient && { background: customGradient, color: '#fff' }),
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {/* 子内容 */}
        {children && <Box sx={{ mt: 2 }}>{children}</Box>}
      </CardContent>
    </Card>
  );

  // 包装 Tooltip
  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        placement='top'
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

// ============ 快捷统计卡片组 ============

export interface StatCardGroupProps {
  stats: Omit<StatCardProps, ''>[];
  loading?: boolean;
  columns?: number;
}

export const StatCardGroup: React.FC<StatCardGroupProps> = ({ stats, loading, columns = 4 }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: `repeat(${Math.min(columns, 4)}, 1fr)`,
        },
        gap: 2,
      }}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={stat.title + index}
          {...stat}
          loading={loading}
        />
      ))}
    </Box>
  );
};

export default StatCard;
