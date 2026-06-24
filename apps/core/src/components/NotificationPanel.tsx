import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNotificationStore } from '../store/notificationStore';
import type { NotificationType } from '../api/notification';

interface NotificationPanelProps {
  onClose: () => void;
}

const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case 'system':
      return <InfoIcon />;
    case 'workflow':
      return <WorkIcon />;
    case 'message':
      return <MessageIcon />;
    case 'info':
      return <InfoIcon />;
    case 'success':
      return <CheckCircleIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'error':
      return <ErrorIcon />;
    default:
      return <InfoIcon />;
  }
};

const getTypeColor = (type: NotificationType): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case 'system':
      return 'primary';
    case 'workflow':
      return 'info';
    case 'message':
      return 'default';
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const getTypeLabel = (type: NotificationType): string => {
  switch (type) {
    case 'system':
      return '系统';
    case 'workflow':
      return '工作流';
    case 'message':
      return '消息';
    case 'info':
      return '通知';
    case 'success':
      return '成功';
    case 'warning':
      return '警告';
    case 'error':
      return '错误';
    default:
      return type;
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeType, setActiveType] = useState<NotificationType | 'all'>('all');
  const {
    notifications,
    unreadCount,
    loading,
    total,
    page,
    pageSize,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications({ page: 1, pageSize: 20 });
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'all' | 'unread') => {
    setActiveTab(newValue);
  };

  const handleTypeChange = (type: NotificationType | 'all') => {
    setActiveType(type);
    fetchNotifications({
      page: 1,
      pageSize: 20,
      type: type === 'all' ? undefined : type,
      read: activeTab === 'unread' ? false : undefined,
    });
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (id: string) => {
    await removeNotification(id);
  };

  const handleRefresh = () => {
    fetchNotifications({
      page: 1,
      pageSize: 20,
      type: activeType === 'all' ? undefined : activeType,
      read: activeTab === 'unread' ? false : undefined,
    });
    fetchUnreadCount();
  };

  const handleLoadMore = () => {
    fetchNotifications({
      page: page + 1,
      pageSize,
      type: activeType === 'all' ? undefined : activeType,
      read: activeTab === 'unread' ? false : undefined,
    });
  };

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const typeOptions: (NotificationType | 'all')[] = ['all', 'system', 'workflow', 'message'];

  return (
    <Box sx={{ width: 400, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
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
        <Typography variant="h6" fontWeight="medium">
          通知中心
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="通知设置">
            <IconButton size="small">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="刷新">
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab label="全部" value="all" />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              未读
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ height: 20, minWidth: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
                />
              )}
            </Box>
          }
          value="unread"
        />
      </Tabs>

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          overflowX: 'auto',
        }}
      >
        {typeOptions.map((type) => (
          <Chip
            key={type}
            label={type === 'all' ? '全部' : getTypeLabel(type)}
            size="small"
            color={activeType === type ? 'primary' : 'default'}
            variant={activeType === type ? 'filled' : 'outlined'}
            onClick={() => handleTypeChange(type)}
            sx={{ flexShrink: 0 }}
          />
        ))}
      </Box>

      {unreadCount > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={handleMarkAllAsRead}
            sx={{ textTransform: 'none' }}
          >
            全部标记已读
          </Button>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
        {loading && notifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              color: 'text.secondary',
            }}
          >
            <InfoIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
            <Typography variant="body2">
              {activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!notification.read && (
                        <Tooltip title="标记已读">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <DoneAllIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${getTypeColor(notification.type)}.light`,
                        color: `${getTypeColor(notification.type)}.main`,
                      }}
                    >
                      {getTypeIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: notification.read ? 400 : 600,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getTypeLabel(notification.type)}
                          size="small"
                          color={getTypeColor(notification.type)}
                          variant="outlined"
                          sx={{ height: 16, fontSize: 10 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notification.content}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                          {dayjs(notification.createdAt).format('MM-DD HH:mm')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {total > notifications.length && (
        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            size="small"
            onClick={handleLoadMore}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            加载更多
          </Button>
        </Box>
      )}

      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Button
          fullWidth
          size="small"
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          查看全部通知
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationPanel;
