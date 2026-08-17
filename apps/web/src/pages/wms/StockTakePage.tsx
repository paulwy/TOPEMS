import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Button,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { Play, CheckCircle2, Eye, Trash2, Package, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter, type CrudTab } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer, StatusBadge } from '@/components/common';
import { useNotificationStore } from '@/store';
import { stockTakeSchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import type { StockTake, StockTakeItem, CountItemRequest, CreateStockTakeRequest } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

const ct = designTokens.colors;

const StockTakePage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [selectedStockTake, setSelectedStockTake] = useState<StockTake | null>(null);
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([]);
  const [countValues, setCountValues] = useState<Record<string, number>>({});

  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_WAREHOUSES_BASE,
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

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const statusConfig: Record<string, { label: string; color: 'default' | 'success' | 'warning' }> =
    {
      planned: { label: t('wms.stocktake_page.plan'), color: 'warning' },
      in_progress: { label: t('wms.stocktake_page.in_progress'), color: 'default' },
      completed: { label: t('wms.stocktake_page.status_completed'), color: 'success' },
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

  const createStockTakeMutation = useMutation({
    mutationFn: (data: CreateStockTakeRequest) => wmsApi.stockTakes.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.create'),
        message: t('wms.stocktake_page.create_1'),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_STOCK_TAKES_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_STOCK_TAKES_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_STOCK_TAKES_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_STOCK_TAKES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setShowDetailDialog(false);
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_STOCK_TAKES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setShowDetailDialog(false);
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WMS_WAREHOUSES_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: t('wms.stocktake_page.operation_success'),
        message: t('wms.stocktake_page.update'),
      });
      const detailResponse = await wmsApi.stockTakes.listItems(id);
      if (detailResponse.success && detailResponse.data) {
        setStockTakeItems(detailResponse.data.items || []);
      }
      setShowCountDialog(false);
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

  const handleViewDetail = useCallback(
    async (row: Record<string, unknown>) => {
      const stockTake = row as unknown as StockTake;
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
    [addNotification, t]
  );

  const handleStartStockTake = useCallback(
    async (row: Record<string, unknown>) => {
      await startStockTakeMutation.mutateAsync(row.id as string);
    },
    [startStockTakeMutation]
  );

  const handleDeleteStockTake = useCallback(
    async (row: Record<string, unknown>) => {
      await deleteStockTakeMutation.mutateAsync(row.id as string);
    },
    [deleteStockTakeMutation]
  );

  const handleCompleteStockTake = useCallback(async () => {
    if (!selectedStockTake) return;
    await completeStockTakeMutation.mutateAsync(selectedStockTake.id);
  }, [selectedStockTake, completeStockTakeMutation]);

  const handleAdjustStockTake = useCallback(async () => {
    if (!selectedStockTake) return;
    await adjustStockTakeMutation.mutateAsync(selectedStockTake.id);
  }, [selectedStockTake, adjustStockTakeMutation]);

  const handleOpenCountDialog = useCallback(() => {
    if (!selectedStockTake) return;
    const initialValues: Record<string, number> = {};
    stockTakeItems.forEach((item) => {
      initialValues[item.id] = item.counted_quantity || 0;
    });
    setCountValues(initialValues);
    setShowCountDialog(true);
  }, [selectedStockTake, stockTakeItems]);

  const handleCountItems = useCallback(async () => {
    if (!selectedStockTake) return;
    const items: CountItemRequest[] = stockTakeItems.map((item) => ({
      item_id: item.id,
      counted_quantity: countValues[item.id] || item.counted_quantity || 0,
      discrepancy_reason: item.discrepancy_reason || '',
    }));
    await countItemsMutation.mutateAsync({ id: selectedStockTake.id, items });
  }, [selectedStockTake, stockTakeItems, countValues, countItemsMutation]);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const search = params?.search as string | undefined;
        const statusFilter = params?.status as string | undefined;
        const page = params?.page ?? 1;
        const pageSize = params?.pageSize ?? 10;

        const wmsParams: Record<string, unknown> = {
          page,
          pagesize: pageSize,
        };
        if (search) wmsParams.search = search;
        if (statusFilter && statusFilter !== 'all') wmsParams.status = statusFilter;

        const response = await wmsApi.stockTakes.list(wmsParams);
        if (response.success && response.data) {
          let items = response.data.items || [];
          items = items.map((item) => ({
            ...item,
            warehouse_name: getWarehouseName(item.warehouse_id),
          }));
          return {
            data: items as unknown as Record<string, unknown>[],
            total: response.data.total || 0,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await wmsApi.stockTakes.create(data as unknown as CreateStockTakeRequest);
        if (res.success && res.data) {
          return {
            ...res.data,
            warehouse_name: getWarehouseName(res.data.warehouse_id),
          } as unknown as Record<string, unknown>;
        }
        throw new Error(res.message || i18n.t('pages.stock_take_page.k0'));
      },
      update: async (id, data) => {
        const response = await wmsApi.stockTakes.update(
          id,
          data as unknown as Parameters<typeof wmsApi.stockTakes.update>[1]
        );
        if (!response.success) throw new Error(i18n.t('pages.stock_take_page.k1'));
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        await wmsApi.stockTakes.delete(id);
      },
    }),
    [getWarehouseName]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: t('wms.stocktake_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        key: 'start',
        label: t('wms.stocktake_page.text_a3e3b8'),
        icon: <Play size={16} />,
        onClick: handleStartStockTake,
        visible: (row: Record<string, unknown>) =>
          (row as unknown as StockTake).status === 'planned',
      },
      {
        key: 'delete',
        label: t('wms.stocktake_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: handleDeleteStockTake,
        confirm: true,
        confirmMessage: t('wms.stocktake_page.confirm'),
        visible: (row: Record<string, unknown>) =>
          (row as unknown as StockTake).status === 'planned',
      },
    ],
    [handleViewDetail, handleStartStockTake, handleDeleteStockTake, t]
  );

  const renderDetailDialog = () => {
    if (!selectedStockTake) return null;

    return (
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={20} />
          {selectedStockTake.stock_take_number}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.stock_take_page.k0')}
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
                  {i18n.t('pages.stock_take_page.k1')}
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedStockTake.status)}</Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.stock_take_page.k2')}
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
                  {i18n.t('pages.stock_take_page.k3')}
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
                <Typography variant='h6'>{i18n.t('pages.stock_take_page.k2')}</Typography>
                {selectedStockTake.status === 'in_progress' && (
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<Edit size={16} />}
                    onClick={handleOpenCountDialog}
                  >
                    {i18n.t('pages.stock_take_page.k4')}
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
                      {i18n.t('pages.stock_take_page.k5')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k6')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k7')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k8')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k9')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k10')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k11')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k12')}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.stock_take_page.k13')}
                    </Typography>
                  </Box>
                  {stockTakeItems.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.stock_take_page.k14')}
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
                        <Typography variant='body2'>{item.discrepancy_type || '-'}</Typography>
                        <Typography variant='body2'>{item.discrepancy_reason || '-'}</Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {selectedStockTake.status === 'in_progress' && (
            <Button
              variant='contained'
              color='success'
              startIcon={<CheckCircle2 size={16} />}
              onClick={handleCompleteStockTake}
              disabled={completeStockTakeMutation.isPending}
            >
              {i18n.t('pages.stock_take_page.k15')}
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
              {i18n.t('pages.stock_take_page.k16')}
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
            {i18n.t('pages.stock_take_page.k17')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderCountDialog = () => {
    if (!selectedStockTake) return null;

    return (
      <Dialog
        open={showCountDialog}
        onClose={() => setShowCountDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.stock_take_page.k3')}</DialogTitle>
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
                {i18n.t('pages.stock_take_page.k18')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.stock_take_page.k19')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.stock_take_page.k20')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.stock_take_page.k21')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.stock_take_page.k22')}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.stock_take_page.k23')}
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
                    <MenuItem value=''>{i18n.t('pages.stock_take_page.k24')}</MenuItem>
                    <MenuItem value='damaged'>{i18n.t('pages.stock_take_page.k4')}</MenuItem>
                    <MenuItem value='lost'>{i18n.t('pages.stock_take_page.k5')}</MenuItem>
                    <MenuItem value='miscount'>{i18n.t('pages.stock_take_page.k6')}</MenuItem>
                    <MenuItem value='other'>{i18n.t('pages.stock_take_page.k7')}</MenuItem>
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
            {i18n.t('pages.stock_take_page.k25')}
          </Button>
          <Button
            variant='contained'
            onClick={handleCountItems}
            disabled={countItemsMutation.isPending}
          >
            {i18n.t('pages.stock_take_page.k26')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <PageContainer
      title={t('wms.stocktake_page.breadcrumb_current')}
      subtitle={t('wms.stocktake_page.stocktake_2')}
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={stockTakeSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[
          { label: t('wms.stocktake_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.stocktake_page.breadcrumb_module'), href: WMS_PATHS.root },
          { label: t('wms.stocktake_page.breadcrumb_current') },
        ]}
      />

      {renderDetailDialog()}
      {renderCountDialog()}
    </PageContainer>
  );
};

export default StockTakePage;
