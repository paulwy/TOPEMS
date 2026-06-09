import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Play, Eye, FileSearch, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../components/ToastProvider';
import {
  migrationApi,
  type MigrationService,
  type MigrationStatus,
} from '../api/migration';

interface ServiceStatusMap {
  [serviceName: string]: MigrationStatus;
}

const MigrationAdminPage: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<MigrationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingService, setApplyingService] = useState<string | null>(null);
  const [rollingBackService, setRollingBackService] = useState<string | null>(null);
  const [batchApplying, setBatchApplying] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<ServiceStatusMap>({});
  const [activeService, setActiveService] = useState<MigrationService | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await migrationApi.listServices();
      setServices(data);
      showToast('success', `加载成功，共 ${data.length} 个服务`);
    } catch (err: any) {
      showToast('error', err.message || '加载服务列表失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleApply = async (service: MigrationService) => {
    setApplyingService(service.name);
    try {
      const result = await migrationApi.applyMigration(service.name, 'schema');
      showToast('success', `${service.name} 迁移执行成功，共 ${result.files.length} 个文件`);
      await fetchStatusFor(service.name, true);
    } catch (err: any) {
      showToast('error', err.message || `${service.name} 迁移执行失败`);
    } finally {
      setApplyingService(null);
    }
  };

  const handleRollback = async (service: MigrationService) => {
    if (!window.confirm(`确认回滚 ${service.name} 最近一次迁移？该操作不可恢复。`)) {
      return;
    }
    setRollingBackService(service.name);
    try {
      const result = await migrationApi.rollbackMigration(service.name);
      showToast(
        'success',
        `${service.name} 回滚完成：${result.record ? '已移除记录' : '无记录可回滚'}`
      );
      await fetchStatusFor(service.name, true);
    } catch (err: any) {
      showToast('error', err.message || `${service.name} 回滚失败`);
    } finally {
      setRollingBackService(null);
    }
  };

  const fetchStatusFor = async (serviceName: string, silent = false) => {
    if (!silent) setStatusLoading(serviceName);
    try {
      const status = await migrationApi.getMigrationStatus(serviceName);
      setStatusMap((prev) => ({ ...prev, [serviceName]: status }));
      return status;
    } catch (err: any) {
      if (!silent) showToast('error', err.message || '获取迁移状态失败');
      return null;
    } finally {
      if (!silent) setStatusLoading(null);
    }
  };

  const handleShowStatus = async (service: MigrationService) => {
    setActiveService(service);
    setStatusDialogOpen(true);
    if (!statusMap[service.name]) {
      await fetchStatusFor(service.name);
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
      } catch (err: any) {
        failed += 1;
        showToast('error', `${svc.name} 迁移失败：${err.message || '未知错误'}`);
      }
    }
    try {
      const results = await Promise.all(
        services.map((svc) => migrationApi.getMigrationStatus(svc.name).catch(() => null))
      );
      const nextStatusMap: ServiceStatusMap = {};
      services.forEach((svc, idx) => {
        if (results[idx]) nextStatusMap[svc.name] = results[idx] as MigrationStatus;
      });
      setStatusMap((prev) => ({ ...prev, ...nextStatusMap }));
    } catch (err) {
      // ignore
    }
    showToast(
      failed === 0 ? 'success' : 'warning',
      `批量迁移完成：成功 ${succeeded} 个，失败 ${failed} 个`
    );
    setBatchApplying(false);
  };

  const getPendingCount = (serviceName: string) =>
    statusMap[serviceName]?.pending?.length ?? 0;

  const getAppliedCount = (serviceName: string) =>
    statusMap[serviceName]?.applied?.length ?? 0;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center space-x-3'>
              <div className='p-2 bg-blue-100 rounded-lg'>
                <Database className='w-6 h-6 text-blue-600' />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>数据库迁移管理</h1>
                <p className='text-sm text-gray-500 mt-1'>
                  查看各服务迁移状态，生成并执行 schema / index / audit 迁移
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={fetchServices}
                disabled={loading}
                className='gap-2'
              >
                {loading ? (
                  <LoadingSpinner size='sm' />
                ) : (
                  <RefreshCw className='w-4 h-4' />
                )}
                刷新列表
              </Button>
              <Button
                onClick={handleBatchApply}
                disabled={batchApplying || loading || services.length === 0}
                className='gap-2'
              >
                {batchApplying ? <LoadingSpinner size='sm' /> : <Play className='w-4 h-4' />}
                批量生成全部服务迁移
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
          {loading ? (
            <div className='py-16 flex flex-col items-center justify-center'>
              <LoadingSpinner size='lg' />
              <p className='mt-4 text-gray-500 text-sm'>加载服务列表中...</p>
            </div>
          ) : services.length === 0 ? (
            <div className='py-16 flex flex-col items-center justify-center text-gray-500'>
              <FileSearch className='w-12 h-12 text-gray-300 mb-3' />
              <p>暂无可管理的迁移服务</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[180px]'>服务名</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead className='text-right'>端口</TableHead>
                  <TableHead className='text-right'>表数</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className='text-center'>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((svc) => {
                  const isApplying = applyingService === svc.name;
                  const isRolling = rollingBackService === svc.name;
                  const isLoadingStatus = statusLoading === svc.name;
                  const pending = getPendingCount(svc.name);
                  const applied = getAppliedCount(svc.name);
                  return (
                    <TableRow key={svc.name}>
                      <TableCell className='font-medium text-gray-900'>
                        {svc.name}
                      </TableCell>
                      <TableCell className='text-gray-700'>{svc.schema}</TableCell>
                      <TableCell className='text-right text-gray-700'>{svc.port}</TableCell>
                      <TableCell className='text-right text-gray-700'>{svc.tables}</TableCell>
                      <TableCell className='text-gray-600 max-w-xs truncate'>
                        {svc.description || '-'}
                      </TableCell>
                      <TableCell className='text-center'>
                        {isLoadingStatus ? (
                          <span className='inline-flex items-center gap-2 text-gray-500 text-xs'>
                            <LoadingSpinner size='sm' />
                            加载中
                          </span>
                        ) : (
                          <div className='flex flex-col items-center gap-1'>
                            <span className='inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700'>
                              待执行 {pending}
                            </span>
                            <span className='inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700'>
                              已执行 {applied}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleShowStatus(svc)}
                            disabled={isLoadingStatus}
                            className='gap-1'
                          >
                            <Eye className='w-3.5 h-3.5' />
                            查看状态
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleRollback(svc)}
                            disabled={isRolling || isApplying || getAppliedCount(svc.name) === 0}
                            title={getAppliedCount(svc.name) === 0 ? '暂无可回滚记录' : '回滚最近一次迁移'}
                            className='gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                          >
                            {isRolling ? (
                              <LoadingSpinner size='sm' />
                            ) : (
                              <RotateCcw className='w-3.5 h-3.5' />
                            )}
                            回滚
                          </Button>
                          <Button
                            size='sm'
                            onClick={() => handleApply(svc)}
                            disabled={isApplying || isRolling}
                            className='gap-1'
                          >
                            {isApplying ? (
                              <LoadingSpinner size='sm' />
                            ) : (
                              <Play className='w-3.5 h-3.5' />
                            )}
                            生成迁移
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              {activeService ? `${activeService.name} · 迁移状态` : '迁移状态'}
            </DialogTitle>
            <DialogDescription>
              {activeService
                ? `Schema: ${activeService.schema} ｜ 端口: ${activeService.port}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {activeService && statusLoading === activeService.name ? (
            <div className='py-10 flex flex-col items-center justify-center text-gray-500'>
              <LoadingSpinner size='lg' />
              <p className='mt-3 text-sm'>加载迁移状态中...</p>
            </div>
          ) : activeService && statusMap[activeService.name] ? (
            <div className='space-y-6 max-h-[60vh] overflow-y-auto'>
              <div>
                <h3 className='text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2'>
                  <span className='inline-block w-2 h-2 rounded-full bg-yellow-500' />
                  待执行迁移 ({statusMap[activeService.name].pending.length})
                </h3>
                {statusMap[activeService.name].pending.length === 0 ? (
                  <div className='text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-4 text-center'>
                    暂无待执行的迁移文件
                  </div>
                ) : (
                  <ul className='space-y-1.5 text-sm font-mono bg-gray-50 rounded-md p-3'>
                    {statusMap[activeService.name].pending.map((file) => (
                      <li key={file} className='text-gray-800'>
                        {file}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className='text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2'>
                  <span className='inline-block w-2 h-2 rounded-full bg-green-500' />
                  已执行迁移 ({statusMap[activeService.name].applied.length})
                </h3>
                {statusMap[activeService.name].applied.length === 0 ? (
                  <div className='text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-4 text-center'>
                    暂无已执行记录
                  </div>
                ) : (
                  <div className='border border-gray-200 rounded-md overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-[120px]'>版本</TableHead>
                          <TableHead>名称</TableHead>
                          <TableHead className='w-[180px]'>执行时间</TableHead>
                          <TableHead className='text-right w-[100px]'>耗时(ms)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statusMap[activeService.name].applied.map((m) => (
                          <TableRow key={`${m.version}-${m.name}`}>
                            <TableCell className='font-mono text-xs text-gray-800'>
                              {m.version}
                            </TableCell>
                            <TableCell className='text-gray-700'>{m.name}</TableCell>
                            <TableCell className='text-gray-600 text-xs'>
                              {m.applied_at
                                ? new Date(m.applied_at).toLocaleString()
                                : '-'}
                            </TableCell>
                            <TableCell className='text-right text-gray-600 text-xs'>
                              {m.duration_ms ?? '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='py-10 text-center text-gray-500 text-sm'>未获取到状态信息</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MigrationAdminPage;
