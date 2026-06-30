import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  CheckCheck,
  Filter,
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton } from '@/components/mobile';
import { getNotifications, markAsRead } from '@/api/notification';
import { apiLogger } from '@/utils/logger';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  time: string;
  source: string;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
};

const NotificationListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications(1, 50);
      if (response.success && response.data) {
        const mapped: NotificationItem[] = response.data.notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content || n.message || '',
          type: (n.type || n.notification_type || 'info') as NotificationItem['type'],
          read: n.is_read !== undefined ? n.is_read : n.read !== undefined ? n.read : false,
          time: n.created_at ? formatRelativeTime(n.created_at) : '刚刚',
          source: n.source || n.module || '系统通知',
        }));
        setNotifications(mapped);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (err) {
      apiLogger.error('加载通知列表失败:', err);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  const getAvatarBg = (type: string) => {
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

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return !n.read;
    return n.read;
  });

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate('/mobile/home');
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

  const bottomTabs = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    { id: 'approval', label: '审批', icon: <CheckSquare style={{ width: 22, height: 22 }} /> },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='消息通知'
      showBack={false}
      showMenu={false}
      showTabBar
      tabs={bottomTabs}
      activeTab='home'
      onTabChange={handleBottomTabChange}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant='fullWidth'
        sx={{ px: 2, mb: 1, '& .MuiTab-root': { minHeight: 44, fontSize: '0.875rem' } }}
      >
        <Tab label='全部' />
        <Tab label={`未读 (${unreadCount})`} />
        <Tab label='已读' />
      </Tabs>

      <PullToRefresh onRefresh={handleRefresh}>
        {loading ? (
          <MobileSkeleton
            type='list'
            count={6}
          />
        ) : filteredNotifications.length === 0 ? (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, px: 4 }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Bell style={{ width: 32, height: 32, color: 'text.secondary' }} />
            </Box>
            <Typography
              variant='subtitle1'
              sx={{ mb: 1, fontWeight: 500 }}
            >
              暂无通知
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              当前分类下暂无通知消息
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    px: 2,
                    py: 2,
                    bgcolor: !notification.read ? 'action.hover' : 'transparent',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: getAvatarBg(notification.type),
                        color: getAvatarColor(notification.type),
                        fontSize: '0.75rem',
                      }}
                    >
                      {notification.type === 'success'
                        ? '✓'
                        : notification.type === 'warning'
                          ? '!'
                          : notification.type === 'error'
                            ? '×'
                            : 'i'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: notification.read ? 400 : 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.25,
                          }}
                        >
                          {notification.content}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Clock style={{ width: 12, height: 12, color: 'text.disabled' }} />
                          <Typography
                            variant='caption'
                            color='text.disabled'
                          >
                            {notification.time}
                          </Typography>
                          <Chip
                            label={notification.source}
                            size='small'
                            sx={{ height: 16, fontSize: '0.625rem' }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider component='li' />}
              </React.Fragment>
            ))}
          </List>
        )}
      </PullToRefresh>
    </MobileLayout>
  );
};

export default NotificationListPage;
