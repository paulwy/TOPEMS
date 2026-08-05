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
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { DashboardTemplate, type StatCard, type QuickAction } from '@/components/templates';
import { useQuery } from '@tanstack/react-query';
import type { StatisticsResponse } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';

export const WorkflowDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const dashboardQuery = useQuery<StatisticsResponse | null>({
    queryKey: ['workflow-dashboard'],
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
        title: '运行中流程',
        value: '24',
        icon: <PlaySquare size={20} />,
        change: 5,
        changeLabel: '较昨日',
        color: 'primary',
      },
      {
        id: 'pending',
        title: '待我审批',
        value: '8',
        icon: <CheckSquare size={20} />,
        change: -2,
        changeLabel: '较昨日',
        color: 'warning',
      },
      {
        id: 'completed',
        title: '本月完成',
        value: '156',
        icon: <Clock size={20} />,
        change: 18,
        changeLabel: '环比增长',
        color: 'success',
      },
      {
        id: 'overdue',
        title: '超时预警',
        value: '3',
        icon: <AlertTriangle size={20} />,
        change: 1,
        changeLabel: '较昨日',
        color: 'error',
      },
    ],
    []
  );

  const charts = useMemo(
    () => [
      {
        id: 'trend',
        title: '流程趋势',
        chart: <BarChart3 size={18} />,
        type: 'line' as const,
        span: 2,
      },
      {
        id: 'distribution',
        title: '流程分布',
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
        label: '发起流程',
        icon: <PlaySquare size={20} />,
        color: 'primary',
        onClick: () => navigate(WORKFLOW_PATHS.instances),
      },
      {
        id: 'approval',
        label: '我的审批',
        icon: <CheckSquare size={20} />,
        color: 'success',
        onClick: () => navigate(WORKFLOW_PATHS.approvals),
      },
      {
        id: 'designer',
        label: '流程设计',
        icon: <FileCode size={20} />,
        color: 'info',
        onClick: () => navigate(WORKFLOW_PATHS.designer),
      },
      {
        id: 'monitor',
        label: '监控中心',
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
        title: '采购订单审批 - PO20240115',
        subtitle: '提交人：张三 · 2小时前',
        status: 'info' as const,
        statusColor: 'primary',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '1')),
      },
      {
        id: '2',
        title: '请假申请 - 年假5天',
        subtitle: '提交人：李四 · 4小时前',
        status: 'success' as const,
        statusColor: 'success',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '2')),
      },
      {
        id: '3',
        title: '费用报销 - 差旅费2380元',
        subtitle: '提交人：王五 · 昨天',
        status: 'warning' as const,
        statusColor: 'warning',
        onClick: () => navigate(WORKFLOW_PATHS.approvalDetail.replace(':id', '3')),
      },
      {
        id: '4',
        title: '合同审批 - 供应商合作协议',
        subtitle: '提交人：赵六 · 昨天',
        status: 'error' as const,
        statusColor: 'error',
        onClick: () => navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', '4')),
      },
      {
        id: '5',
        title: '用章申请 - 项目合同章',
        subtitle: '提交人：钱七 · 2天前',
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
        recentTitle='最近流程'
        onRefresh={() => {
          dashboardQuery.refetch();
        }}
      />
    </PageContainer>
  );
};

const PieChart = (props: { size?: number }) => <BarChart3 {...props} />;

export default WorkflowDashboardPage;
