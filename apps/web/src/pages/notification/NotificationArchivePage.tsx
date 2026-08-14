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
      throw new Error(res.message || '加载归档配置失败');
    },
    staleTime: 5 * 60 * 1000,
  });

  const archiveConfig = configQuery.data ?? null;

  const updateConfigMutation = useMutation({
    mutationFn: async (config: ArchiveConfig) => {
      const res = await updateArchiveConfig(config);
      if (!res.success) {
        throw new Error(res.message || '更新失败');
      }
      return res;
    },
    onSuccess: () => {
      success('归档配置更新成功');
      setShowConfigModal(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_ARCHIVE_CONFIG_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err: unknown) => {
      error((err as { message?: string }).message || '更新失败');
    },
  });

  const runAutoArchiveMutation = useMutation({
    mutationFn: async () => {
      const res = await runAutoArchive();
      if (!res.success) {
        throw new Error(res.message || '执行失败');
      }
      return res;
    },
    onSuccess: (res) => {
      success(`自动归档执行成功，已归档 ${res.data?.archived_count || 0} 条通知`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.ARCHIVEDNOTIFICATION_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err: unknown) => {
      error((err as { message?: string }).message || '执行失败');
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
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '恢复通知',
      icon: <RotateCcw size={16} />,
      onClick: (row: Record<string, unknown>) => {
        success(`恢复功能开发中 - ${String(row.title)}`);
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
              归档配置
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
              {archiveConfig.enabled ? '已启用' : '已禁用'}
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
      title='通知归档管理'
      subtitle='查看和管理已归档的通知'
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
      <DialogTitle>归档设置</DialogTitle>
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
              启用自动归档
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
              自动归档天数
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
                padding: '8px 12px',
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
              超过此天数未读的通知将自动归档
            </Typography>
          </Box>

          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.700', mb: 0.5 }}
            >
              保留天数
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
                padding: '8px 12px',
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
              超过此天数的归档通知将被永久删除
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
        >
          保存
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
      system: '系统通知',
      workflow: '审批通知',
      reminder: '提醒通知',
      alert: '告警通知',
      message: '消息通知',
      info: '信息通知',
      success: '成功通知',
      warning: '警告通知',
      error: '错误通知',
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
      <DialogTitle>归档通知详情</DialogTitle>
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
              标题
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
              内容
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
                类型
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
                优先级
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {notification.priority >= 4
                  ? '紧急'
                  : notification.priority >= 3
                    ? '高'
                    : notification.priority >= 2
                      ? '中'
                      : '低'}
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
                原创建时间
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
                归档时间
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
                阅读时间
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>
                {new Date(notification.read_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationArchivePage;
