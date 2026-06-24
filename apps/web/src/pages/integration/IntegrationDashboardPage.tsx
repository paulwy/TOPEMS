import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { ArrowRightLeft, Database, Box as BoxIcon, Bell, Settings, Layers } from 'lucide-react';
import { integrationApi } from '@/api/integration';
import type { SyncStats, IntegrationEvent } from '@/api/integration';
import { logger } from '@/utils/logger';
import {
  DashboardTemplate,
  type StatCard,
  type RecentItem,
  type QuickAction,
  type ChartCard,
} from '@/components/templates';
import { PieChartComponent } from '@/components/charts/PieChart';
import { BarChartComponent } from '@/components/charts/BarChart';

const IntegrationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes] = await Promise.all([
        integrationApi.getSyncStats(),
        integrationApi.listEvents(),
      ]);

      if (statsRes.success && statsRes.data !== undefined) setStats(statsRes.data);
      if (eventsRes.success && eventsRes.data !== undefined) setEvents(eventsRes.data);
    } catch (error: unknown) {
      logger.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算同步成功率
  const getSyncRate = (synced: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((synced / total) * 100);
  };

  // 转换统计数据为 StatCard 格式（带进度条）
  const statCards: StatCard[] = stats
    ? [
        {
          id: 'lims-qms',
          title: 'LIMS ↔ QMS',
          value: stats.lims_qms_total,
          subtitle: `已同步 ${stats.lims_qms_synced} / 失败 ${stats.lims_qms_failed}`,
          progress: getSyncRate(stats.lims_qms_synced, stats.lims_qms_total),
          progressLabel: '同步率',
          color: 'primary',
          size: 'medium' as const,
        },
        {
          id: 'mes-erp',
          title: 'MES ↔ ERP',
          value: stats.mes_erp_total,
          subtitle: `已同步 ${stats.mes_erp_synced} / 失败 ${stats.mes_erp_failed}`,
          progress: getSyncRate(stats.mes_erp_synced, stats.mes_erp_total),
          progressLabel: '同步率',
          color: 'info',
          size: 'medium' as const,
        },
        {
          id: 'wms-scm',
          title: 'WMS ↔ SCM',
          value: stats.wms_scm_total,
          subtitle: `已同步 ${stats.wms_scm_synced} / 失败 ${stats.wms_scm_failed}`,
          progress: getSyncRate(stats.wms_scm_synced, stats.wms_scm_total),
          progressLabel: '同步率',
          color: 'secondary',
          size: 'medium' as const,
        },
        {
          id: 'total-synced',
          title: '总已同步',
          value: stats.lims_qms_synced + stats.mes_erp_synced + stats.wms_scm_synced,
          color: 'success',
          size: 'small' as const,
        },
        {
          id: 'total-failed',
          title: '总失败',
          value: stats.lims_qms_failed + stats.mes_erp_failed + stats.wms_scm_failed,
          color: 'error',
          size: 'small' as const,
        },
        {
          id: 'total-pending',
          title: '总待处理',
          value:
            stats.lims_qms_total +
            stats.mes_erp_total +
            stats.wms_scm_total -
            (stats.lims_qms_synced + stats.mes_erp_synced + stats.wms_scm_synced) -
            (stats.lims_qms_failed + stats.mes_erp_failed + stats.wms_scm_failed),
          color: 'warning',
          size: 'small' as const,
        },
      ]
    : [];

  // 转换事件数据为 RecentItem 格式
  const recentItems: RecentItem[] = events.slice(0, 10).map((event) => ({
    id: event.id,
    title: `${event.source_system} → ${event.target_system}`,
    description: event.event_type,
    time: new Date(event.created_at).toLocaleString('zh-CN'),
    status:
      event.status === 'synced'
        ? 'success'
        : event.status === 'pending'
          ? 'warning'
          : event.status === 'failed'
            ? 'error'
            : 'default',
  }));

  // 快捷操作配置
  const quickActions: QuickAction[] = [
    {
      id: 'lims-qms',
      label: 'LIMS-QMS',
      description: 'LIMS与QMS系统数据同步',
      icon: <ArrowRightLeft size={20} />,
      onClick: () => navigate('/integration/lims-qms'),
    },
    {
      id: 'mes-erp',
      label: 'MES-ERP',
      description: 'MES与ERP系统数据同步',
      icon: <Database size={20} />,
      onClick: () => navigate('/integration/mes-erp'),
    },
    {
      id: 'wms-scm',
      label: 'WMS-SCM',
      description: 'WMS与SCM系统数据同步',
      icon: <BoxIcon size={20} />,
      onClick: () => navigate('/integration/wms-scm'),
    },
    {
      id: 'events',
      label: '事件日志',
      description: '查看集成事件记录',
      icon: <Bell size={20} />,
      onClick: () => navigate('/integration/events'),
    },
    {
      id: 'rules',
      label: '转换规则',
      description: '管理数据转换规则',
      icon: <Layers size={20} />,
      onClick: () => navigate('/integration/rules'),
    },
    {
      id: 'external-erp',
      label: '外部ERP',
      description: '外部ERP系统连接配置',
      icon: <Settings size={20} />,
      onClick: () => navigate('/integration/external-erp'),
    },
  ];

  // 同步状态分布数据（饼图）
  const syncStatusData = stats
    ? [
        {
          name: 'LIMS-QMS 已同步',
          value: stats.lims_qms_synced,
          color: 'success.dark',
        },
        {
          name: 'LIMS-QMS 失败',
          value: stats.lims_qms_failed,
          color: 'error.main',
        },
        {
          name: 'MES-ERP 已同步',
          value: stats.mes_erp_synced,
          color: 'primary.main',
        },
        {
          name: 'MES-ERP 失败',
          value: stats.mes_erp_failed,
          color: 'warning.main',
        },
        {
          name: 'WMS-SCM 已同步',
          value: stats.wms_scm_synced,
          color: 'secondary.main',
        },
        {
          name: 'WMS-SCM 失败',
          value: stats.wms_scm_failed,
          color: 'info.main',
        },
      ]
    : [];

  // 各系统同步对比数据（柱状图）
  const syncComparisonData = stats
    ? [
        {
          name: 'LIMS-QMS',
          已同步: stats.lims_qms_synced,
          失败: stats.lims_qms_failed,
          总数: stats.lims_qms_total,
        },
        {
          name: 'MES-ERP',
          已同步: stats.mes_erp_synced,
          失败: stats.mes_erp_failed,
          总数: stats.mes_erp_total,
        },
        {
          name: 'WMS-SCM',
          已同步: stats.wms_scm_synced,
          失败: stats.wms_scm_failed,
          总数: stats.wms_scm_total,
        },
      ]
    : [];

  // 图表卡片配置
  const charts: ChartCard[] = [
    {
      id: 'sync-status-pie',
      title: '同步状态分布',
      subtitle: '各系统同步成功与失败占比',
      type: 'pie',
      height: 300,
      loading,
      chart:
        syncStatusData.length > 0 ? (
          <Box sx={{ height: 300 }}>
            <PieChartComponent
              data={syncStatusData}
              title=''
            />
          </Box>
        ) : (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <Typography color='text.secondary'>暂无数据</Typography>
          </Box>
        ),
    },
    {
      id: 'sync-comparison-bar',
      title: '系统同步对比',
      subtitle: '各系统同步数量统计',
      type: 'bar',
      height: 300,
      loading,
      chart:
        syncComparisonData.length > 0 ? (
          <Box sx={{ height: 300 }}>
            <BarChartComponent
              data={syncComparisonData}
              xKey='name'
              yKeys={[
                { key: '已同步', name: '已同步', color: 'success.dark' },
                { key: '失败', name: '失败', color: 'error.main' },
              ]}
              height={280}
            />
          </Box>
        ) : (
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <Typography color='text.secondary'>暂无数据</Typography>
          </Box>
        ),
    },
  ];

  return (
    <DashboardTemplate
      title='集成管理仪表板'
      stats={statCards}
      charts={charts}
      quickActions={quickActions}
      recentItems={recentItems}
      recentTitle='最近事件'
      loading={loading}
      onRefresh={loadData}
      layout={{
        statsBreakpoints: { xs: 12, sm: 6, md: 4, lg: 3 },
        chartsBreakpoints: { xs: 12, md: 6 },
      }}
    />
  );
};

export default IntegrationDashboardPage;
