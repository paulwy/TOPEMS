import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Eye, RotateCcw, FileSearch } from 'lucide-react';
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
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { migrationApi, type MigrationService, type MigrationStatus } from '@/api/migration';

interface ServiceStatusMap {
  [serviceName: string]: MigrationStatus;
}

const MigrationAdminPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<ServiceStatusMap>({});
  const [activeService, setActiveService] = useState<MigrationService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const servicesQuery = useQuery<MigrationService[]>({
    queryKey: ['admin-migration-services'],
    queryFn: async () => migrationApi.listServices(),
    staleTime: 5 * 60 * 1000,
  });

  const services = servicesQuery.data ?? [];
  const loading = servicesQuery.isLoading;

  useEffect(() => {
    if (servicesQuery.isError) {
      addNotification({
        title: '错误',
        message: (servicesQuery.error as { message?: string })?.message || '加载服务列表失败',
        type: 'error',
      });
    }
  }, [servicesQuery.isError, servicesQuery.error, addNotification]);

  useEffect(() => {
    if (!servicesQuery.isSuccess || services.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        services.map((svc) => migrationApi.getMigrationStatus(svc.name).catch(() => null))
      );
      if (cancelled) return;
      const nextStatusMap: ServiceStatusMap = {};
      services.forEach((svc, idx) => {
        if (results[idx]) nextStatusMap[svc.name] = results[idx] as MigrationStatus;
      });
      setStatusMap((prev) => ({ ...prev, ...nextStatusMap }));
    })();
    return () => {
      cancelled = true;
    };
  }, [servicesQuery.isSuccess, services]);

  const fetchStatusFor = useCallback(
    async (serviceName: string, silent = false) => {
      if (!silent) setStatusLoading(serviceName);
      try {
        const status = await migrationApi.getMigrationStatus(serviceName);
        setStatusMap((prev) => ({ ...prev, [serviceName]: status }));
        return status;
      } catch (err: unknown) {
        if (!silent)
          addNotification({
            title: '错误',
            message: (err as { message?: string }).message || '获取迁移状态失败',
            type: 'error',
          });
        return null;
      } finally {
        if (!silent) setStatusLoading(null);
      }
    },
    [addNotification]
  );

  const applyMutation = useMutation({
    mutationFn: async (service: MigrationService) => {
      const result = await migrationApi.applyMigration(service.name, 'schema');
      return { service, result };
    },
    onSuccess: async ({ service, result }) => {
      addNotification({
        title: '成功',
        message: `${service.name} 迁移执行成功，共 ${result.files.length} 个文件`,
        type: 'success',
      });
      await fetchStatusFor(service.name, true);
      await queryClient.invalidateQueries({ queryKey: ['admin-migration-services'] });
    },
    onError: (err: unknown, service: MigrationService) => {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || `${service.name} 迁移执行失败`,
        type: 'error',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (service: MigrationService) => {
      const result = await migrationApi.rollbackMigration(service.name);
      return { service, result };
    },
    onSuccess: async ({ service, result }) => {
      addNotification({
        title: '成功',
        message: `${service.name} 回滚完成：${result.record ? '已移除记录' : '无记录可回滚'}`,
        type: 'success',
      });
      await fetchStatusFor(service.name, true);
      await queryClient.invalidateQueries({ queryKey: ['admin-migration-services'] });
    },
    onError: (err: unknown, service: MigrationService) => {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || `${service.name} 回滚失败`,
        type: 'error',
      });
    },
  });

  const batchApplyMutation = useMutation({
    mutationFn: async (servicesToApply: MigrationService[]) => {
      let succeeded = 0;
      let failed = 0;
      for (const svc of servicesToApply) {
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
      const results = await Promise.all(
        servicesToApply.map((svc) => migrationApi.getMigrationStatus(svc.name).catch(() => null))
      );
      const nextStatusMap: ServiceStatusMap = {};
      servicesToApply.forEach((svc, idx) => {
        if (results[idx]) nextStatusMap[svc.name] = results[idx] as MigrationStatus;
      });
      setStatusMap((prev) => ({ ...prev, ...nextStatusMap }));
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      addNotification({
        title: failed === 0 ? '成功' : '警告',
        message: `批量迁移完成：成功 ${succeeded} 个，失败 ${failed} 个`,
        type: failed === 0 ? 'success' : 'warning',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-migration-services'] });
    },
  });

  const applyingService = applyMutation.isPending
    ? ((applyMutation.variables as MigrationService)?.name ?? null)
    : null;
  const rollingBackService = rollbackMutation.isPending
    ? ((rollbackMutation.variables as MigrationService)?.name ?? null)
    : null;
  const batchApplying = batchApplyMutation.isPending;

  const handleApply = useCallback(
    (service: MigrationService) => {
      applyMutation.mutate(service);
    },
    [applyMutation]
  );

  const handleRollback = useCallback(
    (service: MigrationService) => {
      if (!window.confirm(`确认回滚 ${service.name} 最近一次迁移？该操作不可恢复。`)) {
        return;
      }
      rollbackMutation.mutate(service);
    },
    [rollbackMutation]
  );

  const handleShowStatus = useCallback(
    async (service: MigrationService) => {
      setActiveService(service);
      setStatusDialogOpen(true);
      if (!statusMap[service.name]) {
        await fetchStatusFor(service.name);
      }
    },
    [statusMap, fetchStatusFor]
  );

  const handleBatchApply = useCallback(() => {
    if (services.length === 0) return;
    if (!window.confirm(`将对全部 ${services.length} 个服务执行 schema 迁移，确认继续？`)) {
      return;
    }
    batchApplyMutation.mutate(services);
  }, [services, batchApplyMutation]);

  const getPendingCount = (serviceName: string) => statusMap[serviceName]?.pending?.length ?? 0;
  const getAppliedCount = (serviceName: string) => statusMap[serviceName]?.applied?.length ?? 0;

  const filteredData = useMemo(() => {
    if (!searchValue) return services;
    const query = searchValue.toLowerCase();
    return services.filter(
      (svc) =>
        svc.name.toLowerCase().includes(query) ||
        svc.schema.toLowerCase().includes(query) ||
        (svc.description || '').toLowerCase().includes(query)
    );
  }, [services, searchValue]);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const columns: ColumnDef<MigrationService>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '服务名',
        minWidth: 180,
        render: (row) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
      },
      { id: 'schema', label: 'Schema', minWidth: 120 },
      {
        id: 'port',
        label: '端口',
        minWidth: 80,
        align: 'right',
      },
      {
        id: 'tables',
        label: '表数',
        minWidth: 80,
        align: 'right',
      },
      {
        id: 'description',
        label: '描述',
        minWidth: 200,
        render: (row) => (
          <Box
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.description || '-'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 140,
        align: 'center',
        render: (row) => {
          const isLoadingStatus = statusLoading === row.name;
          const pending = getPendingCount(row.name);
          const applied = getAppliedCount(row.name);
          if (isLoadingStatus) {
            return (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  color: 'text.secondary',
                }}
              >
                <CircularProgress size={14} />
                <Typography variant='caption'>加载中</Typography>
              </Box>
            );
          }
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={`待执行 ${pending}`}
                size='small'
                sx={{ bgcolor: 'warning.light', color: 'warning.main', fontSize: 11 }}
              />
              <Chip
                label={`已执行 ${applied}`}
                size='small'
                sx={{ bgcolor: 'success.light', color: 'success.main', fontSize: 11 }}
              />
            </Box>
          );
        },
      },
    ],
    [statusLoading]
  );

  const renderRowActions = useCallback(
    (row: MigrationService) => {
      const isApplying = applyingService === row.name;
      const isRolling = rollingBackService === row.name;
      const isLoadingStatus = statusLoading === row.name;
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            size='small'
            variant='outlined'
            onClick={(e) => {
              e.stopPropagation();
              handleShowStatus(row);
            }}
            disabled={isLoadingStatus}
            startIcon={<Eye size={14} />}
          >
            查看状态
          </Button>
          <Button
            size='small'
            variant='text'
            onClick={(e) => {
              e.stopPropagation();
              handleRollback(row);
            }}
            disabled={isRolling || isApplying || getAppliedCount(row.name) === 0}
            sx={{ color: 'warning.main' }}
            startIcon={isRolling ? <CircularProgress size={14} /> : <RotateCcw size={14} />}
          >
            回滚
          </Button>
          <Button
            size='small'
            variant='contained'
            onClick={(e) => {
              e.stopPropagation();
              handleApply(row);
            }}
            disabled={isApplying || isRolling}
            startIcon={isApplying ? <CircularProgress size={14} /> : <Play size={14} />}
          >
            生成迁移
          </Button>
        </Box>
      );
    },
    [applyingService, rollingBackService, statusLoading]
  );

  return (
    <PageContainer
      title='数据库迁移管理'
      subtitle='查看各服务迁移状态，生成并执行 schema / index / audit 迁移'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        searchable
        searchPlaceholder='搜索服务名、Schema或描述...'
        onSearch={handleSearch}
        renderRowActions={renderRowActions}
        actions={[
          {
            label: '批量生成全部服务迁移',
            icon: batchApplying ? <CircularProgress size={16} /> : <Play size={16} />,
            onClick: handleBatchApply,
            variant: 'contained',
          },
        ]}
        onRefresh={() => servicesQuery.refetch()}
        emptyMessage='暂无可管理的迁移服务'
        emptyIcon={
          <FileSearch style={{ width: 48, height: 48, color: theme.palette.text.disabled }} />
        }
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

          {activeService && statusLoading === activeService.name ? (
            <Box
              sx={{
                py: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <CircularProgress size={40} />
              <Typography
                variant='body2'
                sx={{ mt: 3 }}
              >
                加载迁移状态中...
              </Typography>
            </Box>
          ) : activeService && statusMap[activeService.name] ? (
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
    </PageContainer>
  );
};

export default MigrationAdminPage;
