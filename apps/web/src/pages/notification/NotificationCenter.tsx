import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  Search,
  Trash2,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Cpu,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  ListPageTemplate,
  Modal,
  Select,
  Tabs,
  ToastContainer,
  Toggle,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import type { LucideIcon } from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/api/notification';
import type { Notification, NotificationTypeEnum } from '@/api/notification';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['notifications', 'list'];

type NotificationFilterType = 'all' | 'unread' | NotificationTypeEnum;

const notificationTypeConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  info: { label: '系统通知', icon: Info, color: 'var(--info-500)' },
  success: { label: '成功通知', icon: CheckCircle2, color: 'var(--success-500)' },
  warning: { label: '警告通知', icon: AlertTriangle, color: 'var(--warning-500)' },
  error: { label: '错误通知', icon: AlertCircle, color: 'var(--error-500)' },
  message: { label: '消息通知', icon: MessageSquare, color: 'var(--accent-primary)' },
  reminder: { label: '提醒通知', icon: Calendar, color: 'var(--warning-500)' },
  system: { label: '系统更新', icon: Cpu, color: 'var(--text-secondary)' },
};

const filterTabs = [
  { id: 'all', label: '全部' },
  { id: 'unread', label: '未读', badge: 0 },
  { id: 'info', label: '系统' },
  { id: 'warning', label: '警告' },
  { id: 'message', label: '消息' },
];

