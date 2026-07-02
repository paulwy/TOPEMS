/**
 * 移动端消息通知页面
 *
 * @module pages/mobile
 * @path /mobile/notifications
 */

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
  Badge,
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
  Filter,
  MessageSquare,
  AlertCircle,
  Info,
  Clock,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { useAppStore } from '../../store';
import { extractErrorMessage } from '@/utils/errors';

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationPriority = 'high' | 'medium' | 'low';
type TabType = 'all' | 'unread' | 'system' | 'approval' | 'task';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  avatar?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    title: '审批通过',
    message: '您的请假申请（2024-01-15 至 2024-01-17）已通过审批',
    type: 'approval',
    priority: 'high',
    isRead: false,
    createdAt: '10分钟前',
  },
  {
    id: 'notif-002',
    title: '新任务通知',
    message: '您有一个新的生产任务等待处理：订单 #20240115001',
    type: 'task',
    priority: 'medium',
    isRead: false,
    createdAt: '30分钟前',
  },
  {
    id: 'notif-003',
    title: '库存预警',
    message: '原材料「钢材 A3」库存低于安全库存，请及时补货',
    type: 'system',
    priority: 'high',
    isRead: true,
    createdAt: '1小时前',
  },
  {
    id: 'notif-004',
    title: '消息提醒',
    message: '张三：您好，关于上周的报表有什么问题可以咨询我',
    type: 'message',
    priority: 'low',
    isRead: true,
    createdAt: '2小时前',
  },
  {
    id: 'notif-005',
    title: '审批提醒',
    message: '您有 3 条待审批事项需要处理',
    type: 'approval',
    priority: 'medium',
    isRead: true,
    createdAt: '3小时前',
  },
  {
    id: 'notif-006',
    title: '系统更新',
    message: 'TOPEMS 移动端 v2.5.0 已发布，更新了考勤打卡功能',
    type: 'system',
    priority: 'low',
    isRead: true,
    createdAt: '1天前',
  },
  {
    id: 'notif-007',
    title: '任务完成',
    message: '质检任务「批次 #20240114-003」已完成检验',
    type: 'task',
    priority: 'medium',
    isRead: true,
    createdAt: '1天前',
  },
  {
    id: 'notif-008',
    title: '质量报警',
    message: '检测到产品「零件编号 X-2024-001」质量异常，请及时处理',
    type: 'system',
    priority: 'high',
    isRead: false,
    createdAt: '昨天',
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

const PRIORITY_COLORS: Record<NotificationPriority, 'error' | 'warning' | 'info'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const getTypeIcon = (type: NotificationType) => TYPE_ICONS[type];

export const MobileNotificationPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const filteredNotifications = useMemo(() => {
    let result = notifications;

    if (activeTab === 'unread') {
      result = result.filter((n) => !n.isRead);
    } else if (activeTab !== 'all') {
      result = result.filter((n) => n.type === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query)
      );
    }

    return result;
  }, [notifications, activeTab, searchQuery]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

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
    (notification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      addNotification({
        title: '标记已读',
        message: `「${notification.title}」已标记为已读`,
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    addNotification({
      title: '全部已读',
      message: '所有通知已标记为已读',
      type: 'success',
    });
  }, [addNotification]);

  const handleDelete = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      addNotification({
        title: '删除成功',
        message: `「${notification.title}」已删除`,
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    addNotification({
      title: '清空成功',
      message: '所有通知已清空',
      type: 'success',
    });
  }, [addNotification]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        handleMarkAsRead(notification);
      }
      addNotification({
        title: '查看详情',
        message: notification.message,
        type: 'info',
      });
    },
    [handleMarkAsRead, addNotification]
  );

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: 'notification',
        label: '通知内容',
        minWidth: 200,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: row.isRead ? 'action.disabledBackground' : 'primary.main',
              }}
            >
              {getTypeIcon(row.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: row.isRead ? 400 : 600 }}
                  color={row.isRead ? 'text.secondary' : 'text.primary'}
                  noWrap
                >
                  {row.title}
                </Typography>
                {!row.isRead && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {row.message}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 80,
        render: (row) => (
          <Chip
            size='small'
            label={TYPE_LABELS[row.type]}
            variant='outlined'
          />
        ),
      },
      {
        id: 'time',
        label: '时间',
        width: 80,
        render: (row) => (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {row.createdAt}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        width: 100,
        fixed: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {!row.isRead && (
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(row);
                }}
                title='标记已读'
              >
                <Check size={16} />
              </IconButton>
            )}
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
              sx={{ color: 'error.main' }}
              title='删除'
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [handleMarkAsRead, handleDelete]
  );

  return (
    <PageContainer
      title='消息通知'
      subtitle={`${unreadCount} 条未读消息`}
    >
      {/* Mobile Notification Settings */}
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

      {/* Tabs */}
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

      {/* Stats */}
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

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size='small'
          placeholder='搜索通知...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search size={16} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1 }}
        />
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

      {/* Notification List */}
      <List disablePadding>
        {filteredNotifications.map((notification, index) => (
          <React.Fragment key={notification.id}>
            <ListItem
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <ListItemIcon sx={{ minWidth: 48 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: notification.isRead ? 'action.disabledBackground' : 'primary.main',
                  }}
                >
                  {getTypeIcon(notification.type)}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: notification.isRead ? 400 : 600 }}
                      color={notification.isRead ? 'text.secondary' : 'text.primary'}
                    >
                      {notification.title}
                    </Typography>
                    {notification.priority === 'high' && (
                      <Chip
                        size='small'
                        label='紧急'
                        color='error'
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        size='small'
                        label={TYPE_LABELS[notification.type]}
                        variant='outlined'
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                      <Typography
                        variant='caption'
                        color='text.disabled'
                      >
                        {notification.createdAt}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!notification.isRead && (
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification);
                      }}
                    >
                      <Check size={16} />
                    </IconButton>
                  )}
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < filteredNotifications.length - 1 && <Divider />}
          </React.Fragment>
        ))}

        {filteredNotifications.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <BellOff
              size={48}
              style={{ opacity: 0.3 }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              暂无通知
            </Typography>
          </Box>
        )}
      </List>
    </PageContainer>
  );
};

export default MobileNotificationPage;
