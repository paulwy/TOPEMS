import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import type { StatisticsResponse } from '@/api/workflow';
import { workflowApi, WorkflowStat, MonthlyData } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';

const FlowStatisticsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const response = await workflowApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        addNotification({
          title: '错误',
          message: response.message || '加载统计数据失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('加载统计数据失败:', err);
      addNotification({
        title: '错误',
        message: '加载统计数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo<StatCard[]>(() => {
    if (!stats) return [];

    return [
      {
        id: 'workflows',
        title: '工作流数量',
        value: stats.total_workflows,
        icon: <GitBranch size={24} />,
        color: 'primary',
        description: `${stats.active_workflows} 活跃`,
      },
      {
        id: 'instances',
        title: '实例总数',
        value: stats.total_instances,
        icon: <Activity size={24} />,
        color: 'success',
        description: `${stats.running_instances} 进行中 · ${stats.completed_instances} 已完成`,
      },
      {
        id: 'approvals',
        title: '审批总数',
        value: stats.total_approvals,
        icon: <Users size={24} />,
        color: 'info',
        description: `${stats.pending_approvals} 待处理 · ${stats.approved_approvals} 已通过`,
      },
      {
        id: 'avgApprovalTime',
        title: '平均审批时长',
        value: stats.avg_approval_time,
        icon: <Clock size={24} />,
        color: 'warning',
        suffix: 'h',
        description: `通过率 ${stats.approval_rate}% · 拒绝率 ${stats.rejection_rate}%`,
      },
    ];
  }, [stats]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (!stats) return [];

    return [
      {
        id: 'monthlyTrend',
        title: '月度趋势',
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: stats.monthly_data.flatMap((m) => [
          { name: m.month, value: m.instances_started, type: 'instances_started' },
          { name: m.month, value: m.instances_completed, type: 'instances_completed' },
          { name: m.month, value: m.approvals_processed, type: 'approvals_processed' },
        ]),
        height: 250,
      },
      {
        id: 'instanceStatus',
        title: '实例状态分布',
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          { name: '进行中', value: stats.running_instances, color: '#1e40af' },
          { name: '已完成', value: stats.completed_instances, color: '#16a34a' },
          { name: '已拒绝', value: stats.rejected_instances, color: '#dc2626' },
        ],
        height: 250,
      },
    ];
  }, [stats]);

  const tableColumns: TableColumn[] = [
    { id: 'rank', label: '#', width: 50, align: 'center' },
    { id: 'name', label: '工作流名称' },
    { id: 'count', label: '实例数', width: 80, align: 'center' },
    { id: 'rate', label: '完成率', width: 150 },
    { id: 'duration', label: '平均时长', width: 100, align: 'center' },
    { id: 'status', label: '状态', width: 80, align: 'center' },
  ];

  const filteredWorkflowStats = useMemo(() => {
    if (!stats) return [];
    return stats.workflow_stats.filter((stat) =>
      stat.workflow_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stats, searchTerm]);

  const tables = useMemo<DataTable[]>(() => {
    if (!stats) return [];

    return [
      {
        id: 'workflowPerformance',
        title: '工作流性能排行',
        columns: tableColumns,
        data: filteredWorkflowStats.map((stat, index) => ({
          rank: index + 1,
          name: stat.workflow_name,
          count: stat.instance_count,
          rate: stat.completion_rate,
          duration: `${stat.avg_duration}h`,
          status:
            stat.completion_rate >= 90 ? '优秀' : stat.completion_rate >= 70 ? '良好' : '需优化',
        })),
        loading,
      },
    ];
  }, [stats, filteredWorkflowStats, loading]);

  const timeRangeOptions = [
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季度', value: 'quarter' },
    { label: '本年', value: 'year' },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <StatsPageTemplate
        title='统计分析报表'
        subtitle='工作流数据统计和分析'
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, md: 2 }}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索工作流...',
        }}
        onRefresh={loadStatistics}
        showExport
        showRefresh
        showTimeRange
        showSearch
      />
    </PageContainer>
  );
};

export default FlowStatisticsPage;
