import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Settings, RotateCcw, Eye } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import i18n from '@/i18n';
import { archiveNotificationSchema } from '@/schemas/notification';
import type { ArchiveConfig, ArchivedNotification } from '@/api/notification';
import {
  getArchivedNotifications,
  getArchiveConfig,
  updateArchiveConfig,
  runAutoArchive,
} from '@/api/notification';
import { useNotification } from '@/hooks/useNotification';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';
const NotificationArchivePage: React.FC = () => {
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<ArchivedNotification | null>(
    null
  );
  const configQuery = useQuery<ArchiveConfig>({
    queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_ARCHIVE_CONFIG_BASE,
    queryFn: async () => {
      const res = await getArchiveConfig();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || i18n.t('notification.notification_archive_page.k0'));
    },
    staleTime: 5 * 60 * 1000,
  });
  const archiveConfig = configQuery.data ?? null;
  const updateConfigMutation = useMutation({
    mutationFn: async (config: ArchiveConfig) => {
      const res = await updateArchiveConfig(config);
      if (!res.success) {
        throw new Error(res.message || i18n.t('notification.notification_archive_page.k1'));
      }
      return res;
    },
    onSuccess: () => {
      success(i18n.t('notification.notification_archive_page.k2'));
      setShowConfigModal(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_ARCHIVE_CONFIG_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err: unknown) => {
      error((err as { message?: string }).message || i18n.t('notification.notification_archive_page.k3'));
    },
  });
  const runAutoArchiveMutation = useMutation({
    mutationFn: async () => {
      const res = await runAutoArchive();
      if (!res.success) {
        throw new Error(res.message || i18n.t('notification.notification_archive_page.k4'));
      }
      return res;
    },
    onSuccess: (res) => {
      success(`${i18n.t('pages.notification_archive_page.k0')}${res.data?.archived_count || 0}${i18n.t('pages.notification_archive_page.k1')}`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.ARCHIVEDNOTIFICATION_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err: unknown) => {
      error((err as { message?: string }).message || i18n.t('notification.notification_archive_page.k5'));
    },
  });
  const apiAdapter: CrudApiAdapter<ArchivedNotification> = {
    list: async (params) => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const search = params?.search as string | undefined;
      const res = await getArchivedNotifications(page, pageSize);
      let notifications: ArchivedNotification[] = [];
      let total = 0;
      if (res.success && res.data) {
        notifications = res.data.notifications || [];
        total = res.data.total || 0;
        if (search) {
          const query = search.toLowerCase();
          notifications = notifications.filter(
            (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
          );
          total = notifications.length;
        }
      }
      return { data: notifications, total };
    },
    create: async () => ({}) as unknown as ArchivedNotification,
    update: async () => ({}) as unknown as ArchivedNotification,
    delete: async () => {},
  };
  const handleViewDetail = useCallback((row: Record<string, unknown>) => {
    setSelectedNotification(row as unknown as ArchivedNotification);
  }, []);
  const customRowActions = [
    {
      label: i18n.t('notification.notification_archive_page.k6'),
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: i18n.t('notification.notification_archive_page.k7'),
      icon: <RotateCcw size={16} />,
      onClick: (row: Record<string, unknown>) => {
        success(`${i18n.t('pages.notification_archive_page.k2')}${String(row.title)}`);
      },
    },
  ];
  const headerContent = useMemo(() => {
    if (!archiveConfig) return null;
    return (
      <Box
        sx={{
          bgcolor: 'warning.50',
          borderRadius: 3,
          p: 2,
          mb: 2,
          border: 1,
          borderColor: 'warning.200',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Settings sx={{ width: 20, height: 20, color: 'warning.main', mr: 1 }} />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'warning.900' }}
            >
              {i18n.t('pages.notification_archive_page.k0')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.875rem',
              color: 'warning.800',
            }}
          >
            <span>自动归档天数：{archiveConfig.auto_archive_days} 天</span>
            <span>保留天数：{archiveConfig.retention_days} 天</span>
            <Typography
              component='span'
              sx={{
                color: archiveConfig.enabled ? 'success.main' : 'error.main',
              }}
            >
              {archiveConfig.enabled ? i18n.t('notification.notification_archive_page.k9') : i18n.t('notification.notification_archive_page.k8')}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [archiveConfig]);
  const schemaWithHeader = {
    ...archiveNotificationSchema,
    headerContent,
  };
  return (
    <PageContainer
      title={i18n.t('notification.notification_archive_page.k10')}
      subtitle={i18n.t('notification.notification_archive_page.k11')}
    >
      <CrudPage
        schema={schemaWithHeader}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
      />
      {showConfigModal && archiveConfig && (
        <ArchiveConfigModal
          config={archiveConfig}
          onClose={() => setShowConfigModal(false)}
          onSubmit={(config) => updateConfigMutation.mutate(config)}
        />
      )}
      {selectedNotification && (
        <ArchivedNotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </PageContainer>
  );
};
interface ArchiveConfigModalProps {
  config: ArchiveConfig;
  onClose: () => void;
  onSubmit: (config: ArchiveConfig) => void;
}
const ArchiveConfigModal: React.FC<ArchiveConfigModalProps> = ({ config, onClose, onSubmit }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ArchiveConfig>(config);
  const handleSubmit = () => {
    onSubmit(formData);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{i18n.t('notification.notification_archive_page.k12')}</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.700' }}
            >
              {i18n.t('pages.notification_archive_page.k1')}
            </Typography>
            <Box
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              sx={{
                position: 'relative',
                display: 'inline-flex',
                width: 44,
                height: 24,
                borderRadius: 'lg',
                alignItems: 'center',
                bgcolor: formData.enabled ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'common.white',
                  transition: 'transform 0.2s',
                  transform: formData.enabled ? 'translateX(20px)' : 'translateX(4px)',
                }}
              />
            </Box>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
            >
              {i18n.t('pages.notification_archive_page.k2')}
            </Typography>
            <input
              type='number'
              min='1'
              value={formData.auto_archive_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auto_archive_days: parseInt(e.target.value) || 30,
                })
              }
              style={{
                width: '100%',
                padding: `${designTokens.spacing.sm} 12px`,
                border: '1px solid',
                borderColor: theme.palette.grey[300],
                borderRadius: 8,
                outline: 'none',
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'grey.500', mt: 0.5, display: 'block' }}
            >
              {i18n.t('pages.notification_archive_page.k3')}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
            >
              {i18n.t('pages.notification_archive_page.k4')}
            </Typography>
            <input
              type='number'
              min='1'
              value={formData.retention_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retention_days: parseInt(e.target.value) || 90,
                })
              }
              style={{
                width: '100%',
                padding: `${designTokens.spacing.sm} 12px`,
                border: '1px solid',
                borderColor: theme.palette.grey[300],
                borderRadius: 8,
                outline: 'none',
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'grey.500', mt: 0.5, display: 'block' }}
            >
              {i18n.t('pages.notification_archive_page.k5')}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('notification.notification_archive_page.k13')}</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
        >
          {i18n.t('pages.notification_archive_page.k6')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
interface ArchivedNotificationDetailModalProps {
  notification: ArchivedNotification;
  onClose: () => void;
}
const ArchivedNotificationDetailModal: React.FC<ArchivedNotificationDetailModalProps> = ({
  notification,
  onClose,
}) => {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: i18n.t('notification.notification_archive_page.k14'),
      workflow: i18n.t('notification.notification_archive_page.k15'),
      reminder: i18n.t('notification.notification_archive_page.k16'),
      alert: i18n.t('notification.notification_archive_page.k17'),
      message: i18n.t('notification.notification_archive_page.k18'),
      info: i18n.t('notification.notification_archive_page.k19'),
      success: i18n.t('notification.notification_archive_page.k20'),
      warning: i18n.t('notification.notification_archive_page.k21'),
      error: i18n.t('notification.notification_archive_page.k22'),
    };
    return labels[type] || type;
  };
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>{i18n.t('notification.notification_archive_page.k23')}</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography
              variant='caption'
              sx={{
                fontWeight: 500,
                color: 'grey.500',
                textTransform: 'uppercase',
                mb: 0.5,
                display: 'block',
              }}
            >
              {i18n.t('pages.notification_archive_page.k7')}
            </Typography>
            <Typography sx={{ color: 'grey.900' }}>{notification.title}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              sx={{
                fontWeight: 500,
                color: 'grey.500',
                textTransform: 'uppercase',
                mb: 0.5,
                display: 'block',
              }}
            >
              {i18n.t('pages.notification_archive_page.k8')}
            </Typography>
            <Typography sx={{ color: 'grey.700' }}>{notification.content}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: 'grey.500',
                  textTransform: 'uppercase',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                {i18n.t('pages.notification_archive_page.k9')}
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {getTypeLabel(notification.notification_type)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: 'grey.500',
                  textTransform: 'uppercase',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                {i18n.t('pages.notification_archive_page.k10')}
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {notification.priority >= 4
                  ? i18n.t('notification.notification_archive_page.k24')
                  : notification.priority >= 3
                    ? i18n.t('notification.notification_archive_page.k25')
                    : notification.priority >= 2
                      ? i18n.t('notification.notification_archive_page.k26')
                      : i18n.t('notification.notification_archive_page.k27')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: 'grey.500',
                  textTransform: 'uppercase',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                {i18n.t('pages.notification_archive_page.k11')}
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {new Date(notification.created_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: 'grey.500',
                  textTransform: 'uppercase',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                {i18n.t('pages.notification_archive_page.k12')}
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {new Date(notification.archived_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
          </Box>
          {notification.read_at && (
            <Box>
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: 'grey.500',
                  textTransform: 'uppercase',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                {i18n.t('pages.notification_archive_page.k13')}
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {new Date(notification.read_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('notification.notification_archive_page.k28')}</Button>
      </DialogActions>
    </Dialog>
  );
};
export default NotificationArchivePage;