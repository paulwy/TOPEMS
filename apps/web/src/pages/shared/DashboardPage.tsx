import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { AUTH_PATHS } from '@/routes/auth';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from '@mui/material';
import {
  User,
  Activity,
  Clock,
  ListTodo,
  CheckCircle,
  GitBranch,
  FileText,
  Folder,
} from 'lucide-react';
import { docApi } from '@/api/doc';
import { workflowApi } from '@/api/workflow';
import { qmsApi } from '@/api/qms';
import { ehsApi } from '@/api/ehs';
import { srmApi } from '@/api/srm';
import { limsApi } from '@/api/lims';
import { rdApi } from '@/api/rd';
import { biApi } from '@/api/bi';
import { scmApi } from '@/api/scm';
// V34.0: BFF GraphQL 聚合 API
import { getDashboard, completeTodoGql, subscribeServiceHealth } from '@/api/bff';
import { useAuth } from '@/hooks/useAuth';
import { useServiceStatus } from '@/hooks/useServiceStatus';
import { MetricCard } from '@/components/bi/MetricCard';
import {
  DashboardQuickActions,
  defaultQuickActions,
  ServiceStatusMonitor,
  RecentActivities,
  type ActivityItem,
  DashboardSection,
  QuickAccessSection,
  TodoListSection,
  ServiceMonitorSection,
  RecentActivitySection,
} from '@/components/dashboard';
import { PageContainer, EmptyState } from '@/components/common';

