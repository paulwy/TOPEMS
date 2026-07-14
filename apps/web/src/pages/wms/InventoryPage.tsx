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

const ct = designTokens.colors;


const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  qualified: { label: '合格', color: 'success' },
  unqualified: { label: '不合格', color: 'error' },
  pending: { label: '待检验', color: 'warning' },
};

const InventoryPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
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
    queryKey: ['wms-inventory', currentPage, pageSize, searchTerm, statusFilter, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
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
        title: '创建成功',
        message: '库存记录已创建',
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '创建库存记录失败',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, item }: { id: string; item: UpdateInventoryItemRequest }) =>
      wmsApi.inventory.update(id, item),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '库存记录已更新',
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '更新库存记录失败',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wmsApi.inventory.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '库存记录已删除',
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['wms-alert-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wms-low-stock'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除库存记录失败',
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
        title: '批量删除成功',
        message: `成功删除 ${batchDeleteIds.length} 条库存记录`,
      });
      setConfirmBatchDeleteOpen(false);
      setBatchDeleteIds([]);
    } catch {
      addNotification({
        type: 'error',
        title: '批量删除失败',
        message: '删除部分库存记录失败',
      });
    }
  }, [batchDeleteIds, deleteMutation]);

  const handleCreate = async () => {
    if (!newItem.sku || !newItem.name || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写必要信息（物料编码、名称、仓库）',
      });
      return;
    }

    try {
      await createMutation.mutateAsync(newItem);
      setShowCreateDialog(false);
      resetNewItem();
    } catch (error: unknown) {
      apiLogger.error('创建库存失败:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      await updateMutation.mutateAsync({ id: selectedItem.id, item: editItem });
      setShowEditDialog(false);
    } catch (error: unknown) {
      apiLogger.error('更新库存失败:', error);
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
      apiLogger.error('删除库存失败:', error);
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
      { id: 'sku', label: '物料编码', sortable: true },
      { id: 'name', label: '物料名称', sortable: true },
      { id: 'specification', label: '规格' },
      { id: 'unit', label: '单位' },
      { id: 'quantity', label: '数量', sortable: true },
      { id: 'available_quantity', label: '可用数量' },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      { id: 'batch_number', label: '批次' },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: '' },
          { label: '合格', value: 'qualified' },
          { label: '不合格', value: 'unqualified' },
          { label: '待检验', value: 'pending' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        type: 'select',
        options: [
          { label: '全部仓库', value: '' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
        value: warehouseFilter,
        onChange: (value) => {
          setWarehouseFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses]
  );

  const rowActions: RowAction<InventoryItem>[] = useMemo(
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
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    []
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
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
      title='库存管理'
      subtitle='管理仓库库存，查看库存状态和低库存预警'
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.info.main}, ${ct.info.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: WMS_PATHS.root },
          { label: '库存管理' },
        ]}
        columns={columns}
        data={inventory}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索物料名称或编码...'
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
            label: '新增库存',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无库存记录'
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
          specification: '规格',
          quantity: '数量',
          available_quantity: '可用数量',
          warehouse_name: '仓库',
        }}
        exportable
        exportFileName='库存列表'
        persistFilters
        persistSearch
        emptyActionButton={{
          label: '新增库存',
          icon: <Plus size={16} />,
          onClick: handleOpenCreate,
        }}
        batchActions={[
          {
            label: '批量删除',
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
              label='物料编码 *'
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label='物料名称 *'
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label='规格'
              value={newItem.specification}
              onChange={(e) => setNewItem({ ...newItem, specification: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='单位 *'
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label='数量 *'
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
                label='仓库 *'
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
              label='最低库存'
              type='number'
              value={newItem.min_quantity}
              onChange={(e) =>
                setNewItem({ ...newItem, min_quantity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label='最高库存'
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
                label='物料编码'
                value={editItem.sku || ''}
                onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='物料名称'
                value={editItem.name || ''}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='规格'
                value={editItem.specification || ''}
                onChange={(e) => setEditItem({ ...editItem, specification: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='单位'
                value={editItem.unit || ''}
                onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='数量'
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
                  label='状态'
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                >
                  <MenuItem value='qualified'>合格</MenuItem>
                  <MenuItem value='unqualified'>不合格</MenuItem>
                  <MenuItem value='pending'>待检验</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='最低库存'
                type='number'
                value={editItem.min_quantity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, min_quantity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label='最高库存'
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
        title='确认删除'
        message='确定要删除这条库存记录吗？此操作不可撤销。'
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
        title='批量删除确认'
        message={`确定要删除选中的 ${batchDeleteIds.length} 条库存记录吗？`}
        danger
      />
    </PageContainer>
  );
};

export default InventoryPage;

// Phase 7-2: React Query migration tagged
