import React, { useState } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  MoreVertical,
  Download,
  Maximize2,
  RefreshCw,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';

type ChartType = 'bar' | 'line' | 'area' | 'pie';

interface TimeRange {
  label: string;
  value: string;
}

const timeRanges: TimeRange[] = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  chartTypes?: ChartType[];
  activeChartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  showTimeRange?: boolean;
  showChartType?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showRefresh?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

const ChartCardIcon: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 className='w-4 h-4' />,
  line: <LineChart className='w-4 h-4' />,
  area: <AreaChart className='w-4 h-4' />,
  pie: <PieChart className='w-4 h-4' />,
};

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
  className = '',
  trend,
  trendValue,
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    return trend === 'up' ? (
      <TrendingUp className='w-4 h-4 text-emerald-500' />
    ) : (
      <TrendingUp className='w-4 h-4 text-rose-500 rotate-180' />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-slate-500';
    return trend === 'up' ? 'text-emerald-500' : 'text-rose-500';
  };

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-slate-200/60 
        overflow-hidden transition-all duration-300
        hover:shadow-md hover:border-slate-300/60
        ${className}
      `}
    >
      {/* Header */}
      <div className='px-6 py-4 border-b border-slate-100'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-semibold text-slate-900'>{title}</h3>
              {trend && trendValue && (
                <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className='text-xs font-medium'>{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && <p className='text-sm text-slate-500 mt-0.5'>{subtitle}</p>}
          </div>

          <div className='flex items-center gap-2'>
            {/* Chart Type Selector */}
            {showChartType && chartTypes.length > 1 && (
              <div className='flex items-center bg-slate-100 rounded-lg p-0.5'>
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => onChartTypeChange?.(type)}
                    className={`
                      p-1.5 rounded-md transition-all duration-200
                      ${activeChartType === type ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}
                    `}
                    title={type}
                  >
                    {ChartCardIcon[type]}
                  </button>
                ))}
              </div>
            )}

            {/* Time Range Selector */}
            {showTimeRange && (
              <div className='relative'>
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors'
                >
                  <Calendar className='w-4 h-4' />
                  <span>{timeRanges.find((r) => r.value === timeRange)?.label || '本月'}</span>
                </button>
                {showTimePicker && (
                  <div className='absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[100px]'>
                    {timeRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => {
                          onTimeRangeChange?.(range.value);
                          setShowTimePicker(false);
                        }}
                        className={`
                          w-full px-3 py-1.5 text-sm text-left hover:bg-slate-50
                          ${timeRange === range.value ? 'text-blue-600 font-medium' : 'text-slate-600'}
                        `}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors'>
                  <MoreVertical className='w-4 h-4' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40'>
                {showRefresh && (
                  <DropdownMenuItem onClick={onRefresh} className='cursor-pointer'>
                    <RefreshCw className='w-4 h-4 mr-2' />
                    刷新数据
                  </DropdownMenuItem>
                )}
                {showExport && (
                  <DropdownMenuItem onClick={onExport} className='cursor-pointer'>
                    <Download className='w-4 h-4 mr-2' />
                    导出数据
                  </DropdownMenuItem>
                )}
                {showFullscreen && (
                  <DropdownMenuItem onClick={onFullscreen} className='cursor-pointer'>
                    <Maximize2 className='w-4 h-4 mr-2' />
                    全屏查看
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='p-6'>
        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-4 w-1/3' />
            <Skeleton className='h-[200px] w-full rounded-lg' />
          </div>
        ) : error ? (
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <div className='w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3'>
              <svg className='w-6 h-6 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
              </svg>
            </div>
            <p className='text-sm text-slate-600 mb-2'>{error}</p>
            {onRefresh && (
              <Button variant='outline' size='sm' onClick={onRefresh}>
                <RefreshCw className='w-4 h-4 mr-1' />
                重试
              </Button>
            )}
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
