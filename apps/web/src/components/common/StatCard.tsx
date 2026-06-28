/**
 * 统一的统计卡片组件库
 * 整合了MetricCard、ChartCard等统计展示类组件
 * 提供基类组件和多种特化组件，支持丰富的交互和动画效果
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Menu,
  MenuItem,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Download,
  Maximize2,
  RefreshCw,
  Calendar,
  AlertCircle,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  MoreVertical,
  Eye,
  Target,
  Award,
  type LucideIcon,
} from 'lucide-react';

// ============ 类型定义 ============

/**
 * 趋势类型
 */
export type TrendType = 'up' | 'down' | 'stable' | 'neutral';

/**
 * 颜色类型
 */
export type CardColor =
  | 'green'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'red'
  | 'cyan'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

/**
 * 图表类型
 */
export type ChartType = 'bar' | 'line' | 'area' | 'pie';

/**
 * 卡片尺寸
 */
export type CardSize = 'sm' | 'md' | 'lg';

/**
 * Sparkline属性
 */
export interface SparklineProps {
  /** 数据点数组 */
  data: number[];
  /** 颜色 */
  color?: string;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 线宽 */
  strokeWidth?: number;
  /** 是否动画 */
  isAnimated?: boolean;
}

/**
 * 统计卡片属性（基类）
 */
export interface StatCardBaseProps {
  /** 标题 */
  title: string;
  /** 值 */
  value: string | number;
  /** 副标题 */
  subtitle?: string;
  /** 单位 */
  unit?: string;
  /** 后缀 */
  suffix?: string;
  /** 变化率 */
  change?: number;
  /** 趋势 */
  trend?: TrendType;
  /** 图标 */
  icon?: React.ReactNode;
  /** 颜色 */
  color?: CardColor;
  /** 渐变色 */
  gradient?: [string, string];
  /** 是否动画 */
  animate?: boolean;
  /** 点击事件 */
  onClick?: () => void;
  /** 自定义样式 */
  sx?: any;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * MetricCard属性
 */
export interface MetricCardProps extends StatCardBaseProps {
  /** Sparkline数据 */
  sparklineData?: number[];
  /** 目标值 */
  target?: number;
  /** 目标进度 */
  targetProgress?: number;
  /** 显示目标进度 */
  showTargetProgress?: boolean;
}

/**
 * 时间范围配置
 */
export interface TimeRange {
  label: string;
  value: string;
}

/**
 * 图表卡片属性
 */
export interface ChartCardProps {
  /** 标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 图表内容 */
  children: React.ReactNode;
  /** 高度 */
  height?: number;
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 全屏回调 */
  onFullscreen?: () => void;
  /** 图表类型列表 */
  chartTypes?: ChartType[];
  /** 当前图表类型 */
  activeChartType?: ChartType;
  /** 图表类型变化回调 */
  onChartTypeChange?: (type: ChartType) => void;
  /** 时间范围 */
  timeRange?: string;
  /** 时间范围变化回调 */
  onTimeRangeChange?: (range: string) => void;
  /** 显示时间范围选择器 */
  showTimeRange?: boolean;
  /** 显示图表类型选择器 */
  showChartType?: boolean;
  /** 显示导出按钮 */
  showExport?: boolean;
  /** 显示全屏按钮 */
  showFullscreen?: boolean;
  /** 显示刷新按钮 */
  showRefresh?: boolean;
  /** 趋势 */
  trend?: TrendType;
  /** 趋势值 */
  trendValue?: string;
  /** 自定义样式 */
  sx?: any;
}

// ============ 颜色配置 ============

/**
 * 颜色配置映射
 */
const COLOR_MAP: Record<string, { bg: string; gradient: string; light: string; main: string }> = {
  green: {
    bg: 'success.main',
    gradient: 'linear-gradient(135deg, success.main, success.dark)',
    light: 'success.lightest',
    main: 'success.main',
  },
  purple: {
    bg: 'secondary.main',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    light: 'secondary.lightest',
    main: 'secondary.main',
  },
  blue: {
    bg: 'primary.main',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    light: 'primary.lightest',
    main: 'primary.main',
  },
  orange: {
    bg: 'warning.main',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    light: 'warning.lightest',
    main: 'warning.main',
  },
  red: {
    bg: 'error.main',
    gradient: 'linear-gradient(135deg, error.main, #DC2626)',
    light: 'error.lightest',
    main: 'error.main',
  },
  cyan: {
    bg: 'info.main',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    light: 'info.lightest',
    main: 'info.main',
  },
  primary: {
    bg: 'primary.main',
    gradient: 'linear-gradient(135deg, #1976d2, #1565c0)',
    light: 'primary.lightest',
    main: 'primary.main',
  },
  success: {
    bg: 'success.main',
    gradient: 'linear-gradient(135deg, #388e3c, success.dark)',
    light: 'success.lightest',
    main: 'success.main',
  },
  warning: {
    bg: 'warning.main',
    gradient: 'linear-gradient(135deg, #f57c00, #ef6c00)',
    light: 'warning.lightest',
    main: 'warning.main',
  },
  error: {
    bg: 'error.main',
    gradient: 'linear-gradient(135deg, #d32f2f, #c62828)',
    light: 'error.lightest',
    main: 'error.main',
  },
  info: {
    bg: 'info.main',
    gradient: 'linear-gradient(135deg, #0288d1, #0277bd)',
    light: 'info.lightest',
    main: 'info.main',
  },
};

/**
 * 默认时间范围配置
 */
const DEFAULT_TIME_RANGES: TimeRange[] = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
];

