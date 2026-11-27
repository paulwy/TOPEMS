/**
 * 流程统计分析页面
 *
 * @module pages/workflow
 * @path /workflow/statistics
 *
 * 所有数字都来自 GET /api/core/flow/statistics（真实 COUNT 查询）。
 * 原先的「1,256 / 1,089 / 86.7%」卡片、五档分布饼图、节点效率与瓶颈柱图都是写死常量，
 * 且页面顶部还有 today/week/month/quarter/year 时间下拉——该端点不吃任何时间参数，
 * 两者已一并撤掉；monthly_data 为空时趋势图显示「暂无数据」。
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Timer,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Zap,
} from 'lucide-react';
import i18n from '@/i18n';
import { useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '../../store';
import { WORKFLOW_PATHS } from '@/module-configs/workflow/config';
import type { StatisticsResponse } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';
import { LazyChart } from '@/components/charts';

import { QUERY_KEYS } from '@/lib/reactQuery';

const EMPTY_STATS: StatisticsResponse = {
  total_workflows: 0,
  active_workflows: 0,
  total_instances: 0,
  running_instances: 0,
  completed_instances: 0,
  rejected_instances: 0,
  total_approvals: 0,
  pending_approvals: 0,
  approved_approvals: 0,
  rejected_approvals: 0,
  avg_approval_time: 0,
  approval_rate: 0,
  rejection_rate: 0,
  workflow_stats: [],
  monthly_data: [],
};

export const WorkflowStatisticsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const statisticsQuery = useQuery<StatisticsResponse | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_STATISTICS_BASE],
    queryFn: async () => {
      const res = await workflowApi.getStatistics();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = statisticsQuery.isLoading;

  useEffect(() => {
    if (statisticsQuery.isError) {
      apiLogger.error('Failed to load workflow statistics:', statisticsQuery.error);
      addNotification({
        title: i18n.t('pages.workflow_statistics_page.k38'),
        message: i18n.t('pages.workflow_statistics_page.k37'),
        type: 'error',
      });
    }
  }, [statisticsQuery.isError, statisticsQuery.error, addNotification]);

  const handleRefresh = useCallback(() => {
    void statisticsQuery.refetch();
    addNotification({
      message: i18n.t('pages.workflow_statistics_page.k40'),
      type: 'success',
      duration: 3000,
    });
  }, [statisticsQuery, addNotification]);

  const data = statisticsQuery.data ?? EMPTY_STATS;
  const hasData =
    data.total_instances > 0 || data.total_approvals > 0 || data.workflow_stats.length > 0;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total',
        title: i18n.t('pages.workflow_statistics_page.k41'),
        value: data.total_instances,
        icon: <FileText size={20} />,
        color: 'primary',
      },
      {
        id: 'completed',
        title: i18n.t('pages.workflow_statistics_page.k43'),
        value: data.completed_instances,
        icon: <CheckCircle size={20} />,
        color: 'success',
      },
      {
        id: 'in-progress',
        title: i18n.t('pages.workflow_statistics_page.k45'),
        value: data.running_instances,
        icon: <Clock size={20} />,
        color: 'warning',
      },
      {
        id: 'avg-duration',
        title: i18n.t('pages.workflow_statistics_page.k47'),
        value: Number(data.avg_approval_time ?? 0).toFixed(1),
        unit: i18n.t('pages.workflow_statistics_page.k48'),
        icon: <Timer size={20} />,
        color: 'info',
      },
      {
        id: 'pass-rate',
        title: i18n.t('pages.workflow_statistics_page.k50'),
        value: Number(data.approval_rate ?? 0).toFixed(1),
        unit: '%',
        icon: <ThumbsUp size={20} />,
        color: 'success',
        progress: Math.round(Number(data.approval_rate ?? 0)),
        progressLabel: i18n.t('pages.workflow_statistics_page.k52'),
      },
      {
        id: 'reject-rate',
        title: i18n.t('pages.workflow_statistics_page.k53'),
        value: Number(data.rejection_rate ?? 0).toFixed(1),
        unit: '%',
        icon: <ThumbsDown size={20} />,
        color: 'error',
        progress: Math.round(Number(data.rejection_rate ?? 0)),
        progressLabel: i18n.t('pages.workflow_statistics_page.k55'),
      },
    ],
    [data]
  );

  const trendData = useMemo(
    () =>
      data.monthly_data.map((m) => ({
        name: m.month,
        [i18n.t('pages.workflow_statistics_page.k60')]: m.instances_started,
        [i18n.t('pages.workflow_statistics_page.k62')]: m.instances_completed,
      })),
    [data.monthly_data]
  );

  const distributionData = useMemo(
    () =>
      data.workflow_stats
        .filter((w) => w.instance_count > 0)
        .slice(0, 6)
        .map((w) => ({ name: w.workflow_name, value: w.instance_count })),
    [data.workflow_stats]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('pages.workflow_statistics_page.k58'),
        subtitle: i18n.t('pages.workflow_statistics_page.30_59'),
        chart: (
          <LazyChart
            type='line'
            data={trendData}
            xKey='name'
            yKeys={[
              {
                key: i18n.t('pages.workflow_statistics_page.k60'),
                name: i18n.t('pages.workflow_statistics_page.k61'),
                color: 'primary.main',
              },
              {
                key: i18n.t('pages.workflow_statistics_page.k62'),
                name: i18n.t('pages.workflow_statistics_page.k63'),
                color: 'success.700',
              },
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
        chart: (
          <LazyChart
            type='pie'
            data={distributionData}
            height={280}
          />
        ),
        height: 360,
        type: 'pie',
        onRefresh: handleRefresh,
      },
    ],
    [trendData, distributionData, handleRefresh]
  );

  const topItems: RecentItem[] = useMemo(
    () =>
      data.workflow_stats.map((item, index) => ({
        id: item.workflow_id,
        title: item.workflow_name,
        description: `${i18n.t('pages.workflow_statistics_page.k28')} ${item.instance_count}`,
        icon: <Zap size={18} />,
        status: index < 3 ? 'success' : index < 6 ? 'info' : 'default',
        tags: [
          { label: `#${index + 1}`, color: index < 3 ? 'warning.main' : undefined },
          {
            label: `${i18n.t('pages.workflow_statistics_page.k30')} ${Number(item.completion_rate ?? 0).toFixed(1)}%`,
          },
        ],
        onClick: () => navigate(WORKFLOW_PATHS.definitions),
      })),
    [data.workflow_stats, navigate]
  );

  return (
    <PageContainer
      title={i18n.t('pages.workflow_statistics_page.k72')}
      subtitle={i18n.t('pages.workflow_statistics_page.k73')}
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.secondary[400]} 0%, ${theme.palette.secondary.main} 100%)`,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
          visible: true,
        },
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
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
