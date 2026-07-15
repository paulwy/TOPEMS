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
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  OutboundOrder,
  OutboundOrderItem,
  CreateOutboundOrderRequest,
  Warehouse,
  WavePick,
  WavePickItem,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Check,
  Package,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer, StatusBadge } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  picking: { label: '拣货中', color: 'info' },
  picked: { label: '已拣货', color: 'info' },
  packing: { label: '打包中', color: 'warning' },
  shipped: { label: '已发货', color: 'success' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const orderTypeConfig: Record<string, string> = {
  sale: '销售出库',
  return: '退货出库',
  transfer: '调拨出库',
  production: '生产领料',
  other: '其他',
};

const wavePickStatusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待分配', color: 'warning' },
  assigned: { label: '已分配', color: 'info' },
  picking: { label: '拣货中', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const OutboundPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);

  // Filter/search/pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Wave pick pagination
  const [wavePicksPage, setWavePicksPage] = useState(1);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OutboundOrderItem[]>([]);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // Form states
  const [newItem, setNewItem] = useState<CreateOutboundOrderRequest>({
    order_number: '',
    order_type: 'sale',
    warehouse_id: '',
    customer_id: '',
    customer_name: '',
    shipping_address: '',
    expected_date: '',
    order_date: '',
    expected_delivery: '',
    total_amount: 0,
    remarks: '',
    items: [],
  });

  const ordersQueryKey = [
    QUERY_KEYS.WMS.OUTBOUND_ORDERS,
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    warehouseFilter,
  ];

  const { data: ordersResponse, isLoading: loading } = useQuery({
    queryKey: ordersQueryKey,
    enabled: currentTab === 0,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.outboundOrders.list(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch outbound orders');
      }
      return response.data;
    },
  });

  const orders = ordersResponse?.items || [];
  const total = ordersResponse?.total || 0;

  const { data: warehousesData } = useQuery({
    queryKey: [QUERY_KEYS.WMS.WAREHOUSES],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (!response.success) {
        throw new Error('Failed to fetch warehouses');
      }
      return response.data;
    },
  });

  const warehouses = warehousesData?.items || [];

  const wavePicksQueryKey = [QUERY_KEYS.WMS.WAVE_PICKS, wavePicksPage, pageSize];

  const { data: wavePicksResponse, isLoading: wavePicksLoading } = useQuery({
    queryKey: wavePicksQueryKey,
    enabled: currentTab === 1,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: wavePicksPage,
        pagesize: pageSize,
      };

      const response = await wmsApi.wavePicks.list(params as any);
      if (!response.success) {
        throw new Error('Failed to fetch wave picks');
      }
      return response.data;
    },
  });

  const wavePicks = wavePicksResponse?.items || [];
  const wavePicksTotal = wavePicksResponse?.total || 0;

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await wmsApi.outboundOrders.listItems(orderId);
      if (response.success && response.data) {
        setOrderItems(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('获取出库单明细失败:', error);
    }
  };

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.OUTBOUND_ORDERS] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateOutboundOrderRequest) => {
      const response = await wmsApi.outboundOrders.create(data);
      if (!response.success) {
        throw new Error('Failed to create outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
      setShowCreateDialog(false);
      resetNewItem();
    },
    onError: (error) => {
      apiLogger.error('创建出库单失败:', error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.outboundOrders.confirm(id);
      if (!response.success) {
        throw new Error('Failed to confirm outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
    },
    onError: (error) => {
      apiLogger.error('确认出库单失败:', error);
    },
  });

  const pickMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.outboundOrders.pick(id);
      if (!response.success) {
        throw new Error('Failed to pick outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
    },
    onError: (error) => {
      apiLogger.error('拣货失败:', error);
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.outboundOrders.ship(id, []);
      if (!response.success) {
        throw new Error('Failed to ship outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
    },
    onError: (error) => {
      apiLogger.error('发货失败:', error);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.outboundOrders.complete(id);
      if (!response.success) {
        throw new Error('Failed to complete outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
    },
    onError: (error) => {
      apiLogger.error('完成出库单失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.outboundOrders.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete outbound order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateOrders();
    },
    onError: (error) => {
      apiLogger.error('删除出库单失败:', error);
    },
  });

  const handleCreate = async () => {
    if (!newItem.order_number || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写必要信息（出库单号、仓库）',
      });
      return;
    }

    await createMutation.mutateAsync(newItem);
  };

  const handleConfirm = async (id: string) => {
    await confirmMutation.mutateAsync(id);
  };

  const handlePick = async (id: string) => {
    await pickMutation.mutateAsync(id);
  };

  const handleShip = async (id: string) => {
    await shipMutation.mutateAsync(id);
  };

  const handleComplete = async (id: string) => {
    await completeMutation.mutateAsync(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOrderId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteOrderId) return;
    await deleteMutation.mutateAsync(deleteOrderId);
  }, [deleteMutation, deleteOrderId]);

  const handleViewDetail = async (order: OutboundOrder) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      order_number: '',
      order_type: 'sale',
      warehouse_id: '',
      customer_id: '',
      customer_name: '',
      shipping_address: '',
      expected_date: '',
      order_date: '',
      expected_delivery: '',
      total_amount: 0,
      remarks: '',
      items: [],
    });
  };

  const getStatusBadge = (status: string, config: typeof statusConfig = statusConfig) => {
    const statusStyle = config[status] || { label: status, color: 'default' as const };
    return (
      <StatusBadge
        status={status}
        label={statusStyle.label}
        color={statusStyle.color}
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

  const orderColumns: ColumnDef<OutboundOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '出库单号', sortable: true },
      {
        id: 'order_type',
        label: '出库类型',
        render: (row) => orderTypeConfig[row.order_type] || row.order_type,
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'customer_name', label: '客户' },
      { id: 'total_quantity', label: '总数量' },
      { id: 'expected_date', label: '预计日期' },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [getWarehouseName]
  );

  const wavePickColumns: ColumnDef<WavePick>[] = useMemo(
    () => [
      { id: 'wave_number', label: '波次号', sortable: true },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'wave_type', label: '波次类型' },
      { id: 'total_orders', label: '订单数' },
      { id: 'totalitems', label: '物料项数' },
      { id: 'total_quantity', label: '总数量' },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status, wavePickStatusConfig),
      },
      { id: 'picker_name', label: '拣货员' },
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
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '拣货中', value: 'picking' },
          { label: '已拣货', value: 'picked' },
          { label: '打包中', value: 'packing' },
          { label: '已发货', value: 'shipped' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
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

  const renderRowActions = useCallback(
    (row: OutboundOrder): React.ReactNode => {
      const actions: RowAction<OutboundOrder>[] = [
        {
          label: '查看详情',
          icon: <Eye size={16} />,
          onClick: () => handleViewDetail(row),
        },
      ];

      if (row.status === 'pending') {
        actions.push({
          label: '确认',
          icon: <Check size={16} />,
          onClick: () => handleConfirm(row.id),
        });
      }

      if (row.status === 'confirmed' || row.status === 'picking') {
        actions.push({
          label: '拣货',
          icon: <ClipboardList size={16} />,
          onClick: () => handlePick(row.id),
        });
      }

      if (row.status === 'picked' || row.status === 'packing') {
        actions.push({
          label: '发货',
          icon: <Truck size={16} />,
          onClick: () => handleShip(row.id),
        });
      }

      if (row.status === 'shipped') {
        actions.push({
          label: '完成',
          icon: <Check size={16} />,
          onClick: () => handleComplete(row.id),
        });
      }

      if (row.status === 'pending' || row.status === 'cancelled') {
        actions.push({
          label: '删除',
          icon: <Trash2 size={16} />,
          color: 'error',
          onClick: () => handleDeleteClick(row.id),
        });
      }

      return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {actions.map((action, index) => (
            <IconButton
              key={index}
              size='small'
              color={action.color as 'primary' | 'secondary' | 'error' | 'inherit' | 'default'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (action.onClick) action.onClick(row);
              }}
            >
              {action.icon}
            </IconButton>
          ))}
        </Box>
      );
    },
    [handleConfirm, handlePick, handleShip, handleComplete, handleDeleteClick]
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
          出库单总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待确认
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.dark' }}
        >
          {orders.filter((o) => o.status === 'pending').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          拣货中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'info.dark' }}
        >
          {orders.filter((o) => o.status === 'picking' || o.status === 'picked').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已完成
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.dark' }}
        >
          {orders.filter((o) => o.status === 'completed' || o.status === 'shipped').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='出库管理'
      subtitle='管理出库单，包括销售出库、生产领料、拣货管理等'
      headerProps={{
        pageIcon: <Upload style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main}, ${ct.warning.dark})`,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
        >
          <Tab label='出库单列表' />
          <Tab label='波次拣货' />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: '首页', href: '/dashboard' },
            { label: '仓储', href: WMS_PATHS.root },
            { label: '出库管理' },
          ]}
          columns={orderColumns}
          data={orders}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder='搜索出库单号...'
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
              label: '新增出库单',
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          renderRowActions={renderRowActions}
          headerContent={statsContent}
          emptyMessage='暂无出库单数据'
          getRowId={(row) => row.id}
          mobileCardTitleKey='order_number'
          mobileCardSubtitleKey='customer_name'
          mobileCardDisplayFields={['order_type', 'status', 'expected_date', 'total_quantity']}
          mobileCardFieldLabels={{
            order_type: '出库类型',
            status: '状态',
            expected_date: '预计日期',
            total_quantity: '总数',
          }}
        />
      )}

      {currentTab === 1 && (
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: '首页', href: '/dashboard' },
            { label: '仓储', href: WMS_PATHS.root },
            { label: '出库管理', href: WMS_PATHS.outbound },
            { label: '波次拣货' },
          ]}
          columns={wavePickColumns}
          data={wavePicks}
          loading={wavePicksLoading}
          filters={[]}
          searchable
          searchPlaceholder='搜索波次号...'
          onSearch={() => {}}
          searchValue=''
          pagination={{
            page: wavePicksPage,
            pageSize,
            total: wavePicksTotal,
            onPageChange: setWavePicksPage,
          }}
          actions={[]}
          emptyMessage='暂无波次拣货数据'
          getRowId={(row) => row.id}
          mobileCardTitleKey='wave_number'
          mobileCardDisplayFields={['status', 'total_items', 'picked_items', 'assigned_to']}
          mobileCardFieldLabels={{
            status: '状态',
            total_items: '总项数',
            picked_items: '已拣数',
            assigned_to: '分配给',
          }}
        />
      )}

      {/* 新增对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增出库单</DialogTitle>
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
              label='出库单号 *'
              value={newItem.order_number}
              onChange={(e) => setNewItem({ ...newItem, order_number: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>出库类型</InputLabel>
              <Select
                value={newItem.order_type}
                label='出库类型'
                onChange={(e) => setNewItem({ ...newItem, order_type: e.target.value })}
              >
                {Object.entries(orderTypeConfig).map(([key, label]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              label='客户'
              value={newItem.customer_name}
              onChange={(e) => setNewItem({ ...newItem, customer_name: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='预计日期'
              type='date'
              value={newItem.expected_date}
              onChange={(e) => setNewItem({ ...newItem, expected_date: e.target.value })}
              fullWidth
              size='small'
              slotProps={{ inputLabel: { shrink: true } } as any}
            />
            <TextField
              label='发货地址'
              value={newItem.shipping_address}
              onChange={(e) => setNewItem({ ...newItem, shipping_address: e.target.value })}
              fullWidth
              size='small'
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label='备注'
                value={newItem.remarks}
                onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })}
                fullWidth
                size='small'
                multiline
                rows={2}
              />
            </Box>
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            提示：出库单物料需要在详情页中添加
          </Typography>
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

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>出库单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
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
                    出库单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedOrder.order_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    出库类型
                  </Typography>
                  <Typography variant='body1'>
                    {orderTypeConfig[selectedOrder.order_type] || selectedOrder.order_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedOrder.warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    客户
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.customer_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    预计日期
                  </Typography>
                  <Typography variant='body1'>
                    {selectedOrder.expected_date
                      ? new Date(selectedOrder.expected_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    总数量
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.total_quantity || 0}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    总金额
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.total_amount || 0}</Typography>
                </Box>
              </Box>

              {/* 明细列表 */}
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 1 }}
                >
                  出库明细
                </Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 1fr 80px 80px 80px 80px',
                      gap: 1,
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: '4px 4px 0 0',
                    }}
                  >
                    <Typography variant='caption'>行号</Typography>
                    <Typography variant='caption'>物料编码</Typography>
                    <Typography variant='caption'>物料名称</Typography>
                    <Typography variant='caption'>单位</Typography>
                    <Typography variant='caption'>需求数量</Typography>
                    <Typography variant='caption'>已拣数量</Typography>
                    <Typography variant='caption'>状态</Typography>
                  </Box>
                  {orderItems.map((item, index) => (
                    <Box
                      key={item.id || index}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 1fr 80px 80px 80px 80px',
                        gap: 1,
                        p: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant='caption'>{item.line_number}</Typography>
                      <Typography variant='caption'>{item.material_code}</Typography>
                      <Typography variant='caption'>{item.material_name}</Typography>
                      <Typography variant='caption'>{item.unit}</Typography>
                      <Typography variant='caption'>{item.requested_quantity}</Typography>
                      <Typography variant='caption'>{item.picked_quantity}</Typography>
                      <Typography variant='caption'>
                        {item.status === 'shipped' ? '已发货' : item.status}
                      </Typography>
                    </Box>
                  ))}
                  {orderItems.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        暂无明细数据
                      </Typography>
                    </Box>
                  )}
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
        message='确定要删除这个出库单吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default OutboundPage;
