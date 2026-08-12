/**
 * 排程甘特图分析页
 *
 * 使用 recharts BarChart（横向）展示排程执行时间线：
 * - 每行一个排程任务
 * - 柱条表示计划开始到结束的时间跨度
 * - 颜色区分状态
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const mockSchedules = [
  { name: 'SCH-001 工单A', start: 1, duration: 5, status: 'completed' },
  { name: 'SCH-002 工单B', start: 3, duration: 4, status: 'completed' },
  { name: 'SCH-003 工单C', start: 6, duration: 6, status: 'running' },
  { name: 'SCH-004 工单D', start: 8, duration: 3, status: 'released' },
  { name: 'SCH-005 工单E', start: 10, duration: 5, status: 'pending' },
  { name: 'SCH-006 工单F', start: 12, duration: 4, status: 'pending' },
  { name: 'SCH-007 工单G', start: 14, duration: 7, status: 'pending' },
];

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  running: '#3b82f6',
  released: '#f59e0b',
  pending: '#9ca3af',
  cancelled: '#ef4444',
};

export default function ScheduleGanttPage() {
  const data = useMemo(() => {
    return mockSchedules.map((s) => ({
      ...s,
      end: s.start + s.duration,
      // recharts stacked bar: 用 base offset + duration 来画甘特
      offset: s.start,
    }));
  }, []);

  const totalDuration = useMemo(() => {
    return Math.max(...data.map((d) => d.end));
  }, [data]);

  const completedCount = useMemo(
    () => data.filter((d) => d.status === 'completed').length,
    [data],
  );
  const runningCount = useMemo(
    () => data.filter((d) => d.status === 'running').length,
    [data],
  );

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>排程甘特图</h1>
        <span className='text-sm text-gray-500'>排程执行时间线视图</span>
      </div>
      <p className='text-sm text-gray-600'>
        以甘特图形式展示各排程任务的计划起止时间与执行状态，直观呈现资源占用与排程冲突。
      </p>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>排程总数</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{data.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>已完成</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{completedCount}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>进行中</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{runningCount}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>排程甘特图（天数）</h3>
        <ResponsiveContainer
          width='100%'
          height={360}
        >
          <BarChart
            data={data}
            layout='vertical'
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              type='number'
              domain={[0, totalDuration + 2]}
              fontSize={11}
              label={{ value: '天数', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type='category'
              dataKey='name'
              fontSize={10}
              width={120}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === '工期') return [`${value} 天`, name];
                return [value, name];
              }}
            />
            <Legend />
            <Bar
              dataKey='duration'
              name='工期'
              stackId='gantt'
              barSize={24}
            >
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey='duration'
                  fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className='mt-4 flex flex-wrap gap-4'>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div
              key={status}
              className='flex items-center gap-2'
            >
              <span
                className='inline-block h-3 w-3 rounded'
                style={{ backgroundColor: color }}
              />
              <span className='text-sm text-gray-600'>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
