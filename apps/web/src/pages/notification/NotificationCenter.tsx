import React, { useState, useEffect, useMemo } from 'react';
import css from './NotificationCenter.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCheck,
  Settings,
  Search,
  Trash2,
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
  Input,
  ListPageTemplate,
  Modal,
  Tabs,
  ToastContainer,
  Toggle,
} from '@/components/redesign';
import type { Toast } from '@/components/redesign';
import type { LucideIcon } from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/api/notification';
import type { Notification, NotificationTypeEnum } from '@/api/notification';
import { useTranslation } from 'react-i18next';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['notifications', 'list'];

// L14 B类：文件内同构重复布局等价抽常量，值逐字不变，视觉零差异
const styles: Record<string, React.CSSProperties> = {
  sectionHeading: { margin: '0 0 var(--space-3) 0', fontSize: 14, fontWeight: 600 },
  sectionStack: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
};

type NotificationFilterType = 'all' | 'unread' | NotificationTypeEnum;

const notificationTypeConfig: Record<
  string,
  { labelKey: string; icon: LucideIcon; color: string }
> = {
  info: { labelKey: 'notification.notification_center.k13', icon: Info, color: 'var(--info-500)' },
  success: {
    labelKey: 'notification.notification_center.type_success',
    icon: CheckCircle2,
    color: 'var(--success-500)',
  },
  warning: {
    labelKey: 'notification.notification_center.type_warning',
    icon: AlertTriangle,
    color: 'var(--warning-500)',
  },
  error: {
    labelKey: 'notification.notification_center.type_error',
    icon: AlertCircle,
    color: 'var(--error-500)',
  },
  message: {
    labelKey: 'notification.notification_center.k17',
    icon: MessageSquare,
    color: 'var(--accent-primary)',
  },
  reminder: {
    labelKey: 'notification.notification_center.k15',
    icon: Calendar,
    color: 'var(--warning-500)',
  },
  system: {
    labelKey: 'notification.notification_center.type_system_update',
    icon: Cpu,
    color: 'var(--text-secondary)',
  },
};

const filterTabs = [
  { id: 'all', labelKey: 'notification.notification_center.k12' },
  { id: 'unread', labelKey: 'notification.notification_center.tab_unread', badge: 0 },
  { id: 'info', labelKey: 'notification.notification_center.tab_system' },
  { id: 'warning', labelKey: 'notification.notification_center.tab_warning' },
  { id: 'message', labelKey: 'notification.notification_center.tab_message' },
];

