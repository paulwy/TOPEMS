/**
 * 工作流仪表盘
 *
 * 数据全部来自 GET /api/core/flow/statistics（真实 COUNT）与 /api/core/flow/instances：
 *  - 卡片：运行中/待审批/已完成/驳回
 *  - 图表：月度趋势（monthly_data）、流程分布（workflow_stats）
 *  - 最近流程：instances 列表前 5 条
 * 原先写死的 24/8/156/3 与各自环比、图标占位图表、5 条示例流程已删除。
 */
import React, { useMemo, useEffect } from 'react';
import { PlaySquare, CheckSquare, Clock, AlertTriangle, FileCode, Zap } from 'lucide-react';
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { WORKFLOW_PATHS } from '@/module-configs/workflow/config';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useQuery } from '@tanstack/react-query';
import type { StatisticsResponse, WorkflowInstance } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

export const WorkflowDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const statisticsQuery = useQuery<StatisticsResponse | null>({
    queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_DASHBOARD_BASE,
    queryFn: async () => {
      const res = await workflowApi.getStatistics();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 60 * 1000,
  });

  const instancesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_DASHBOARD_BASE, 'instances'],
    queryFn: async () => {
      const res = await workflowApi.listInstances({ page: 1, page_size: 5 });
      const data = res?.data as { items?: WorkflowInstance[] } | undefined;
      return data?.items ?? [];
    },
    staleTime: 60 * 1000,
  });

  const loading = statisticsQuery.isLoading || instancesQuery.isLoading;

  useEffect(() => {
    if (statisticsQuery.isError) {
      apiLogger.error('Failed to load workflow dashboard:', statisticsQuery.error);
    }
  }, [statisticsQuery.isError, statisticsQuery.error]);

  const s = statisticsQuery.data;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'running',
        title: i18n.t('workflow.workflow_dashboard_page.k0'),
        value: s?.running_instances ?? 0,
        icon: <PlaySquare size={20} />,
        color: 'primary',
      },
      {
        id: 'pending',
        title: i18n.t('workflow.workflow_dashboard_page.pending_approvals'),
        value: s?.pending_approvals ?? 0,
        icon: <CheckSquare size={20} />,
        color: 'warning',
      },
      {
        id: 'completed',
        title: i18n.t('workflow.workflow_dashboard_page.completed_instances'),
        value: s?.completed_instances ?? 0,
        icon: <Clock size={20} />,
        color: 'success',
      },
      {
        id: 'rejected',
        title: i18n.t('workflow.workflow_dashboard_page.rejected_instances'),
        value: s?.rejected_instances ?? 0,
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
    ],
    [s]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('workflow.workflow_dashboard_page.k8'),
        type: 'line',
        // monthly_data 由后端按自然月返回发起数；无数据时如实空态
        data: (s?.monthly_data ?? []).map((m) => ({
          label: m.month,
          value: Number(m.instances_started ?? 0),
        })),
      },
      {
        id: 'distribution',
        title: i18n.t('workflow.workflow_dashboard_page.k9'),
        type: 'pie',
        data: (s?.workflow_stats ?? []).map((w) => ({
          label: w.workflow_name,
          value: Number(w.instance_count ?? 0),
        })),
      },
    ],
    [s]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-instance',
        label: i18n.t('workflow.workflow_dashboard_page.k10'),
        icon: <PlaySquare size={20} />,
        color: 'primary',
        onClick: () => navigate(WORKFLOW_PATHS.instances),
      },
      {
        id: 'approval',
        label: i18n.t('workflow.workflow_dashboard_page.k11'),
        icon: <CheckSquare size={20} />,
        color: 'success',
        onClick: () => navigate(WORKFLOW_PATHS.approvals),
      },
      {
        id: 'designer',
        label: i18n.t('workflow.workflow_dashboard_page.k12'),
        icon: <FileCode size={20} />,
        color: 'info',
        onClick: () => navigate(WORKFLOW_PATHS.designer),
      },
      {
        id: 'monitor',
        label: i18n.t('workflow.workflow_dashboard_page.k13'),
        icon: <Zap size={20} />,
        color: 'warning',
        onClick: () => navigate(WORKFLOW_PATHS.monitor),
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () =>
      (instancesQuery.data ?? []).map((inst) => ({
        id: inst.id,
        title: inst.name || inst.workflow_name || inst.id,
        description: inst.currentnode
          ? `${inst.currentnode}`
          : (inst.start_user_name ?? ''),
        time: inst.started_at
          ? new Date(inst.started_at).toLocaleString('zh-CN', { hour12: false })
          : '',
        status:
          inst.status === 'completed'
            ? ('success' as const)
            : inst.status === 'rejected'
              ? ('error' as const)
              : inst.status === 'running'
                ? ('info' as const)
                : ('warning' as const),
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', inst.id)),
      })),
    [instancesQuery.data, navigate]
  );

  return (
    <DashboardTemplate
        title={i18n.t('workflow.nav.workflow-dashboard')}
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle={i18n.t('workflow.workflow_dashboard_page.k24')}
        onRefresh={() => {
          void statisticsQuery.refetch();
          void instancesQuery.refetch();
        }}
      />
  );
};

export default WorkflowDashboardPage;
