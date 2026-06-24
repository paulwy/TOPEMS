import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ProductionRecord,
  CreateProductionRecordRequest,
  UpdateProductionRecordRequest,
} from '@/api/professional/mes/mes';
import { mesApi } from '@/api/professional/mes/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Eye, Trash2, Clock, User, Package, Settings } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const ProductionRecordPage: React.FC = () => {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);
  const [formData, setFormData] = useState<CreateProductionRecordRequest>({
    order_id: '',
    process_id: '',
    work_station_id: '',
    operator: '',
    quantity_completed: 0,
    quantity_rejected: 0,
    start_time: '',
  });

  const { addNotification } = useAppStore();

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.records.list(params);
      if (response.success && response.data) {
        setRecords(response.data.records || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error('加载生产记录失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载生产记录',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRecord) {
        await mesApi.records.update(selectedRecord.id, {
          quantity_completed: formData.quantity_completed,
          quantity_rejected: formData.quantity_rejected,
        } as UpdateProductionRecordRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '生产记录已更新',
        });
      } else {
        await mesApi.records.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新生产记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadRecords();
    } catch (error) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedRecord ? '更新生产记录失败' : '创建生产记录失败',
      });
    }
  };

  const handleEdit = useCallback((record: ProductionRecord) => {
    setSelectedRecord(record);
    setFormData({
      order_id: record.order_id,
      process_id: record.process_id || '',
      work_station_id: record.work_station_id || '',
      operator: record.operator,
      quantity_completed: record.quantity_completed,
      quantity_rejected: record.quantity_rejected || 0,
      start_time: record.start_time,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((record: ProductionRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这条生产记录吗?')) return;
      try {
        await mesApi.records.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '生产记录已删除',
        });
        loadRecords();
      } catch (error) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除生产记录',
        });
      }
    },
    [loadRecords, addNotification]
  );

  const resetForm = () => {
    setSelectedRecord(null);
    setFormData({
      order_id: '',
      process_id: '',
      work_station_id: '',
      operator: '',
      quantity_completed: 0,
      quantity_rejected: 0,
      start_time: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; color: string }> = {
      pending: { label: '待开始', bg: '#fef3c7', color: '#b45309' },
      in_progress: { label: '进行中', bg: '#dbeafe', color: '#1d4ed8' },
      completed: { label: '已完成', bg: '#dcfce7', color: '#15803d' },
      cancelled: { label: '已取消', bg: '#fee2e2', color: '#dc2626' },
    };
    const s = statusMap[status] || { label: status, bg: '#f3f4f6', color: '#4b5563' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<ProductionRecord>[] = useMemo(
    () => [
      {
        id: 'order_id',
        label: '订单ID',
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 500 }}>{row.order_id}</Box>,
      },
      {
        id: 'process_id',
        label: '工序',
        render: (row) => row.process_id || '-',
      },
      {
        id: 'work_station_id',
        label: '工作站',
        render: (row) => row.work_station_id || '-',
      },
      {
        id: 'operator',
        label: '操作员',
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <User size={14} />
            {row.operator}
          </Stack>
        ),
      },
      {
        id: 'quantity_completed',
        label: '完成数量',
        sortable: true,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Package size={14} />
            {row.quantity_completed}
          </Stack>
        ),
      },
      {
        id: 'quantity_rejected',
        label: '不良数量',
        render: (row) => row.quantity_rejected || 0,
      },
      {
        id: 'start_time',
        label: '开始时间',
        render: (row) => (row.start_time ? new Date(row.start_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: '' },
          { label: '待开始', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<ProductionRecord>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条生产记录吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 生产记录统计
  const stats = useMemo(() => {
    return {
      total: records.length,
      completed: records.filter((r) => r.status === 'completed').length,
      in_progress: records.filter((r) => r.status === 'in_progress').length,
      total_output: records.reduce((sum, r) => sum + r.quantity_completed, 0),
    };
  }, [records]);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: '#f3f4f6', borderRadius: 2 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          记录总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#dcfce7', borderRadius: 2 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已完成
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.completed}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 2 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          进行中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.in_progress}
        </Typography>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title='生产记录管理'
        subtitle='管理生产记录,包括订单ID、工序、操作员、完成数量等'
        columns={columns}
        data={records}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索订单ID或操作员...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        actions={[
          {
            label: '新增生产记录',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无生产记录数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedRecord ? '编辑生产记录' : '新增生产记录'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='订单ID *'
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='工序ID'
                value={formData.process_id}
                onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                size='small'
              />
              <TextField
                label='工作站ID'
                value={formData.work_station_id}
                onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                size='small'
              />
              <TextField
                label='操作员 *'
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='完成数量 *'
                type='number'
                value={formData.quantity_completed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity_completed: parseInt(e.target.value),
                  })
                }
                size='small'
                required
              />
              <TextField
                label='不良数量'
                type='number'
                value={formData.quantity_rejected}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity_rejected: parseInt(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='开始时间 *'
                type='datetime-local'
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <DialogActions sx={{ mt: 2 }}>
              <Button
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>生产记录详情</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  订单ID
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedRecord.order_id}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工序
                </Box>
                <Box>{selectedRecord.process_id || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工作站
                </Box>
                <Box>{selectedRecord.work_station_id || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  操作员
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <User size={16} />
                  {selectedRecord.operator}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  完成数量
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Package size={16} />
                  {selectedRecord.quantity_completed}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  不良数量
                </Box>
                <Box>{selectedRecord.quantity_rejected || 0}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  开始时间
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Clock size={16} />
                  {selectedRecord.start_time
                    ? new Date(selectedRecord.start_time).toLocaleString('zh-CN')
                    : '-'}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  结束时间
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Clock size={16} />
                  {selectedRecord.end_time
                    ? new Date(selectedRecord.end_time).toLocaleString('zh-CN')
                    : '-'}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedRecord.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  备注
                </Box>
                <Box>{selectedRecord.notes || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Clock size={16} />
                  {selectedRecord.created_at
                    ? new Date(selectedRecord.created_at).toLocaleString('zh-CN')
                    : '-'}
                </Stack>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductionRecordPage;
