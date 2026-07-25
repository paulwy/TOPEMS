import React, { useState, useMemo } from 'react';
import { Play, Eye, RotateCcw, FileSearch, Database } from 'lucide-react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  useTheme,
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
  const theme = useTheme();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [applyingService, setApplyingService] = useState<string | null>(null);
  const [rollingBackService, setRollingBackService] = useState<string | null>(null);
  const [batchApplying, setBatchApplying] = useState(false);
  const [activeService, setActiveService] = useState<MigrationService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
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
        throw new Error('不支持创建迁移服务');
      },
      update: async () => {
        throw new Error('不支持更新迁移服务');
      },
      delete: async () => {
        throw new Error('不支持删除迁移服务');
      },
    }),
    []
  );

  const applyMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.applyMigration(serviceName, 'schema'),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: '成功',
        message: `${serviceName} 迁移执行成功，共 ${result.files.length} 个文件`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error('迁移执行失败:', error);
      addNotification({
        title: '错误',
        message: (error as { message?: string }).message || `${serviceName} 迁移执行失败`,
        type: 'error',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (serviceName: string) => migrationApi.rollbackMigration(serviceName),
    onSuccess: (result, serviceName) => {
      addNotification({
        title: '成功',
        message: `${serviceName} 回滚完成：${result.record ? '已移除记录' : '无记录可回滚'}`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    },
    onError: (error: unknown, serviceName) => {
      apiLogger.error('回滚失败:', error);
      addNotification({
        title: '错误',
        message: (error as { message?: string }).message || `${serviceName} 回滚失败`,
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
      title: '确认回滚',
      message: `确认回滚 ${service.name} 最近一次迁移？该操作不可恢复。`,
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
      title: '确认批量迁移',
      message: `将对全部 ${services.length} 个服务执行 schema 迁移，确认继续？`,
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
              title: '错误',
              message: `${svc.name} 迁移失败：${(err as { message?: string }).message || '未知错误'}`,
              type: 'error',
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['migration-status'] });

        addNotification({
          title: failed === 0 ? '成功' : '警告',
          message: `批量迁移完成：成功 ${succeeded} 个，失败 ${failed} 个`,
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
        label: '查看状态',
        icon: <Eye size={16} />,
        onClick: (row) => handleShowStatus(row as MigrationService),
      },
      {
        label: '回滚',
        icon: <RotateCcw size={16} />,
        color: 'warning',
        onClick: (row) => handleRollback(row as MigrationService),
      },
      {
        label: '执行迁移',
        icon: <Play size={16} />,
        onClick: (row) => handleApply(row as MigrationService),
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
                服务总数
              </Typography>
            </Box>
            <Typography
              variant='h4'
              fontWeight={700}
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
                待执行迁移
              </Typography>
            </Box>
            <Typography
              variant='h4'
              fontWeight={700}
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
                已执行迁移
              </Typography>
            </Box>
            <Typography
              variant='h4'
              fontWeight={700}
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
                批量迁移
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }, [services, statusMap, batchApplying]);

  return (
    <PageContainer
      title='数据库迁移管理'
      subtitle='查看各服务迁移状态，生成并执行 schema / index / audit 迁移'
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
            {activeService ? `${activeService.name} · 迁移状态` : '迁移状态'}
          </DialogTitle>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 4 }}
          >
            {activeService ? `Schema: ${activeService.schema} ｜ 端口: ${activeService.port}` : ''}
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
                  待执行迁移 ({statusMap[activeService.name].pending.length})
                </Typography>
                {statusMap[activeService.name].pending.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      暂无待执行的迁移文件
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
                  已执行迁移 ({statusMap[activeService.name].applied.length})
                </Typography>
                {statusMap[activeService.name].applied.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      暂无已执行记录
                    </Typography>
                  </Paper>
                ) : (
                  <Paper sx={{ overflow: 'hidden' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 120, fontWeight: 600 }}>版本</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                          <TableCell sx={{ width: 180, fontWeight: 600 }}>执行时间</TableCell>
                          <TableCell
                            sx={{
                              width: 100,
                              textAlign: 'right',
                              fontWeight: 600,
                            }}
                          >
                            耗时(ms)
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
              <Typography variant='body2'>未获取到状态信息</Typography>
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
