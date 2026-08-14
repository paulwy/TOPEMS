/**
 * 工作流仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/workflow
 * @path /workflow/dashboard
 */
import React, { useMemo, useEffect } from 'react';
import {
  PlaySquare,
  CheckSquare,
  Clock,
  AlertTriangle,
  FileCode,
  BarChart3,
  Zap,
} from 'lucide-react';
import i18n from '@/i18n';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { DashboardTemplate, type StatCard, type QuickAction } from '@/components/templates';
import { useQuery } from '@tanstack/react-query';
import type { StatisticsResponse } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';
export const WorkflowDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dashboardQuery = useQuery<StatisticsResponse | null>({
    queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_DASHBOARD_BASE,
    queryFn: async () => {
      const res = await workflowApi.getStatistics();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const loading = dashboardQuery.isLoading;
  useEffect(() => {
    if (dashboardQuery.isError) {
      apiLogger.error('Failed to load workflow dashboard:', dashboardQuery.error);
    }
  }, [dashboardQuery.isError, dashboardQuery.error]);
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'running',
        title: i18n.t('workflow.workflow_dashboard_page.k0'),
        value: '24',
        icon: <PlaySquare size={20} />,
        change: 5,
        changeLabel: i18n.t('workflow.workflow_dashboard_page.k1'),
        color: 'primary',
      },
      {
        id: 'pending',
        title: i18n.t('workflow.workflow_dashboard_page.k2'),
        value: '8',
        icon: <CheckSquare size={20} />,
        change: -2,
        changeLabel: i18n.t('workflow.workflow_dashboard_page.k3'),
        color: 'warning',
      },
      {
        id: 'completed',
        title: i18n.t('workflow.workflow_dashboard_page.k4'),
        value: '156',
        icon: <Clock size={20} />,
        change: 18,
        changeLabel: i18n.t('workflow.workflow_dashboard_page.k5'),
        color: 'success',
      },
      {
        id: 'overdue',
        title: i18n.t('workflow.workflow_dashboard_page.k6'),
        value: '3',
        icon: <AlertTriangle size={20} />,
        change: 1,
        changeLabel: i18n.t('workflow.workflow_dashboard_page.k7'),
        color: 'error',
      },
    ],
    []
  );
  const charts = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('workflow.workflow_dashboard_page.k8'),
        chart: <BarChart3 size={18} />,
        type: 'line' as const,
        span: 2,
      },
      {
        id: 'distribution',
        title: i18n.t('workflow.workflow_dashboard_page.k9'),
        chart: <PieChart size={18} />,
        type: 'pie' as const,
        span: 1,
      },
    ],
    []
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
  const recentItems = useMemo(
    () => [
      {
        id: '1',
        title: i18n.t('workflow.workflow_dashboard_page.po20240115_14'),
        subtitle: i18n.t('workflow.workflow_dashboard_page.2_15'),
        status: 'info' as const,
        statusColor: 'primary',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '1')),
      },
      {
        id: '2',
        title: i18n.t('workflow.workflow_dashboard_page.5_16'),
        subtitle: i18n.t('workflow.workflow_dashboard_page.4_17'),
        status: 'success' as const,
        statusColor: 'success',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '2')),
      },
      {
        id: '3',
        title: i18n.t('workflow.workflow_dashboard_page.2380_18'),
        subtitle: i18n.t('workflow.workflow_dashboard_page.k19'),
        status: 'warning' as const,
        statusColor: 'warning',
        onClick: () => navigate(WORKFLOW_PATHS.approvalDetail.replace(':id', '3')),
      },
      {
        id: '4',
        title: i18n.t('workflow.workflow_dashboard_page.k20'),
        subtitle: i18n.t('workflow.workflow_dashboard_page.k21'),
        status: 'error' as const,
        statusColor: 'error',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '4')),
      },
      {
        id: '5',
        title: i18n.t('workflow.workflow_dashboard_page.k22'),
        subtitle: i18n.t('workflow.workflow_dashboard_page.2_23'),
        status: 'success' as const,
        statusColor: 'success',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '5')),
      },
    ],
    [navigate]
  );
  return (
    <PageContainer
      headerProps={{
        pageIcon: <PlaySquare size={20} />,
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle={i18n.t('workflow.workflow_dashboard_page.k24')}
        onRefresh={() => {
          dashboardQuery.refetch();
        }}
      />
    </PageContainer>
  );
};
const PieChart = (props: { size?: number }) => <BarChart3 {...props} />;
export default WorkflowDashboardPage;