// ============ Sparkline组件 ============

/**
 * Sparkline迷你图表组件
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = 'primary.main',
  width = 80,
  height = 32,
  strokeWidth = 2,
  isAnimated = false,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - strokeWidth * 2) - strokeWidth;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id={`gradient-${color.replace('#', '')}`}
          x1='0%'
          y1='0%'
          x2='0%'
          y2='100%'
        >
          <stop
            offset='0%'
            stopColor={color}
            stopOpacity='0.3'
          />
          <stop
            offset='100%'
            stopColor={color}
            stopOpacity='0'
          />
        </linearGradient>
      </defs>
      <path
        d={areaD}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      <path
        d={pathD}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle
        cx={width}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r={3}
        fill={color}
      />
    </svg>
  );
};

// ============ StatCardBase组件 ============

/**
 * 统计卡片基类组件
 */
export const StatCardBase: React.FC<StatCardBaseProps> = ({
  title,
  value,
  subtitle,
  unit,
  suffix,
  change,
  trend,
  icon,
  color = 'blue',
  gradient,
  animate = true,
  onClick,
  sx,
  children,
}) => {
  const [displayValue, setDisplayValue] = useState(
    animate && typeof value === 'number' ? 0 : value
  );
  const [isHovered, _setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!animate || typeof value !== 'number' || !isVisible) {
      setDisplayValue(value);
      return;
    }

    const duration = 1200;
    const steps = 40;
    const stepDuration = duration / steps;
    const startValue = 0;
    const endValue = value as number;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(endValue);
        clearInterval(timer);
      } else {
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 4);
        setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate, isVisible]);

  const computedTrend = trend ?? (change !== undefined ? (change >= 0 ? 'up' : 'down') : null);

  const getTrendIcon = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable') {
      return <Minus size={16} />;
    }
    return computedTrend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  const getTrendColor = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable') {
      return 'text.secondary';
    }
    return computedTrend === 'up' ? 'success.main' : 'error.main';
  };

  const getTrendBgColor = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable') {
      return 'action.hover';
    }
    return computedTrend === 'up' ? 'success.lightest' : 'error.lightest';
  };

  const colorInfo = COLOR_MAP[color] || COLOR_MAP.blue;
  const iconGradient = gradient
    ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
    : colorInfo.gradient;

  return (
    <Box
      ref={cardRef}
      onClick={onClick}
      sx={{
        position: 'relative',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick
          ? {
              boxShadow: 4,
              transform: 'translateY(-2px)',
            }
          : {},
        ...sx,
      }}
    >
      {/* 背景装饰 */}
      <Box
        sx={{
          position: 'absolute',
          top: -64,
          right: -64,
          width: 128,
          height: 128,
          opacity: isHovered ? 0.15 : 0.05,
          transition: 'opacity 0.3s',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: iconGradient,
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
      </Box>

      {/* 顶部进度条 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: iconGradient,
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 10 }}>
        {/* 标题和图标行 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                variant='h3'
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  fontSize: '2rem',
                  lineHeight: 1.2,
                }}
              >
                {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
              </Typography>
              {unit && (
                <Typography
                  variant='body1'
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  {unit}
                </Typography>
              )}
              {suffix && (
                <Typography
                  variant='body2'
                  sx={{ color: 'text.disabled', fontSize: '0.875rem' }}
                >
                  {suffix}
                </Typography>
              )}
            </Box>
            {subtitle && (
              <Typography
                variant='caption'
                sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: iconGradient,
                boxShadow: isHovered
                  ? '0 8px 25px rgba(0, 0, 0, 0.15)'
                  : '0 4px 15px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                color: 'white',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {/* 趋势信息 */}
        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getTrendBgColor(),
                color: getTrendColor(),
              }}
            >
              {getTrendIcon()}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 700,
                  color: getTrendColor(),
                  fontSize: '0.875rem',
                }}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
              >
                vs 上期
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============ MetricCard组件 ============

