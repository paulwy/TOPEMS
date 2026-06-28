import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  useTheme,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import { Grid } from '@/components/common';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Bell,
  Package,
  Truck,
  Warehouse,
  Users,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton, MobileCard } from '@/components/mobile';
import { useAppStore } from '@/store';
import { mobileApi } from '@/api/mobile';
import { approvalTaskApi } from '@/api/workflow/approval';
import { apiLogger } from '@/utils/logger';

interface StatCard {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  avatar: React.ReactNode;
  type: 'info' | 'success' | 'warning' | 'error';
}

const MobileHomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const quickActions: QuickAction[] = [
    {
      id: 'scan',
      label: '扫码',
      icon: <ScanLine style={{ width: 24, height: 24 }} />,
      path: '/mobile/scan-page',
      color: 'primary',
    },
    {
      id: 'tasks',
      label: '任务',
      icon: <ListTodo style={{ width: 24, height: 24 }} />,
      path: '/mobile/tasks',
      color: 'success',
    },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 24, height: 24 }} />,
      path: '/mobile/approvals',
      color: 'warning',
    },
    {
      id: 'inventory',
      label: '库存',
      icon: <Package style={{ width: 24, height: 24 }} />,
      path: '/wms/inventory',
      color: 'info',
    },
    {
      id: 'inbound',
      label: '入库',
      icon: <Warehouse style={{ width: 24, height: 24 }} />,
      path: '/wms/inbound-orders',
      color: 'secondary',
    },
    {
      id: 'outbound',
      label: '出库',
      icon: <Truck style={{ width: 24, height: 24 }} />,
      path: '/wms/outbound-orders',
      color: 'error',
    },
    {
      id: 'employee',
      label: '员工',
      icon: <Users style={{ width: 24, height: 24 }} />,
      path: '/hrm/employees',
      color: 'primary',
    },
    {
      id: 'more',
      label: '更多',
      icon: <LayoutGrid style={{ width: 24, height: 24 }} />,
      path: '/dashboard',
      color: 'info',
    },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResponse, tasksResponse, approvalsResponse] = await Promise.all([
        mobileApi.getDashboardStats(),
        mobileApi.listMobileTasks(),
        approvalTaskApi.listApprovalTasks({ pagesize: 100 }),
      ]);

      const dashboardStats =
        statsResponse.success && statsResponse.data ? statsResponse.data : null;
      const tasksData =
        tasksResponse.success && tasksResponse.data ? (tasksResponse.data as any) : null;
      const approvalsData =
        approvalsResponse.success && approvalsResponse.data
          ? (approvalsResponse.data as any)
          : null;

      const pendingTasks = tasksData?.items?.length || dashboardStats?.pending_tasks || 0;
      const pendingApprovals = approvalsData?.items?.length || 0;
      const todayInbound = dashboardStats?.today_patrols || 0;
      const todayOutbound = dashboardStats?.today_scans || 0;

      setStats([
        {
          id: '1',
          label: '待办任务',
          value: String(pendingTasks),
          icon: <ListTodo style={{ width: 20, height: 20 }} />,
          color: 'primary' as const,
        },
        {
          id: '2',
          label: '待审批',
          value: String(pendingApprovals),
          icon: <CheckSquare style={{ width: 20, height: 20 }} />,
          color: 'warning' as const,
        },
        {
          id: '3',
          label: '今日入库',
          value: String(todayInbound),
          icon: <Warehouse style={{ width: 20, height: 20 }} />,
          color: 'success' as const,
        },
        {
          id: '4',
          label: '今日出库',
          value: String(todayOutbound),
          icon: <Truck style={{ width: 20, height: 20 }} />,
          color: 'info' as const,
        },
      ]);
      setPendingTasksCount(pendingTasks);
      setPendingApprovalsCount(pendingApprovals);

      const activities: ActivityItem[] = [];
      if (tasksData?.items && Array.isArray(tasksData.items)) {
        tasksData.items.slice(0, 3).forEach((task: any, index: number) => {
          activities.push({
            id: `task-${task.id}`,
            title: task.title || `任务 ${task.id}`,
            subtitle: task.assignee || '未知',
            time: task.due_date
              ? new Date(task.due_date).toLocaleDateString('zh-CN')
              : '无截止日期',
            avatar: <ListTodo style={{ width: 20, height: 20 }} />,
            type: 'info' as const,
          });
        });
      }
      if (approvalsData?.items && Array.isArray(approvalsData.items)) {
        approvalsData.items.slice(0, 2).forEach((approval: any, index: number) => {
          activities.push({
            id: `approval-${approval.id}`,
            title: approval.title || `审批 ${approval.id}`,
            subtitle: approval.applicant_name || '未知',
            time: approval.created_at
              ? new Date(approval.created_at).toLocaleDateString('zh-CN')
              : '',
            avatar: <CheckSquare style={{ width: 20, height: 20 }} />,
            type: 'warning' as const,
          });
        });
      }
      if (activities.length === 0) {
        activities.push({
          id: 'empty',
          title: '暂无动态',
          subtitle: '开始您的工作吧',
          time: '',
          avatar: <FileText style={{ width: 20, height: 20 }} />,
          type: 'info' as const,
        });
      }
      setActivities(activities);
    } catch (err) {
      apiLogger.error('加载首页数据失败:', err);
      setStats([
        {
          id: '1',
          label: '待办任务',
          value: '-',
          icon: <ListTodo style={{ width: 20, height: 20 }} />,
          color: 'primary' as const,
        },
        {
          id: '2',
          label: '待审批',
          value: '-',
          icon: <CheckSquare style={{ width: 20, height: 20 }} />,
          color: 'warning' as const,
        },
        {
          id: '3',
          label: '今日入库',
          value: '-',
          icon: <Warehouse style={{ width: 20, height: 20 }} />,
          color: 'success' as const,
        },
        {
          id: '4',
          label: '今日出库',
          value: '-',
          icon: <Truck style={{ width: 20, height: 20 }} />,
          color: 'info' as const,
        },
      ]);
      setActivities([
        {
          id: 'error',
          title: '加载失败',
          subtitle: '请稍后刷新页面',
          time: '',
          avatar: <AlertCircle style={{ width: 20, height: 20 }} />,
          type: 'error' as const,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const getAvatarBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'success.lighter';
      case 'warning':
        return 'warning.lighter';
      case 'error':
        return 'error.lighter';
      default:
        return 'primary.lighter';
    }
  };

  const getAvatarColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'success.main';
      case 'warning':
        return 'warning.main';
      case 'error':
        return 'error.main';
      default:
        return 'primary.main';
    }
  };

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        break;
      case 'tasks':
        navigate('/mobile/tasks');
        break;
      case 'scan':
        navigate('/mobile/scan-page');
        break;
      case 'approval':
        navigate('/mobile/approvals');
        break;
      case 'profile':
        navigate('/mobile/settings');
        break;
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    navigate(action.path);
  };

  const tabs = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='TOPEMS'
      showBack={false}
      showMenu={false}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={tabs}
      activeTab='home'
      onTabChange={handleTabChange}
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <Box sx={{ p: 2, pb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              mb: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  fontSize: '1rem',
                }}
              >
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  {user?.fullName || user?.username || '用户'}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ opacity: 0.8 }}
                >
                  {user?.role || '欢迎使用 TOPEMS'}
                </Typography>
              </Box>
              <Bell style={{ width: 22, height: 22, opacity: 0.9 }} />
            </Box>
            <Typography
              variant='body2'
              sx={{ opacity: 0.9 }}
            >
              今天有 <strong>{pendingTasksCount + pendingApprovalsCount}</strong> 项待办，继续加油！
            </Typography>
          </Paper>

          {loading ? (
            <MobileSkeleton
              type='dashboard'
              count={4}
            />
          ) : (
            <>
              <Grid
                container
                spacing={2}
                sx={{ mb: 3 }}
              >
                {stats.map((stat) => (
                  <Grid
                    xs={6}
                    key={stat.id}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: `${stat.color}.lighter`,
                            color: `${stat.color}.main`,
                          }}
                        >
                          {stat.icon}
                        </Box>
                        {stat.trend && (
                          <Chip
                            label={stat.trend}
                            size='small'
                            color={stat.color as any}
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, mb: 0.5 }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {stat.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  mb: 3,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  快捷功能
                </Typography>
                <Grid
                  container
                  spacing={2}
                >
                  {quickActions.map((action) => (
                    <Grid
                      xs={3}
                      key={action.id}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:active': {
                            transform: 'scale(0.95)',
                          },
                        }}
                        onClick={() => handleQuickAction(action)}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: `${action.color}.lighter`,
                            color: `${action.color}.main`,
                          }}
                        >
                          {action.icon}
                        </Box>
                        <Typography
                          variant='caption'
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {action.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    最近动态
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'primary.main',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/notifications')}
                  >
                    <Typography variant='caption'>查看全部</Typography>
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </Box>
                </Box>
                <List disablePadding>
                  {activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem
                        sx={{
                          px: 2,
                          py: 1.5,
                          minHeight: 60,
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: getAvatarBgColor(activity.type),
                              color: getAvatarColor(activity.type),
                            }}
                          >
                            {activity.avatar}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={activity.title}
                          secondary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mt: 0.5,
                              }}
                            >
                              <Clock style={{ width: 12, height: 12 }} />
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {activity.time}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && (
                        <Divider
                          variant='inset'
                          sx={{ ml: 9 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </>
          )}
        </Box>
      </PullToRefresh>
    </MobileLayout>
  );
};

export default MobileHomePage;
