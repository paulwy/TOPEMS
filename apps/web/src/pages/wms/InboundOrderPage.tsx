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
  Button,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import type { InboundOrder, CreateInboundOrderRequest, UpdateInboundOrderRequest } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer, StatusBadge } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const orderTypeConfig: Record<string, string> = {
  purchase_in: '采购入库',
  return_in: '退货入库',
  transfer_in: '调拨入库',
  other_in: '其他入库',
};

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' }
> = {
  pending: { label: '待处理', color: 'warning' },
  confirmed: { label: '已确认', color: 'success' },
  receiving: { label: '收货中', color: 'default' },
  completed: { label: '已完成', color: 'default' },
  cancelled: { label: '已取消', color: 'error' },
};

const InboundOrderPage: React.FC = () => {
  const { addNotification } = useNotificationStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateInboundOrderRequest>({
    order_number: '',
    order_type: 'purchase_in',
    warehouse_id: '',
    supplier_id: '',
    supplier_name: '',
    expected_date: '',
    items: [],
  });

  const [editFormData, setEditFormData] = useState<UpdateInboundOrderRequest>({});

  const queryClient = useQueryClient();

  const queryKey = [QUERY_KEYS.WMS.INBOUND_ORDERS, currentPage, pageSize, searchTerm, statusFilter];

  const { data: ordersResponse, isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await wmsApi.inboundOrders.list(params);
      if (!response.success) {
        throw new Error('Failed to fetch inbound orders');
      }
      return response.data;
    },
  });

  const orders = ordersResponse?.items || [];
  const total = ordersResponse?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (data: CreateInboundOrderRequest) => {
      const response = await wmsApi.inboundOrders.create(data);
      if (!response.success) {
        throw new Error('Failed to create inbound order');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.INBOUND_ORDERS] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建入库订单失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInboundOrderRequest }) => {
      const response = await wmsApi.inboundOrders.update(id, data);
      if (!response.success) {
        throw new Error('Failed to update inbound order');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.INBOUND_ORDERS] });
      setShowEditDialog(false);
    },
    onError: (error) => {
      apiLogger.error('更新入库订单失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.inboundOrders.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete inbound order');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.INBOUND_ORDERS] });
    },
    onError: (error) => {
      apiLogger.error('删除入库订单失败:', error);
    },
  });

  const handleCreate = async () => {
    if (!formData.order_number) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写订单号',
      });
      return;
    }

    await createMutation.mutateAsync(formData);
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;
    await updateMutation.mutateAsync({ id: selectedOrder.id, data: editFormData });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOrderId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteOrderId) return;
    await deleteMutation.mutateAsync(deleteOrderId);
  }, [deleteMutation, deleteOrderId]);

  const handleEdit = (order: InboundOrder) => {
    setSelectedOrder(order);
    setEditFormData({
      order_number: order.order_number,
      order_type: order.order_type,
      warehouse_id: order.warehouse_id,
      supplier_id: order.supplier_id,
      supplier_name: order.supplier_name,
      expected_date: order.expected_date,
    });
    setShowEditDialog(true);
  };

  const handleViewDetail = (order: InboundOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      order_type: 'purchase_in',
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

  const getOrderTypeLabel = (type: string) => {
    return orderTypeConfig[type] || type;
  };

  const columns: ColumnDef<InboundOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '订单号', sortable: true },
      {
        id: 'order_type',
        label: '订单类型',
        render: (row) => getOrderTypeLabel(row.order_type),
      },
      { id: 'warehouse_id', label: '仓库' },
      { id: 'supplier_name', label: '供应商' },
      {
        id: 'expected_date',
        label: '预计日期',
        render: (row) =>
          row.expected_date ? new Date(row.expected_date).toLocaleDateString('zh-CN') : '-',
      },
      { id: 'total_amount', label: '总金额' },
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
          { label: '全部状态', value: '' },
          { label: '待处理', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '收货中', value: 'receiving' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
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

  const rowActions: RowAction<InboundOrder>[] = useMemo(
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
    [handleDelete]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  return (
    <PageContainer
      title='入库订单管理'
      subtitle='管理入库订单,包括订单号、仓库、供应商、订单日期等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: WMS_PATHS.root },
          { label: '入库订单' },
        ]}
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索订单号或供应商...'
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
            label: '新增入库订单',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无入库订单数据'
        getRowId={(row) => row.id}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增入库订单</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              py: 2,
            }}
          >
            <TextField
              label='订单号 *'
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              size='small'
              required
              fullWidth
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>订单类型 *</InputLabel>
              <Select
                value={formData.order_type}
                label='订单类型 *'
                onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
              >
                <MenuItem value='purchase_in'>采购入库</MenuItem>
                <MenuItem value='return_in'>退货入库</MenuItem>
                <MenuItem value='transfer_in'>调拨入库</MenuItem>
                <MenuItem value='other_in'>其他入库</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='仓库ID'
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label='供应商ID'
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label='供应商名称'
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label='预计到货日期'
              type='date'
              value={formData.expected_date}
              onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              size='small'
              fullWidth
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
          </Box>
          <DialogActions sx={{ mt: 2 }}>
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
              保存
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑入库订单</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='订单号'
                value={editFormData.order_number || ''}
                onChange={(e) => setEditFormData({ ...editFormData, order_number: e.target.value })}
                size='small'
                fullWidth
              />
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>订单类型</InputLabel>
                <Select
                  value={editFormData.order_type || ''}
                  label='订单类型'
                  onChange={(e) => setEditFormData({ ...editFormData, order_type: e.target.value })}
                >
                  <MenuItem value='purchase_in'>采购入库</MenuItem>
                  <MenuItem value='return_in'>退货入库</MenuItem>
                  <MenuItem value='transfer_in'>调拨入库</MenuItem>
                  <MenuItem value='other_in'>其他入库</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='仓库ID'
                value={editFormData.warehouse_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, warehouse_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label='供应商ID'
                value={editFormData.supplier_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, supplier_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label='供应商名称'
                value={editFormData.supplier_name || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, supplier_name: e.target.value })
                }
                size='small'
                fullWidth
              />
              <TextField
                label='预计到货日期'
                type='date'
                value={editFormData.expected_date || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, expected_date: e.target.value })
                }
                size='small'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
            </Box>
          )}
          <DialogActions sx={{ mt: 2 }}>
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
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>入库订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='订单号'
                value={selectedOrder.order_number}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='订单类型'
                value={getOrderTypeLabel(selectedOrder.order_type)}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='仓库'
                value={selectedOrder.warehouse_id}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='供应商'
                value={selectedOrder.supplier_name || selectedOrder.supplier_id || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='预计日期'
                value={
                  selectedOrder.expected_date
                    ? new Date(selectedOrder.expected_date).toLocaleDateString('zh-CN')
                    : '-'
                }
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label='总金额'
                value={selectedOrder.total_amount || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <Box>
                <TextField
                  label='状态'
                  value={statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  size='small'
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
              </Box>
              <TextField
                label='创建时间'
                value={new Date(selectedOrder.created_at).toLocaleString('zh-CN')}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
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
        message='确定要删除这个入库订单吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default InboundOrderPage;
