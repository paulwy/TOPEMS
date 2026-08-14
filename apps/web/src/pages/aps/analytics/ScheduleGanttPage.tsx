import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
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
  { name: i18n.t('pages.schedule_gantt_page.sch001a_0'), start: 1, duration: 5, status: 'completed' },
  { name: i18n.t('pages.schedule_gantt_page.sch002b_1'), start: 3, duration: 4, status: 'completed' },
  { name: i18n.t('pages.schedule_gantt_page.sch003c_2'), start: 6, duration: 6, status: 'running' },
  { name: i18n.t('pages.schedule_gantt_page.sch004d_3'), start: 8, duration: 3, status: 'released' },
  { name: i18n.t('pages.schedule_gantt_page.sch005e_4'), start: 10, duration: 5, status: 'pending' },
  { name: i18n.t('pages.schedule_gantt_page.sch006f_5'), start: 12, duration: 4, status: 'pending' },
  { name: i18n.t('pages.schedule_gantt_page.sch007g_6'), start: 14, duration: 7, status: 'pending' },
];
const STATUS_COLORS: Record<string, string> = {
  completed: designTokens.colors.success.dark,
  running: designTokens.colors.primary.main,
  released: designTokens.colors.warning.main,
  pending: 'colors.grey.400',
  cancelled: designTokens.colors.error.main,
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
        <h1 className='text-2xl font-bold'>{i18n.t('aps.schedule_gantt_page.k0')}</h1>
        <span className='text-sm text-gray-500'>{i18n.t('aps.schedule_gantt_page.k1')}</span>
      </div>
      <p className='text-sm text-gray-600'>
        {i18n.t('pages.schedule_gantt_page.k0')}
      </p>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.schedule_gantt_page.k2')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{data.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.schedule_gantt_page.k3')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{completedCount}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.schedule_gantt_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{runningCount}</p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('aps.schedule_gantt_page.k5')}</h3>
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
              label={{ value: i18n.t('aps.schedule_gantt_page.k6'), position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type='category'
              dataKey='name'
              fontSize={10}
              width={120}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === i18n.t('aps.schedule_gantt_page.k7')) return [`${value}${i18n.t('pages.schedule_gantt_page.k7')}`, name];
                return [value, name];
              }}
            />
            <Legend />
            <Bar
              dataKey='duration'
              name={i18n.t('aps.schedule_gantt_page.k8')}
              stackId='gantt'
              barSize={24}
            >
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey='duration'
                  fill={STATUS_COLORS[entry.status] ?? 'colors.grey.400'}
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