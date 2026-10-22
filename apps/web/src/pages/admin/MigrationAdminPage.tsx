import React, { useState, useMemo, useCallback } from 'react';
import { Play, RotateCcw, Database } from 'lucide-react';
import { Box, CircularProgress, Typography, Paper, Button } from '@mui/material';
import i18n from '@/i18n';
import { useNotificationStore } from '@/store';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { migrationApi, type MigrationService } from '@/api/migration';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { migrationSchema } from '@/schemas/admin';
import { QUERY_KEYS } from '@/lib/reactQuery';

const MigrationAdminPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [batchApplying, setBatchApplying] = useState(false);
  const [, setApplyingService] = useState<string | null>(null);
  const [, setRollingBackService] = useState<string | null>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();
  const servicesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MIGRATION_SERVICES_BASE,
    queryFn: async () => {
      const data = await migrationApi.listServices();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const services = useMemo(() => servicesQuery.data || [], [servicesQuery.data]);
  const apiAdapter: CrudApiAdapter<MigrationService> = useMemo(
    () => ({
      list: async () => {
        const data = await migrationApi.listServices();
        return { data, total: data.length };
      },
      create: async () => {
        throw new Error(i18n.t('admin.migration_admin_page.unsupported_create'));
      },
      update: async () => {
        throw new Error(i18n.t('admin.migration_admin_page.unsupported_update'));
      },
      delete: async () => {
        throw new Error(i18n.t('admin.migration_admin_page.unsupported_delete'));
      },
    }),
    []
  );
  const applyMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.applyMigration(serviceName, 'schema'),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: i18n.t('admin.migration_admin_page.success_title'),
        message: i18n.t('admin:migration_admin_page.apply_success_msg', {
          serviceName,
          count: result.files.length,
        }),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MIGRATION_STATUS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error(i18n.t('admin.migration_admin_page.apply_failed_log'), error);
      addNotification({
        title: i18n.t('admin.migration_admin_page.error_title'),
        message:
          (error as { message?: string }).message ||
          i18n.t('admin:migration_admin_page.apply_failed_msg', { serviceName }),
        type: 'error',
      });
    },
  });
  const rollbackMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.rollbackMigration(serviceName),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: i18n.t('admin.migration_admin_page.success_title'),
        message: i18n.t('admin:migration_admin_page.rollback_success_msg', {
          serviceName,
          result: result.record
            ? i18n.t('admin.migration_admin_page.removed_records')
            : i18n.t('admin.migration_admin_page.no_records_to_rollback'),
        }),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MIGRATION_STATUS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error(i18n.t('admin.migration_admin_page.rollback_failed_log'), error);
      addNotification({
        title: i18n.t('admin.migration_admin_page.error_title'),
        message:
          (error as { message?: string }).message ||
          i18n.t('admin:migration_admin_page.rollback_failed_msg', { serviceName }),
        type: 'error',
      });
    },
  });
  const handleApply = useCallback(
    async (service: MigrationService) => {
      setApplyingService(service.name);
      await applyMutation.mutateAsync(service.name);
      setApplyingService(null);
    },
    [applyMutation]
  );
  const handleRollback = useCallback(
    (service: MigrationService) => {
      openConfirmDialog({
        title: i18n.t('admin.migration_admin_page.confirm_rollback_title'),
        message: i18n.t('admin:migration_admin_page.confirm_rollback_msg', {
          serviceName: service.name,
        }),
        danger: true,
        onConfirm: async () => {
          setRollingBackService(service.name);
          await rollbackMutation.mutateAsync(service.name);
          setRollingBackService(null);
        },
      });
    },
    [openConfirmDialog, rollbackMutation]
  );
  const handleBatchApply = useCallback(() => {
    if (services.length === 0) return;
    openConfirmDialog({
      title: i18n.t('admin.migration_admin_page.confirm_batch_title'),
      message: i18n.t('admin:migration_admin_page.confirm_batch_msg', { count: services.length }),
      danger: true,
      onConfirm: async () => {
        setBatchApplying(true);
        let succeeded = 0;
        let failed = 0;
        for (const svc of services) {
          try {
            await migrationApi.applyMigration(svc.name, 'schema');
            succeeded += 1;
          } catch (err: unknown) {
            failed += 1;
            addNotification({
              title: i18n.t('admin.migration_admin_page.error_title'),
              message: i18n.t('admin:migration_admin_page.batch_failed_msg', {
                serviceName: svc.name,
                message:
                  (err as { message?: string }).message ||
                  i18n.t('admin.migration_admin_page.unknown_error'),
              }),
              type: 'error',
            });
          }
        }
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.MIGRATION_STATUS_BASE,
          exact: false,
          refetchType: 'active',
        });
        addNotification({
          title:
            failed === 0
              ? i18n.t('admin.migration_admin_page.success_title')
              : i18n.t('admin.migration_admin_page.warning_title'),
          message: i18n.t('admin:migration_admin_page.batch_complete_msg', { succeeded, failed }),
          type: failed === 0 ? 'success' : 'warning',
        });
        setBatchApplying(false);
      },
    });
  }, [services, openConfirmDialog, addNotification, queryClient]);
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('admin.migration_admin_page.rollback'),
        icon: <RotateCcw size={16} />,
        color: 'warning',
        onClick: (row) => handleRollback(row as unknown as MigrationService),
      },
      {
        label: i18n.t('admin.migration_admin_page.apply_migration'),
        icon: <Play size={16} />,
        onClick: (row) => handleApply(row as unknown as MigrationService),
      },
    ],
    [handleApply, handleRollback]
  );
  const headerContent = useMemo(() => {
    const totalServices = services.length;
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Database sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('admin.migration_admin_page.total_services')}
              </Typography>
            </Box>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
              color='primary.main'
            >
              {totalServices}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Button
                variant='contained'
                startIcon={batchApplying ? <CircularProgress size={16} /> : <Play size={16} />}
                onClick={batchApplying ? undefined : handleBatchApply}
                disabled={batchApplying}
                fullWidth
              >
                {i18n.t('admin.migration_admin_page.batch_migration')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }, [services, batchApplying, handleBatchApply]);
  return (
    <PageContainer
      title={i18n.t('admin.migration_admin_page.page_title')}
      subtitle={i18n.t('admin.migration_admin_page.page_subtitle')}
    >
      <CrudPage
        schema={migrationSchema}
        apiAdapter={apiAdapter}
        headerContent={headerContent}
        customRowActions={customRowActions}
        idField='name'
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};
export default MigrationAdminPage;
