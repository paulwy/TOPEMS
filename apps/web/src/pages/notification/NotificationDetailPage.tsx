import React, { useMemo } from 'react';
import { Box, Typography, InputLabel, Chip, Button } from '@mui/material';
import { Bell, Clock, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, type Notification } from '@/api/notification';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;
const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATION.NOTIFICATION(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error(i18n.t('notification.notification_detail_page.id_0'));
      }
      const res = await notificationApi.get(id);
      if (!res.success || !res.data) {
        throw new Error(i18n.t('notification.notification_detail_page.k1'));
      }
      if (!res.data.is_read) {
        await notificationApi.markRead(id);
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.NOTIFICATION.NOTIFICATIONS,
          exact: false,
          refetchType: 'active',
        });
      }
      return res.data;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.SHORT,
  });
  const notification = detailQuery.data ?? null;
  const loading = detailQuery.isLoading;
  const errorMessage = detailQuery.isError
    ? i18n.t('notification.notification_detail_page.k2')
    : undefined;
  const markUnreadMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return notificationApi.markUnread(id);
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.NOTIFICATION.NOTIFICATION(id),
          exact: false,
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.NOTIFICATION.NOTIFICATIONS,
          exact: false,
          refetchType: 'active',
        });
      }
      success(i18n.t('notification.notification_detail_page.k3'));
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.notification_detail_page.k0'), err);
      error(i18n.t('notification.notification_detail_page.k4'));
    },
  });
  const handleMarkUnread = () => {
    if (!id) return;
    markUnreadMutation.mutate();
  };
  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      unread: { color: 'error', label: i18n.t('notification.notification_detail_page.k5') },
      read: { color: 'success', label: i18n.t('notification.notification_detail_page.k6') },
    };
    return config[status] || config.unread;
  };
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: i18n.t('notification.notification_detail_page.k7'),
      task: i18n.t('notification.notification_detail_page.k8'),
      approval: i18n.t('notification.notification_detail_page.k9'),
      message: i18n.t('notification.notification_detail_page.k10'),
      reminder: i18n.t('notification.notification_detail_page.k11'),
      alert: i18n.t('notification.notification_detail_page.k12'),
      other: i18n.t('notification.notification_detail_page.k13'),
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
      info: {
        color: 'default',
        label: i18n.t('notification.notification_detail_page.k14'),
        icon: <MessageSquare size={16} />,
      },
      warning: {
        color: 'warning',
        label: i18n.t('notification.notification_detail_page.k15'),
        icon: <AlertCircle size={16} />,
      },
      error: {
        color: 'error',
        label: i18n.t('notification.notification_detail_page.k16'),
        icon: <AlertCircle size={16} />,
      },
      success: {
        color: 'success',
        label: i18n.t('notification.notification_detail_page.k17'),
        icon: <CheckCircle2 size={16} />,
      },
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.k18')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={getTypeLabel(notification.type || 'other')}
                size='small'
                variant='outlined'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.k19')}
            </InputLabel>
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.k20')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.k21')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{formatDate(notification.created_at)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.k22')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{notification.source_module || '-'}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('notification.notification_detail_page.id_23')}
            </InputLabel>
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
            {i18n.t('pages.notification_detail_page.k0')}
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.id_24')}
          </InputLabel>
          <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {notification.id.substring(0, 8)}...
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.k25')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {notification.sender_name || i18n.t('notification.notification_detail_page.k26')}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.k27')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{notification.recipient_name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.k28')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {notification.is_top
              ? i18n.t('notification.notification_detail_page.k30')
              : i18n.t('notification.notification_detail_page.k29')}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.k31')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {notification.is_deleted
              ? i18n.t('notification.notification_detail_page.k33')
              : i18n.t('notification.notification_detail_page.k32')}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('notification.notification_detail_page.k34')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(notification.updated_at)}</Typography>
        </Box>
      </Box>
    );
  }, [notification]);
  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: i18n.t('notification.notification_detail_page.k35'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'action',
        label: i18n.t('notification.notification_detail_page.k36'),
        content: actionContent || <></>,
      },
      {
        id: 'extended',
        label: i18n.t('notification.notification_detail_page.k37'),
        content: extendedInfoContent || <></>,
      },
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
        {
          label: i18n.t('notification.notification_detail_page.k38'),
          value: getStatusConfig(notification?.is_read ? 'read' : 'unread').label,
        },
        {
          label: i18n.t('notification.notification_detail_page.k39'),
          value: notification?.created_at ? formatDate(notification.created_at).split(' ')[0] : '-',
        },
      ],
    }),
    [notification]
  );
  return (
    <PageContainer
      title={i18n.t('notification.notification_detail_page.k40')}
      subtitle={i18n.t('notification.notification_detail_page.k41')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={notification?.title || i18n.t('notification.notification_detail_page.k42')}
        backHref={NOTIFICATION_PATHS.root}
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: i18n.t('notification.notification_detail_page.k43'),
            icon: <Clock style={{ width: 18, height: 18 }} />,
            onClick: handleMarkUnread,
          },
        ]}
      />
    </PageContainer>
  );
};
export default NotificationDetailPage;
