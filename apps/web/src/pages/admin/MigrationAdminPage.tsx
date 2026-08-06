import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Eye, RotateCcw, FileSearch, Database } from 'lucide-react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import { useNotificationStore } from '@/store';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { migrationApi, type MigrationService, type MigrationStatus } from '@/api/migration';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { migrationSchema } from '@/schemas/admin';

interface ServiceStatusMap {
  [serviceName: string]: MigrationStatus;
}

const MigrationAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [batchApplying, setBatchApplying] = useState(false);
  const [activeService, setActiveService] = useState<MigrationService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [, setApplyingService] = useState<string | null>(null);
  const [, setRollingBackService] = useState<string | null>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const servicesQuery = useQuery({
    queryKey: ['migration-services'],
    queryFn: async () => {
      const data = await migrationApi.listServices();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statusQuery = useQuery({
    queryKey: ['migration-status', servicesQuery.data?.map((s) => s.name) || []],
    queryFn: async () => {
      const services = servicesQuery.data || [];
      if (services.length === 0) return {};

      const results = await Promise.all(
        services.map((svc) => migrationApi.getMigrationStatus(svc.name).catch(() => null))
      );

      const statusMap: ServiceStatusMap = {};
      services.forEach((svc, idx) => {
        if (results[idx]) statusMap[svc.name] = results[idx] as MigrationStatus;
      });
      return statusMap;
    },
    enabled: !!servicesQuery.data && servicesQuery.data.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const services = servicesQuery.data || [];
  const statusMap = statusQuery.data || {};

  const apiAdapter: CrudApiAdapter<MigrationService> = useMemo(
    () => ({
      list: async () => {
        const data = await migrationApi.listServices();
        return { data, total: data.length };
      },
      create: async () => {
        throw new Error(t('admin:migration_admin_page.unsupported_create'));
      },
      update: async () => {
        throw new Error(t('admin:migration_admin_page.unsupported_update'));
      },
      delete: async () => {
        throw new Error(t('admin:migration_admin_page.unsupported_delete'));
      },
    }),
    []
  );

  const applyMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.applyMigration(serviceName, 'schema'),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: t('admin:migration_admin_page.success_title'),
        message: t('admin:migration_admin_page.apply_success_msg', {
          serviceName,
          count: result.files.length,
        }),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error(t('admin:migration_admin_page.apply_failed_log'), error);
      addNotification({
        title: t('admin:migration_admin_page.error_title'),
        message:
          (error as { message?: string }).message ||
          t('admin:migration_admin_page.apply_failed_msg', { serviceName }),
        type: 'error',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.rollbackMigration(serviceName),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: t('admin:migration_admin_page.success_title'),
        message: t('admin:migration_admin_page.rollback_success_msg', {
          serviceName,
          result: result.record
            ? t('admin:migration_admin_page.removed_records')
            : t('admin:migration_admin_page.no_records_to_rollback'),
        }),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error(t('admin:migration_admin_page.rollback_failed_log'), error);
      addNotification({
        title: t('admin:migration_admin_page.error_title'),
        message:
          (error as { message?: string }).message ||
          t('admin:migration_admin_page.rollback_failed_msg', { serviceName }),
        type: 'error',
      });
    },
  });

  const handleApply = async (service: MigrationService) => {
    setApplyingService(service.name);
    await applyMutation.mutateAsync(service.name);
    setApplyingService(null);
  };

  const handleRollback = (service: MigrationService) => {
    openConfirmDialog({
      title: t('admin:migration_admin_page.confirm_rollback_title'),
      message: t('admin:migration_admin_page.confirm_rollback_msg', { serviceName: service.name }),
      danger: true,
      onConfirm: async () => {
        setRollingBackService(service.name);
        await rollbackMutation.mutateAsync(service.name);
        setRollingBackService(null);
      },
    });
  };

  const handleShowStatus = async (service: MigrationService) => {
    setActiveService(service);
    setStatusDialogOpen(true);
    if (!statusMap[service.name]) {
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    }
  };

  const handleBatchApply = () => {
    if (services.length === 0) return;
    openConfirmDialog({
      title: t('admin:migration_admin_page.confirm_batch_title'),
      message: t('admin:migration_admin_page.confirm_batch_msg', { count: services.length }),
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
              title: t('admin:migration_admin_page.error_title'),
              message: t('admin:migration_admin_page.batch_failed_msg', {
                serviceName: svc.name,
                message:
                  (err as { message?: string }).message ||
                  t('admin:migration_admin_page.unknown_error'),
              }),
              type: 'error',
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['migration-status'] });

        addNotification({
          title:
            failed === 0
              ? t('admin:migration_admin_page.success_title')
              : t('admin:migration_admin_page.warning_title'),
          message: t('admin:migration_admin_page.batch_complete_msg', { succeeded, failed }),
          type: failed === 0 ? 'success' : 'warning',
        });
        setBatchApplying(false);
      },
    });
  };

  const getPendingCount = (serviceName: string) => statusMap[serviceName]?.pending?.length ?? 0;
  const getAppliedCount = (serviceName: string) => statusMap[serviceName]?.applied?.length ?? 0;

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: t('admin:migration_admin_page.view_status'),
        icon: <Eye size={16} />,
        onClick: (row) => handleShowStatus(row as unknown as MigrationService),
      },
      {
        label: t('admin:migration_admin_page.rollback'),
        icon: <RotateCcw size={16} />,
        color: 'warning',
        onClick: (row) => handleRollback(row as unknown as MigrationService),
      },
      {
        label: t('admin:migration_admin_page.apply_migration'),
        icon: <Play size={16} />,
        onClick: (row) => handleApply(row as unknown as MigrationService),
      },
    ],
    [statusMap]
  );

  const headerContent = useMemo(() => {
    const totalServices = services.length;
    const totalPending = services.reduce((sum, svc) => sum + getPendingCount(svc.name), 0);
    const totalApplied = services.reduce((sum, svc) => sum + getAppliedCount(svc.name), 0);

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
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
                {t('admin:migration_admin_page.total_services')}
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
              <FileSearch sx={{ fontSize: 20, color: 'warning.main' }} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('admin:migration_admin_page.pending_migration')}
              </Typography>
            </Box>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
              color='warning.main'
            >
              {totalPending}
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
              <Play sx={{ fontSize: 20, color: 'success.main' }} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('admin:migration_admin_page.applied_migration')}
              </Typography>
            </Box>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700 }}
              color='success.main'
            >
              {totalApplied}
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
                {t('admin:migration_admin_page.batch_migration')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }, [services, statusMap, batchApplying]);

  return (
    <PageContainer
      title={t('admin:migration_admin_page.page_title')}
      subtitle={t('admin:migration_admin_page.page_subtitle')}
    >
      <CrudPage
        schema={migrationSchema}
        apiAdapter={apiAdapter}
        headerContent={headerContent}
        customRowActions={customRowActions}
        idField='name'
      />

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogContent>
          <DialogTitle>
            {activeService
              ? t('admin:migration_admin_page.service_status_title', {
                  serviceName: activeService.name,
                })
              : t('admin:migration_admin_page.migration_status')}
          </DialogTitle>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 4 }}
          >
            {activeService
              ? t('admin:migration_admin_page.schema_port_info', {
                  schema: activeService.schema,
                  port: activeService.port,
                })
              : ''}
          </Typography>

          {activeService && statusMap[activeService.name] ? (
            <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                    }}
                  />
                  {t('admin:migration_admin_page.pending_with_count', {
                    count: statusMap[activeService.name].pending.length,
                  })}
                </Typography>
                {statusMap[activeService.name].pending.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {t('admin:migration_admin_page.no_pending_files')}
                    </Typography>
                  </Paper>
                ) : (
                  <Paper
                    sx={{
                      p: 3,
                      bgcolor: 'grey.50',
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  >
                    {statusMap[activeService.name].pending.map((file) => (
                      <Typography
                        key={file}
                        variant='body2'
                      >
                        {file}
                      </Typography>
                    ))}
                  </Paper>
                )}
              </Box>

              <Box sx={{ mt: 4 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                    }}
                  />
                  {t('admin:migration_admin_page.applied_with_count', {
                    count: statusMap[activeService.name].applied.length,
                  })}
                </Typography>
                {statusMap[activeService.name].applied.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {t('admin:migration_admin_page.no_applied_records')}
                    </Typography>
                  </Paper>
                ) : (
                  <Paper sx={{ overflow: 'hidden' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 120, fontWeight: 600 }}>
                            {t('admin:migration_admin_page.version')}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {t('admin:migration_admin_page.name')}
                          </TableCell>
                          <TableCell sx={{ width: 180, fontWeight: 600 }}>
                            {t('admin:migration_admin_page.execution_time')}
                          </TableCell>
                          <TableCell
                            sx={{
                              width: 100,
                              textAlign: 'right',
                              fontWeight: 600,
                            }}
                          >
                            {t('admin:migration_admin_page.duration_ms')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statusMap[activeService.name].applied.map((m) => (
                          <TableRow key={`${m.version}-${m.name}`}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {m.version}
                            </TableCell>
                            <TableCell>{m.name}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {m.applied_at ? new Date(m.applied_at).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: 'right',
                                fontSize: 12,
                                color: 'text.secondary',
                              }}
                            >
                              {m.duration_ms ?? '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant='body2'>
                {t('admin:migration_admin_page.no_status_info')}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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
