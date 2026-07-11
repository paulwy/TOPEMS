import { Box, Typography, Chip, IconButton, Tabs, Tab, Grid, Paper, Avatar } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Star,
  StarOff,
  Mail,
  Settings,
  AlertCircle,
  CheckSquare,
  MessageSquare,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationStatus = 'unread' | 'read';
type NotificationTab = 'all' | 'unread' | 'read' | 'important';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  status: NotificationStatus;
  important: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统通知',
  approval: '审批通知',
  task: '任务通知',
  message: '消息通知',
};

const TYPE_COLORS: Record<NotificationType, 'primary' | 'success' | 'warning' | 'info'> = {
  system: 'primary',
  approval: 'warning',
  task: 'success',
  message: 'info',
};

const TYPE_BG_COLORS: Record<NotificationType, { bg: string; color: string }> = {
  system: { bg: 'rgba(59, 130, 246, 0.1)', color: 'primary.main' },
  approval: { bg: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' },
  task: { bg: 'rgba(34, 197, 94, 0.1)', color: 'success.main' },
  message: { bg: 'rgba(14, 165, 233, 0.1)', color: ct.info.main },
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  system: <Settings size={16} />,
  approval: <CheckSquare size={16} />,
  task: <Calendar size={16} />,
  message: <MessageSquare size={16} />,
};

const generateMockData = (): NotificationItem[] => {
  const now = new Date();
  const data: NotificationItem[] = [
    {
      id: '1',
      title: '系统维护通知',
      content: '系统将于今晚22:00-24:00进行维护升级，请提前保存您的工作。',
      type: 'system',
      status: 'unread',
      important: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      title: '采购订单审批待处理',
      content: '您有一个采购订单 PO-2024-001 等待审批，请及时处理。',
      type: 'approval',
      status: 'unread',
      important: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '3',
      title: '新任务分配',
      content: '您被分配了一个新任务：QMS质量检测，请在截止日期前完成。',
      type: 'task',
      status: 'unread',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: '4',
      title: '张三给您发送了一条消息',
      content: '关于项目进度的讨论，希望能尽快回复。',
      type: 'message',
      status: 'read',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: '5',
      title: '密码安全提醒',
      content: '您的密码即将过期，请及时更新以确保账户安全。',
      type: 'system',
      status: 'read',
      important: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '6',
      title: '请假审批已通过',
      content: '您的请假申请（2024-06-15至2024-06-16）已通过审批。',
      type: 'approval',
      status: 'read',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: '7',
      title: '任务完成提醒',
      content: '您负责的任务"设备维护"已接近截止日期，请尽快完成。',
      type: 'task',
      status: 'unread',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: '8',
      title: '李四回复了您的消息',
      content: '好的，我会按计划进行。',
      type: 'message',
      status: 'read',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 50).toISOString(),
    },
    {
      id: '9',
      title: '系统升级公告',
      content: '系统已成功升级到v4.0版本，体验新功能。',
      type: 'system',
      status: 'read',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
    },
    {
      id: '10',
      title: '报销审批被驳回',
      content: '您的报销申请BX-2024-056被驳回，请查看详情并修改后重新提交。',
      type: 'approval',
      status: 'unread',
      important: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 80).toISOString(),
    },
    {
      id: '11',
      title: '周报提交提醒',
      content: '请于本周五前提交本周工作周报。',
      type: 'task',
      status: 'read',
      important: false,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 96).toISOString(),
    },
  ];
  return data;
};

