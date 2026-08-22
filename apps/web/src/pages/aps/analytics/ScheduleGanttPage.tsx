import { designTokens } from '@topems/tokens';
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
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography } from '@mui/material';
import { Calendar, CheckCircle, PlayCircle } from 'lucide-react';
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
  {
    name: i18n.t('pages.schedule_gantt_page.sch001a_0'),
    start: 1,
    duration: 5,
    status: 'completed',
  },
  {
    name: i18n.t('pages.schedule_gantt_page.sch002b_1'),
    start: 3,
    duration: 4,
    status: 'completed',
  },
  { name: i18n.t('pages.schedule_gantt_page.sch003c_2'), start: 6, duration: 6, status: 'running' },
  {
    name: i18n.t('pages.schedule_gantt_page.sch004d_3'),
    start: 8,
    duration: 3,
    status: 'released',
  },
  {
    name: i18n.t('pages.schedule_gantt_page.sch005e_4'),
    start: 10,
    duration: 5,
    status: 'pending',
  },
  {
    name: i18n.t('pages.schedule_gantt_page.sch006f_5'),
    start: 12,
    duration: 4,
    status: 'pending',
  },
  {
    name: i18n.t('pages.schedule_gantt_page.sch007g_6'),
    start: 14,
    duration: 7,
    status: 'pending',
  },
];

const STATUS_COLORS: Record<string, string> = {
  completed: designTokens.colors.success.dark,
  running: designTokens.colors.primary.main,
  released: designTokens.colors.warning.main,
  pending: 'colors.grey.400',
  cancelled: designTokens.colors.error.main,
};

export default function ScheduleGanttPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['aps', 'ScheduleGanttPage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listSchedules();
        const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        return { schedules: items };
      } catch {
        return {};
      }
    },
  });

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

  const completedCount = useMemo(() => data.filter((d) => d.status === 'completed').length, [data]);
  const runningCount = useMemo(() => data.filter((d) => d.status === 'running').length, [data]);

  const statCards: StatCard[] = [
    {
      id: 'totalSchedules',
      title: t('aps.schedule_gantt_page.k2'),
      value: data.length,
      icon: <Calendar size={24} />,
      color: 'info',
    },
    {
      id: 'completedCount',
      title: t('aps.schedule_gantt_page.k3'),
      value: completedCount,
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'runningCount',
      title: t('aps.schedule_gantt_page.k4'),
      value: runningCount,
      icon: <PlayCircle size={24} />,
      color: 'primary',
    },
  ];

  return (
    <StatsPageTemplate
      title={t('aps.schedule_gantt_page.k0')}
      subtitle={`${t('pages.schedule_gantt_page.k0')} | ${t('aps.schedule_gantt_page.k1')}`}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('aps.schedule_gantt_page.k5')}
        </Typography>
        <Box sx={{ width: '100%', height: 360 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
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
                label={{
                  value: t('aps.schedule_gantt_page.k6'),
                  position: 'insideBottom',
                  offset: -5,
                }}
              />
              <YAxis
                type='category'
                dataKey='name'
                fontSize={10}
                width={120}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === t('aps.schedule_gantt_page.k7'))
                    return [`${value}${t('pages.schedule_gantt_page.k7')}`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                dataKey='duration'
                name={t('aps.schedule_gantt_page.k8')}
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
        </Box>
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Box
              key={status}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: color,
                }}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {status}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
