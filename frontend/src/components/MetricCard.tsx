import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  change?: number;
  icon?: LucideIcon | React.ReactNode;
  color?: string;
  gradient?: [string, string];
  trend?: 'up' | 'down' | 'stable' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  unit = '',
  change,
  icon,
  color = 'from-blue-500 to-cyan-500',
  gradient,
  trend,
}) => {
  const renderTrend = () => {
    if (!trend || trend === 'neutral' || trend === 'stable') return null;

    const trendIcon = trend === 'up' ? <TrendingUp className='w-4 h-4' /> : <TrendingDown className='w-4 h-4' />;
    const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

    return (
      <div className={`flex items-center space-x-1 ${trendColor}`}>
        {trendIcon}
        <span className='text-sm font-medium'>
          {change !== undefined ? `${change > 0 ? '+' : ''}${change}%` : ''}
        </span>
      </div>
    );
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

  const iconBgStyle = gradient ? {
    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
  } : undefined;

  return (
    <div className='bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-slate-200'>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <p className='text-sm text-slate-600 mb-1'>{title}</p>
          <div className='flex items-baseline space-x-1'>
            <span className='text-3xl font-bold text-slate-900'>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className='text-sm text-slate-500'>{unit}</span>}
          </div>
          {subtitle && <p className='text-xs text-slate-500 mt-1'>{subtitle}</p>}
          {renderTrend()}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center shadow-lg`} style={iconBgStyle}>
          {renderIcon()}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
