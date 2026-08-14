/**
 * 流程统计分析页面
 *
 * @module pages/workflow
 * @path /workflow/statistics
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Timer,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Zap,
  Calendar,
} from 'lucide-react';
import i18n from '@/i18n';
import { Stack, Menu, MenuItem, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '../../store';
import { handleApiError, getErrorMessage } from '@/utils/errors';
import { designTokens } from '@/theme/tokens';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery } from '@tanstack/react-query';
import type { StatisticsResponse } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';
import { LazyChart } from '@/components/charts';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'today', label: i18n.t('pages.workflow_statistics_page.k0') },
  { value: 'week', label: i18n.t('pages.workflow_statistics_page.k1') },
  { value: 'month', label: i18n.t('pages.workflow_statistics_page.k2') },
  { value: 'quarter', label: i18n.t('pages.workflow_statistics_page.k3') },
  { value: 'year', label: i18n.t('pages.workflow_statistics_page.k4') },
];

const generateTrendData = (range: TimeRange) => {
  const counts: Record<TimeRange, number> = {
    today: 24,
    week: 7,
    month: 30,
    quarter: 12,
    year: 12,
  };
  const labels: Record<TimeRange, (i: number) => string> = {
    today: (i) => `${i}:00`,
    week: (i) => [i18n.t('pages.workflow_statistics_page.k11'), i18n.t('pages.workflow_statistics_page.k10'), i18n.t('pages.workflow_statistics_page.k9'), i18n.t('pages.workflow_statistics_page.k8'), i18n.t('pages.workflow_statistics_page.k7'), i18n.t('pages.workflow_statistics_page.k6'), i18n.t('pages.workflow_statistics_page.k5')][i] || '',
    month: (i) => `${i + 1}${i18n.t('pages.workflow_statistics_page.k0')}`,
    quarter: (i) => `${i18n.t('pages.workflow_statistics_page.k1')}${i + 1}${i18n.t('pages.workflow_statistics_page.k2')}`,
    year: (i) => `${i + 1}${i18n.t('pages.workflow_statistics_page.k3')}`,
  };
  const count = counts[range];
  return Array.from({ length: count }, (_, i) => ({
    name: labels[range](i),
    [i18n.t('pages.workflow_statistics_page.k4')]: Math.floor(Math.random() * 50) + 20,
    [i18n.t('pages.workflow_statistics_page.k5')]: Math.floor(Math.random() * 40) + 15,
  }));
};

const distributionData = [
  { name: i18n.t('pages.workflow_statistics_page.k12'), value: 35 },
  { name: i18n.t('pages.workflow_statistics_page.k13'), value: 25 },
  { name: i18n.t('pages.workflow_statistics_page.k14'), value: 20 },
  { name: i18n.t('pages.workflow_statistics_page.k15'), value: 12 },
  { name: i18n.t('pages.workflow_statistics_page.k16'), value: 8 },
];

const efficiencyData = [
  { name: i18n.t('pages.workflow_statistics_page.k17'), [i18n.t('pages.workflow_statistics_page.k6')]: 48 },
  { name: i18n.t('pages.workflow_statistics_page.k18'), [i18n.t('pages.workflow_statistics_page.k7')]: 12 },
  { name: i18n.t('pages.workflow_statistics_page.k19'), [i18n.t('pages.workflow_statistics_page.k8')]: 36 },
  { name: i18n.t('pages.workflow_statistics_page.k20'), [i18n.t('pages.workflow_statistics_page.k9')]: 72 },
  { name: i18n.t('pages.workflow_statistics_page.k21'), [i18n.t('pages.workflow_statistics_page.k10')]: 24 },
];

const bottleneckData = [
  { name: i18n.t('pages.workflow_statistics_page.k22'), [i18n.t('pages.workflow_statistics_page.k11')]: 0.5 },
  { name: i18n.t('pages.workflow_statistics_page.k23'), [i18n.t('pages.workflow_statistics_page.k12')]: 2.5 },
  { name: i18n.t('pages.workflow_statistics_page.k24'), [i18n.t('pages.workflow_statistics_page.k13')]: 4.0 },
  { name: i18n.t('pages.workflow_statistics_page.k25'), [i18n.t('pages.workflow_statistics_page.k14')]: 6.0 },
  { name: i18n.t('pages.workflow_statistics_page.k26'), [i18n.t('pages.workflow_statistics_page.k15')]: 1.0 },
];

const topWorkflows = [
  { id: '1', name: i18n.t('pages.workflow_statistics_page.k27'), count: 128, avgTime: i18n.t('pages.workflow_statistics_page.12_16'), passRate: '95%' },
  { id: '2', name: i18n.t('pages.workflow_statistics_page.k28'), count: 96, avgTime: i18n.t('pages.workflow_statistics_page.36_17'), passRate: '88%' },
  { id: '3', name: i18n.t('pages.workflow_statistics_page.k29'), count: 85, avgTime: i18n.t('pages.workflow_statistics_page.48_18'), passRate: '82%' },
  { id: '4', name: i18n.t('pages.workflow_statistics_page.k30'), count: 64, avgTime: i18n.t('pages.workflow_statistics_page.24_19'), passRate: '92%' },
  { id: '5', name: i18n.t('pages.workflow_statistics_page.k31'), count: 52, avgTime: i18n.t('pages.workflow_statistics_page.72_20'), passRate: '78%' },
  { id: '6', name: i18n.t('pages.workflow_statistics_page.k32'), count: 45, avgTime: i18n.t('pages.workflow_statistics_page.18_21'), passRate: '90%' },
  { id: '7', name: i18n.t('pages.workflow_statistics_page.k33'), count: 38, avgTime: i18n.t('pages.workflow_statistics_page.60_22'), passRate: '96%' },
  { id: '8', name: i18n.t('pages.workflow_statistics_page.k34'), count: 32, avgTime: i18n.t('pages.workflow_statistics_page.48_23'), passRate: '94%' },
  { id: '9', name: i18n.t('pages.workflow_statistics_page.k35'), count: 28, avgTime: i18n.t('pages.workflow_statistics_page.54_24'), passRate: '85%' },
  { id: '10', name: i18n.t('pages.workflow_statistics_page.k36'), count: 25, avgTime: i18n.t('pages.workflow_statistics_page.36_25'), passRate: '91%' },
];

export const WorkflowStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const statisticsQuery = useQuery<StatisticsResponse | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_STATISTICS_BASE, timeRange],
    queryFn: async () => {
      const res = await workflowApi.getStatistics();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = statisticsQuery.isLoading;

  useEffect(() => {
    if (statisticsQuery.isError) {
      apiLogger.error('Failed to load workflow statistics:', statisticsQuery.error);
      addNotification({ title: i18n.t('pages.workflow_statistics_page.k38'), message: i18n.t('pages.workflow_statistics_page.k37'), type: 'error' });
    }
  }, [statisticsQuery.isError, statisticsQuery.error, addNotification]);

  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeSelect = (range: TimeRange) => {
    setTimeRange(range);
    handleTimeRangeClose();
  };

  const currentTimeRangeLabel =
    timeRangeOptions.find((o) => o.value === timeRange)?.label || i18n.t('pages.workflow_statistics_page.k39');

  const handleRefresh = () => {
    statisticsQuery.refetch();
    addNotification({
      message: i18n.t('pages.workflow_statistics_page.k40'),
      type: 'success',
      duration: 3000,
    });
  };

  const trendData = useMemo(() => generateTrendData(timeRange), [timeRange]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total',
        title: i18n.t('pages.workflow_statistics_page.k41'),
        value: '1,256',
        icon: <FileText size={20} />,
        change: 12,
        changeLabel: i18n.t('pages.workflow_statistics_page.k42'),
        color: 'primary',
        trend: [20, 25, 22, 30, 28, 35, 32],
      },
      {
        id: 'completed',
        title: i18n.t('pages.workflow_statistics_page.k43'),
        value: '1,089',
        icon: <CheckCircle size={20} />,
        change: 8,
        changeLabel: i18n.t('pages.workflow_statistics_page.k44'),
        color: 'success',
        trend: [18, 22, 20, 26, 24, 30, 28],
      },
      {
        id: 'in-progress',
        title: i18n.t('pages.workflow_statistics_page.k45'),
        value: '167',
        icon: <Clock size={20} />,
        change: -3,
        changeLabel: i18n.t('pages.workflow_statistics_page.k46'),
        color: 'warning',
        trend: [25, 22, 24, 20, 22, 18, 20],
      },
      {
        id: 'avg-duration',
        title: i18n.t('pages.workflow_statistics_page.k47'),
        value: '32.5',
        unit: i18n.t('pages.workflow_statistics_page.k48'),
        icon: <Timer size={20} />,
        change: -5.2,
        changeLabel: i18n.t('pages.workflow_statistics_page.k49'),
        color: 'info',
        trend: [40, 38, 36, 35, 34, 33, 32],
      },
      {
        id: 'pass-rate',
        title: i18n.t('pages.workflow_statistics_page.k50'),
        value: '86.7',
        unit: '%',
        icon: <ThumbsUp size={20} />,
        change: 2.3,
        changeLabel: i18n.t('pages.workflow_statistics_page.k51'),
        color: 'success',
        progress: 86.7,
        progressLabel: i18n.t('pages.workflow_statistics_page.k52'),
      },
      {
        id: 'reject-rate',
        title: i18n.t('pages.workflow_statistics_page.k53'),
        value: '13.3',
        unit: '%',
        icon: <ThumbsDown size={20} />,
        change: -1.8,
        changeLabel: i18n.t('pages.workflow_statistics_page.k54'),
        color: 'error',
        progress: 13.3,
        progressLabel: i18n.t('pages.workflow_statistics_page.k55'),
      },
    ],
    []
  );

  const BottleneckChart = useMemo(
    () => (
      <ResponsiveContainer
        width='100%'
        height={280}
      >
        <BarChart
          data={bottleneckData}
          layout='vertical'
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis
            type='number'
            unit='h'
          />
          <YAxis
            dataKey='name'
            type='category'
            width={100}
          />
          <Tooltip
            formatter={(value) => [`${value} ${i18n.t('pages.workflow_statistics_page.k26')}`, i18n.t('pages.workflow_statistics_page.k56')] as [string, string]}
            contentStyle={{
              borderRadius: 8,
              padding: 12,
            }}
          />
          <Bar
            dataKey={i18n.t('pages.workflow_statistics_page.k57')}
            radius={[0, 4, 4, 0]}
          >
            {bottleneckData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  index === bottleneckData.length - 1
                    ? 'error.main'
                    : index === bottleneckData.length - 2
                      ? 'warning.main'
                      : 'primary.main'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ),
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('pages.workflow_statistics_page.k58'),
        subtitle: i18n.t('pages.workflow_statistics_page.30_59'),
        chart: (
          <LazyChart type='line'
            data={trendData}
            xKey='name'
            yKeys={[
              { key: i18n.t('pages.workflow_statistics_page.k60'), name: i18n.t('pages.workflow_statistics_page.k61'), color: 'primary.main' },
              { key: i18n.t('pages.workflow_statistics_page.k62'), name: i18n.t('pages.workflow_statistics_page.k63'), color: 'success.main' },
            ]}
            height={280}
          />
        ),
        height: 360,
        type: 'line',
        onRefresh: handleRefresh,
      },
      {
        id: 'distribution',
        title: i18n.t('pages.workflow_statistics_page.k64'),
        subtitle: i18n.t('pages.workflow_statistics_page.k65'),
        chart: <LazyChart type='pie' data={distributionData} />,
        height: 360,
        type: 'pie',
        onRefresh: handleRefresh,
      },
      {
        id: 'efficiency',
        title: i18n.t('pages.workflow_statistics_page.k66'),
        subtitle: i18n.t('pages.workflow_statistics_page.k67'),
        chart: (
          <ResponsiveContainer
            width='100%'
            height={280}
          >
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis unit='h' />
              <Tooltip
                formatter={(value) => [`${value} ${i18n.t('pages.workflow_statistics_page.k27')}`, i18n.t('pages.workflow_statistics_page.k68')] as [string, string]}
                contentStyle={{
                  borderRadius: 8,
                  padding: 12,
                }}
              />
              <Bar
                dataKey={i18n.t('pages.workflow_statistics_page.k69')}
                fill='secondary.main'
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ),
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
      {
        id: 'bottleneck',
        title: i18n.t('pages.workflow_statistics_page.k70'),
        subtitle: i18n.t('pages.workflow_statistics_page.k71'),
        chart: BottleneckChart,
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
    ],
    [trendData, BottleneckChart, handleRefresh]
  );

  const topItems: RecentItem[] = useMemo(
    () =>
      topWorkflows.map((item, index) => ({
        id: item.id,
        title: item.name,
        description: `${i18n.t('pages.workflow_statistics_page.k28')} ${item.count} ${i18n.t('pages.workflow_statistics_page.k29')} ${item.avgTime}`,
        icon: <Zap size={18} />,
        status: index < 3 ? 'success' : index < 6 ? 'info' : 'default',
        tags: [
          { label: `#${index + 1}`, color: index < 3 ? 'warning.main' : undefined },
          { label: `${i18n.t('pages.workflow_statistics_page.k30')} ${item.passRate}` },
        ],
        onClick: () => navigate(WORKFLOW_PATHS.definitions),
      })),
    [navigate]
  );

  const headerContent = (
    <Stack
      direction='row'
      spacing={1}
      sx={{ alignItems: 'center' }}
    >
      <Button
        size='small'
        variant='outlined'
        startIcon={<Calendar size={16} />}
        onClick={handleTimeRangeClick}
        sx={{ textTransform: 'none' }}
      >
        {currentTimeRangeLabel}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleTimeRangeClose}
      >
        {timeRangeOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={timeRange === option.value}
            onClick={() => handleTimeRangeSelect(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );

  return (
    <PageContainer
      title={i18n.t('pages.workflow_statistics_page.k72')}
      subtitle={i18n.t('pages.workflow_statistics_page.k73')}
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
          visible: true,
        },
        children: headerContent,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        recentItems={topItems}
        recentTitle={i18n.t('pages.workflow_statistics_page.top10_31')}
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
};

export default WorkflowStatisticsPage;
