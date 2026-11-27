import { designTokens } from '@topems/tokens';
import { semanticTileSx } from '@/theme/semanticTile';
import styles from './MobileWorkbenchPage.module.css';
import React, { useCallback, useEffect } from 'react';
import { Box, Typography, Paper, Chip, Avatar, useTheme, List, Badge } from '@mui/material';
import { Grid } from '@/components/common';
import { MobilePageTemplate } from '@/components/templates';
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
  TrendingUp,
  Zap,
} from 'lucide-react';
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, MobileSkeleton, MobileCard } from '@/components/mobile';
import { useAuthStore } from '@/store';
import { type MobileWorkbenchData } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/module-configs/mobile/config';
import { NOTIFICATION_PATHS } from '@/module-configs/notification/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

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
  const { user } = useAuthStore();
  const workbenchQuery = useQuery<{
    stats: StatCard[];
    workbenchItems: WorkbenchItem[];
    unreadCount: number;
  }>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_WORKBENCH_BASE,
    queryFn: async () => {
      const workbenchData: MobileWorkbenchData = {
        pending_tasks: 8,
        pending_approvals: 5,
        unread_notifications: 12,
        today_attendance_status: 'checked_in',
        today_production_output: 1256,
        today_quality_pass_rate: 98.5,
        shortcuts: [],
      };
      const stats: StatCard[] = [
        {
          id: '1',
          label: i18n.t('mobile.mobile_workbench_page.k0'),
          value: workbenchData.pending_tasks,
          icon: <ListTodo className={styles.il1} />,
          color: 'primary' as const,
          badge: workbenchData.pending_tasks,
        },
        {
          id: '2',
          label: i18n.t('mobile.mobile_workbench_page.k1'),
          value: workbenchData.pending_approvals,
          icon: <CheckSquare className={styles.il2} />,
          color: 'warning' as const,
          badge: workbenchData.pending_approvals,
        },
        {
          id: '3',
          label: i18n.t('mobile.mobile_workbench_page.k2'),
          value: workbenchData.today_production_output,
          icon: <Factory className={styles.il3} />,
          color: 'success' as const,
        },
        {
          id: '4',
          label: i18n.t('mobile.mobile_workbench_page.k3'),
          value: `${workbenchData.today_quality_pass_rate}%`,
          icon: <TrendingUp className={styles.il4} />,
          color: 'info' as const,
        },
      ];
      const workbenchItems: WorkbenchItem[] = [
        {
          id: 'task-1',
          title: i18n.t('pages.mobile_workbench_page.a3_0'),
          subtitle: i18n.t('mobile.mobile_workbench_page.k4'),
          time: '10:30',
          avatar: <ClipboardList className={styles.il5} />,
          type: 'task',
          status: i18n.t('mobile.mobile_workbench_page.k5'),
        },
        {
          id: 'approval-1',
          title: i18n.t('mobile.mobile_workbench_page.k6'),
          subtitle: i18n.t('pages.mobile_workbench_page.12500_1'),
          time: '09:45',
          avatar: <CheckSquare className={styles.il6} />,
          type: 'approval',
          status: i18n.t('mobile.mobile_workbench_page.k7'),
        },
        {
          id: 'production-1',
          title: i18n.t('pages.mobile_workbench_page.po20240678_2'),
          subtitle: i18n.t('mobile.mobile_workbench_page.500_8'),
          time: '08:00',
          avatar: <Factory className={styles.il7} />,
          type: 'production',
          status: i18n.t('mobile.mobile_workbench_page.k9'),
        },
        {
          id: 'quality-1',
          title: i18n.t('mobile.mobile_workbench_page.k10'),
          subtitle: i18n.t('pages.mobile_workbench_page.b20240601_3'),
          time: i18n.t('pages.mobile_workbench_page.1620_4'),
          avatar: <ClipboardCheck className={styles.il8} />,
          type: 'quality',
          status: i18n.t('mobile.mobile_workbench_page.k11'),
        },
        {
          id: 'notification-1',
          title: i18n.t('mobile.mobile_workbench_page.k12'),
          subtitle: i18n.t('pages.mobile_workbench_page.22002400_5'),
          time: i18n.t('pages.mobile_workbench_page.1400_6'),
          avatar: <Bell className={styles.il9} />,
          type: 'notification',
        },
      ];
      return { stats, workbenchItems, unreadCount: workbenchData.unread_notifications };
    },
    staleTime: 5 * 60 * 1000,
  });
  const stats = workbenchQuery.data?.stats ?? [];
  const workbenchItems = workbenchQuery.data?.workbenchItems ?? [];
  const unreadCount = workbenchQuery.data?.unreadCount ?? 0;
  const loading = workbenchQuery.isLoading;
  useEffect(() => {
    if (workbenchQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_workbench_page.k7'), workbenchQuery.error);
    }
  }, [workbenchQuery.isError, workbenchQuery.error]);
  const quickActions: QuickAction[] = [
    {
      id: 'attendance',
      label: i18n.t('mobile.mobile_workbench_page.k13'),
      icon: <CalendarCheck className={styles.il10} />,
      path: MOBILE_PATHS.attendance,
      color: 'primary',
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_workbench_page.k14'),
      icon: <ScanLine className={styles.il11} />,
      path: MOBILE_PATHS.scanPage,
      color: 'success',
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_workbench_page.k15'),
      icon: <CheckSquare className={styles.il12} />,
      path: MOBILE_PATHS.approvals,
      color: 'warning',
      badge: 3,
    },
    {
      id: 'inventory',
      label: i18n.t('mobile.mobile_workbench_page.k16'),
      icon: <Package className={styles.il13} />,
      path: MOBILE_PATHS.inventory,
      color: 'info',
    },
    {
      id: 'quality',
      label: i18n.t('mobile.mobile_workbench_page.k17'),
      icon: <ClipboardCheck className={styles.il14} />,
      path: MOBILE_PATHS.quality,
      color: 'error',
    },
    {
      id: 'production',
      label: i18n.t('mobile.mobile_workbench_page.k18'),
      icon: <Factory className={styles.il15} />,
      path: MOBILE_PATHS.production,
      color: 'secondary',
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_workbench_page.k19'),
      icon: <ListTodo className={styles.il16} />,
      path: MOBILE_PATHS.tasks,
      color: 'primary',
    },
    {
      id: 'more',
      label: i18n.t('mobile.mobile_workbench_page.k20'),
      icon: <Zap className={styles.il17} />,
      path: MOBILE_PATHS.home,
      color: 'info',
    },
  ];
  const handleRefresh = useCallback(async () => {
    await workbenchQuery.refetch();
  }, [workbenchQuery]);
  // 语义色软底瓦片：MUI v9 没有 .lighter 色阶，`${x}.50` 会被丢弃，
  // Avatar 退回默认 grey[400] 底 + 同色系前景（1.1~2.2:1，暗色灰底更浅）。
  const getTileKey = (type: string) => {
    switch (type) {
      case 'task':
        return 'primary';
      case 'approval':
        return 'warning';
      case 'production':
        return 'success';
      case 'quality':
        return 'error';
      case 'notification':
        return 'info';
      default:
        return 'primary';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case i18n.t('mobile.mobile_workbench_page.k21'):
      case i18n.t('mobile.mobile_workbench_page.k22'):
        return 'primary';
      case i18n.t('mobile.mobile_workbench_page.k23'):
      case i18n.t('mobile.mobile_workbench_page.k24'):
        return 'warning';
      case i18n.t('mobile.mobile_workbench_page.k25'):
        return 'success';
      default:
        return 'default';
    }
  };
  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.workbench);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };
  const handleQuickAction = (action: QuickAction) => {
    navigate(action.path);
  };
  const handleItemClick = (item: WorkbenchItem) => {
    switch (item.type) {
      case 'task':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'production':
        navigate(MOBILE_PATHS.production);
        break;
      case 'quality':
        navigate(MOBILE_PATHS.quality);
        break;
      case 'notification':
        navigate(NOTIFICATION_PATHS.list);
        break;
    }
  };
  const tabs = [
    {
      id: 'home',
      label: i18n.t('mobile.mobile_workbench_page.k26'),
      icon: <Home className={styles.il18} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_workbench_page.k27'),
      icon: <ListTodo className={styles.il19} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_workbench_page.k28'),
      icon: <ScanLine className={styles.il20} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_workbench_page.k29'),
      icon: <CheckSquare className={styles.il21} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_workbench_page.k30'),
      icon: <User className={styles.il22} />,
    },
  ];
  return (
    <MobilePageTemplate
      title={i18n.t('mobile.mobile_workbench_page.k31')}
      onRefresh={handleRefresh}
      bottomNav={
        <BottomTabBar
          tabs={tabs}
          activeTab='home'
          onChange={handleTabChange}
        />
      }
      headerProps={{
        showBack: false,
        showMenu: false,
        showNotifications: true,
        notificationCount: unreadCount,
      }}
    >
      <Box sx={{ p: 2, pb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'action.disabledBackground',
                fontSize: designTokens.typography.fontSize.scale['1rem'],
              }}
            >
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                {user?.fullName || user?.username || i18n.t('mobile.mobile_workbench_page.k32')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ opacity: 0.8 }}
              >
                {user?.department || i18n.t('mobile.mobile_workbench_page.k33')}
              </Typography>
            </Box>
            <Badge
              badgeContent={unreadCount}
              color='error'
            >
              <Bell className={styles.il23} />
            </Badge>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock className={styles.il24} />
            <Typography
              variant='body2'
              sx={{ opacity: 0.9 }}
            >
              {i18n.t('pages.mobile_workbench_page.k0')}
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
                          ...semanticTileSx(stat.color, 0.14),
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
                  {i18n.t('pages.mobile_workbench_page.k1')}
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
                            ...semanticTileSx(action.color, 0.14),
                          }}
                        >
                          {action.icon}
                        </Box>
                      </Badge>
                      <Typography
                        variant='caption'
                        sx={{ fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
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
                  {i18n.t('pages.mobile_workbench_page.k2')}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'primary.main',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(MOBILE_PATHS.tasks)}
                >
                  <Typography variant='caption'>
                    {i18n.t('mobile.mobile_workbench_page.k34')}
                  </Typography>
                  <ChevronRight className={styles.il25} />
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
                            ...semanticTileSx(getTileKey(item.type), 0.14),
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
                            color={
                              getStatusColor(item.status) as React.ComponentProps<
                                typeof Chip
                              >['color']
                            }
                            sx={{
                              height: 20,
                              fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                            }}
                          />
                        ) : undefined
                      }
                      badge={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Clock
                            style={{
                              width: 12,
                              height: 12,
                              color: theme.palette.text.secondary,
                            }}
                          />
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
    </MobilePageTemplate>
  );
};
export default MobileWorkbenchPage;
