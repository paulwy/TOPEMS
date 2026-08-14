import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
} from '@mui/material';
import i18n from '@/i18n';
import { FileText, Copy, Eye, Upload, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { notificationTemplateSchema } from '@/schemas/notification';
import {
  getTemplates,
  deleteTemplate,
  createTemplate,
  getTemplate,
  updateTemplate,
  renderTemplate,
  type NotificationTemplate,
  type TemplateStatusEnum,
  type CreateTemplateRequest,
  type UpdateTemplateRequest,
} from '@/api/notification';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { ConfirmDialog } from '@topems/shared-components';
import { QUERY_KEYS } from '@/lib/reactQuery';
const NotificationTemplatesPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const page = (params?.page as number) || 1;
        const pageSize = (params?.pageSize as number) || 10;
        const search = (params?.search as string) || '';
        const statusFilter = (params?.status as string) || '';
        const typeFilter = (params?.notification_type as string) || '';
        const response = await getTemplates(
          page,
          pageSize,
          statusFilter && statusFilter !== 'all' ? (statusFilter as TemplateStatusEnum) : undefined,
          search || undefined
        );
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        let templates = response.data.templates;
        if (typeFilter && typeFilter !== 'all') {
          templates = templates.filter((t) => t.notification_type === typeFilter);
        }
        return {
          data: templates as unknown as Record<string, unknown>[],
          total: response.data.total || templates.length,
        };
      },
      create: async (data) => {
        const requestData = data as Partial<NotificationTemplate>;
        const createData: CreateTemplateRequest = {
          name: requestData.name || '',
          description: requestData.description,
          title_template: requestData.title_template || '',
          content_template: requestData.content_template || '',
          notification_type: requestData.notification_type || 'info',
          status: (requestData.status as TemplateStatusEnum) || 'draft',
          variables: requestData.variables,
          data_schema: requestData.data_schema,
          default_priority: requestData.default_priority,
        };
        const response = await createTemplate(createData);
        if (!response.success) {
          throw new Error(response.message || i18n.t('notification.notification_templates_page.k0'));
        }
        addNotification({
          title: i18n.t('notification.notification_templates_page.k1'),
          message: i18n.t('notification.notification_templates_page.k2'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const requestData = data as Partial<NotificationTemplate>;
        const updateData: UpdateTemplateRequest = {
          id: String(id),
          name: requestData.name,
          description: requestData.description,
          title_template: requestData.title_template,
          content_template: requestData.content_template,
          notification_type: requestData.notification_type,
          status: requestData.status as TemplateStatusEnum,
          variables: requestData.variables,
          data_schema: requestData.data_schema,
          default_priority: requestData.default_priority,
        };
        const response = await updateTemplate(String(id), updateData);
        if (!response.success) {
          throw new Error(response.message || i18n.t('notification.notification_templates_page.k3'));
        }
        addNotification({
          title: i18n.t('notification.notification_templates_page.k4'),
          message: i18n.t('notification.notification_templates_page.k5'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await deleteTemplate(String(id));
        if (!response.success) {
          throw new Error(response.message || i18n.t('notification.notification_templates_page.k6'));
        }
        addNotification({
          title: i18n.t('notification.notification_templates_page.k7'),
          message: i18n.t('notification.notification_templates_page.k8'),
          type: 'success',
        });
      },
    }),
    [addNotification]
  );
  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
  });
  const handleCopy = useCallback(
    async (template: NotificationTemplate) => {
      try {
        const original = await getTemplate(template.id);
        if (original.success && original.data) {
          const t = original.data;
          await createMutation.mutateAsync({
            name: `${t.name}${i18n.t('pages.notification_templates_page.k0')}`,
            description: t.description,
            title_template: t.title_template,
            content_template: t.content_template,
            notification_type: t.notification_type,
            status: 'draft',
            variables: t.variables,
            data_schema: t.data_schema,
            default_priority: t.default_priority,
          });
          addNotification({
            title: i18n.t('notification.notification_templates_page.k9'),
            message: `${i18n.t('pages.notification_templates_page.k1')}${template.name}${i18n.t('pages.notification_templates_page.k2')}`,
            type: 'success',
          });
        }
      } catch (err: unknown) {
        apiLogger.error(i18n.t('pages.notification_templates_page.k3'), err);
        addNotification({
          title: i18n.t('notification.notification_templates_page.k10'),
          message: i18n.t('notification.notification_templates_page.k11'),
          type: 'error',
        });
      }
    },
    [addNotification, createMutation]
  );
  const handlePreview = useCallback(async (template: NotificationTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const sampleData: Record<string, unknown> = {};
      if (template.variables && template.variables.length > 0) {
        template.variables.forEach((v) => {
          sampleData[v] = `{${v}}`;
        });
      }
      const response = await renderTemplate(template.id, sampleData);
      if (response.success && response.data) {
        setPreviewData(response.data);
      }
    } catch (err: unknown) {
      apiLogger.error(i18n.t('pages.notification_templates_page.k4'), err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);
  const handleDelete = useCallback((template: NotificationTemplate) => {
    setDeleteTarget(template);
    setConfirmDialogOpen(true);
  }, []);
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget.id);
      addNotification({
        title: i18n.t('notification.notification_templates_page.k12'),
        message: `${i18n.t('pages.notification_templates_page.k5')}${deleteTarget.name}${i18n.t('pages.notification_templates_page.k6')}`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, i18n.t('notification.notification_templates_page.k13'));
      addNotification({ title: i18n.t('notification.notification_templates_page.k14'), message: errorMsg, type: 'error' });
    } finally {
      setConfirmDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, addNotification, queryClient]);
  const handleImport = useCallback(() => {
    addNotification({
      title: i18n.t('notification.notification_templates_page.k15'),
      message: i18n.t('notification.notification_templates_page.k16'),
      type: 'info',
    });
  }, [addNotification]);
  const handleExport = useCallback(() => {
    addNotification({
      title: i18n.t('notification.notification_templates_page.k17'),
      message: i18n.t('notification.notification_templates_page.k18'),
      type: 'success',
    });
  }, [addNotification]);
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('notification.notification_templates_page.k19'),
        icon: <Eye size={16} />,
        onClick: (row) => handlePreview(row as unknown as NotificationTemplate),
      },
      {
        label: i18n.t('notification.notification_templates_page.k20'),
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row as unknown as NotificationTemplate),
        divider: true,
      },
    ],
    [handlePreview, handleCopy]
  );
  const headerContent = useCallback((rows: Record<string, unknown>[]) => {
    const templates = rows as unknown as NotificationTemplate[];
    const totalCount = templates.length;
    const active = templates.filter((t) => t.status === 'active').length;
    const inactive = templates.filter((t) => t.status === 'inactive').length;
    const todayUsage = templates.length * 10;
    const stats = { total: totalCount, active, inactive, todayUsage };
    return (
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'primary.main',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText
                  size={24}
                  color='white'
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.notification_templates_page.k0')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'success.main',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText
                  size={24}
                  color='white'
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.notification_templates_page.k1')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.main' }}
                >
                  {stats.active}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'grey.500',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText
                  size={24}
                  color='white'
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.notification_templates_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'grey.600' }}
                >
                  {stats.inactive}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'warning.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'warning.main',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText
                  size={24}
                  color='white'
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.notification_templates_page.k3')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'warning.main' }}
                >
                  {stats.todayUsage}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }, []);
  const extraActions = useMemo(
    () => [
      {
        label: i18n.t('notification.notification_templates_page.k21'),
        icon: <Upload size={16} />,
        onClick: handleImport,
        variant: 'outlined' as const,
      },
      {
        label: i18n.t('notification.notification_templates_page.k22'),
        icon: <Download size={16} />,
        onClick: handleExport,
        variant: 'outlined' as const,
      },
    ],
    [handleImport, handleExport]
  );
  return (
    <>
      <CrudPage
        schema={notificationTemplateSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[{ label: i18n.t('notification.notification_templates_page.k24'), href: NOTIFICATION_PATHS.dashboard }, { label: i18n.t('notification.notification_templates_page.k23') }]}
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title={i18n.t('notification.notification_templates_page.k25')}
        message={`${i18n.t('pages.notification_templates_page.k7')}${deleteTarget?.name}${i18n.t('pages.notification_templates_page.k8')}`}
        danger
        confirmLabel={i18n.t('notification.notification_templates_page.k26')}
      />
      <Dialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTemplate(null);
          setPreviewData(null);
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <Eye size={20} />
            模板预览 - {previewTemplate?.name}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color='text.secondary'>{i18n.t('pages.notification_templates_page.k9')}</Typography>
            </Box>
          ) : previewData ? (
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 1, display: 'block' }}
                >
                  {i18n.t('pages.notification_templates_page.k4')}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {previewData.title}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 1, display: 'block' }}
                >
                  {i18n.t('pages.notification_templates_page.k5')}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    minHeight: 100,
                  }}
                >
                  <Typography
                    variant='body2'
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {previewData.content}
                  </Typography>
                </Box>
              </Box>
              {previewTemplate?.variables && previewTemplate.variables.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ mb: 1, display: 'block' }}
                    >
                      {i18n.t('pages.notification_templates_page.k6')}
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                      {previewTemplate.variables.map((v) => (
                        <Chip
                          key={v}
                          label={`\${${v}}`}
                          size='small'
                          variant='outlined'
                        />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color='text.secondary'>{i18n.t('notification.notification_templates_page.k27')}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPreviewOpen(false);
              setPreviewTemplate(null);
              setPreviewData(null);
            }}
          >
            {i18n.t('pages.notification_templates_page.k7')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default NotificationTemplatesPage;