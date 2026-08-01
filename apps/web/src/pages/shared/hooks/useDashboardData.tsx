/**
 * @done V79 Phase 2 split
 * Extracted from DashboardPage.tsx - centralizes all dashboard data fetching,
 * derived state, and BFF mutation handlers.
 *
 * Return structure:
 *   - Data: stats / moduleStats / chartData / recentActivities / todos / pendingTodos / completedTodos
 *   - Loading: loading (combined) + individual query objects
 *   - Auth context: user / isAuthenticated / hasPermission / checkPermission
 *   - Handlers: getGreeting / handleTodoToggle
 */
import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { docApi } from '@/api/doc';
import { workflowApi } from '@/api/workflow';
import { qmsApi } from '@/api/qms';
import { ehsApi } from '@/api/ehs';
import { srmApi } from '@/api/srm';
import { limsApi } from '@/api/lims';
import { rdApi } from '@/api/rd';
import { biApi } from '@/api/bi';
import { scmApi } from '@/api/scm';
import { getDashboard, completeTodoGql } from '@/api/bff';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import type { ActivityItem } from '@/components/dashboard';
import { User, FileText, GitBranch, Folder } from 'lucide-react';

interface EhsHazard {
  id: string;
  status: string;
}

interface BiMetric {
  title: string;
  value: number;
  icon?: string;
}

interface FlowMonthlyData {
  month: string;
  instances_started?: number;
  approvals_processed?: number;
}

interface AuditLog {
  id: string;
  action?: string;
  module?: string;
  created_at: string;
}

