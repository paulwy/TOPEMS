/**
 * 集成平台仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/integration
 * @path /integration/dashboard
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plug,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  GitMerge,
} from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import { useNotificationStore } from '@/store';


import { QUERY_KEYS } from '@/lib/reactQuery';

export const IntegrationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'active-connections',
        title: '活跃连接',
        value: '12',
        icon: <Plug size={20} />,
        change: 2,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'sync-tasks',
        title: '同步任务',
        value: '156',
        icon: <GitMerge size={20} />,
        change: 23,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: '成功率',
        value: '98.5%',
        icon: <CheckCircle2 size={20} />,
        change: 0.5,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'avg-latency',
        title: '平均延迟',
        value: '125ms',
        icon: <Activity size={20} />,
        change: -15,
        changeLabel: 'ms下降',
        color: 'info',
      },
      {
        id: 'sync-records',
        title: '同步记录',
        value: '12,580',
        icon: <RefreshCw size={20} />,
        change: 1250,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'errors',
        title: '错误数',
        value: '23',
        icon: <AlertTriangle size={20} />,
        change: -5,
        changeLabel: '较上月',
        color: 'error',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: '同步趋势',
        chart: <Activity size={18} />,
        type: 'line',
      },
      {
        id: 'status',
        title: '连接状态',
        chart: <Plug size={18} />,
        type: 'pie',
      },
      {
        id: 'systems',
        title: '各系统同步量',
        chart: <GitMerge size={18} />,
        type: 'bar',
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-connection',
        label: '新建连接',
        icon: <Plug size={20} />,
        color: 'primary',
        onClick: () => navigate(INTEGRATION_PATHS.connections),
      },
      {
        id: 'view-logs',
        label: '查看日志',
        icon: <Activity size={20} />,
        color: 'info',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: 'data-mapping',
        label: '数据映射',
        icon: <GitMerge size={20} />,
        color: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.mappings),
      },
      {
        id: 'settings',
        label: '同步设置',
        icon: <Settings size={20} />,
        color: 'warning',
        onClick: () => navigate(INTEGRATION_PATHS.settings),
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: '1',
        title: 'ERP - 采购订单同步',
        subtitle: '成功 · 2分钟前',
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '2',
        title: 'WMS - 库存数据同步',
        subtitle: '成功 · 5分钟前',
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '3',
        title: 'MES - 工单数据同步',
        subtitle: '成功 · 10分钟前',
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '4',
        title: 'CRM - 客户数据同步',
        subtitle: '警告 · 15分钟前',
        status: 'warning',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '5',
        title: 'SCM - 供应商数据同步',
        subtitle: '失败 · 30分钟前',
        status: 'error',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Plug size={20} />,
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
        recentTitle='最近同步记录'
        onRefresh={() => {
          loadingQuery.refetch();
          addNotification({ title: '刷新成功', message: '数据已更新', type: 'success' });
        }}
      />
    </PageContainer>
  );
};

export default IntegrationDashboardPage;
