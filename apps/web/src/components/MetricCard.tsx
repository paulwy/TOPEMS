import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#3B82F6',
  width = 80,
  height = 32,
  strokeWidth = 2,
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

  // Area fill
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className='overflow-visible'>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor={color} stopOpacity='0.3' />
          <stop offset='100%' stopColor={color} stopOpacity='0' />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#gradient-${color.replace('#', '')})`} />
      <path
        d={pathD}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r={3}
        fill={color}
      />
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
  trend?: 'up' | 'down' | 'stable' | 'neutral';
  sparklineData?: number[];
  animate?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  unit = '',
  suffix,
  change,
  icon,
  color = 'from-blue-500 to-cyan-500',
  gradient,
  trend,
  sparklineData,
  animate = true,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(animate && typeof value === 'number' ? 0 : value);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Animate number counting
  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const startValue = 0;
    const endValue = value as number;
    const increment = (endValue - startValue) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(endValue);
        clearInterval(timer);
      } else {
        const progress = currentStep / steps;
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(startValue + (endValue - startValue) * eased));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  const getTrendIcon = () => {
    if (!trend || trend === 'neutral' || trend === 'stable') {
      return <Minus className='w-4 h-4 text-slate-400' />;
    }
    return trend === 'up' ? <TrendingUp className='w-4 h-4' /> : <TrendingDown className='w-4 h-4' />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 'neutral' || trend === 'stable') return 'text-slate-500';
    return trend === 'up' ? 'text-emerald-500' : 'text-rose-500';
  };

  const renderIcon = () => {
    if (!icon) {
      return <Activity className='w-6 h-6 text-white' />;
    }
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 text-white' });
    }
    return (icon as LucideIcon)({ className: 'w-6 h-6 text-white' });
  };

  const iconBgStyle = gradient
    ? {
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }
    : undefined;

  const getSparklineColor = () => {
    if (!trend || trend === 'neutral' || trend === 'stable') return '#64748B';
    return trend === 'up' ? '#10B981' : '#EF4444';
  };

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white rounded-2xl shadow-sm p-6 
        border border-slate-200/60 overflow-hidden
        transition-all duration-300 ease-out
        hover:shadow-lg hover:border-slate-300/80
        hover:scale-[1.02]
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background decoration */}
      <div className='absolute top-0 right-0 w-32 h-32 opacity-5'>
        <div
          className={`w-full h-full bg-gradient-to-br ${color} rounded-full blur-3xl transform translate-x-8 -translate-y-8`}
        />
      </div>

      {/* Hover glow effect */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent
          transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div className='relative z-10'>
        <div className='flex items-start justify-between mb-4'>
          <div className='flex-1'>
            <p className='text-sm font-medium text-slate-500 mb-1 tracking-wide'>{title}</p>
            <div className='flex items-baseline gap-1.5'>
              <span className='text-3xl font-bold text-slate-900 tracking-tight'>
                {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
              </span>
              {unit && <span className='text-base text-slate-500 font-medium'>{unit}</span>}
              {suffix && <span className='text-sm text-slate-400'>{suffix}</span>}
            </div>
            {subtitle && <p className='text-xs text-slate-400 mt-1.5'>{subtitle}</p>}
          </div>

          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              shadow-lg transition-transform duration-300
              ${isHovered ? 'scale-110 rotate-3' : ''}
            `}
            style={iconBgStyle}
          >
            <div className={`bg-gradient-to-br ${color} w-full h-full rounded-xl flex items-center justify-center`}>
              {renderIcon()}
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <div className={`flex items-center gap-1.5 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className='text-sm font-semibold'>
              {change !== undefined ? `${change > 0 ? '+' : ''}${change}%` : ''}
            </span>
            {trend && trend !== 'neutral' && trend !== 'stable' && (
              <span className='text-xs text-slate-400 ml-1'>vs last period</span>
            )}
          </div>

          {sparklineData && sparklineData.length > 0 && (
            <div className={`transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}>
              <Sparkline data={sparklineData} color={getSparklineColor()} width={80} height={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