export const useDashboardData = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const { checkPermission } = usePermission();

  const statsQuery = useQuery({
    queryKey: [...QUERY_KEYS.DASHBOARD.STATS, user?.id],
    queryFn: async () => {
      const [docRes, flowStatsRes, notificationRes] = await Promise.allSettled([
        docApi.list(),
        workflowApi.getStatistics(),
        user?.id
          ? workflowApi.getNotificationCount(user.id)
          : Promise.resolve({ success: false, data: { count: 0 } }),
      ]);

      const docData =
        docRes.status === 'fulfilled' && docRes.value.success ? docRes.value.data : null;
      const flowData =
        flowStatsRes.status === 'fulfilled' && flowStatsRes.value.success
          ? flowStatsRes.value.data
          : null;
      const notificationData =
        notificationRes.status === 'fulfilled' && notificationRes.value.success
          ? notificationRes.value.data
          : null;

      return {
        fileCount: docData?.files?.length || 0,
        docCount: docData?.total || 0,
        workflowCount: flowData?.total_workflows || 0,
        notificationCount:
          (notificationData as { count?: number; total?: number })?.count ??
          (notificationData as { count?: number; total?: number })?.total ??
          0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const moduleStatsQuery = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD.MODULE_STATS,
    queryFn: async () => {
      const [qmsRes, srmRes, limsRes, rsRes, ehsRes] = await Promise.allSettled([
        qmsApi.getStatistics(),
        srmApi.getStatistics(),
        limsApi.getStatistics(),
        rdApi.getStatistics(),
        ehsApi.listHazards({ page: 1, pagesize: 1000 }),
      ]);

      return {
        qms: {
          total:
            (qmsRes.status === 'fulfilled' &&
              qmsRes.value.success &&
              qmsRes.value.data?.total_inspections) ||
            0,
          active:
            (qmsRes.status === 'fulfilled' &&
              qmsRes.value.success &&
              qmsRes.value.data?.active_standards) ||
            0,
        },
        ehs: {
          total:
            (ehsRes.status === 'fulfilled' && ehsRes.value.success && ehsRes.value.data?.total) ||
            0,
          active:
            (ehsRes.status === 'fulfilled' &&
              ehsRes.value.success &&
              ehsRes.value.data?.items?.filter((h: EhsHazard) => h.status === 'active').length) ||
            0,
        },
        srm: {
          total:
            (srmRes.status === 'fulfilled' &&
              srmRes.value.success &&
              srmRes.value.data?.total_suppliers) ||
            0,
          active:
            (srmRes.status === 'fulfilled' &&
              srmRes.value.success &&
              srmRes.value.data?.active_suppliers) ||
            0,
        },
        lims: {
          total:
            (limsRes.status === 'fulfilled' &&
              limsRes.value.success &&
              limsRes.value.data?.total_samples) ||
            0,
          active:
            (limsRes.status === 'fulfilled' &&
              limsRes.value.success &&
              limsRes.value.data?.testing_samples) ||
            0,
        },
        rs: {
          total:
            (rsRes.status === 'fulfilled' &&
              rsRes.value.success &&
              rsRes.value.data?.total_projects) ||
            0,
          active:
            (rsRes.status === 'fulfilled' &&
              rsRes.value.success &&
              rsRes.value.data?.in_progress_projects) ||
            0,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartDataQuery = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD.CHART_DATA,
    queryFn: async () => {
      const [summaryRes, flowStatsRes] = await Promise.allSettled([
        biApi.fetchSummaryDashboard(),
        workflowApi.getStatistics(),
      ]);

      const summary =
        summaryRes.status === 'fulfilled' && summaryRes.value.success
          ? summaryRes.value.data
          : null;
      const flowStats =
        flowStatsRes.status === 'fulfilled' && flowStatsRes.value.success
          ? flowStatsRes.value.data
          : null;

      return {
        moduleDistribution:
          summary?.key_metrics?.map((metric: BiMetric) => ({
            name: metric.title,
            value: metric.value,
            color: metric.icon || 'primary.main',
          })) || [],
        monthlyTrend:
          flowStats?.monthly_data?.map((item: FlowMonthlyData) => ({
            name: item.month,
            value: item.instances_started || item.approvals_processed || 0,
          })) || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const bffDashboardQuery = useQuery({
    queryKey: [...QUERY_KEYS.DASHBOARD.TODOS, 'bff-graphql'],
    queryFn: async () => {
      return await getDashboard();
    },
    staleTime: 5 * 60 * 1000,
  });

  const activitiesQuery = useQuery<ActivityItem[]>({
    queryKey: QUERY_KEYS.DASHBOARD.ACTIVITIES,
    queryFn: async () => {
      const [logsRes] = await Promise.allSettled([
        scmApi.auditLogs.list({ page: 1, pageSize: 10 }),
      ]);

      if (logsRes.status === 'fulfilled' && logsRes.value.success && logsRes.value.data?.items) {
        const logs = logsRes.value.data.items;
        return logs.map((log: AuditLog) => {
          let icon = <User size={16} />;
          let type = t('shared.dashboard.type_system');

          if (log.module?.includes('doc') || log.module?.includes('file')) {
            icon = <FileText size={16} />;
            type = t('shared.dashboard.type_document');
          } else if (
            log.module?.includes('flow') ||
            log.module?.includes('workflow') ||
            log.module?.includes('approval')
          ) {
            icon = <GitBranch size={16} />;
            type = t('shared.dashboard.type_workflow');
          } else if (log.module?.includes('folder')) {
            icon = <Folder size={16} />;
            type = t('shared.dashboard.type_document');
          }

          const timeDiff = Date.now() - new Date(log.created_at).getTime();
          const minutes = Math.floor(timeDiff / 60000);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          let time = t('shared.dashboard.just_now');
          if (days > 0) {
            time = t('shared.favorites.days_ago', { days });
          } else if (hours > 0) {
            time = t('shared.dashboard.hours_ago', { hours });
          } else if (minutes > 0) {
            time = t('shared.dashboard.minutes_ago', { minutes });
          }

          return {
            id: log.id,
            title: log.action || t('shared.dashboard.system_operation'),
            type,
            time,
            icon,
          };
        });
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsQuery.data ?? {
    fileCount: 0,
    workflowCount: 0,
    docCount: 0,
    notificationCount: 0,
  };
  const moduleStats = moduleStatsQuery.data ?? {
    qms: { total: 0, active: 0 },
    ehs: { total: 0, active: 0 },
    srm: { total: 0, active: 0 },
    lims: { total: 0, active: 0 },
    rs: { total: 0, active: 0 },
  };
  const chartData = chartDataQuery.data ?? {
    moduleDistribution: [] as { name: string; value: number; color: string }[],
    monthlyTrend: [] as { name: string; value: number }[],
  };
  const recentActivities = activitiesQuery.data ?? [];
  const todos: Array<{ id: string; title: string; type: string; done: boolean }> = (
    bffDashboardQuery.data?.todos ?? []
  ).map((todo) => ({
    id: todo.id,
    title: todo.title,
    type: todo.source,
    done: todo.status === 'completed' || todo.status === 'read',
  }));

  const loading =
    statsQuery.isLoading ||
    moduleStatsQuery.isLoading ||
    chartDataQuery.isLoading ||
    bffDashboardQuery.isLoading ||
    activitiesQuery.isLoading;

  useEffect(() => {
    if (statsQuery.isError) {
      apiLogger.error('Failed to load stats:', statsQuery.error);
    }
  }, [statsQuery.isError, statsQuery.error]);

  useEffect(() => {
    if (moduleStatsQuery.isError) {
      apiLogger.error('Failed to load module stats:', moduleStatsQuery.error);
    }
  }, [moduleStatsQuery.isError, moduleStatsQuery.error]);

  useEffect(() => {
    if (chartDataQuery.isError) {
      apiLogger.error('Failed to load chart data:', chartDataQuery.error);
    }
  }, [chartDataQuery.isError, chartDataQuery.error]);

  useEffect(() => {
    if (bffDashboardQuery.isError) {
      apiLogger.error('BFF GraphQL load failed:', bffDashboardQuery.error);
    }
  }, [bffDashboardQuery.isError, bffDashboardQuery.error]);

  useEffect(() => {
    if (activitiesQuery.isError) {
      apiLogger.error('Failed to load recent activities:', activitiesQuery.error);
    }
  }, [activitiesQuery.isError, activitiesQuery.error]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('shared.dashboard.welcome_morning');
    if (hour < 18) return t('shared.dashboard.welcome_afternoon');
    return t('shared.dashboard.welcome_evening');
  };

  const pendingTodos = todos.filter((t) => !t.done);
  const completedTodos = todos.filter((t) => t.done);

  const handleTodoToggle = useCallback(
    async (id: string) => {
      try {
        await completeTodoGql(id);
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.DASHBOARD.TODOS, 'bff-graphql'],
        });
      } catch (err) {
        apiLogger.error('BFF Mutation complete todo failed:', err);
      }
    },
    [queryClient]
  );

  return {
    user,
    isAuthenticated,
    hasPermission,
    checkPermission,
    stats,
    moduleStats,
    chartData,
    recentActivities,
    todos,
    pendingTodos,
    completedTodos,
    loading,
    getGreeting,
    handleTodoToggle,
    statsQuery,
    moduleStatsQuery,
    chartDataQuery,
    bffDashboardQuery,
    activitiesQuery,
  };
};

export type UseDashboardDataReturn = ReturnType<typeof useDashboardData>;
