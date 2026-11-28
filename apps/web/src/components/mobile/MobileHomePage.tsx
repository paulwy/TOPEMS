/**
 * 移动端首页 - 真实数据版
 *
 * 数据来源：
 *   - 用户卡片：登录态（IAM）
 *   - 打卡卡：/api/mobile/attendance/overview + clock-in/clock-out
 *   - 待办：/api/mobile/workbench（workflow 待办数、审批数）
 *   - 最近动态：/notifications（真实通知）
 */
import React, { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import { attendanceApi } from '@/api/mobile/attendance';
import { getNotifications } from '@/api/notification';
import type { Notification } from '@/api/notification';
import {
  Clock,
  CheckSquare,
  Scan,
  LayoutDashboard,
  Bell,
  User,
  ChevronRight,
  FileText,
} from 'lucide-react';
import i18n from '@/i18n';
import { Box, Typography, Avatar, Paper, Chip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MobilePageTemplate } from '@/components/templates';
import { useAuthStore, useNotificationStore } from '@/store';
import { useCurrentIamUser } from '@/hooks/useCurrentIamUser';
import { MOBILE_PATHS } from '@/module-configs/mobile/config';

const quickActions = [
  {
    id: 'attendance',
    label: i18n.t('mobile.mobile_home_page.k0'),
    icon: <Clock size={24} />,
    path: MOBILE_PATHS.attendance,
  },
  {
    id: 'approval',
    label: i18n.t('mobile.mobile_home_page.k1'),
    icon: <CheckSquare size={24} />,
    path: MOBILE_PATHS.approvals,
  },
  {
    id: 'scan',
    label: i18n.t('mobile.mobile_home_page.k2'),
    icon: <Scan size={24} />,
    path: MOBILE_PATHS.scan,
  },
  {
    id: 'workbench',
    label: i18n.t('mobile.mobile_home_page.k3'),
    icon: <LayoutDashboard size={24} />,
    path: MOBILE_PATHS.workbench,
  },
  {
    id: 'notification',
    label: i18n.t('mobile.mobile_home_page.k4'),
    icon: <Bell size={24} />,
    path: MOBILE_PATHS.notifications,
  },
  {
    id: 'profile',
    label: i18n.t('mobile.mobile_home_page.k5'),
    icon: <User size={24} />,
    path: MOBILE_PATHS.profile,
  },
];

const formatTime = (value?: string) => {
  if (!value) return '--:--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 5);
  return parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatRelative = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMinutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) return i18n.t('pages.mobile_home_page.just_now');
  if (diffMinutes < 60) return `${diffMinutes}${i18n.t('pages.mobile_home_page.minutes_ago')}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}${i18n.t('pages.mobile_home_page.hours_ago')}`;
  return parsed.toLocaleDateString('zh-CN');
};

