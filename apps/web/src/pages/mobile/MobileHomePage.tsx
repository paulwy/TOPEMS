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
import { MobileLayout } from '@/components/mobile';
import { PullToRefresh } from '@/components/mobile';
import { MobileSkeleton } from '@/components/mobile';
import { MobileCard } from '@/components/mobile';
import { useAppStore } from '@/store';

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

  const quickActions: QuickAction[] = [
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 24, height: 24 }} />, path: '/mobile/scan-page', color: 'primary' },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 24, height: 24 }} />, path: '/mobile/tasks', color: 'success' },
    { id: 'approval', label: '审批', icon: <CheckSquare style={{ width: 24, height: 24 }} />, path: '/mobile/approvals', color: 'warning' },
    { id: 'inventory', label: '库存', icon: <Package style={{ width: 24, height: 24 }} />, path: '/wms/inventory', color: 'info' },
    { id: 'inbound', label: '入库', icon: <Warehouse style={{ width: 24, height: 24 }} />, path: '/wms/inbound-orders', color: 'secondary' },
    { id: 'outbound', label: '出库', icon: <Truck style={{ width: 24, height: 24 }} />, path: '/wms/outbound-orders', color: 'error' },
    { id: 'employee', label: '员工', icon: <Users style={{ width: 24, height: 24 }} />, path: '/hrm/employees', color: 'primary' },
    { id: 'more', label: '更多', icon: <LayoutGrid style={{ width: 24, height: 24 }} />, path: '/dashboard', color: 'info' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    setStats([
      { id: '1', label: '待办任务', value: '12', icon: <ListTodo style={{ width: 20, height: 20 }} />, color: 'primary', trend: '+3' },
      { id: '2', label: '待审批', value: '5', icon: <CheckSquare style={{ width: 20, height: 20 }} />, color: 'warning', trend: '+2' },
      { id: '3', label: '今日入库', value: '28', icon: <Warehouse style={{ width: 20, height: 20 }} />, color: 'success', trend: '+15%' },
      { id: '4', label: '今日出库', value: '35', icon: <Truck style={{ width: 20, height: 20 }} />, color: 'info', trend: '+8%' },
    ]);

    setActivities([
      {
        id: '1',
        title: '采购订单 PO-2024-001 已审批',
        subtitle: '张经理 完成审批',
        time: '10分钟前',
        avatar: <CheckSquare style={{ width: 20, height: 20 }} />,
        type: 'success',
      },
      {
        id: '2',
        title: '入库单 IN-2024-015 需要确认',
        subtitle: '仓库 A3 - 物料数量核对',
        time: '30分钟前',
        avatar: <AlertCircle style={{ width: 20, height: 20 }} />,
        type: 'warning',
      },
      {
        id: '3',
        title: '设备巡检任务已分配',
        subtitle: '2号生产线 - 日常巡检',
        time: '1小时前',
        avatar: <FileText style={{ width: 20, height: 20 }} />,
        type: 'info',
      },
      {
        id: '4',
        title: '质量异常报告 Q-2024-008',
        subtitle: '产品批次 B20240601 检测不通过',
        time: '2小时前',
        avatar: <AlertCircle style={{ width: 20, height: 20 }} />,
        type: 'error',
      },
      {
        id: '5',
        title: '员工入职申请已提交',
        subtitle: '李明 - 研发部工程师',
        time: '3小时前',
        avatar: <Users style={{ width: 20, height: 20 }} />,
        type: 'info',
      },
    ]);

    setLoading(false);
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
    { id: 'approval', label: '审批', icon: <CheckSquare style={{ width: 22, height: 22 }} />, badge: 3 },
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
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                  {user?.fullName || user?.username || '用户'}
                </Typography>
                <Typography variant='body2' sx={{ opacity: 0.8 }}>
                  {user?.role || '欢迎使用 TOPEMS'}
                </Typography>
              </Box>
              <Bell style={{ width: 22, height: 22, opacity: 0.9 }} />
            </Box>
            <Typography variant='body2' sx={{ opacity: 0.9 }}>
              今天有 <strong>12</strong> 项待办，继续加油！
            </Typography>
          </Paper>

          {loading ? (
            <MobileSkeleton type='dashboard' count={4} />
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map((stat) => (
                  <Grid xs={6} key={stat.id}>
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
                      <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
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
                <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                  快捷功能
                </Typography>
                <Grid container spacing={2}>
                  {quickActions.map((action) => (
                    <Grid xs={3} key={action.id}>
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
                        <Typography variant='caption' sx={{ fontSize: '0.75rem' }}>
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
                  <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
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
                              <Typography variant='caption' color='text.secondary'>
                                {activity.time}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && (
                        <Divider variant='inset' sx={{ ml: 9 }} />
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
