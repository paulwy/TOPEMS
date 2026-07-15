import React, { useState, useMemo } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';

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
  const [searchValue, setSearchValue] = useState('');

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
  const loading = servicesQuery.isLoading;
  const statusMap = statusQuery.data || {};

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

  const handleRollback = async (service: MigrationService) => {
    if (!window.confirm(`确认回滚 ${service.name} 最近一次迁移？该操作不可恢复。`)) {
      return;
    }
    setRollingBackService(service.name);
    await rollbackMutation.mutateAsync(service.name);
    setRollingBackService(null);
  };

  const handleShowStatus = async (service: MigrationService) => {
    setActiveService(service);
    setStatusDialogOpen(true);
    if (!statusMap[service.name]) {
      queryClient.invalidateQueries({ queryKey: ['migration-status'] });
    }
  };

  const handleBatchApply = async () => {
    if (services.length === 0) return;
    if (!window.confirm(`将对全部 ${services.length} 个服务执行 schema 迁移，确认继续？`)) {
      return;
    }
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
  };

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

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

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
          const pending = getPendingCount(row.name);
          const applied = getAppliedCount(row.name);
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
    []
  );

  const renderRowActions = (row: MigrationService) => {
    const isApplying = applyingService === row.name || applyMutation.isPending;
    const isRolling = rollingBackService === row.name || rollbackMutation.isPending;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          size='small'
          variant='outlined'
          onClick={(e) => {
            e.stopPropagation();
            handleShowStatus(row);
          }}
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
  };

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
            onClick: batchApplying ? undefined : handleBatchApply,
            variant: 'contained' as const,
          },
        ]}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['migration-services', 'migration-status'] })}
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
    </PageContainer>
  );
};

export default MigrationAdminPage;