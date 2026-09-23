import { designTokens } from '@topems/tokens';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Switch,
  Button,
  Tabs,
  Tab,
  Paper,
  FormControlLabel,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
} from '@/api/notification';
import { useNotificationStore } from '../../store';
import { getMobileNotificationSchema } from '@/schemas/mobile';

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationPriority = 'high' | 'medium' | 'low';
type TabType = 'all' | 'unread' | 'system' | 'approval' | 'task';
interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  created_at: string;
}
export const MobileNotificationPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const { data: notifRes } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => getNotifications(1, 50),
  });
  const invalidateNotifications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
  }, [queryClient]);
  const notifications = useMemo<Notification[]>(
    () =>
      (notifRes?.data?.notifications ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: (n.notification_type === 'warning'
          ? 'approval'
          : n.notification_type === 'error'
            ? 'task'
            : 'system') as NotificationType,
        priority: (n.priority >= 2
          ? 'high'
          : n.priority === 1
            ? 'medium'
            : 'low') as NotificationPriority,
        read: n.is_read,
        created_at: n.created_at,
      })),
    [notifRes]
  );
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const stats = useMemo(
    () => [
      {
        id: 'total',
        title: i18n.t('mobile.mobile_notification_page.k16'),
        value: notifications.length,
        icon: <Bell size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'unread',
        title: i18n.t('mobile.mobile_notification_page.k17'),
        value: unreadCount,
        icon: <BellOff size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approval',
        title: i18n.t('mobile.mobile_notification_page.k18'),
        value: notifications.filter((n) => n.type === 'approval').length,
        icon: <CheckCheck size={20} />,
        color: 'info' as const,
      },
      {
        id: 'task',
        title: i18n.t('mobile.mobile_notification_page.k19'),
        value: notifications.filter((n) => n.type === 'task').length,
        icon: <Clock size={20} />,
        color: 'success' as const,
      },
    ],
    [notifications, unreadCount]
  );
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      await markAsRead(id);
      invalidateNotifications();
      if (notification) {
        addNotification({
          title: i18n.t('mobile.mobile_notification_page.k20'),
          message: `「${notification.title}${i18n.t('pages.mobile_notification_page.k12')}`,
          type: 'success',
        });
      }
    },
    [notifications, addNotification, invalidateNotifications]
  );
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    invalidateNotifications();
    addNotification({
      title: i18n.t('mobile.mobile_notification_page.k21'),
      message: i18n.t('mobile.mobile_notification_page.k22'),
      type: 'success',
    });
  }, [addNotification, invalidateNotifications]);
  const handleDelete = useCallback(
    async (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      await deleteNotification(id);
      invalidateNotifications();
      if (notification) {
        addNotification({
          title: i18n.t('mobile.mobile_notification_page.k23'),
          message: `「${notification.title}${i18n.t('pages.mobile_notification_page.k13')}`,
          type: 'success',
        });
      }
    },
    [notifications, addNotification, invalidateNotifications]
  );
  const handleClearAll = useCallback(async () => {
    await bulkDeleteNotifications(notifications.map((n) => n.id));
    invalidateNotifications();
    addNotification({
      title: i18n.t('mobile.mobile_notification_page.k24'),
      message: i18n.t('mobile.mobile_notification_page.k25'),
      type: 'success',
    });
  }, [notifications, addNotification, invalidateNotifications]);
  const apiAdapter = useMemo<CrudApiAdapter<Notification>>(
    () => ({
      list: async (params) => {
        let result = [...notifications];
        const typeFilter = params?.type as string;
        const readFilter = params?.read as string;
        const search = params?.search as string;
        if (readFilter === 'unread') {
          result = result.filter((n) => !n.read);
        } else if (typeFilter && typeFilter !== 'all') {
          result = result.filter((n) => n.type === typeFilter);
        }
        if (search) {
          const query = search.toLowerCase();
          result = result.filter(
            (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
          );
        }
        return { data: result, total: result.length };
      },
      create: async (data) => {
        const newNotif = {
          ...data,
          id: `notif-${Date.now()}`,
          read: false,
          created_at: new Date().toISOString(),
        } as Notification;
        return newNotif;
      },
      update: async (id, data) => {
        return { id, ...data } as Notification;
      },
      delete: async (id) => {
        handleDelete(id);
      },
    }),
    [notifications, handleDelete]
  );
  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: i18n.t('mobile.mobile_notification_page.k27'),
        icon: <Check size={16} />,
        onClick: (row: Record<string, unknown>) => handleMarkAsRead(String(row.id)),
      },
    ],
    [handleMarkAsRead]
  );
  const headerContent = useMemo(
    () => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant='outlined'
          size='small'
          startIcon={<CheckCheck size={14} />}
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          {i18n.t('pages.mobile_notification_page.k0')}
        </Button>
        <Button
          variant='outlined'
          size='small'
          color='error'
          startIcon={<Trash2 size={14} />}
          onClick={handleClearAll}
          disabled={notifications.length === 0}
        >
          {i18n.t('pages.mobile_notification_page.k1')}
        </Button>
      </Box>
    ),
    [handleMarkAllAsRead, handleClearAll, unreadCount, notifications.length]
  );
  return (
    <PageContainer
      title={i18n.t('mobile.mobile_notification_page.k28')}
      subtitle={`${unreadCount}${i18n.t('pages.mobile_notification_page.k14')}`}
    >
      <Paper
        variant='outlined'
        sx={{ p: 2, mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={18} />
            <Typography variant='subtitle2'>
              {i18n.t('mobile.mobile_notification_page.k29')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {i18n.t('pages.mobile_notification_page.k2')}
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={vibrationEnabled}
                onChange={(e) => setVibrationEnabled(e.target.checked)}
              />
            }
            label={i18n.t('mobile.mobile_notification_page.k30')}
          />
        </Box>
      </Paper>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant='scrollable'
          scrollButtons='auto'
        >
          <Tab
            value='all'
            label={i18n.t('mobile.mobile_notification_page.k31')}
          />
          <Tab
            value='unread'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {i18n.t('pages.mobile_notification_page.k3')}
                {unreadCount > 0 && (
                  <Chip
                    size='small'
                    label={unreadCount}
                    color='primary'
                    sx={{ height: 18, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            value='system'
            label={i18n.t('mobile.mobile_notification_page.k32')}
          />
          <Tab
            value='approval'
            label={i18n.t('mobile.mobile_notification_page.k33')}
          />
          <Tab
            value='task'
            label={i18n.t('mobile.mobile_notification_page.k34')}
          />
        </Tabs>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          mb: 2,
        }}
      >
        {stats.map((stat) => (
          <Paper
            key={stat.id}
            variant='outlined'
            sx={{
              p: 1.5,
              textAlign: 'center',
              bgcolor: stat.color === 'warning' ? 'warning.50' : 'transparent',
            }}
          >
            <Box sx={{ color: `${stat.color}.main`, mb: 0.5 }}>{stat.icon}</Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {stat.value}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {stat.title}
            </Typography>
          </Paper>
        ))}
      </Box>
      <CrudPage
        schema={getMobileNotificationSchema()}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        extraQueryParams={{
          type: activeTab === 'all' ? 'all' : activeTab === 'unread' ? undefined : activeTab,
          read: activeTab === 'unread' ? 'unread' : undefined,
        }}
      />
    </PageContainer>
  );
};
export default MobileNotificationPage;
