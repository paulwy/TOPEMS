import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  StockTake,
  StockTakeItem,
  CreateStockTakeRequest,
  CountItemRequest,
  Warehouse,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Play, CheckCircle2, Eye, Package } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { PageContainer, StatusBadge } from '@/components/common';

import { useTranslation } from 'react-i18next';


const StockTakePage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'success' | 'warning' | 'error' }
  > = {
    planned: { label: t('wms.stocktake_page.plan'), color: 'warning' },
    in_progress: { label: t('wms.stocktake_page.in_progress'), color: 'default' },
    completed: { label: t('wms.stocktake_page.status_completed'), color: 'success' },
  };
  const discrepancyTypeConfig: Record<
    string,
    { label: string; color: 'default' | 'success' | 'error' }
  > = {
    over: { label: t('wms.stocktake_page.text_fc2783'), color: 'success' },
    under: { label: t('wms.stocktake_page.text_ee0513'), color: 'error' },
    none: { label: t('wms.stocktake_page.difference'), color: 'default' },
  };

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [selectedStockTake, setSelectedStockTake] = useState<StockTake | null>(null);
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([]);
  const [countValues, setCountValues] = useState<Record<string, number>>({});

  // Form states
  const [newStockTake, setNewStockTake] = useState<CreateStockTakeRequest>({
    stock_take_number: '',
    warehouse_id: '',
    remarks: '',
  });

  const warehousesQuery = useQuery({
    queryKey: ['wms-warehouses'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const warehouses = warehousesQuery.data || [];

  useEffect(() => {
    if (warehousesQuery.isError && warehousesQuery.error) {
      apiLogger.error(t('wms.stocktake_page.list'), warehousesQuery.error);
    }
  }, [warehousesQuery.isError, warehousesQuery.error]);

  const stockTakesQuery = useQuery({
    queryKey: ['wms-stock-takes', searchTerm, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await wmsApi.stockTakes.list(params);
      if (response.success && response.data) {
        return { stockTakes: response.data.items || [], total: response.data.total || 0 };
      }
      return { stockTakes: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const stockTakes = stockTakesQuery.data?.stockTakes || [];
  const total = stockTakesQuery.data?.total || 0;
  const loading = stockTakesQuery.isLoading;

  useEffect(() => {
    if (stockTakesQuery.isError && stockTakesQuery.error) {
      apiLogger.error(t('wms.stocktake_page.fail'), stockTakesQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.fail_1'),
        message: t('wms.stocktake_page.stocktake'),
      });
    }
  }, [stockTakesQuery.isError, stockTakesQuery.error, addNotification]);

  const createStockTakeMutation = useMutation({
    mutationFn: (data: CreateStockTakeRequest) => wmsApi.stockTakes.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.create'),
        message: t('wms.stocktake_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-stock-takes'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.create_2'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.create_3'),
        message: t('wms.stocktake_page.create_4'),
      });
    },
  });

  const deleteStockTakeMutation = useMutation({
    mutationFn: (id: string) => wmsApi.stockTakes.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.delete_success'),
        message: t('wms.stocktake_page.delete_success_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-stock-takes'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.delete'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.delete_1'),
        message: t('wms.stocktake_page.delete_2'),
      });
    },
  });

  const startStockTakeMutation = useMutation({
    mutationFn: (id: string) => wmsApi.stockTakes.start(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.operation_success'),
        message: t('wms.stocktake_page.stocktake_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-stock-takes'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.fail_2'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.operation_failed'),
        message: t('wms.stocktake_page.fail_3'),
      });
    },
  });

  const completeStockTakeMutation = useMutation({
    mutationFn: (id: string) => wmsApi.stockTakes.complete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.operation_success'),
        message: t('wms.stocktake_page.completed'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-stock-takes'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.fail_4'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.operation_failed'),
        message: t('wms.stocktake_page.fail_5'),
      });
    },
  });

  const adjustStockTakeMutation = useMutation({
    mutationFn: (id: string) => wmsApi.stockTakes.adjust(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.operation_success'),
        message: t('wms.stocktake_page.text_cd78ac'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-stock-takes'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.fail_6'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.operation_failed'),
        message: t('wms.stocktake_page.fail_7'),
      });
    },
  });

  const countItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: CountItemRequest[] }) =>
      wmsApi.stockTakes.count(id, items),
    onSuccess: async (_, { id }) => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.operation_success'),
        message: t('wms.stocktake_page.update'),
      });
      const detailResponse = await wmsApi.stockTakes.listItems(id);
      if (detailResponse.success && detailResponse.data) {
        setStockTakeItems(detailResponse.data.items || []);
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.stocktake_page.update_1'), error);
      addNotification({
        type: 'error',
        title: t('wms.stocktake_page.operation_failed'),
        message: t('wms.stocktake_page.update_2'),
      });
    },
  });

  const handleCreateStockTake = async () => {
    if (!newStockTake.stock_take_number || !newStockTake.warehouse_id) {
      addNotification({
        type: 'warning',
        title: t('wms.stocktake_page.error'),
        message: t('wms.stocktake_page.please_fill'),
      });
      return;
    }

    await createStockTakeMutation.mutateAsync(newStockTake);
    setShowCreateDialog(false);
    setNewStockTake({ stock_take_number: '', warehouse_id: '', remarks: '' });
  };

  const handleDeleteStockTake = useCallback(
    async (id: string) => {
      if (!window.confirm(t('wms.stocktake_page.confirm'))) {
        return;
      }
      await deleteStockTakeMutation.mutateAsync(id);
    },
    [deleteStockTakeMutation]
  );

  const handleStartStockTake = useCallback(
    async (id: string) => {
      await startStockTakeMutation.mutateAsync(id);
    },
    [startStockTakeMutation]
  );

  const handleViewDetail = useCallback(
    async (stockTake: StockTake) => {
      setSelectedStockTake(stockTake);
      try {
        const response = await wmsApi.stockTakes.listItems(stockTake.id);
        if (response.success && response.data) {
          setStockTakeItems(response.data.items || []);
        }
      } catch (error: unknown) {
        apiLogger.error(t('wms.stocktake_page.fail_8'), error);
        addNotification({
          type: 'error',
          title: t('wms.stocktake_page.fail_1'),
          message: t('wms.stocktake_page.fail_9'),
        });
      }
      setShowDetailDialog(true);
    },
    [addNotification]
  );

  const handleCompleteStockTake = async () => {
    if (!selectedStockTake) return;
    await completeStockTakeMutation.mutateAsync(selectedStockTake.id);
    setShowDetailDialog(false);
  };

  const handleAdjustStockTake = async () => {
    if (!selectedStockTake) return;
    await adjustStockTakeMutation.mutateAsync(selectedStockTake.id);
    setShowDetailDialog(false);
  };

  const handleCountItems = async () => {
    if (!selectedStockTake) return;

    const items: CountItemRequest[] = stockTakeItems.map((item) => ({
      item_id: item.id,
      counted_quantity: countValues[item.id] || item.counted_quantity || 0,
      discrepancy_reason: item.discrepancy_reason || '',
    }));

    await countItemsMutation.mutateAsync({ id: selectedStockTake.id, items });
    setShowCountDialog(false);
  };

  const handleOpenCountDialog = () => {
    const initialValues: Record<string, number> = {};
    stockTakeItems.forEach((item) => {
      initialValues[item.id] = item.counted_quantity || 0;
    });
    setCountValues(initialValues);
    setShowCountDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        size='sm'
        variant='outlined'
      />
    );
  };

  const getDiscrepancyTypeBadge = (type: string) => {
    const config = discrepancyTypeConfig[type] || { label: type, color: 'default' as const };
    return (
      <StatusBadge
        status={type}
        label={config.label}
        color={config.color}
        size='sm'
        variant='outlined'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const columns: ColumnDef<StockTake>[] = useMemo(
    () => [
      { id: 'stock_take_number', label: t('wms.stocktake_page.column_stocktake_number'), sortable: true },
      {
        id: 'warehouse_id',
        label: t('wms.stocktake_page.filter_warehouse'),
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      {
        id: 'status',
        label: t('wms.stocktake_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'accuracy_rate',
        label: t('wms.stocktake_page.text_3c7d9e'),
        render: (row) => (row.accuracy_rate ? `${row.accuracy_rate.toFixed(1)}%` : '-'),
      },
      { id: 'created_at', label: t('wms.stocktake_page.created_at') },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.stocktake_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.stocktake_page.filter_option_all_status'), value: '' },
          { label: t('wms.stocktake_page.plan'), value: 'planned' },
          { label: t('wms.stocktake_page.in_progress'), value: 'in_progress' },
          { label: t('wms.stocktake_page.status_completed'), value: 'completed' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<StockTake>[] = useMemo(
    () => [
      {
        label: t('wms.stocktake_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('wms.stocktake_page.text_a3e3b8'),
        icon: <Play size={16} />,
        onClick: (row) => handleStartStockTake(row.id),
        visible: (row: StockTake) => row.status === 'planned',
      },
      {
        label: t('wms.stocktake_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteStockTake(row.id),
        confirm: true,
        confirmMessage: t('wms.stocktake_page.confirm'),
        visible: (row: StockTake) => row.status === 'planned',
      },
    ],
    [handleViewDetail, handleStartStockTake, handleDeleteStockTake]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setNewStockTake({ stock_take_number: '', warehouse_id: '', remarks: '' });
    setShowCreateDialog(true);
  };

  return (
    <PageContainer
      title={t('wms.stocktake_page.breadcrumb_current')}
      subtitle={t('wms.stocktake_page.stocktake_2')}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.stocktake_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.stocktake_page.breadcrumb_module'), href: WMS_PATHS.root },
          { label: t('wms.stocktake_page.breadcrumb_current') },
        ]}
        columns={columns}
        data={stockTakes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.stocktake_page.search_placeholder')}
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: t('wms.stocktake_page.create_5'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('wms.stocktake_page.no_data')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建盘点单</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr' },
              gap: 2,
              py: 2,
            }}
          >
            <TextField
              label={t('wms.stocktake_page.field_stocktake_number_required')}
              value={newStockTake.stock_take_number}
              onChange={(e) =>
                setNewStockTake({ ...newStockTake, stock_take_number: e.target.value })
              }
              fullWidth
              size='small'
              placeholder={t('wms.stocktake_page.stocktake_3')}
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>仓库 *</InputLabel>
              <Select
                value={newStockTake.warehouse_id}
                label={t('wms.stocktake_page.warehouse')}
                onChange={(e) => setNewStockTake({ ...newStockTake, warehouse_id: e.target.value })}
              >
                {warehouses.map((w) => (
                  <MenuItem
                    key={w.id}
                    value={w.id}
                  >
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('wms.stocktake_page.field_remark')}
              multiline
              rows={3}
              value={newStockTake.remarks || ''}
              onChange={(e) => setNewStockTake({ ...newStockTake, remarks: e.target.value })}
              fullWidth
              size='small'
              placeholder={t('wms.stocktake_page.remark')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateStockTake}
            disabled={createStockTakeMutation.isPending}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={20} />
          {selectedStockTake?.stock_take_number}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          {selectedStockTake && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {getWarehouseName(selectedStockTake.warehouse_id)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedStockTake.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    准确率
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedStockTake.accuracy_rate
                      ? `${selectedStockTake.accuracy_rate.toFixed(1)}%`
                      : '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    差异数量
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                    color={
                      selectedStockTake.discrepancy_quantity !== undefined &&
                      selectedStockTake.discrepancy_quantity !== 0
                        ? selectedStockTake.discrepancy_quantity > 0
                          ? 'success.main'
                          : 'error.main'
                        : 'text.primary'
                    }
                  >
                    {selectedStockTake.discrepancy_quantity || 0}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>盘点明细</Typography>
                  {selectedStockTake.status === 'in_progress' && (
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Edit size={16} />}
                      onClick={handleOpenCountDialog}
                    >
                      录入盘点数量
                    </Button>
                  )}
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 800 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: 1,
                        p: 1,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        序号
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        物料编码
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        物料名称
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        规格
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        批次
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        系统数量
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        盘点数量
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异类型
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异原因
                      </Typography>
                    </Box>
                    {stockTakeItems.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          暂无盘点明细
                        </Typography>
                      </Box>
                    ) : (
                      stockTakeItems.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(10, 1fr)',
                            gap: 1,
                            p: 1,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant='body2'>{item.line_number}</Typography>
                          <Typography variant='body2'>{item.material_code}</Typography>
                          <Typography variant='body2'>{item.material_name}</Typography>
                          <Typography variant='body2'>{item.specification || '-'}</Typography>
                          <Typography variant='body2'>{item.batch_number || '-'}</Typography>
                          <Typography variant='body2'>{item.system_quantity}</Typography>
                          <Typography variant='body2'>{item.counted_quantity ?? '-'}</Typography>
                          <Typography
                            variant='body2'
                            sx={{
                              color:
                                item.discrepancy_quantity !== undefined
                                  ? item.discrepancy_quantity > 0
                                    ? 'success.main'
                                    : item.discrepancy_quantity < 0
                                      ? 'error.main'
                                      : 'text.primary'
                                  : 'text.primary',
                            }}
                          >
                            {item.discrepancy_quantity !== undefined
                              ? item.discrepancy_quantity
                              : '-'}
                          </Typography>
                          <Box>
                            {item.discrepancy_type
                              ? getDiscrepancyTypeBadge(item.discrepancy_type)
                              : '-'}
                          </Box>
                          <Typography variant='body2'>{item.discrepancy_reason || '-'}</Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {selectedStockTake.status === 'in_progress' && (
                  <Button
                    variant='contained'
                    color='success'
                    startIcon={<CheckCircle2 size={16} />}
                    onClick={handleCompleteStockTake}
                    disabled={completeStockTakeMutation.isPending}
                  >
                    完成盘点
                  </Button>
                )}
                {selectedStockTake.status === 'completed' && !selectedStockTake.stock_adjusted && (
                  <Button
                    variant='contained'
                    color='warning'
                    startIcon={<Edit size={16} />}
                    onClick={handleAdjustStockTake}
                    disabled={adjustStockTakeMutation.isPending}
                  >
                    调整库存
                  </Button>
                )}
                {selectedStockTake.status === 'completed' && selectedStockTake.stock_adjusted && (
                  <Chip
                    label={t('wms.stocktake_page.text_cd78ac')}
                    color='success'
                  />
                )}
                <Button
                  variant='outlined'
                  onClick={() => setShowDetailDialog(false)}
                >
                  关闭
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCountDialog}
        onClose={() => setShowCountDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>录入盘点数量</DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          <Box sx={{ minWidth: 600 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 1,
                p: 1,
                bgcolor: 'grey.200',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                物料编码
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                物料名称
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                规格
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                系统数量
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                盘点数量
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                差异原因
              </Typography>
            </Box>
            {stockTakeItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 1,
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body2'>{item.material_code}</Typography>
                <Typography variant='body2'>{item.material_name}</Typography>
                <Typography variant='body2'>{item.specification || '-'}</Typography>
                <Typography variant='body2'>{item.system_quantity}</Typography>
                <TextField
                  type='number'
                  size='small'
                  defaultValue={item.counted_quantity || ''}
                  onChange={(e) =>
                    setCountValues({
                      ...countValues,
                      [item.id]: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={t('wms.stocktake_page.quantity')}
                />
                <FormControl size='small'>
                  <Select
                    value={item.discrepancy_reason || ''}
                    onChange={(e) => {
                      const newItems = stockTakeItems.map((i) =>
                        i.id === item.id ? { ...i, discrepancy_reason: e.target.value } : i
                      );
                      setStockTakeItems(newItems);
                    }}
                    displayEmpty
                  >
                    <MenuItem value=''>无</MenuItem>
                    <MenuItem value='damaged'>损坏</MenuItem>
                    <MenuItem value='lost'>丢失</MenuItem>
                    <MenuItem value='miscount'>计数错误</MenuItem>
                    <MenuItem value='other'>其他</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCountDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCountItems}
            disabled={countItemsMutation.isPending}
          >
            确认盘点
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default StockTakePage;