export const NotificationListPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [notifications, setNotifications] = useState<NotificationItem[]>(generateMockData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importantFilter, setImportantFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const filteredByTab = useMemo(() => {
    let result = notifications;

    switch (activeTab) {
      case 'unread':
        result = result.filter((n) => n.status === 'unread');
        break;
      case 'read':
        result = result.filter((n) => n.status === 'read');
        break;
      case 'important':
        result = result.filter((n) => n.important);
        break;
      default:
        break;
    }

    return result;
  }, [notifications, activeTab]);

  const filteredData = useMemo(() => {
    let result = filteredByTab;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((n) => n.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((n) => n.status === statusFilter);
    }

    if (importantFilter !== 'all') {
      result = result.filter((n) => (importantFilter === 'important' ? n.important : !n.important));
    }

    return result;
  }, [filteredByTab, searchQuery, typeFilter, statusFilter, importantFilter]);

  const total = filteredData.length;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  const stats = useMemo(() => {
    const unreadCount = notifications.filter((n) => n.status === 'unread').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = notifications.filter((n) => new Date(n.createdAt) >= today).length;
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = notifications.filter((n) => new Date(n.createdAt) >= weekAgo).length;
    const readCount = notifications.filter((n) => n.status === 'read').length;
    const readRate =
      notifications.length > 0 ? Math.round((readCount / notifications.length) * 100) : 0;

    return [
      {
        id: 'unread',
        title: '未读数',
        value: unreadCount,
        icon: <Bell size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'today',
        title: '今日通知',
        value: todayCount,
        icon: <Calendar size={20} />,
        color: 'success' as const,
      },
      {
        id: 'week',
        title: '本周通知',
        value: weekCount,
        icon: <Mail size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'readRate',
        title: '已读率',
        value: `${readRate}%`,
        icon: <Check size={20} />,
        color: 'info' as const,
      },
    ];
  }, [notifications]);

  const handleMarkAsRead = useCallback(
    (row: NotificationItem) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === row.id ? { ...n, status: 'read' as const } : n))
      );
      addNotification({
        title: '操作成功',
        message: '通知已标记为已读',
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleMarkAsUnread = useCallback(
    (row: NotificationItem) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === row.id ? { ...n, status: 'unread' as const } : n))
      );
      addNotification({
        title: '操作成功',
        message: '通知已标记为未读',
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleToggleImportant = useCallback(
    (row: NotificationItem) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === row.id ? { ...n, important: !n.important } : n))
      );
      addNotification({
        title: '操作成功',
        message: row.important ? '已取消重要标记' : '已标记为重要',
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleDeleteClick = useCallback((row: NotificationItem) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      addNotification({
        title: '删除成功',
        message: '通知已删除',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '删除失败',
        message: extractErrorMessage(_err, '删除通知失败'),
        type: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, addNotification]);

  const handleMarkAllAsRead = useCallback(() => {
    const unreadItems = filteredData.filter((n) => n.status === 'unread');
    if (unreadItems.length === 0) {
      addNotification({
        title: '提示',
        message: '没有未读通知',
        type: 'info',
      });
      return;
    }
    setNotifications((prev) =>
      prev.map((n) =>
        unreadItems.some((u) => u.id === n.id) ? { ...n, status: 'read' as const } : n
      )
    );
    addNotification({
      title: '操作成功',
      message: `已将 ${unreadItems.length} 条通知标记为已读`,
      type: 'success',
    });
  }, [filteredData, addNotification]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要删除的通知',
        type: 'warning',
      });
      return;
    }
    setBulkDeleteDialogOpen(true);
  }, [selectedIds.length, addNotification]);

  const handleConfirmBulkDelete = useCallback(async () => {
    try {
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      addNotification({
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 条通知`,
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '删除失败',
        message: extractErrorMessage(_err, '批量删除失败'),
        type: 'error',
      });
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  }, [selectedIds, addNotification]);

  const handleFilterImportant = useCallback(() => {
    if (importantFilter === 'important') {
      setImportantFilter('all');
    } else {
      setImportantFilter('important');
    }
    setPage(1);
  }, [importantFilter]);

  const columns: ColumnDef<NotificationItem>[] = useMemo(
    () => [
      {
        id: 'title',
        label: '通知标题',
        minWidth: 280,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: TYPE_BG_COLORS[row.type].bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TYPE_BG_COLORS[row.type].color,
                flexShrink: 0,
              }}
            >
              {TYPE_ICONS[row.type]}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: row.status === 'unread' ? 600 : 400,
                  color: row.status === 'unread' ? 'text.primary' : 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.title}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.content}
              </Typography>
            </Box>
            {row.important && (
              <Star
                size={14}
                color='warning.main'
                fill='warning.main'
              />
            )}
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 120,
        render: (row) => (
          <Chip
            size='small'
            color={TYPE_COLORS[row.type]}
            label={TYPE_LABELS[row.type]}
            variant='outlined'
          />
        ),
      },
      {
        id: 'createdAt',
        label: '发送时间',
        width: 160,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.createdAt).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            color={row.status === 'unread' ? 'primary' : 'default'}
            label={row.status === 'unread' ? '未读' : '已读'}
            variant={row.status === 'unread' ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <IconButton
              size='small'
              onClick={() =>
                row.status === 'unread' ? handleMarkAsRead(row) : handleMarkAsUnread(row)
              }
              title={row.status === 'unread' ? '标记已读' : '标记未读'}
            >
              {row.status === 'unread' ? <Eye size={16} /> : <EyeOff size={16} />}
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleToggleImportant(row)}
              title={row.important ? '取消重要' : '标记重要'}
              color={row.important ? 'warning' : 'default'}
            >
              {row.important ? (
                <Star
                  size={16}
                  fill='currentColor'
                />
              ) : (
                <StarOff size={16} />
              )}
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleDeleteClick(row)}
              title='删除'
              color='error'
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [handleMarkAsRead, handleMarkAsUnread, handleToggleImportant, handleDeleteClick]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'type',
        label: '类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '未读', value: 'unread' },
          { label: '已读', value: 'read' },
        ],
      },
      {
        id: 'important',
        label: '重要性',
        type: 'select' as const,
        options: [
          { label: '全部', value: 'all' },
          { label: '重要', value: 'important' },
          { label: '普通', value: 'normal' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.type === 'string') {
      setTypeFilter(filters.type);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.important === 'string') {
      setImportantFilter(filters.important);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: NotificationTab) => {
    setActiveTab(newValue);
    setPage(1);
  }, []);

  const headerContent = useMemo(() => {
    const tabs: { key: NotificationTab; label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'unread', label: '未读' },
      { key: 'read', label: '已读' },
      { key: 'important', label: '重要' },
    ];
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          {stats.map((stat) => (
            <Box
              key={stat.id}
              sx={{ flex: 1, minWidth: { xs: '50%', sm: 'calc(25% - 8px)' } }}
            >
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${stat.color}.light`,
                      color: `${stat.color}.main`,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600 }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          ))}
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>
      </Box>
    );
  }, [activeTab, handleTabChange, stats]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
        backButton: {
          href: NOTIFICATION_PATHS.dashboard,
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={paginatedData}
        loading={loading}
        error={error || undefined}
        searchable
        searchPlaceholder='搜索标题、内容...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          type: typeFilter,
          status: statusFilter,
          important: importantFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
        }}
        actions={[
          {
            label: '全部已读',
            icon: <Check size={16} />,
            onClick: handleMarkAllAsRead,
            variant: 'outlined',
          },
          {
            label: '全部删除',
            icon: <Trash2 size={16} />,
            onClick: handleBulkDelete,
            variant: 'outlined',
          },
          {
            label: importantFilter === 'important' ? '取消筛选重要' : '筛选重要',
            icon: <Star size={16} />,
            onClick: handleFilterImportant,
            variant: 'outlined',
          },
        ]}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={[
          {
            label: '批量已读',
            icon: <Check size={16} />,
            onClick: () => {
              setNotifications((prev) =>
                prev.map((n) =>
                  selectedIds.includes(n.id) ? { ...n, status: 'read' as const } : n
                )
              );
              setSelectedIds([]);
              addNotification({
                title: '操作成功',
                message: '已标记为已读',
                type: 'success',
              });
            },
            showWhenSelected: true,
          },
          {
            label: '批量删除',
            icon: <Trash2 size={16} />,
            color: 'error',
            onClick: handleBulkDelete,
            confirm: true,
            showWhenSelected: true,
          },
        ]}
        onRefresh={() => {
          setNotifications(generateMockData());
          addNotification({
            title: '刷新成功',
            message: '通知列表已刷新',
            type: 'success',
          });
        }}
        emptyMessage='暂无通知'
        headerContent={headerContent}
        getRowId={(row) => row.id}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title='删除通知'
        message={
          <Box>
            <AlertCircle
              size={48}
              color='error.main'
              style={{ marginBottom: 16 }}
            />
            <Typography variant='body1'>确定要删除这条通知吗？</Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {deleteTarget?.title}
            </Typography>
          </Box>
        }
        type='confirm'
        confirmLabel='删除'
        cancelLabel='取消'
        danger
      />

      <ConfirmDialog
        isOpen={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title='批量删除'
        message={
          <Box>
            <AlertCircle
              size={48}
              color='error.main'
              style={{ marginBottom: 16 }}
            />
            <Typography variant='body1'>
              确定要删除选中的 {selectedIds.length} 条通知吗？
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              此操作不可恢复
            </Typography>
          </Box>
        }
        type='confirm'
        confirmLabel='删除'
        cancelLabel='取消'
        danger
      />
    </PageContainer>
  );
};

export default NotificationListPage;
