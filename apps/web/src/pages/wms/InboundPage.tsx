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
  Stack,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useResponsive } from '@/hooks/useResponsive';
import { Hidden } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  InboundOrder,
  InboundOrderItem,
  CreateInboundOrderRequest,
  CreateInboundOrderItemRequest,
  ReceiveItemRequest,
  Warehouse,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Eye, Download, Check, Package, ClipboardCheck } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer, StatusBadge } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  receiving: { label: '收货中', color: 'info' },
  quality_check: { label: '质检中', color: 'warning' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const orderTypeConfig: Record<string, string> = {
  purchase: '采购入库',
  return: '退货入库',
  transfer: '调拨入库',
  production: '生产入库',
  other: '其他',
};

const InboundPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();
  const theme = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<CreateInboundOrderRequest>({
    order_number: '',
    order_type: 'purchase',
    warehouse_id: '',
    supplier_id: '',
    supplier_name: '',
    expected_date: '',
    items: [],
  });

  const [receiveItems, setReceiveItems] = useState<ReceiveItemRequest[]>([]);

  const ordersQuery = useQuery({
    queryKey: ['wms-inbound-orders', searchTerm, statusFilter, warehouseFilter, currentPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.inboundOrders.list(params as any);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
  });

  useEffect(() => {
    if (ordersQuery.isError && ordersQuery.error) {
      apiLogger.error('获取入库单列表失败:', ordersQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载入库单列表',
      });
    }
  }, [ordersQuery.isError, ordersQuery.error, addNotification]);

  const warehousesQuery = useQuery({
    queryKey: ['wms-warehouses'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
  });

  useEffect(() => {
    if (warehousesQuery.isError && warehousesQuery.error) {
      apiLogger.error('获取仓库列表失败:', warehousesQuery.error);
    }
  }, [warehousesQuery.isError, warehousesQuery.error]);

  const [orderItems, setOrderItems] = useState<InboundOrderItem[]>([]);

  const orderItemsQuery = useQuery({
    queryKey: ['wms-inbound-order-items', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const response = await wmsApi.inboundOrders.listItems(selectedOrder.id);
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    enabled: !!selectedOrder,
  });

  useEffect(() => {
    if (orderItemsQuery.data) {
      const items = orderItemsQuery.data;
      setOrderItems(items);
      setReceiveItems(
        items.map((item) => ({
          item_id: item.id,
          received_quantity: item.expected_quantity - item.received_quantity,
        }))
      );
    }
  }, [orderItemsQuery.data]);

  useEffect(() => {
    if (orderItemsQuery.isError && orderItemsQuery.error) {
      apiLogger.error('获取入库单明细失败:', orderItemsQuery.error);
    }
  }, [orderItemsQuery.isError, orderItemsQuery.error]);

  const createMutation = useMutation({
    mutationFn: (data: CreateInboundOrderRequest) => wmsApi.inboundOrders.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '入库单已创建',
      });
      setShowCreateDialog(false);
      resetNewItem();
      queryClient.invalidateQueries({ queryKey: ['wms-inbound-orders'] });
    },
    onError: (error) => {
      apiLogger.error('创建入库单失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '创建入库单失败',
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => wmsApi.inboundOrders.confirm(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '确认成功',
        message: '入库单已确认',
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inbound-orders'] });
    },
    onError: (error) => {
      apiLogger.error('确认入库单失败:', error);
      addNotification({
        type: 'error',
        title: '确认失败',
        message: '确认入库单失败',
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReceiveItemRequest[] }) => 
      wmsApi.inboundOrders.receive(id, items),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '收货成功',
        message: '入库单已收货',
      });
      setShowReceiveDialog(false);
      queryClient.invalidateQueries({ queryKey: ['wms-inbound-orders'] });
    },
    onError: (error) => {
      apiLogger.error('收货失败:', error);
      addNotification({
        type: 'error',
        title: '收货失败',
        message: '收货失败',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => wmsApi.inboundOrders.complete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '完成成功',
        message: '入库单已完成',
      });
      queryClient.invalidateQueries({ queryKey: ['wms-inbound-orders'] });
    },
    onError: (error) => {
      apiLogger.error('完成入库单失败:', error);
      addNotification({
        type: 'error',
        title: '完成失败',
        message: '完成入库单失败',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wmsApi.inboundOrders.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '入库单已删除',
      });
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['wms-inbound-orders'] });
    },
    onError: (error) => {
      apiLogger.error('删除入库单失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除入库单失败',
      });
    },
  });

  const handleCreate = () => {
    if (!newItem.order_number || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写必要信息（入库单号、仓库）',
      });
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleConfirm = (id: string) => {
    confirmMutation.mutate(id);
  };

  const handleReceiveClick = (order: InboundOrder) => {
    setSelectedOrder(order);
    setShowReceiveDialog(true);
  };

  const handleReceive = () => {
    if (!selectedOrder) return;
    receiveMutation.mutate({ id: selectedOrder.id, items: receiveItems });
  };

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOrderId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!deleteOrderId) return;
    deleteMutation.mutate(deleteOrderId);
  };

  const handleViewDetail = (order: InboundOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      order_number: '',
      order_type: 'purchase',
      warehouse_id: '',
      supplier_id: '',
      supplier_name: '',
      expected_date: '',
      items: [],
    });
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

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehousesQuery.data?.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehousesQuery.data]);

  const orders = ordersQuery.data?.items || [];
  const total = ordersQuery.data?.total || 0;
  const warehouses = warehousesQuery.data || [];
  const loading = ordersQuery.isLoading;

  const columns: ColumnDef<InboundOrder>[] = useMemo(
    () => {
      const baseColumns = [
        { id: 'order_number', label: '入库单号', sortable: true },
        { id: 'total_quantity', label: '总数量' },
        {
          id: 'status',
          label: '状态',
          render: (row: InboundOrder) => getStatusBadge(row.status),
        },
      ];

      if (isMobile) {
        return baseColumns;
      }

      if (isTablet) {
        return [
          ...baseColumns.slice(0, 1),
          {
            id: 'order_type',
            label: '入库类型',
            render: (row: InboundOrder) => orderTypeConfig[row.order_type] || row.order_type,
          },
          ...baseColumns.slice(1),
        ];
      }

      return [
        ...baseColumns.slice(0, 1),
        {
          id: 'order_type',
          label: '入库类型',
          render: (row: InboundOrder) => orderTypeConfig[row.order_type] || row.order_type,
        },
        {
          id: 'warehouse_id',
          label: '仓库',
          render: (row: InboundOrder) => getWarehouseName(row.warehouse_id),
        },
        { id: 'supplier_name', label: '供应商' },
        ...baseColumns.slice(1),
        { id: 'expected_date', label: '预计日期' },
      ];
    },
    [getWarehouseName, isMobile, isTablet]
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
          { label: '收货中', value: 'receiving' },
          { label: '质检中', value: 'quality_check' },
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
        onChange: (value: unknown) => {
          setWarehouseFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses]
  );

  const renderRowActions = useCallback(
    (row: InboundOrder): React.ReactNode => {
      const actions: RowAction<InboundOrder>[] = [
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

      if (row.status === 'confirmed' || row.status === 'receiving') {
        actions.push({
          label: '收货',
          icon: <Package size={16} />,
          onClick: () => handleReceiveClick(row),
        });
      }

      if (row.status === 'receiving' || row.status === 'quality_check') {
        actions.push({
          label: '完成',
          icon: <ClipboardCheck size={16} />,
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
    [handleConfirm, handleReceiveClick, handleComplete, handleDeleteClick]
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
          入库单总数
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
          收货中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'info.dark' }}
        >
          {orders.filter((o) => o.status === 'receiving' || o.status === 'confirmed').length}
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
          {orders.filter((o) => o.status === 'completed').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='入库管理'
      subtitle='管理入库单，包括采购入库、退货入库、调拨入库等'
      headerProps={{
        pageIcon: <Download style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: WMS_PATHS.root },
          { label: '入库管理' },
        ]}
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索入库单号...'
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
            label: '新增入库单',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        renderRowActions={renderRowActions}
        headerContent={statsContent}
        emptyMessage='暂无入库单数据'
        getRowId={(row) => row.id}
        mobileCardTitleKey='order_number'
        mobileCardSubtitleKey='supplier_name'
        mobileCardDisplayFields={['order_type', 'status', 'expected_date', 'total_quantity']}
        mobileCardFieldLabels={{
          order_type: '入库类型',
          status: '状态',
          expected_date: '预计日期',
          total_quantity: '总数',
        }}
      />

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth={isMobile ? 'sm' : 'md'}
        fullWidth={isMobile}
      >
        <DialogTitle>新增入库单</DialogTitle>
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
              label='入库单号 *'
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
              <InputLabel>入库类型</InputLabel>
              <Select
                value={newItem.order_type}
                label='入库类型'
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
              label='供应商'
              value={newItem.supplier_name}
              onChange={(e) => setNewItem({ ...newItem, supplier_name: e.target.value })}
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
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            提示：入库单物料需要在详情页中添加
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
            disabled={createMutation.isPending}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth={isMobile ? 'sm' : 'md'}
        fullWidth={isMobile}
      >
        <DialogTitle>入库单详情</DialogTitle>
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
                    入库单号
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
                    入库类型
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
                    供应商
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.supplier_name || '-'}</Typography>
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

              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 1 }}
                >
                  入库明细
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
                    <Typography variant='caption'>预期数量</Typography>
                    <Typography variant='caption'>已收数量</Typography>
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
                      <Typography variant='caption'>{item.expected_quantity}</Typography>
                      <Typography variant='caption'>{item.received_quantity}</Typography>
                      <Typography variant='caption'>
                        {item.status === 'completed' ? '已完成' : item.status}
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

      <Dialog
        open={showReceiveDialog}
        onClose={() => setShowReceiveDialog(false)}
        maxWidth={isMobile ? 'sm' : 'md'}
        fullWidth={isMobile}
      >
        <DialogTitle>入库收货</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant='body2'>入库单号：{selectedOrder.order_number}</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 1fr 80px 100px 100px',
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
                  <Typography variant='caption'>预期数量</Typography>
                  <Typography variant='caption'>收货数量</Typography>
                </Box>
                {orderItems.map((item, index) => (
                  <Box
                    key={item.id || index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 1fr 80px 100px 100px',
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
                    <Typography variant='caption'>{item.expected_quantity}</Typography>
                    <TextField
                      type='number'
                      size='small'
                      value={receiveItems[index]?.received_quantity || 0}
                      onChange={(e) => {
                        const newReceiveItems = [...receiveItems];
                        newReceiveItems[index] = {
                          item_id: item.id,
                          received_quantity: parseFloat(e.target.value) || 0,
                        };
                        setReceiveItems(newReceiveItems);
                      }}
                      slotProps={{ input: { min: 0 } } as any}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowReceiveDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleReceive}
            disabled={receiveMutation.isPending}
          >
            确认收货
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title='确认删除'
        message='确定要删除此入库单吗？此操作无法撤销。'
        onConfirm={handleDelete}
        confirmLabel='删除'
        confirmColor='error'
      />
    </PageContainer>
  );
};

export default InboundPage;