import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Box, Typography } from '@mui/material';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  isAnimated?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({
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

  const pathLength = data.reduce((acc, _, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1].split(',').map(Number);
    const curr = points[i].split(',').map(Number);
    return acc + Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
  }, 0);

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
        style={
          isAnimated
            ? {
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength,
                animation: 'drawLine 1s ease-out forwards',
              }
            : {}
        }
      />
      <circle
        cx={width}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r={isAnimated ? 0 : 3}
        fill={color}
        style={
          isAnimated
            ? {
                animation: 'pulseDot 0.5s ease-out 0.8s forwards',
              }
            : {}
        }
      />
      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseDot {
          0% { r: 0; opacity: 0; }
          50% { r: 5; opacity: 1; }
          100% { r: 3; opacity: 1; }
        }
      `}</style>
    </svg>
  );
};

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  suffix?: string;
  change?: number;
  icon?: LucideIcon | React.ReactNode;
  color?: string;
  gradient?: [string, string];
  trend?: 'up' | 'down' | 'stable' | 'neutral' | null;
  sparklineData?: number[];
  animate?: boolean;
}

const colorMap: Record<string, { bg: string; gradient: string }> = {
  green: {
    bg: 'success.main',
    gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
  },
  purple: {
    bg: 'secondary.main',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  },
  blue: {
    bg: 'primary.main',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  },
  orange: {
    bg: 'warning.main',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  red: { bg: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  cyan: {
    bg: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  unit = '',
  suffix,
  change,
  icon,
  color = 'blue',
  gradient,
  trend,
  sparklineData,
  animate = true,
}) => {
  const [displayValue, setDisplayValue] = useState(
    animate && typeof value === 'number' ? 0 : value
  );
  const [isHovered, setIsHovered] = useState(false);
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
      return (
        <Minus
          size={16}
          color='grey.400'
        />
      );
    }
    return computedTrend === 'up' ? <TrendingUp size={16} color='success.main' /> : <TrendingDown size={16} color='error.main' />;
  };

  const getTrendColor = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable')
      return '#64748B';
    return computedTrend === 'up' ? 'success.main' : 'error.main';
  };

  const renderIcon = () => {
    if (!icon) {
      return (
        <Activity
          size={24}
          color='white'
        />
      );
    }
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<{ size?: number; color?: string }>, {
        size: 24,
        color: 'white',
      });
    }
    const IconComponent = icon as LucideIcon;
    return (
      <IconComponent
        size={24}
        color='white'
      />
    );
  };

  const getIconGradient = () => {
    if (gradient) {
      return `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;
    }
    const colorInfo = colorMap[color];
    return colorInfo ? colorInfo.gradient : colorMap.blue.gradient;
  };

  const getSparklineColor = () => {
    if (!computedTrend || computedTrend === 'neutral' || computedTrend === 'stable')
      return '#64748B';
    return computedTrend === 'up' ? 'success.main' : 'error.main';
  };

  return (
    <Box
      ref={cardRef}
      sx={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: 3,
        padding: 3,
        border: '1px solid rgba(226, 232, 240, 0.6)',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: isHovered
          ? '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.1)'
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
        transform: isHovered ? 'scale(1.03) translateY(-4px)' : 'scale(1) translateY(0)',
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? 'fadeInUp 0.6s ease-out forwards' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -64,
          right: -64,
          width: 128,
          height: 128,
          opacity: isHovered ? 0.15 : 0.05,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: getIconGradient(),
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, transparent 50%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: getIconGradient(),
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 10 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='body2'
              sx={{
                color: '#64748B',
                fontWeight: 500,
                marginBottom: 0.5,
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                variant='h3'
                sx={{
                  fontWeight: 800,
                  color: '#1E293B',
                  fontSize: '2rem',
                  lineHeight: 1.2,
                }}
              >
                {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
              </Typography>
              {unit && (
                <Typography
                  variant='body1'
                  sx={{ color: '#64748B', fontWeight: 600, fontSize: '1rem' }}
                >
                  {unit}
                </Typography>
              )}
              {suffix && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.400', fontSize: '0.875rem' }}
                >
                  {suffix}
                </Typography>
              )}
            </Box>
            {subtitle && (
              <Typography
                variant='caption'
                sx={{ color: 'grey.400', marginTop: 0.5, display: 'block' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isHovered
                ? '0 8px 25px rgba(0, 0, 0, 0.15)'
                : '0 4px 15px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isHovered ? 'scale(1.15) rotate(5deg)' : 'scale(1) rotate(0deg)',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: getIconGradient(),
                transition: 'box-shadow 0.3s',
                boxShadow: isHovered ? 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' : 'none',
              }}
            >
              {renderIcon()}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  computedTrend === 'up'
                    ? '#DCFCE7'
                    : computedTrend === 'down'
                      ? 'error.100'
                      : '#F1F5F9',
                transition: 'all 0.3s',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
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
                {change !== undefined ? `${change > 0 ? '+' : ''}${change}%` : '——'}
              </Typography>
              {(computedTrend && computedTrend !== 'neutral' && computedTrend !== 'stable') ||
              change !== undefined ? (
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.400', fontSize: '0.7rem' }}
                >
                  vs last period
                </Typography>
              ) : null}
            </Box>
          </Box>

          {sparklineData && sparklineData.length > 0 && (
            <Box
              sx={{
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              <Sparkline
                data={sparklineData}
                color={getSparklineColor()}
                width={85}
                height={34}
                isAnimated={isVisible}
              />
            </Box>
          )}
        </Box>
      </Box>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
};

export default MetricCard;