export const MobileHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const iamUser = useCurrentIamUser();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const workbenchQuery = useQuery({
    queryKey: ['mobile-home-workbench'],
    queryFn: () => mobileApi.getWorkbenchData().then((res) => res.data ?? null),
    staleTime: 60 * 1000,
  });

  const attendanceQuery = useQuery({
    queryKey: ['mobile-home-attendance'],
    queryFn: () => attendanceApi.getOverview().then((res) => res.data ?? null),
    staleTime: 60 * 1000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['mobile-home-notifications'],
    queryFn: async () => {
      const res = await getNotifications(1, 5);
      return (res?.data?.notifications ?? []) as Notification[];
    },
    staleTime: 60 * 1000,
  });

  const attendanceStatus = attendanceQuery.data?.today_status ?? 'not_checked_in';
  const checkedIn = attendanceStatus === 'checked_in' || attendanceStatus === 'checked_out';
  const checkedOut = attendanceStatus === 'checked_out';

  const punchMutation = useMutation({
    mutationFn: async () => (checkedIn ? attendanceApi.clockOut() : attendanceApi.clockIn()),
    onSuccess: async (res) => {
      await attendanceQuery.refetch();
      addNotification({
        title: checkedIn
          ? i18n.t('mobile.mobile_home_page.checkout_success')
          : i18n.t('mobile.mobile_home_page.k14'),
        message: res?.data?.check_out_time
          ? `${i18n.t('pages.mobile_home_page.k3')} ${formatTime(res.data.check_out_time)}`
          : `${i18n.t('pages.mobile_home_page.k2')} ${formatTime(res?.data?.check_in_time)}`,
        type: 'success',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('mobile.mobile_home_page.punch_fail'),
        message: i18n.t('mobile.mobile_home_page.punch_fail_hint'),
        type: 'error',
      });
    },
  });

  const displayName =
    iamUser?.full_name ||
    user?.realName ||
    user?.full_name ||
    user?.username ||
    '';
  const displaySubtitle =
    (iamUser as unknown as { department?: string } | null)?.department ?? '';
  const avatarText = displayName ? displayName.charAt(0) : '';
  const today = new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const pendingTasks = workbenchQuery.data?.pending_tasks ?? 0;
  const pendingApprovals = workbenchQuery.data?.pending_approvals ?? 0;
  const todoRows = useMemo(
    () =>
      [
        { id: 'tasks', count: pendingTasks, label: i18n.t('mobile.mobile_home_page.todo_tasks'), path: MOBILE_PATHS.tasks },
        {
          id: 'approvals',
          count: pendingApprovals,
          label: i18n.t('mobile.mobile_home_page.todo_approvals'),
          path: MOBILE_PATHS.approvals,
        },
      ].filter((row) => row.count > 0),
    [pendingTasks, pendingApprovals]
  );
  const notifications = notificationsQuery.data ?? [];

  return (
    <MobilePageTemplate title={i18n.t('mobile.mobile_home_page.k15')}>
      <Box sx={{ p: 2, pb: 3, bgcolor: 'background.default' }}>
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{avatarText}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6'>{displayName}</Typography>
            {displaySubtitle && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {displaySubtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {today}
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 6, mb: 2 }}>
            <Box sx={{ minWidth: 88, textAlign: 'center' }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 0.5 }}
              >
                {i18n.t('pages.mobile_home_page.k2')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                {formatTime(attendanceQuery.data?.today_check_in)}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 88, textAlign: 'center' }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 0.5 }}
              >
                {i18n.t('pages.mobile_home_page.k3')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                {formatTime(attendanceQuery.data?.today_check_out)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Chip
              label={
                checkedOut
                  ? i18n.t('mobile.mobile_home_page.checkout_done')
                  : checkedIn
                    ? i18n.t('mobile.mobile_home_page.checkout')
                    : i18n.t('mobile.mobile_home_page.k17')
              }
              color={checkedIn ? 'success' : 'primary'}
              disabled={punchMutation.isPending || checkedOut}
              onClick={() => punchMutation.mutate()}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Paper>

        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 1.5 }}
        >
          {i18n.t('mobile.mobile_home_page.quick_entries')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
          {quickActions.map((action) => (
            <Paper
              key={action.id}
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => navigate(action.path)}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  color: 'primary.main',
                }}
              >
                {action.icon}
              </Box>
              <Typography
                variant='caption'
                sx={{ fontWeight: 500 }}
              >
                {action.label}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 500 }}
          >
            {i18n.t('pages.mobile_home_page.k5')}
          </Typography>
          <Chip
            label={i18n.t('mobile.mobile_home_page.k19')}
            size='small'
            onClick={() => navigate(MOBILE_PATHS.tasks)}
          />
        </Box>
        <Paper sx={{ mb: 2 }}>
          {todoRows.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('mobile.mobile_home_page.no_todo')}
              </Typography>
            </Box>
          ) : (
            todoRows.map((row, index) => (
              <Box key={row.id}>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(row.path)}
                >
                  <Box
                    sx={{
                      width: 4,
                      height: 40,
                      borderRadius: 3,
                      bgcolor: row.id === 'approvals' ? 'warning.main' : 'primary.main',
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {row.label}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('mobile.mobile_home_page.todo_count', { count: row.count })}
                    </Typography>
                  </Box>
                  <ChevronRight
                    size={20}
                    color='action'
                  />
                </Box>
                {index < todoRows.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Paper>

        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 1.5 }}
        >
          {i18n.t('pages.mobile_home_page.k6')}
        </Typography>
        <Paper>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('mobile.mobile_home_page.no_activity')}
              </Typography>
            </Box>
          ) : (
            notifications.map((notification, index) => (
              <Box key={notification.id}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>
                    <FileText size={16} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='body2'>{notification.title}</Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {formatRelative(notification.created_at)}
                    </Typography>
                  </Box>
                </Box>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </MobilePageTemplate>
  );
};
export default MobileHomePage;
