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
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  ProductionRecord,
  CreateProductionRecordRequest,
  UpdateProductionRecordRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { LoadingSpinner } from '@topems/shared-components';
import { useCrudMutations } from '@/hooks';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Eye, Trash2, Clock, User, Package, Settings, Activity } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProductionRecordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
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

  const recordQuery = useQuery({
    queryKey: ['mes-records', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.records.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.production_record_page.fail'));
      }
      return {
        items: response.data.records || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const records = recordQuery.data?.items ?? [];
  const total = recordQuery.data?.total ?? 0;
  const loading = recordQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateProductionRecordRequest,
    UpdateProductionRecordRequest,
    string
  >({
    queryKeyToInvalidate: ['mes-records'],
    createFn: async (data) => {
      const response = await mesApi.records.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建生产记录失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await mesApi.records.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新生产记录失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await mesApi.records.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除生产记录失败');
      }
      return response.data;
    },
    entityName: '生产记录',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecord) {
      await updateMutation.mutateAsync({
        id: selectedRecord.id,
        data: {
          quantity_completed: formData.quantity_completed,
          quantity_rejected: formData.quantity_rejected,
        } as UpdateProductionRecordRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setShowDialog(false);
    resetForm();
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
      if (!window.confirm(t('mes.production_record_page.confirm'))) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
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
      pending: { label: t('mes.production_record_page.text_1568ba'), bg: 'warning.light', color: 'warning.700' },
      in_progress: { label: t('mes.production_record_page.status_in_progress'), bg: 'primary.100', color: 'primary.dark' },
      completed: { label: t('mes.production_record_page.status_completed'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.production_record_page.status_cancelled'), bg: 'error.lighter', color: 'error.dark' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
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
        label: t('mes.production_record_page.order'),
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 500 }}>{row.order_id}</Box>,
      },
      {
        id: 'process_id',
        label: t('mes.production_record_page.field_process'),
        render: (row) => row.process_id || '-',
      },
      {
        id: 'work_station_id',
        label: t('mes.production_record_page.text_909250'),
        render: (row) => row.work_station_id || '-',
      },
      {
        id: 'operator',
        label: t('mes.production_record_page.action'),
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
        label: t('mes.production_record_page.completed_quantity'),
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
        label: t('mes.production_record_page.field_defective_quantity'),
        render: (row) => row.quantity_rejected || 0,
      },
      {
        id: 'start_time',
        label: t('mes.production_record_page.column_start_time'),
        render: (row) => (row.start_time ? new Date(row.start_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'status',
        label: t('mes.production_record_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.production_record_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.production_record_page.all'), value: '' },
          { label: t('mes.production_record_page.text_1568ba'), value: 'pending' },
          { label: t('mes.production_record_page.status_in_progress'), value: 'in_progress' },
          { label: t('mes.production_record_page.status_completed'), value: 'completed' },
          { label: t('mes.production_record_page.status_cancelled'), value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<ProductionRecord>[] = useMemo(
    () => [
      {
        label: t('mes.production_record_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.production_record_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.production_record_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.production_record_page.confirm'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

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
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
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
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
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
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
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
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Activity style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={records}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.production_record_page.search')}
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
            label: t('mes.production_record_page.add'),
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.production_record_page.empty_message')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedRecord ? t('mes.production_record_page.edit') : t('mes.production_record_page.add')}</DialogTitle>
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
                label={t('mes.production_record_page.order_1')}
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                size='small'
                required
                disabled={!!selectedRecord}
              />
              <TextField
                label={t('mes.production_record_page.process')}
                value={formData.process_id}
                onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                size='small'
                disabled={!!selectedRecord}
              />
              <TextField
                label={t('mes.production_record_page.text_e991a1')}
                value={formData.work_station_id}
                onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                size='small'
                disabled={!!selectedRecord}
              />
              <TextField
                label={t('mes.production_record_page.action_1')}
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                size='small'
                required
                disabled={!!selectedRecord}
              />
              <TextField
                label={t('mes.production_record_page.completed_quantity_1')}
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
                label={t('mes.production_record_page.field_defective_quantity')}
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
                label={t('mes.production_record_page.start_time')}
                type='datetime-local'
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } } as const}
                disabled={!!selectedRecord}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

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
    </PageContainer>
  );
};

export default ProductionRecordPage;
