/**
 * 集成平台仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/integration
 * @path /integration/dashboard
 */

import React, { useState, useMemo } from 'react';
import {
  Plug,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  GitMerge,
  ArrowRight,
} from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { DashboardTemplate, type StatCard, type ChartCard, type QuickAction, type RecentItem } from '@/components/templates';
import { useAppStore } from '../../store';

export const IntegrationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);

  const stats: StatCard[] = useMemo(() => [
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
  ], []);

  const charts: ChartCard[] = useMemo(() => [
    {
      id: 'trend',
      title: '同步趋势',
      icon: <Activity size={18} />,
      type: 'line',
      span: 2,
    },
    {
      id: 'status',
      title: '连接状态',
      icon: <Plug size={18} />,
      type: 'pie',
      span: 1,
    },
    {
      id: 'systems',
      title: '各系统同步量',
      icon: <GitMerge size={18} />,
      type: 'bar',
      span: 1,
    },
  ], []);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-connection',
      label: '新建连接',
      icon: <Plug size={20} />,
      color: 'primary',
      onClick: () => navigate('/integration/connections'),
    },
    {
      id: 'view-logs',
      label: '查看日志',
      icon: <Activity size={20} />,
      color: 'info',
      onClick: () => navigate('/integration/events'),
    },
    {
      id: 'data-mapping',
      label: '数据映射',
      icon: <GitMerge size={20} />,
      color: 'success',
      onClick: () => navigate('/integration/mappings'),
    },
    {
      id: 'settings',
      label: '同步设置',
      icon: <Settings size={20} />,
      color: 'warning',
      onClick: () => navigate('/integration/settings'),
    },
  ], [navigate]);

  const recentItems: RecentItem[] = useMemo(() => [
    {
      id: '1',
      title: 'ERP - 采购订单同步',
      subtitle: '成功 · 2分钟前',
      status: '成功',
      statusColor: 'success',
      onClick: () => navigate('/integration/events'),
    },
    {
      id: '2',
      title: 'WMS - 库存数据同步',
      subtitle: '成功 · 5分钟前',
      status: '成功',
      statusColor: 'success',
      onClick: () => navigate('/integration/events'),
    },
    {
      id: '3',
      title: 'MES - 工单数据同步',
      subtitle: '成功 · 10分钟前',
      status: '成功',
      statusColor: 'success',
      onClick: () => navigate('/integration/events'),
    },
    {
      id: '4',
      title: 'CRM - 客户数据同步',
      subtitle: '警告 · 15分钟前',
      status: '警告',
      statusColor: 'warning',
      onClick: () => navigate('/integration/events'),
    },
    {
      id: '5',
      title: 'SCM - 供应商数据同步',
      subtitle: '失败 · 30分钟前',
      status: '失败',
      statusColor: 'error',
      onClick: () => navigate('/integration/events'),
    },
  ], [navigate]);

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
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            addNotification({ title: '刷新成功', message: '数据已更新', type: 'success' });
          }, 500);
        }}
      />
    </PageContainer>
  );
};

export default IntegrationDashboardPage;
