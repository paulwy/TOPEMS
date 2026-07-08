import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  InputLabel,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Bell,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notificationApi, type Notification } from '@/api/notification';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const NotificationDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error } = useNotification();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadNotificationDetail();
  }, [id]);

  const loadNotificationDetail = async () => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      if (!id) {
        throw new Error('通知ID为空');
      }

      const res = await notificationApi.get(id);

      if (!res.success || !res.data) {
        throw new Error('获取通知详情失败');
      }

      setNotification(res.data);

      if (!res.data.is_read) {
        await notificationApi.markRead(id);
      }
    } catch (err: unknown) {
      apiLogger.error('加载通知详情失败:', err);
      setErrorMessage('加载通知详情失败');
      error('加载通知详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnread = async () => {
    if (!id) return;
    try {
      await notificationApi.markUnread(id);
      setNotification((prev) => (prev ? { ...prev, is_read: false } : null));
      success('已标记为未读');
    } catch (err: unknown) {
      apiLogger.error('标记未读失败:', err);
      error('标记未读失败');
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      unread: { color: 'error', label: '未读' },
      read: { color: 'success', label: '已读' },
    };
    return config[status] || config.unread;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: '系统通知',
      task: '任务通知',
      approval: '审批通知',
      message: '消息通知',
      reminder: '提醒通知',
      alert: '告警通知',
      other: '其他',
    };
    return labels[type] || type;
  };

  const getLevelConfig = (level: string) => {
    const config: Record<
      string,
      {
        color: 'success' | 'error' | 'default' | 'warning';
        label: string;
        icon: React.ReactElement;
      }
    > = {
      info: { color: 'default', label: '信息', icon: <MessageSquare size={16} /> },
      warning: { color: 'warning', label: '警告', icon: <AlertCircle size={16} /> },
      error: { color: 'error', label: '错误', icon: <AlertCircle size={16} /> },
      success: { color: 'success', label: '成功', icon: <CheckCircle2 size={16} /> },
    };
    return config[level] || config.info;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const basicInfoContent = useMemo(() => {
    if (!notification) return null;
    const statusConfig = getStatusConfig(notification.is_read ? 'read' : 'unread');
    const levelConfig = getLevelConfig(notification.level || 'info');

    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {notification.title}
          </Typography>
          <Typography
            variant='body1'
            sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
          >
            {notification.content}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>通知类型</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={getTypeLabel(notification.type || 'other')}
                size='small'
                variant='outlined'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>通知级别</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={levelConfig.label}
                color={levelConfig.color}
                icon={levelConfig.icon}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>阅读状态</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>发送时间</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{formatDate(notification.created_at)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>来源模块</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{notification.source_module || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>关联ID</InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {notification.source_id || '-'}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [notification]);

  const actionContent = useMemo(() => {
    if (!notification) return null;

    const actions = notification.actions || [];

    return (
      <Box>
        {actions.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.type === 'primary' ? 'contained' : 'outlined'}
                onClick={() => {
                  if (action.url) {
                    window.open(action.url, '_blank');
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        ) : (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            暂无操作按钮
          </Typography>
        )}
      </Box>
    );
  }, [notification]);

  const extendedInfoContent = useMemo(() => {
    if (!notification) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>通知ID</InputLabel>
          <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {notification.id.substring(0, 8)}...
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>发送人</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{notification.sender_name || '系统'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>接收人</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{notification.recipient_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>是否置顶</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{notification.is_top ? '是' : '否'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>是否已删除</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{notification.is_deleted ? '是' : '否'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>更新时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(notification.updated_at)}</Typography>
        </Box>
      </Box>
    );
  }, [notification]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '通知内容', content: basicInfoContent || <></> },
      { id: 'action', label: '快捷操作', content: actionContent || <></> },
      { id: 'extended', label: '扩展信息', content: extendedInfoContent || <></> },
    ],
    [basicInfoContent, actionContent, extendedInfoContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Bell
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: notification?.title,
      subtitle: notification?.type ? getTypeLabel(notification.type) : undefined,
      tags: [getLevelConfig(notification?.level || '').label],
      stats: [
        { label: '状态', value: getStatusConfig(notification?.is_read ? 'read' : 'unread').label },
        {
          label: '时间',
          value: notification?.created_at ? formatDate(notification.created_at).split(' ')[0] : '-',
        },
      ],
    }),
    [notification]
  );

  return (
    <PageContainer
      title='通知详情'
      subtitle='查看通知详情'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/notification'
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: '标记未读',
            icon: <Clock style={{ width: 18, height: 18 }} />,
            onClick: handleMarkUnread,
          },
        ]}
      />
    </PageContainer>
  );
};

export default NotificationDetailPage;
