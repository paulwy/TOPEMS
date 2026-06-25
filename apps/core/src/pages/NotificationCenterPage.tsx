/**
 * @deprecated 此页面已废弃，请使用 apps/web/src/pages/notification/NotificationCenter.tsx
 * 该页面功能更完善，使用自定义组件，支持更丰富的通知管理功能
 * 将在下一个版本中移除
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  Checkbox,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Badge,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification, NotificationType, NotificationSettings } from '../api/notification';

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

const getTypeColor = (
  type: NotificationType
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' => {
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
      return '系统通知';
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

interface CategoryItem {
  key: NotificationType | 'all';
  label: string;
  icon: React.ReactNode;
  count: number;
}

export const NotificationCenterPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<NotificationType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<NotificationSettings>>({});

  const {
    notifications,
    unreadCount,
    loading,
    total,
    page,
    pageSize,
    selectedIds,
    settings,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    bulkDelete,
    toggleSelected,
    selectAll,
    clearSelected,
    fetchSettings,
    updateSettings,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications({ page: 1, pageSize: 20 });
    fetchUnreadCount();
    fetchSettings();
  }, [fetchNotifications, fetchUnreadCount, fetchSettings]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: total,
      system: 0,
      workflow: 0,
      message: 0,
    };
    notifications.forEach((n) => {
      if (counts[n.type] !== undefined) {
        counts[n.type]++;
      }
    });
    return counts;
  }, [notifications, total]);

  const categories: CategoryItem[] = [
    { key: 'all', label: '全部通知', icon: <NotificationsIcon />, count: categoryCounts.all },
    { key: 'system', label: '系统通知', icon: <InfoIcon />, count: categoryCounts.system || 0 },
    { key: 'workflow', label: '工作流', icon: <WorkIcon />, count: categoryCounts.workflow || 0 },
    { key: 'message', label: '消息', icon: <MessageIcon />, count: categoryCounts.message || 0 },
  ];

  const filteredNotifications = useMemo(() => {
    let result = notifications;

    if (activeCategory !== 'all') {
      result = result.filter((n) => n.type === activeCategory);
    }

    if (activeTab === 'unread') {
      result = result.filter((n) => !n.read);
    } else if (activeTab === 'read') {
      result = result.filter((n) => n.read);
    }

    return result;
  }, [notifications, activeCategory, activeTab]);

  const handleCategoryChange = (category: NotificationType | 'all') => {
    setActiveCategory(category);
    setSelectedNotification(null);
    clearSelected();
    fetchNotifications({
      page: 1,
      pageSize: 20,
      type: category === 'all' ? undefined : category,
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'all' | 'unread' | 'read') => {
    setActiveTab(newValue);
    setSelectedNotification(null);
    clearSelected();
    fetchNotifications({
      page: 1,
      pageSize: 20,
      type: activeCategory === 'all' ? undefined : activeCategory,
      read: newValue === 'all' ? undefined : newValue === 'read',
    });
  };

  const handleSelectNotification = async (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll(filteredNotifications.map((n) => n.id));
    } else {
      clearSelected();
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length > 0) {
      await bulkMarkAsRead(selectedIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length > 0) {
      if (window.confirm(`确定要删除选中的 ${selectedIds.length} 条通知吗？`)) {
        await bulkDelete(selectedIds);
        setSelectedNotification(null);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = () => {
    fetchNotifications({
      page: 1,
      pageSize: 20,
      type: activeCategory === 'all' ? undefined : activeCategory,
      read: activeTab === 'all' ? undefined : activeTab === 'read',
    });
    fetchUnreadCount();
  };

  const handleLoadMore = () => {
    fetchNotifications({
      page: page + 1,
      pageSize,
      type: activeCategory === 'all' ? undefined : activeCategory,
      read: activeTab === 'all' ? undefined : activeTab === 'read',
    });
  };

  const handleOpenSettings = () => {
    if (settings) {
      setSettingsForm(settings);
    }
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    await updateSettings(settingsForm);
    setSettingsDialogOpen(false);
  };

  const allSelected = filteredNotifications.length > 0 && selectedIds.length === filteredNotifications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredNotifications.length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" fontWeight="medium">
          通知中心
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="通知设置">
            <IconButton onClick={handleOpenSettings}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="刷新">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Paper
          elevation={0}
          sx={{
            width: 240,
            borderRight: 1,
            borderColor: 'divider',
            borderRadius: 0,
            overflowY: 'auto',
          }}
        >
          <List disablePadding>
            {categories.map((category) => (
              <ListItemButton
                key={category.key}
                selected={activeCategory === category.key}
                onClick={() => handleCategoryChange(category.key)}
                sx={{
                  py: 1.5,
                  px: 2,
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: activeCategory === category.key
                        ? 'primary.main'
                        : 'action.selected',
                      color: activeCategory === category.key
                        ? 'primary.contrastText'
                        : 'action.active',
                    }}
                  >
                    {category.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={category.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: activeCategory === category.key ? 600 : 400,
                  }}
                />
                {category.count > 0 && (
                  <Chip
                    label={category.count}
                    size="small"
                    color={activeCategory === category.key ? 'primary' : 'default'}
                    variant={activeCategory === category.key ? 'filled' : 'outlined'}
                    sx={{ height: 20, minWidth: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
            >
              <Tab label="全部" value="all" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    未读
                    {unreadCount > 0 && (
                      <Chip
                        label={unreadCount}
                        size="small"
                        color="error"
                        sx={{
                          height: 18,
                          minWidth: 18,
                          '& .MuiChip-label': { px: 0.5, py: 0, fontSize: 10 },
                        }}
                      />
                    )}
                  </Box>
                }
                value="unread"
              />
              <Tab label="已读" value="read" />
            </Tabs>

            {selectedIds.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  已选 {selectedIds.length} 项
                </Typography>
                <Tooltip title="标记已读">
                  <IconButton size="small" onClick={handleBulkMarkAsRead}>
                    <DoneAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton size="small" color="error" onClick={handleBulkDelete}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {filteredNotifications.length > 0 && (
            <Box
              sx={{
                px: 2,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'action.hover',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <Button
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllAsRead}
                sx={{ textTransform: 'none' }}
              >
                全部已读
              </Button>
            </Box>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredNotifications.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 8,
                  color: 'text.secondary',
                }}
              >
                <NotificationsIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="body1">
                  {activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredNotifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItemButton
                      selected={selectedNotification?.id === notification.id}
                      onClick={() => handleSelectNotification(notification)}
                      sx={{
                        px: 2,
                        py: 2,
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <Checkbox
                        size="small"
                        edge="start"
                        checked={selectedIds.includes(notification.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelected(notification.id);
                        }}
                        sx={{ mr: 1 }}
                      />
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Badge
                          variant={notification.read ? 'standard' : 'dot'}
                          color="primary"
                          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        >
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${getTypeColor(notification.type)}.light`,
                              color: `${getTypeColor(notification.type)}.main`,
                            }}
                          >
                            {getTypeIcon(notification.type)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: notification.read ? 400 : 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Chip
                              label={getTypeLabel(notification.type)}
                              size="small"
                              color={getTypeColor(notification.type)}
                              variant="outlined"
                              sx={{ height: 18, fontSize: 10, flexShrink: 0 }}
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
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                mb: 0.5,
                              }}
                            >
                              {notification.content}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {dayjs(notification.createdAt).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                    <Divider component="li" />
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
                onClick={handleLoadMore}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                加载更多
              </Button>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            width: 400,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedNotification ? (
            <>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <IconButton size="small" onClick={() => setSelectedNotification(null)}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h6" fontWeight="medium">
                  通知详情
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: `${getTypeColor(selectedNotification.type)}.light`,
                      color: `${getTypeColor(selectedNotification.type)}.main`,
                    }}
                  >
                    {getTypeIcon(selectedNotification.type)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom fontWeight="medium">
                      {selectedNotification.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={getTypeLabel(selectedNotification.type)}
                        size="small"
                        color={getTypeColor(selectedNotification.type)}
                        variant="outlined"
                      />
                      <Chip
                        label={selectedNotification.read ? '已读' : '未读'}
                        size="small"
                        color={selectedNotification.read ? 'default' : 'primary'}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(selectedNotification.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {selectedNotification.content}
                </Typography>

                {selectedNotification.linkUrl && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      href={selectedNotification.linkUrl}
                      target="_blank"
                    >
                      查看详情
                    </Button>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                }}
              >
                {!selectedNotification.read && (
                  <Button
                    startIcon={<DoneAllIcon />}
                    onClick={() => markAsRead(selectedNotification.id)}
                    sx={{ textTransform: 'none' }}
                  >
                    标记已读
                  </Button>
                )}
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={async () => {
                    if (window.confirm('确定要删除这条通知吗？')) {
                      await useNotificationStore.getState().removeNotification(selectedNotification.id);
                      setSelectedNotification(null);
                    }
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  删除
                </Button>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                p: 4,
              }}
            >
              <InfoIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="body1">选择一条通知查看详情</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>通知设置</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settingsForm.emailEnabled ?? false}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, emailEnabled: e.target.checked }))
                  }
                />
              }
              label="邮件通知"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settingsForm.pushEnabled ?? false}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, pushEnabled: e.target.checked }))
                  }
                />
              }
              label="推送通知"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settingsForm.soundEnabled ?? false}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                  }
                />
              }
              label="声音提醒"
            />

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" color="text.secondary">
              通知类型
            </Typography>

            {(['system', 'workflow', 'message', 'info', 'success', 'warning', 'error'] as NotificationType[]).map(
              (type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={settingsForm.types?.[type] ?? true}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          types: {
                            ...(prev.types || {} as Record<NotificationType, boolean>),
                            [type]: e.target.checked,
                          },
                        }))
                      }
                    />
                  }
                  label={getTypeLabel(type)}
                />
              )
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationCenterPage;
