import React from 'react';
import { BIChartColors } from './chartTheme';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: (value: number | string, name: string) => [string, string];
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className='bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 min-w-[140px]'>
      {label && (
        <p className='text-xs font-medium text-slate-500 mb-2 pb-2 border-b border-slate-100'>
          {label}
        </p>
      )}
      <div className='space-y-1.5'>
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value, entry.name)
            : [
                typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value,
                entry.name,
              ];

          return (
            <div key={index} className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-2'>
                <div
                  className='w-2.5 h-2.5 rounded-full'
                  style={{ backgroundColor: entry.color }}
                />
                <span className='text-sm text-slate-600'>{displayName}</span>
              </div>
              <span className='text-sm font-semibold text-slate-900'>{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Percentage formatter
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Currency formatter (CNY)
export const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString()}`;
};

// Number with unit formatter
export const formatWithUnit = (value: number, unit: string): string => {
  return `${value.toLocaleString()}${unit}`;
};

export default CustomTooltip;
