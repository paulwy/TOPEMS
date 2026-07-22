import React, { useState, useMemo, useCallback } from 'react';
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
  Stack,
  Button,
} from '@mui/material';
import { ConfirmDialog } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  Warehouse,
  InventoryAlertStatistics,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Eye, Package, AlertTriangle } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUrlListState } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;


const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
  > = {
    qualified: { label: t('wms.inventory_page.status_qualified'), color: 'success' },
    unqualified: { label: t('wms.inventory_page.status_unqualified'), color: 'error' },
    pending: { label: t('wms.inventory_page.status_pending'), color: 'warning' },
  };

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters: urlFilters,
    setFilter,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useUrlListState<{ status: string; warehouse_id: string }>({
    defaultPageSize: 10,
    defaultFilters: { status: '', warehouse_id: '' },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const searchTerm = searchQuery;
  const statusFilter = urlFilters.status;
  const warehouseFilter = urlFilters.warehouse_id;
  const [showLowStockDialog, setShowLowStockDialog] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Form states
  const [newItem, setNewItem] = useState<CreateInventoryItemRequest>({
    warehouse_id: '',
    location_id: '00000000-0000-0000-0000-000000000001',
    sku: '',
    name: '',
    specification: '',
    quantity: 0,
    unit: '',
    min_quantity: 0,
    max_quantity: 0,
  });

  const [editItem, setEditItem] = useState<UpdateInventoryItemRequest>({});

  // React Query - 库存列表
  const inventoryQuery = useQuery({
    queryKey: ['wms-inventory', currentPage, pageSize, debouncedSearch, statusFilter, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      return wmsApi.inventory.list(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const inventory =
    inventoryQuery.data?.success && inventoryQuery.data.data
      ? inventoryQuery.data.data.items || []
      : [];
  const total =
    inventoryQuery.data?.success && inventoryQuery.data.data
      ? inventoryQuery.data.data.total || 0
      : 0;
  const loading = inventoryQuery.isLoading;

  // React Query - 仓库列表
  const warehousesQuery = useQuery({
    queryKey: ['wms-warehouses'],
    queryFn: () => wmsApi.warehouses.list({ page: 1, pagesize: 100 }),
    staleTime: 10 * 60 * 1000,
  });

  const warehouses =
    warehousesQuery.data?.success && warehousesQuery.data.data
      ? warehousesQuery.data.data.items || []
      : [];

  // React Query - 库存预警统计
  const alertStatsQuery = useQuery({
    queryKey: ['wms-alert-stats', warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      return wmsApi.inventoryAlerts.getStatistics(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const alertStats =
    alertStatsQuery.data?.success && alertStatsQuery.data.data ? alertStatsQuery.data.data : null;

  // React Query - 低库存列表
  const lowStockQuery = useQuery({
    queryKey: ['wms-low-stock'],
    queryFn: () => wmsApi.inventory.listLowStock(),
    staleTime: 5 * 60 * 1000,
  });

  const lowStockItems =
    lowStockQuery.data?.success && lowStockQuery.data.data
      ? lowStockQuery.data.data.items || []
      : [];

  // React Query - Mutations
  const createMutation = useMutation({
    mutationFn: (item: CreateInventoryItemRequest) => wmsApi.inventory.create(item),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.inventory_page.create'),
        message: t('wms.inventory_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.inventory_page.create_2'),
        message: t('wms.inventory_page.create_3'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, item }: { id: string; item: UpdateInventoryItemRequest }) =>
      wmsApi.inventory.update(id, item),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.inventory_page.update'),
        message: t('wms.inventory_page.update_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.inventory_page.update_2'),
        message: t('wms.inventory_page.update_3'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wmsApi.inventory.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.inventory_page.delete_success'),
        message: t('wms.inventory_page.deleted'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.inventory_page.delete'),
        message: t('wms.inventory_page.delete_1'),
      });
    },
  });

  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);
  const [confirmBatchDeleteOpen, setConfirmBatchDeleteOpen] = useState(false);

  const handleBatchDelete = useCallback((items: InventoryItem[]) => {
    const ids = items.map((i) => i.id);
    setBatchDeleteIds(ids);
    setConfirmBatchDeleteOpen(true);
  }, []);

  const handleBatchDeleteConfirm = useCallback(async () => {
    try {
      for (const id of batchDeleteIds) {
        await deleteMutation.mutateAsync(id);
      }
      addNotification({
        type: 'success',
        title: t('wms.inventory_page.batch_delete'),
        message: `成功删除 ${batchDeleteIds.length} 条库存记录`,
      });
      setConfirmBatchDeleteOpen(false);
      setBatchDeleteIds([]);
    } catch {
      addNotification({
        type: 'error',
        title: t('wms.inventory_page.batch_delete_1'),
        message: t('wms.inventory_page.delete_3'),
      });
    }
  }, [batchDeleteIds, deleteMutation]);

  const handleCreate = async () => {
    if (!newItem.sku || !newItem.name || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: t('wms.inventory_page.error'),
        message: t('wms.inventory_page.material_code'),
      });
      return;
    }

    try {
      await createMutation.mutateAsync(newItem);
      setShowCreateDialog(false);
      resetNewItem();
    } catch (error: unknown) {
      apiLogger.error(t('wms.inventory_page.create_4'), error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      await updateMutation.mutateAsync({ id: selectedItem.id, item: editItem });
      setShowEditDialog(false);
    } catch (error: unknown) {
      apiLogger.error(t('wms.inventory_page.update_4'), error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteItemId) return;

    try {
      await deleteMutation.mutateAsync(deleteItemId);
    } catch (error: unknown) {
      apiLogger.error(t('wms.inventory_page.delete_4'), error);
    }
  }, [deleteMutation, deleteItemId]);

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditItem({
      sku: item.sku,
      name: item.name,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      min_quantity: item.min_quantity,
      max_quantity: item.max_quantity,
      status: item.status,
    });
    setShowEditDialog(true);
  };

  const handleViewDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      warehouse_id: '',
      location_id: '00000000-0000-0000-0000-000000000001',
      sku: '',
      name: '',
      specification: '',
      quantity: 0,
      unit: '',
      min_quantity: 0,
      max_quantity: 0,
    });
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='outlined'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      { id: 'sku', label: t('wms.inventory_page.detail_sku'), sortable: true },
      { id: 'name', label: t('wms.inventory_page.detail_name'), sortable: true },
      { id: 'specification', label: t('wms.inventory_page.detail_specification') },
      { id: 'unit', label: t('wms.inventory_page.detail_unit') },
      { id: 'quantity', label: t('wms.inventory_page.detail_quantity'), sortable: true },
      { id: 'available_quantity', label: t('wms.inventory_page.detail_available_quantity') },
      {
        id: 'warehouse_id',
        label: t('wms.inventory_page.detail_warehouse'),
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      {
        id: 'status',
        label: t('wms.inventory_page.detail_status'),
        render: (row) => getStatusBadge(row.status),
      },
      { id: 'batch_number', label: t('wms.inventory_page.column_batch') },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.inventory_page.detail_status'),
        type: 'select',
        options: [
          { label: t('wms.inventory_page.filter_option_all_status'), value: '' },
          { label: t('wms.inventory_page.status_qualified'), value: 'qualified' },
          { label: t('wms.inventory_page.status_unqualified'), value: 'unqualified' },
          { label: t('wms.inventory_page.status_pending'), value: 'pending' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setFilter('status', value as string);
        },
      },
      {
        id: 'warehouse_id',
        label: t('wms.inventory_page.detail_warehouse'),
        type: 'select',
        options: [
          { label: t('wms.inventory_page.filter_option_all_warehouse'), value: '' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
        value: warehouseFilter,
        onChange: (value) => {
          setFilter('warehouse_id', value as string);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses, setFilter]
  );

  const rowActions: RowAction<InventoryItem>[] = useMemo(
    () => [
      {
        label: t('wms.inventory_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('wms.inventory_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('wms.inventory_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    []
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleOpenCreate = () => {
    resetNewItem();
    setShowCreateDialog(true);
  };

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          库存总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {total}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 2,
          bgcolor: 'warning.light',
          borderRadius: 3,
          cursor: 'pointer',
          '&:hover': { opacity: 0.9 },
        }}
        onClick={() => {
          lowStockQuery.refetch();
          setShowLowStockDialog(true);
        }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center', mb: 0.5 }}
        >
          <AlertTriangle
            size={16}
            color='warning.700'
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            低库存预警
          </Typography>
        </Stack>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {alertStats?.low_stock_count || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.error[50], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待处理预警
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.main' }}
        >
          {alertStats?.pending_alerts || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          预警总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.dark' }}
        >
          {alertStats?.total_alerts || 0}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('wms.inventory_page.breadcrumb_current')}
      subtitle={t('wms.inventory_page.subtitle')}
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.info.main}, ${ct.info.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.inventory_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.inventory_page.breadcrumb_module'), href: WMS_PATHS.root },
          { label: t('wms.inventory_page.breadcrumb_current') },
        ]}
        columns={columns}
        data={inventory}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.inventory_page.search_placeholder')}
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
            label: t('wms.inventory_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('wms.inventory_page.empty_message')}
        getRowId={(row) => row.id}
        mobileCardTitleKey='name'
        mobileCardSubtitleKey='sku'
        mobileCardDisplayFields={[
          'specification',
          'quantity',
          'available_quantity',
          'warehouse_name',
        ]}
        mobileCardFieldLabels={{
          specification: t('wms.inventory_page.detail_specification'),
          quantity: t('wms.inventory_page.detail_quantity'),
          available_quantity: t('wms.inventory_page.detail_available_quantity'),
          warehouse_name: t('wms.inventory_page.detail_warehouse'),
        }}
        exportable
        exportFileName={t('wms.inventory_page.export_filename')}
        persistFilters
        persistSearch
        emptyActionButton={{
          label: t('wms.inventory_page.dialog_create_title'),
          icon: <Plus size={16} />,
          onClick: handleOpenCreate,
        }}
        batchActions={[
          {
            label: t('wms.inventory_page.button_batch_delete'),
            icon: <Trash2 size={16} />,
            onClick: handleBatchDelete,
          },
        ]}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增库存</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
              py: 2,
            }}
          >
            <TextField
              label={t('wms.inventory_page.field_sku_required')}
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label={t('wms.inventory_page.field_name_required')}
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label={t('wms.inventory_page.detail_specification')}
              value={newItem.specification}
              onChange={(e) => setNewItem({ ...newItem, specification: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.inventory_page.field_unit_required')}
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label={t('wms.inventory_page.field_quantity_required')}
              type='number'
              value={newItem.quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              required
              size='small'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>仓库 *</InputLabel>
              <Select
                value={newItem.warehouse_id}
                label={t('wms.inventory_page.field_warehouse_required')}
                onChange={(e) => setNewItem({ ...newItem, warehouse_id: e.target.value })}
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
              label={t('wms.inventory_page.detail_min_quantity')}
              type='number'
              value={newItem.min_quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, min_quantity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.inventory_page.detail_max_quantity')}
              type='number'
              value={newItem.max_quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, max_quantity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
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
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑库存</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label={t('wms.inventory_page.detail_sku')}
                value={editItem.sku || ''}
                onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.inventory_page.detail_name')}
                value={editItem.name || ''}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.inventory_page.detail_specification')}
                value={editItem.specification || ''}
                onChange={(e) => setEditItem({ ...editItem, specification: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.inventory_page.detail_unit')}
                value={editItem.unit || ''}
                onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.inventory_page.detail_quantity')}
                type='number'
                value={editItem.quantity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, quantity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>状态</InputLabel>
                <Select
                  value={editItem.status || ''}
                  label={t('wms.inventory_page.detail_status')}
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                >
                  <MenuItem value='qualified'>合格</MenuItem>
                  <MenuItem value='unqualified'>不合格</MenuItem>
                  <MenuItem value='pending'>待检验</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('wms.inventory_page.detail_min_quantity')}
                type='number'
                value={editItem.min_quantity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, min_quantity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.inventory_page.detail_max_quantity')}
                type='number'
                value={editItem.max_quantity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, max_quantity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>库存详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    物料编码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedItem.sku}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    物料名称
                  </Typography>
                  <Typography variant='body1'>{selectedItem.name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    规格
                  </Typography>
                  <Typography variant='body1'>{selectedItem.specification || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    单位
                  </Typography>
                  <Typography variant='body1'>{selectedItem.unit || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    数量
                  </Typography>
                  <Typography variant='body1'>{selectedItem.quantity}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    可用数量
                  </Typography>
                  <Typography variant='body1'>{selectedItem.available_quantity}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedItem.warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    批次号
                  </Typography>
                  <Typography variant='body1'>{selectedItem.batch_number || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    有效期
                  </Typography>
                  <Typography variant='body1'>
                    {selectedItem.expiry_date
                      ? new Date(selectedItem.expiry_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    最低库存
                  </Typography>
                  <Typography variant='body1'>{selectedItem.min_quantity || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    最高库存
                  </Typography>
                  <Typography variant='body1'>{selectedItem.max_quantity || '-'}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('wms.inventory_page.dialog_delete_title')}
        message={t('wms.inventory_page.dialog_delete_message')}
        danger
      />

      {/* 低库存预警对话框 */}
      <Dialog
        open={showLowStockDialog}
        onClose={() => setShowLowStockDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <AlertTriangle
              size={20}
              color='warning.700'
            />
            低库存预警列表
          </Stack>
        </DialogTitle>
        <DialogContent>
          {lowStockItems.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>暂无低库存物品</Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              {lowStockItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    bgcolor: 'warning.lighter',
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {item.sku}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'error.main', fontWeight: 600 }}
                    >
                      当前库存: {item.quantity} {item.unit}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      最低库存: {item.min_quantity || 0} {item.unit}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowLowStockDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmBatchDeleteOpen}
        onClose={() => setConfirmBatchDeleteOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title={t('wms.inventory_page.dialog_batch_delete_title')}
        message={`确定要删除选中的 ${batchDeleteIds.length} 条库存记录吗？`}
        danger
      />
    </PageContainer>
  );
};

export default InventoryPage;

// Phase 7-2: React Query migration tagged
