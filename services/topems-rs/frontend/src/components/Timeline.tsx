import React from 'react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  icon?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
}

export const Timeline: React.FC<TimelineProps> = ({ items, orientation = 'vertical' }) => {
  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center justify-between w-full">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                item.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : item.status === 'current'
                  ? 'bg-primary-100 text-primary-600 ring-4 ring-primary-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {item.icon || (item.status === 'completed' ? '✓' : index + 1)}
            </div>
            <div className="mt-2 text-center">
              <p className={`text-sm font-medium ${
                item.status === 'completed' || item.status === 'current'
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}>
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
            </div>
            {index < items.length - 1 && (
              <div className={`absolute h-0.5 top-5 w-[calc(100%/(${items.length}-1))] ${
                item.status === 'completed' ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                item.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : item.status === 'current'
                  ? 'bg-primary-100 text-primary-600 ring-4 ring-primary-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {item.icon || (item.status === 'completed' ? '✓' : index + 1)}
            </div>
            {index < items.length - 1 && (
              <div className={`w-0.5 h-full mt-2 ${
                item.status === 'completed' ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
          <div className={`flex-1 pb-6 ${item.status === 'current' ? 'font-medium' : ''}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base ${
                item.status === 'completed' || item.status === 'current'
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}>
                {item.title}
              </h3>
              <span className="text-sm text-gray-400">{item.timestamp}</span>
            </div>
            {item.description && (
              <p className={`text-sm mt-1 ${
                item.status === 'completed' || item.status === 'current'
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}>
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'primary',
  size = 'md',
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          {showPercentage && (
            <span className="font-medium text-gray-900">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!label && showPercentage && (
        <p className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}%</p>
      )}
    </div>
  );
};

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'primary',
  showLabel = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorClasses[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{percentage.toFixed(0)}%</span>
          <span className="text-xs text-gray-500">完成</span>
        </div>
      )}
    </div>
  );
};

export default Timeline;
