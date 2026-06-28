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
  Badge,
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
  ClipboardList,
  ClipboardCheck,
  Factory,
  Clock,
  ChevronRight,
  CalendarCheck,
  AlertCircle,
  FileText,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton, MobileCard } from '@/components/mobile';
import { useAppStore } from '@/store';
import { mobileApi, type MobileWorkbenchData } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  badge?: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: number;
}

interface WorkbenchItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  avatar: React.ReactNode;
  type: 'task' | 'approval' | 'notification' | 'production' | 'quality';
  status?: string;
}

const MobileWorkbenchPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [workbenchItems, setWorkbenchItems] = useState<WorkbenchItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const quickActions: QuickAction[] = [
    {
      id: 'attendance',
      label: '考勤打卡',
      icon: <CalendarCheck style={{ width: 24, height: 24 }} />,
      path: '/mobile/attendance',
      color: 'primary',
    },
    {
      id: 'scan',
      label: '扫码',
      icon: <ScanLine style={{ width: 24, height: 24 }} />,
      path: '/mobile/scan-page',
      color: 'success',
    },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 24, height: 24 }} />,
      path: '/mobile/approvals',
      color: 'warning',
      badge: 3,
    },
    {
      id: 'inventory',
      label: '库存',
      icon: <Package style={{ width: 24, height: 24 }} />,
      path: '/mobile/inventory',
      color: 'info',
    },
    {
      id: 'quality',
      label: '质检',
      icon: <ClipboardCheck style={{ width: 24, height: 24 }} />,
      path: '/mobile/quality',
      color: 'error',
    },
    {
      id: 'production',
      label: '生产',
      icon: <Factory style={{ width: 24, height: 24 }} />,
      path: '/mobile/production',
      color: 'secondary',
    },
    {
      id: 'tasks',
      label: '任务',
      icon: <ListTodo style={{ width: 24, height: 24 }} />,
      path: '/mobile/tasks',
      color: 'primary',
    },
    {
      id: 'more',
      label: '更多',
      icon: <Zap style={{ width: 24, height: 24 }} />,
      path: '/mobile/home',
      color: 'info',
    },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const workbenchData: MobileWorkbenchData = {
        pending_tasks: 8,
        pending_approvals: 5,
        unread_notifications: 12,
        today_attendance_status: 'checked_in',
        today_production_output: 1256,
        today_quality_pass_rate: 98.5,
        shortcuts: [],
      };

      setStats([
        {
          id: '1',
          label: '待办任务',
          value: workbenchData.pending_tasks,
          icon: <ListTodo style={{ width: 20, height: 20 }} />,
          color: 'primary' as const,
          badge: workbenchData.pending_tasks,
        },
        {
          id: '2',
          label: '待审批',
          value: workbenchData.pending_approvals,
          icon: <CheckSquare style={{ width: 20, height: 20 }} />,
          color: 'warning' as const,
          badge: workbenchData.pending_approvals,
        },
        {
          id: '3',
          label: '今日产量',
          value: workbenchData.today_production_output,
          icon: <Factory style={{ width: 20, height: 20 }} />,
          color: 'success' as const,
        },
        {
          id: '4',
          label: '合格率',
          value: `${workbenchData.today_quality_pass_rate}%`,
          icon: <TrendingUp style={{ width: 20, height: 20 }} />,
          color: 'info' as const,
        },
      ]);

      setUnreadCount(workbenchData.unread_notifications);

      const mockItems: WorkbenchItem[] = [
        {
          id: 'task-1',
          title: 'A3仓库盘点任务',
          subtitle: '库存盘点 · 今日截止',
          time: '10:30',
          avatar: <ClipboardList style={{ width: 20, height: 20 }} />,
          type: 'task',
          status: '进行中',
        },
        {
          id: 'approval-1',
          title: '采购订单审批',
          subtitle: '张明提交 · ¥12,500',
          time: '09:45',
          avatar: <CheckSquare style={{ width: 20, height: 20 }} />,
          type: 'approval',
          status: '待审批',
        },
        {
          id: 'production-1',
          title: '生产工单 #PO-2024-0678',
          subtitle: '智能传感器 · 500件',
          time: '08:00',
          avatar: <Factory style={{ width: 20, height: 20 }} />,
          type: 'production',
          status: '生产中',
        },
        {
          id: 'quality-1',
          title: '来料质检任务',
          subtitle: '电子元件批次 #B20240601',
          time: '昨天 16:20',
          avatar: <ClipboardCheck style={{ width: 20, height: 20 }} />,
          type: 'quality',
          status: '待检验',
        },
        {
          id: 'notification-1',
          title: '系统维护通知',
          subtitle: '今晚22:00-24:00系统升级',
          time: '昨天 14:00',
          avatar: <Bell style={{ width: 20, height: 20 }} />,
          type: 'notification',
        },
      ];

      setWorkbenchItems(mockItems);
    } catch (err) {
      apiLogger.error('加载工作台数据失败:', err);
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
          label: '今日产量',
          value: '-',
          icon: <Factory style={{ width: 20, height: 20 }} />,
          color: 'success' as const,
        },
        {
          id: '4',
          label: '合格率',
          value: '-',
          icon: <TrendingUp style={{ width: 20, height: 20 }} />,
          color: 'info' as const,
        },
      ]);
      setWorkbenchItems([
        {
          id: 'error',
          title: '加载失败',
          subtitle: '请稍后刷新页面',
          time: '',
          avatar: <AlertCircle style={{ width: 20, height: 20 }} />,
          type: 'notification',
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
      case 'task':
        return 'primary.lighter';
      case 'approval':
        return 'warning.lighter';
      case 'production':
        return 'success.lighter';
      case 'quality':
        return 'error.lighter';
      case 'notification':
        return 'info.lighter';
      default:
        return 'grey.100';
    }
  };

  const getAvatarColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'primary.main';
      case 'approval':
        return 'warning.main';
      case 'production':
        return 'success.main';
      case 'quality':
        return 'error.main';
      case 'notification':
        return 'info.main';
      default:
        return 'text.primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中':
      case '生产中':
        return 'primary';
      case '待审批':
      case '待检验':
        return 'warning';
      case '已完成':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate('/mobile/workbench');
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

  const handleItemClick = (item: WorkbenchItem) => {
    switch (item.type) {
      case 'task':
        navigate('/mobile/tasks');
        break;
      case 'approval':
        navigate('/mobile/approvals');
        break;
      case 'production':
        navigate('/mobile/production');
        break;
      case 'quality':
        navigate('/mobile/quality');
        break;
      case 'notification':
        navigate('/notifications');
        break;
    }
  };

  const tabs = [
    { id: 'home', label: '工作台', icon: <Home style={{ width: 22, height: 22 }} /> },
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
      title='工作台'
      showBack={false}
      showMenu={false}
      showNotifications
      notificationCount={unreadCount}
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
                  {user?.department || '生产部 · 操作员'}
                </Typography>
              </Box>
              <Badge badgeContent={unreadCount} color='error'>
                <Bell style={{ width: 22, height: 22, opacity: 0.9 }} />
              </Badge>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Clock style={{ width: 16, height: 16 }} />
              <Typography
                variant='body2'
                sx={{ opacity: 0.9 }}
              >
                今日已签到 · 工作顺利！
              </Typography>
            </Box>
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
                        position: 'relative',
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    常用功能
                  </Typography>
                </Box>
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
                          position: 'relative',
                        }}
                        onClick={() => handleQuickAction(action)}
                      >
                        <Badge
                          badgeContent={action.badge}
                          color='error'
                          sx={{
                            '& .MuiBadge-badge': {
                              top: 2,
                              right: 2,
                            },
                          }}
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
                        </Badge>
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
                    待办事项
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'primary.main',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/mobile/tasks')}
                  >
                    <Typography variant='caption'>查看全部</Typography>
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </Box>
                </Box>
                <List disablePadding>
                  {workbenchItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: getAvatarBgColor(item.type),
                              color: getAvatarColor(item.type),
                            }}
                          >
                            {item.avatar}
                          </Avatar>
                        }
                        title={item.title}
                        subtitle={item.subtitle}
                        showArrow
                        divider={index < workbenchItems.length - 1}
                        rightContent={
                          item.status ? (
                            <Chip
                              label={item.status}
                              size='small'
                              color={getStatusColor(item.status) as any}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          ) : undefined
                        }
                        badge={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Clock style={{ width: 12, height: 12, color: 'text.secondary' }} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {item.time}
                            </Typography>
                          </Box>
                        }
                        onClick={() => handleItemClick(item)}
                      />
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

export default MobileWorkbenchPage;
