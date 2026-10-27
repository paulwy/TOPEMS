import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Box, Typography, useTheme } from '@mui/material';
import { useCountUp, countUpEasings } from '@/hooks/useCountUp';
import { designTokens } from '@topems/tokens';

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

interface MetricCardProps {
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
    gradient: `linear-gradient(135deg, ${designTokens.colors.success.main}, ${designTokens.colors.success.dark})`,
  },
  purple: {
    bg: 'secondary.main',
    gradient: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.secondary.dark})`,
  },
  blue: {
    bg: 'primary.main',
    gradient: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.primary.dark})`,
  },
  orange: {
    bg: 'warning.main',
    gradient: `linear-gradient(135deg, ${designTokens.colors.warning.main}, ${designTokens.colors.warning.dark})`,
  },
  red: {
    bg: designTokens.colors.error.main,
    gradient: `linear-gradient(135deg, ${designTokens.colors.error.main}, ${designTokens.colors.error.dark})`,
  },
  cyan: {
    bg: `${designTokens.colors.cyan['500']}`,
    gradient: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']})`,
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
  const theme = useTheme();
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