/**
 * 指标卡片组件
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  unit,
  suffix,
  change,
  trend,
  icon,
  color = 'blue',
  gradient,
  animate = true,
  onClick,
  sx,
  sparklineData,
  target,
  targetProgress,
  showTargetProgress = false,
}) => {
  const [_isHovered, _setIsHovered] = useState(false);
  const computedTrend = trend ?? (change !== undefined ? (change >= 0 ? 'up' : 'down') : null);

  const getSparklineColor = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable') {
      return 'text.secondary';
    }
    return computedTrend === 'up' ? 'success.main' : 'error.main';
  };

  const colorInfo = COLOR_MAP[color] || COLOR_MAP.blue;
  const iconGradient = gradient
    ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
    : colorInfo.gradient;

  return (
    <StatCardBase
      title={title}
      value={value}
      subtitle={subtitle}
      unit={unit}
      suffix={suffix}
      change={change}
      trend={trend}
      icon={icon}
      color={color}
      gradient={gradient}
      animate={animate}
      onClick={onClick}
      sx={{
        ...sx,
      }}
    >
      {/* 渲染子元素（如果有） */}
      {(sparklineData || showTargetProgress) && (
        <Box sx={{ mt: 2 }}>
          {sparklineData && sparklineData.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Sparkline
                data={sparklineData}
                color={getSparklineColor()}
                width={85}
                height={34}
              />
            </Box>
          )}
          {showTargetProgress && targetProgress !== undefined && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  目标进度
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {targetProgress}%
                </Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={targetProgress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: colorInfo.light,
                  '& .MuiLinearProgress-bar': {
                    background: iconGradient,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </StatCardBase>
  );
};

// ============ ChartCard组件 ============

/**
 * 图表卡片组件
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  height = 320,
  loading = false,
  error,
  onRefresh,
  onExport,
  onFullscreen,
  chartTypes = ['bar', 'line', 'area', 'pie'],
  activeChartType = 'bar',
  onChartTypeChange,
  timeRange = 'month',
  onTimeRangeChange,
  showTimeRange = false,
  showChartType = false,
  showExport = true,
  showFullscreen = true,
  showRefresh = true,
  trend,
  trendValue,
  sx,
}) => {
  const [timeMenuAnchor, setTimeMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const chartTypeIcons: Record<ChartType, React.ReactNode> = {
    bar: <BarChart3 style={{ width: 16, height: 16 }} />,
    line: <LineChart style={{ width: 16, height: 16 }} />,
    area: <AreaChart style={{ width: 16, height: 16 }} />,
    pie: <PieChart style={{ width: 16, height: 16 }} />,
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    return trend === 'up' ? (
      <TrendingUp style={{ width: 16, height: 16, color: 'success.main' }} />
    ) : (
      <TrendingUp
        style={{
          width: 16,
          height: 16,
          color: 'error.main',
          transform: 'rotate(180deg)',
        }}
      />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text.secondary';
    return trend === 'up' ? 'success.main' : 'error.main';
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        transition: 'all 0.3s',
        '&:hover': { boxShadow: 3 },
        ...sx,
      }}
    >
      <CardHeader
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            {trend && trendValue && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: getTrendColor(),
                }}
              >
                {getTrendIcon()}
                <Typography
                  variant='caption'
                  sx={{ fontWeight: 500 }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
        }
        subheader={
          subtitle ? (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {subtitle}
            </Typography>
          ) : undefined
        }
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showChartType && chartTypes.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                {chartTypes.map((type) => (
                  <IconButton
                    key={type}
                    size='small'
                    onClick={() => onChartTypeChange?.(type)}
                    sx={{
                      borderRadius: 0.5,
                      bgcolor: activeChartType === type ? 'background.paper' : 'transparent',
                      color: activeChartType === type ? 'primary.main' : 'text.secondary',
                      boxShadow: activeChartType === type ? 1 : 0,
                    }}
                  >
                    {chartTypeIcons[type]}
                  </IconButton>
                ))}
              </Box>
            )}

            {showTimeRange && (
              <Button
                variant='text'
                size='small'
                onClick={(e) => setTimeMenuAnchor(e.currentTarget)}
                sx={{ textTransform: 'none' }}
              >
                <Calendar style={{ width: 16, height: 16, marginRight: 0.5 }} />
                {DEFAULT_TIME_RANGES.find((r) => r.value === timeRange)?.label || '本月'}
              </Button>
            )}

            <IconButton
              size='small'
              onClick={(e) => setActionMenuAnchor(e.currentTarget)}
            >
              <MoreVertical style={{ width: 16, height: 16 }} />
            </IconButton>
          </Box>
        }
      />

      <CardContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton sx={{ width: '33%', height: 16 }} />
            <Skeleton sx={{ width: '100%', height, borderRadius: 2 }} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <AlertCircle style={{ width: 24, height: 24, color: 'error.main' }} />
            </Box>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              {error}
            </Typography>
            {onRefresh && (
              <Button
                variant='outlined'
                size='small'
                onClick={onRefresh}
                startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              >
                重试
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ height }}>{children}</Box>
        )}
      </CardContent>

      {/* 时间范围菜单 */}
      <Menu
        anchorEl={timeMenuAnchor}
        open={Boolean(timeMenuAnchor)}
        onClose={() => setTimeMenuAnchor(null)}
      >
        {DEFAULT_TIME_RANGES.map((range) => (
          <MenuItem
            key={range.value}
            onClick={() => {
              onTimeRangeChange?.(range.value);
              setTimeMenuAnchor(null);
            }}
            selected={timeRange === range.value}
          >
            {range.label}
          </MenuItem>
        ))}
      </Menu>

      {/* 操作菜单 */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {showRefresh && onRefresh && (
          <MenuItem
            onClick={() => {
              onRefresh();
              setActionMenuAnchor(null);
            }}
          >
            <RefreshCw style={{ width: 16, height: 16, marginRight: 1 }} />
            刷新数据
          </MenuItem>
        )}
        {showExport && onExport && (
          <MenuItem
            onClick={() => {
              onExport();
              setActionMenuAnchor(null);
            }}
          >
            <Download style={{ width: 16, height: 16, marginRight: 1 }} />
            导出数据
          </MenuItem>
        )}
        {showFullscreen && onFullscreen && (
          <MenuItem
            onClick={() => {
              onFullscreen();
              setActionMenuAnchor(null);
            }}
          >
            <Maximize2 style={{ width: 16, height: 16, marginRight: 1 }} />
            全屏查看
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

// ============ 默认导出 ============

export default {
  Sparkline,
  StatCardBase,
  MetricCard,
  ChartCard,
};