const NotificationCenter: React.FC = () => {
  const { t } = useTranslation();
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
      pushToast('success', t('notification.notification_center.mark_read_success'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('notification.notification_center.mark_all_read_success'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('notification.notification_center.delete_success'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // 更新未读 Tab 的 badge
  const tabsWithBadge = useMemo(
    () =>
      filterTabs.map((tab) =>
        tab.id === 'unread'
          ? { id: tab.id, label: t(tab.labelKey), badge: unreadCount }
          : { id: tab.id, label: t(tab.labelKey) }
      ),
    [unreadCount, t]
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

      if (minutes < 1) return t('notification.notification_center.just_now');
      if (minutes < 60)
        return t('notification.notification_center.minutes_ago', { count: minutes });
      if (hours < 24) return t('notification.notification_center.hours_ago', { count: hours });
      if (days < 7) return t('notification.notification_center.days_ago', { count: days });

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
          title: t('notification.notification_center.title'),
          subtitle: t('notification.notification_center.subtitle'),
        }}
        toolbar={
          <>
            <div
              className={css.il1}
            >
              <Input
                placeholder={t('notification.notification_center.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className={css.il2}
              />
              {selectedIds.size > 0 && (
                <Badge variant='cyan'>
                  {t('notification.notification_center.selected_badge', {
                    count: selectedIds.size,
                  })}
                </Badge>
              )}
            </div>
            <div className={css.il3}>
              <Button
                variant='ghost'
                leftIcon={<CheckCheck size={16} />}
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={unreadCount === 0}
              >
                {t('notification.notification_center.mark_all_read')}
              </Button>
              <Button
                variant='ghost'
                leftIcon={<Settings size={16} />}
                onClick={() => setShowSettings(true)}
              >
                {t('notification.notification_center.settings')}
              </Button>
              <Button
                variant='ghost'
                leftIcon={<Trash2 size={16} />}
                disabled={selectedIds.size === 0}
              >
                {t('notification.notification_center.delete_selected')}
              </Button>
            </div>
          </>
        }
        columns={[]}
        data={notifications}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('notification.notification_center.empty_title')}
        emptyDescription={t('notification.notification_center.empty_description')}
        tableProps={{
          onRowClick: handleNotificationClick,
        }}
        footer={
          <div className={css.il4}>
            <span className={css.il5}>
              {t('notification.notification_center.footer_summary', {
                total: notifications.length,
                unread: unreadCount,
              })}
            </span>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => refetch()}
            >
              {t('notification.notification_center.refresh')}
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
            onChange={(id) => setActiveFilter(id as NotificationFilterType)}
          />

          <div
            className={css.il6}
          >
            {/* 全选栏 */}
            <div
              className={css.il7}
            >
              <input
                type='checkbox'
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onChange={selectAll}
                className={css.il8}
              />
              <span className={css.il9}>
                {selectedIds.size > 0
                  ? t('notification.notification_center.selected_count', {
                      count: selectedIds.size,
                    })
                  : t('notification.notification_center.k21')}
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
                  role='button'
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
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
                    className={css.il10}
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

                  <div className={css.il11}>
                    <div
                      className={css.il12}
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
                          className={css.il13}
                        />
                      )}
                      <Badge
                        variant='default'
                        className={css.il14}
                      >
                        {t(typeConfig.labelKey)}
                      </Badge>
                    </div>
                    <p
                      className={css.il15}
                    >
                      {notification.content || t('notification.notification_center.no_content')}
                    </p>
                    <div className={css.il16}>
                      {formatTime(notification.created_at || notification.created_at)}
                    </div>
                  </div>

                  <div
                    className={css.il17}
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
                        {t('notification.notification_center.btn_read')}
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
                      className={css.il18}
                    >
                      {t('notification.notification_center.btn_delete')}
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
        title={t('notification.notification_center.k22')}
        size='md'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setShowSettings(false)}
            >
              {t('notification.notification_center.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => setShowSettings(false)}
            >
              {t('notification.notification_center.save_settings')}
            </Button>
          </>
        }
      >
        <div className={css.il19}>
          <div
            className={css.il20}
          >
            <h4 style={styles.sectionHeading}>
              {t('notification.notification_center.section_channels')}
            </h4>
            <div style={styles.sectionStack}>
              <SettingToggle
                label={t('notification.notification_center.channel_inapp')}
                description={t('notification.notification_center.channel_inapp_desc')}
                defaultChecked
              />
              <SettingToggle
                label={t('notification.notification_center.channel_email')}
                description={t('notification.notification_center.channel_email_desc')}
                defaultChecked
              />
              <SettingToggle
                label={t('notification.notification_center.channel_sms')}
                description={t('notification.notification_center.channel_sms_desc')}
              />
            </div>
          </div>

          <div
            className={css.il21}
          >
            <h4 style={styles.sectionHeading}>
              {t('notification.notification_center.section_types')}
            </h4>
            <div style={styles.sectionStack}>
              <SettingToggle
                label={t('notification.notification_center.k13')}
                description={t('notification.notification_center.type_system_desc')}
                defaultChecked
              />
              <SettingToggle
                label={t('notification.notification_center.type_task_reminder')}
                description={t('notification.notification_center.type_task_reminder_desc')}
                defaultChecked
              />
              <SettingToggle
                label={t('notification.notification_center.type_alert')}
                description={t('notification.notification_center.type_alert_desc')}
                defaultChecked
              />
              <SettingToggle
                label={t('notification.notification_center.k17')}
                description={t('notification.notification_center.type_message_desc')}
                defaultChecked
              />
            </div>
          </div>

          <div
            className={css.il22}
          >
            <h4 style={styles.sectionHeading}>
              {t('notification.notification_center.section_dnd')}
            </h4>
            <div style={styles.sectionStack}>
              <SettingToggle
                label={t('notification.notification_center.dnd_enable')}
                description={t('notification.notification_center.dnd_enable_desc')}
              />
              <div
                className={css.il23}
              >
                <div>
                  <label
                    htmlFor='dnd-start-time'
                    className={css.il24}
                  >
                    {t('notification.notification_center.dnd_start')}
                  </label>
                  <Input
                    id='dnd-start-time'
                    type='time'
                    defaultValue='22:00'
                  />
                </div>
                <div>
                  <label
                    htmlFor='dnd-end-time'
                    className={css.il25}
                  >
                    {t('notification.notification_center.dnd_end')}
                  </label>
                  <Input
                    id='dnd-end-time'
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
    <div className={css.il26}>
      <div>
        <div className={css.il27}>{label}</div>
        {description && (
          <div className={css.il28}>
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