const NotificationCenter: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, activeFilter, debouncedSearch],
    queryFn: async () => {
      const typeParam =
        activeFilter === 'all' || activeFilter === 'unread' ? undefined : activeFilter;
      const response = await getNotifications(1, 50, typeParam);
      if (response.success && response.data) {
        let notifications = response.data.notifications || [];
        // 未读筛选
        if (activeFilter === 'unread') {
          notifications = notifications.filter((n) => !n.is_read);
        }
        // 搜索筛选
        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          notifications = notifications.filter(
            (n) =>
              n.title?.toLowerCase().includes(query) ||
              n.content?.toLowerCase().includes(query) ||
              n.content?.toLowerCase().includes(query)
          );
        }
        return {
          notifications,
          total: response.data.total || 0,
          unread_count: response.data.unread_count || 0,
        };
      }
      return { notifications: [], total: 0, unread_count: 0 };
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '已标记为已读');
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '全部标记为已读');
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '通知已删除');
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // 更新未读 Tab 的 badge
  const tabsWithBadge = useMemo(
    () => filterTabs.map((t) => (t.id === 'unread' ? { ...t, badge: unreadCount } : t)),
    [unreadCount]
  );

  const formatTime = (value?: string) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes} 分钟前`;
      if (hours < 24) return `${hours} 小时前`;
      if (days < 7) return `${days} 天前`;

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return value;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  return (
    <>
      <ListPageTemplate<Notification>
        header={{
          title: '消息中心',
          subtitle: '查看和管理所有系统通知、消息和提醒',
        }}
        toolbar={
          <>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                placeholder='搜索通知...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 240 }}
              />
              {selectedIds.size > 0 && <Badge variant='cyan'>已选 {selectedIds.size} 项</Badge>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<CheckCheck size={16} />}
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={unreadCount === 0}
              >
                全部已读
              </Button>
              <Button
                variant='ghost'
                leftIcon={<Settings size={16} />}
                onClick={() => setShowSettings(true)}
              >
                设置
              </Button>
              <Button
                variant='ghost'
                leftIcon={<Trash2 size={16} />}
                disabled={selectedIds.size === 0}
              >
                删除选中
              </Button>
            </div>
          </>
        }
        columns={[]}
        data={notifications}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无通知'
        emptyDescription='您目前没有任何通知'
        tableProps={{
          onRowClick: handleNotificationClick,
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              共 {notifications.length} 条通知，{unreadCount} 条未读
            </span>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => refetch()}
            >
              刷新
            </Button>
          </div>
        }
      >
        {/* 自定义通知列表渲染 */}
      </ListPageTemplate>

      {/* 通知列表（自定义渲染，替代 DataTable） */}
      {!isLoading && !error && notifications.length > 0 && (
        <Card style={{ marginTop: 'calc(-1 * var(--space-6))' }}>
          <Tabs
            tabs={tabsWithBadge}
            activeTab={activeFilter}
            onChange={(id) => setActiveFilter(id as any)}
          />

          <div
            style={{
              marginTop: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {/* 全选栏 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <input
                type='checkbox'
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onChange={selectAll}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selectedIds.size > 0 ? `已选择 ${selectedIds.size} 项` : '全选'}
              </span>
            </div>

            {notifications.map((notification) => {
              const typeConfig =
                notificationTypeConfig[notification.type || 'info'] || notificationTypeConfig.info;
              const TypeIcon = typeConfig.icon;
              const isSelected = selectedIds.has(notification.id);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: 'var(--space-4)',
                    backgroundColor: notification.is_read ? 'var(--surface-1)' : 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)',
                    opacity: notification.is_read ? 0.85 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type='checkbox'
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(notification.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 2 }}
                  />

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: `color-mix(in srgb, ${typeConfig.color} 12%, transparent)`,
                      color: typeConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TypeIcon size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: notification.is_read ? 400 : 600,
                          fontSize: 14,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {notification.title || notification.type}
                      </span>
                      {!notification.is_read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-primary)',
                          }}
                        />
                      )}
                      <Badge
                        variant='default'
                        style={{ fontSize: 11 }}
                      >
                        {typeConfig.label}
                      </Badge>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notification.content || notification.content || '暂无内容'}
                    </p>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatTime(notification.created_at || notification.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                      flexShrink: 0,
                    }}
                  >
                    {!notification.is_read && (
                      <Button
                        size='sm'
                        variant='ghost'
                        leftIcon={<Check size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notification.id);
                        }}
                      >
                        已读
                      </Button>
                    )}
                    <Button
                      size='sm'
                      variant='ghost'
                      leftIcon={<Trash2 size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notification.id);
                      }}
                      style={{ color: 'var(--error-500)' }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 通知设置弹窗 */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title='通知设置'
        size='md'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setShowSettings(false)}
            >
              取消
            </Button>
            <Button
              variant='primary'
              onClick={() => setShowSettings(false)}
            >
              保存设置
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 14, fontWeight: 600 }}>
              通知渠道
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <SettingToggle
                label='站内通知'
                description='在系统内显示通知'
                defaultChecked
              />
              <SettingToggle
                label='邮件通知'
                description='发送通知到绑定邮箱'
                defaultChecked
              />
              <SettingToggle
                label='短信通知'
                description='发送重要通知到手机'
              />
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 14, fontWeight: 600 }}>
              通知类型
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <SettingToggle
                label='系统通知'
                description='系统更新、维护等通知'
                defaultChecked
              />
              <SettingToggle
                label='任务提醒'
                description='待办任务、审批提醒'
                defaultChecked
              />
              <SettingToggle
                label='告警通知'
                description='设备异常、质量告警'
                defaultChecked
              />
              <SettingToggle
                label='消息通知'
                description='同事消息、评论回复'
                defaultChecked
              />
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 14, fontWeight: 600 }}>
              免打扰
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <SettingToggle
                label='启用免打扰'
                description='在指定时间段内不发送通知'
              />
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    开始时间
                  </label>
                  <Input
                    type='time'
                    defaultValue='22:00'
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    结束时间
                  </label>
                  <Input
                    type='time'
                    defaultValue='08:00'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

// 设置开关组件
const SettingToggle: React.FC<{
  label: string;
  description?: string;
  defaultChecked?: boolean;
}> = ({ label, description, defaultChecked = false }) => {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <Toggle
        checked={checked}
        onChange={setChecked}
      />
    </div>
  );
};

export default NotificationCenter;
