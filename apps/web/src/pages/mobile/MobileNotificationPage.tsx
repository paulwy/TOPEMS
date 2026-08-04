import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Switch,
  Divider,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Paper,
  Avatar,
  FormControlLabel,
} from '@mui/material';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Search,
  MessageSquare,
  Clock,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import { useNotificationStore } from '../../store';
import { notificationSchema } from '@/schemas/mobile';

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

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    title: '审批通过',
    content: '您的请假申请（2024-01-15 至 2024-01-17）已通过审批',
    type: 'approval',
    priority: 'high',
    read: false,
    created_at: '10分钟前',
  },
  {
    id: 'notif-002',
    title: '新任务通知',
    content: '您有一个新的生产任务等待处理：订单 #20240115001',
    type: 'task',
    priority: 'medium',
    read: false,
    created_at: '30分钟前',
  },
  {
    id: 'notif-003',
    title: '库存预警',
    content: '原材料「钢材 A3」库存低于安全库存，请及时补货',
    type: 'system',
    priority: 'high',
    read: true,
    created_at: '1小时前',
  },
  {
    id: 'notif-004',
    title: '消息提醒',
    content: '张三：您好，关于上周的报表有什么问题可以咨询我',
    type: 'message',
    priority: 'low',
    read: true,
    created_at: '2小时前',
  },
  {
    id: 'notif-005',
    title: '审批提醒',
    content: '您有 3 条待审批事项需要处理',
    type: 'approval',
    priority: 'medium',
    read: true,
    created_at: '3小时前',
  },
  {
    id: 'notif-006',
    title: '系统更新',
    content: 'TOPEMS 移动端 v2.5.0 已发布，更新了考勤打卡功能',
    type: 'system',
    priority: 'low',
    read: true,
    created_at: '1天前',
  },
  {
    id: 'notif-007',
    title: '任务完成',
    content: '质检任务「批次 #20240114-003」已完成检验',
    type: 'task',
    priority: 'medium',
    read: true,
    created_at: '1天前',
  },
  {
    id: 'notif-008',
    title: '质量报警',
    content: '检测到产品「零件编号 X-2024-001」质量异常，请及时处理',
    type: 'system',
    priority: 'high',
    read: false,
    created_at: '昨天',
  },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统',
  approval: '审批',
  task: '任务',
  message: '消息',
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  system: <Bell size={20} />,
  approval: <CheckCheck size={20} />,
  task: <Clock size={20} />,
  message: <MessageSquare size={20} />,
};

const getTypeIcon = (type: NotificationType) => TYPE_ICONS[type];

export const MobileNotificationPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const stats = useMemo(
    () => [
      {
        id: 'total',
        title: '全部通知',
        value: notifications.length,
        icon: <Bell size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'unread',
        title: '未读消息',
        value: unreadCount,
        icon: <BellOff size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approval',
        title: '审批通知',
        value: notifications.filter((n) => n.type === 'approval').length,
        icon: <CheckCheck size={20} />,
        color: 'info' as const,
      },
      {
        id: 'task',
        title: '任务通知',
        value: notifications.filter((n) => n.type === 'task').length,
        icon: <Clock size={20} />,
        color: 'success' as const,
      },
    ],
    [notifications, unreadCount]
  );

  const handleMarkAsRead = useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (notification) {
        addNotification({
          title: '标记已读',
          message: `「${notification.title}」已标记为已读`,
          type: 'success',
        });
      }
    },
    [notifications, addNotification]
  );

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addNotification({
      title: '全部已读',
      message: '所有通知已标记为已读',
      type: 'success',
    });
  }, [addNotification]);

  const handleDelete = useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notification) {
        addNotification({
          title: '删除成功',
          message: `「${notification.title}」已删除`,
          type: 'success',
        });
      }
    },
    [notifications, addNotification]
  );

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    addNotification({
      title: '清空成功',
      message: '所有通知已清空',
      type: 'success',
    });
  }, [addNotification]);

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
          created_at: '刚刚',
        } as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
        return newNotif;
      },
      update: async (id, data) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...data } : n)));
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
        label: '标记已读',
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
          全部已读
        </Button>
        <Button
          variant='outlined'
          size='small'
          color='error'
          startIcon={<Trash2 size={14} />}
          onClick={handleClearAll}
          disabled={notifications.length === 0}
        >
          清空
        </Button>
      </Box>
    ),
    [handleMarkAllAsRead, handleClearAll, unreadCount, notifications.length]
  );

  return (
    <PageContainer
      title='消息通知'
      subtitle={`${unreadCount} 条未读消息`}
    >
      <Paper
        variant='outlined'
        sx={{ p: 2, mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={18} />
            <Typography variant='subtitle2'>通知设置</Typography>
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
                声音
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
            label='振动'
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
            label='全部'
          />
          <Tab
            value='unread'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                未读
                {unreadCount > 0 && (
                  <Chip
                    size='small'
                    label={unreadCount}
                    color='primary'
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            value='system'
            label='系统'
          />
          <Tab
            value='approval'
            label='审批'
          />
          <Tab
            value='task'
            label='任务'
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
        schema={notificationSchema}
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
