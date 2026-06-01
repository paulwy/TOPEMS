import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  trend?: 'up' | 'down' | 'stable';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    light: 'bg-blue-50',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    light: 'bg-green-50',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    light: 'bg-purple-50',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    light: 'bg-orange-50',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    light: 'bg-red-50',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  change,
  icon,
  color = 'blue',
  trend,
}) => {
  const colors = colorClasses[color];

  const renderTrend = () => {
    if (change === undefined || change === null) return null;
    
    const isPositive = change >= 0;
    const trendIcon = isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
    const trendColor = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className={`flex items-center space-x-1 ${trendColor}`}>
        {trendIcon}
        <span className="text-sm font-medium">{change > 0 ? '+' : ''}{change}%</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <div className="flex items-baseline space-x-1">
            <span className={`text-3xl font-bold ${colors.text}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {renderTrend()}
        </div>
        {icon ? (
          <div className={`w-12 h-12 ${colors.light} rounded-lg flex items-center justify-center`}>
            <span className={colors.text}>{icon}</span>
          </div>
        ) : (
          <div className={`w-12 h-12 ${colors.light} rounded-lg flex items-center justify-center`}>
            <Activity className={`w-6 h-6 ${colors.text}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;