interface DashboardPageProps {
  onLogout?: () => void;
}

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

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, logout: authLogout, isAuthenticated } = useAuth();
  const { serviceStatuses, refresh: refreshServiceStatuses } = useServiceStatus();
  const queryClient = useQueryClient();

  const [todoTab, setTodoTab] = useState(0);

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

  // V34.0: 使用 BFF GraphQL 替代多次 REST 调用获取待办 + 服务健康
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
          let type = '系统';

          if (log.module?.includes('doc') || log.module?.includes('file')) {
            icon = <FileText size={16} />;
            type = '文档';
          } else if (
            log.module?.includes('flow') ||
            log.module?.includes('workflow') ||
            log.module?.includes('approval')
          ) {
            icon = <GitBranch size={16} />;
            type = '工作流';
          } else if (log.module?.includes('folder')) {
            icon = <Folder size={16} />;
            type = '文档';
          }

          const timeDiff = Date.now() - new Date(log.created_at).getTime();
          const minutes = Math.floor(timeDiff / 60000);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          let time = '刚刚';
          if (days > 0) {
            time = `${days}天前`;
          } else if (hours > 0) {
            time = `${hours}小时前`;
          } else if (minutes > 0) {
            time = `${minutes}分钟前`;
          }

          return {
            id: log.id,
            title: log.action || '系统操作',
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
  // V34.0: 从 BFF GraphQL 数据中派生待办列表（保留原始 string id 供 mutation 使用）
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

  // V64 降级：开发环境微服务未启动是常态，404/连接失败降级为 warn，
  // 生产环境保持 error 级别，以便监控真正的路由/服务异常
  const logLvl: 'error' | 'warn' = import.meta.env.DEV ? 'warn' : 'error';

  useEffect(() => {
    if (statsQuery.isError) {
      apiLogger[logLvl]('加载统计失败:', statsQuery.error);
    }
  }, [statsQuery.isError, statsQuery.error, logLvl]);

  useEffect(() => {
    if (moduleStatsQuery.isError) {
      apiLogger[logLvl]('加载模块统计失败:', moduleStatsQuery.error);
    }
  }, [moduleStatsQuery.isError, moduleStatsQuery.error, logLvl]);

  useEffect(() => {
    if (chartDataQuery.isError) {
      apiLogger[logLvl]('加载图表数据失败:', chartDataQuery.error);
    }
  }, [chartDataQuery.isError, chartDataQuery.error, logLvl]);

  useEffect(() => {
    if (bffDashboardQuery.isError) {
      apiLogger[logLvl]('BFF GraphQL 加载失败:', bffDashboardQuery.error);
    }
  }, [bffDashboardQuery.isError, bffDashboardQuery.error, logLvl]);

  useEffect(() => {
    if (activitiesQuery.isError) {
      apiLogger[logLvl]('加载最近活动失败:', activitiesQuery.error);
    }
  }, [activitiesQuery.isError, activitiesQuery.error, logLvl]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(AUTH_PATHS.login);
      return;
    }

    refreshServiceStatuses();

    const intervalId = setInterval(() => {
      refreshServiceStatuses();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [navigate, isAuthenticated, refreshServiceStatuses]);

  // V34.0: BFF GraphQL Subscription — 实时服务健康推送
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = subscribeServiceHealth(() => {
      refreshServiceStatuses();
    });
    return unsubscribe;
  }, [isAuthenticated, refreshServiceStatuses]);

  const handleLogout = useCallback(() => {
    authLogout();
    navigate(AUTH_PATHS.login);
    onLogout?.();
  }, [authLogout, navigate, onLogout]);

  const handleQuickAccess = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  // V34.0: BFF Mutation — 完成待办（必须在所有 early return 之前调用 hooks）
  const handleTodoToggle = useCallback(
    async (id: string) => {
      try {
        await completeTodoGql(id);
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.DASHBOARD.TODOS, 'bff-graphql'],
        
  exact: false,
  refetchType: 'active',
});
      } catch (err) {
        // V64 降级：开发环境 portal 服务未启动是常态
        apiLogger[logLvl]('BFF Mutation 完成待办失败:', err);
      }
    },
    [queryClient]
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', color: 'text.secondary' }}>加载中...</Typography>
      </Box>
    );
  }

  const onlineServices = Object.values(serviceStatuses).filter(Boolean).length;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const pendingTodos = todos.filter((t) => !t.done);
  const completedTodos = todos.filter((t) => t.done);

  const getTodoIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return <GitBranch size={18} />;
      case 'lims':
      case 'training':
      case 'report':
      case 'meeting':
      default:
        return <ListTodo size={18} />;
    }
  };

  return (
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      sx={{ bgcolor: 'background.default' }}
    >
      <Box sx={{ width: '100%' }}>
        {/* 欢迎标题 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', md: '1.875rem' },
              fontWeight: 700,
              color: 'text.primary',
              mb: 1,
            }}
          >
            👋 欢迎回来，{user?.full_name || user?.username || '用户'}！
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem', md: '1rem' } }}>
            {getGreeting()}，今天有 {pendingTodos.length} 个待处理事项
          </Typography>
        </Box>

        {/* 今日概览分区 */}
        <DashboardSection
          title='今日概览'
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 2, md: 3 },
            }}
          >
            <MetricCard
              title='在线服务'
              value={String(onlineServices)}
              icon={<Activity size={24} />}
              color='green'
              change={onlineServices > 5 ? 10 : -5}
            />
            <MetricCard
              title='文件数量'
              value={String(stats.fileCount)}
              icon={<FileText size={24} />}
              color='purple'
              change={8}
            />
            <MetricCard
              title='工作流'
              value={String(stats.workflowCount)}
              icon={<GitBranch size={24} />}
              color='orange'
              change={-3}
            />
            <MetricCard
              title='待处理'
              value={String(pendingTodos.length)}
              icon={<Clock size={24} />}
              color='blue'
            />
          </Box>
        </DashboardSection>

        {/* 快捷入口分区 */}
        <QuickAccessSection defaultExpanded={true}>
          <DashboardQuickActions
            quickActions={defaultQuickActions}
            serviceStatuses={serviceStatuses}
            onQuickAccess={handleQuickAccess}
          />
        </QuickAccessSection>

        {/* 待办事项分区 */}
        <TodoListSection>
          <Box sx={{ mb: 2 }}>
            <Tabs
              value={todoTab}
              onChange={(_, v) => setTodoTab(v)}
              sx={{
                minHeight: 36,
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListTodo size={16} />
                    <Typography sx={{ fontSize: '0.875rem' }}>待处理</Typography>
                    <Badge
                      badgeContent={pendingTodos.length}
                      color='primary'
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                sx={{ minHeight: 36, py: 1 }}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={16} />
                    <Typography sx={{ fontSize: '0.875rem' }}>已完成</Typography>
                    <Badge
                      badgeContent={completedTodos.length}
                      color='success'
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                sx={{ minHeight: 36, py: 1 }}
              />
            </Tabs>
          </Box>
          <List sx={{ py: 0 }}>
            {(todoTab === 0 ? pendingTodos : completedTodos).length > 0 ? (
              (todoTab === 0 ? pendingTodos : completedTodos).map((todo) => (
                <ListItem
                  key={todo.id}
                  sx={{
                    px: 0,
                    borderBottom: '1px solid',
                    borderColor: 'grey.100',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <ListItemButton
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        checked={todo.done}
                        onChange={() => handleTodoToggle(todo.id)}
                        size='small'
                        sx={{
                          color: 'grey.400',
                          '&.Mui-checked': { color: 'success.main' },
                        }}
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: todo.done ? 'grey.100' : 'primary.50',
                          color: todo.done ? 'grey.500' : 'primary.main',
                        }}
                      >
                        {getTodoIcon(todo.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={todo.title}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          color: todo.done ? 'grey.500' : 'grey.900',
                          textDecoration: todo.done ? 'line-through' : 'none',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <EmptyState
                height={180}
                title={todoTab === 0 ? '暂无待处理事项' : '暂无已完成事项'}
                description={todoTab === 0 ? '所有任务已完成，继续保持！' : '还没有完成任何事项'}
                sx={{ border: 'none', bgcolor: 'transparent' }}
              />
            )}
          </List>
        </TodoListSection>

        {/* 服务状态监测分区 */}
        <ServiceMonitorSection
          collapsible={true}
          defaultExpanded={false}
        >
          <ServiceStatusMonitor
            serviceStatuses={serviceStatuses}
            onRefresh={refreshServiceStatuses}
          />
        </ServiceMonitorSection>

        {/* 最近活动分区 */}
        <RecentActivitySection
          headerRight={
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              查看全部
            </Typography>
          }
        >
          <RecentActivities activities={recentActivities} />
        </RecentActivitySection>
      </Box>
    </PageContainer>
  );
};

export default DashboardPage;
