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

import { useTranslation } from 'react-i18next';


const InboundOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'success' | 'warning' | 'error' }
  > = {
    pending: { label: t('wms.inbound_order_page.pending'), color: 'warning' },
    confirmed: { label: t('wms.inbound_order_page.confirmed'), color: 'success' },
    receiving: { label: t('wms.inbound_order_page.text_61cf24'), color: 'default' },
    completed: { label: t('wms.inbound_order_page.status_completed'), color: 'default' },
    cancelled: { label: t('wms.inbound_order_page.status_cancelled'), color: 'error' },
  };

  const orderTypeConfig: Record<string, string> = {
    purchase_in: t('wms.inbound_order_page.type_purchase'),
    return_in: t('wms.inbound_order_page.type_return'),
    transfer_in: t('wms.inbound_order_page.type_transfer'),
    other_in: t('wms.inbound_order_page.type_other'),
  };

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
      apiLogger.error(t('wms.inbound_order_page.create'), error);
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
      apiLogger.error(t('wms.inbound_order_page.update'), error);
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
      apiLogger.error(t('wms.inbound_order_page.delete'), error);
    },
  });

  const handleCreate = async () => {
    if (!formData.order_number) {
      addNotification({
        type: 'warning',
        title: t('wms.inbound_order_page.error'),
        message: t('wms.inbound_order_page.please_fill'),
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
      { id: 'order_number', label: t('wms.inbound_order_page.order_number'), sortable: true },
      {
        id: 'order_type',
        label: t('wms.inbound_order_page.order_type'),
        render: (row) => getOrderTypeLabel(row.order_type),
      },
      { id: 'warehouse_id', label: t('wms.inbound_order_page.filter_warehouse') },
      { id: 'supplier_name', label: t('wms.inbound_order_page.field_supplier') },
      {
        id: 'expected_date',
        label: t('wms.inbound_order_page.date'),
        render: (row) =>
          row.expected_date ? new Date(row.expected_date).toLocaleDateString('zh-CN') : '-',
      },
      { id: 'total_amount', label: t('wms.inbound_order_page.amount') },
      {
        id: 'status',
        label: t('wms.inbound_order_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.inbound_order_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.inbound_order_page.filter_option_all_status'), value: '' },
          { label: t('wms.inbound_order_page.pending'), value: 'pending' },
          { label: t('wms.inbound_order_page.confirmed'), value: 'confirmed' },
          { label: t('wms.inbound_order_page.text_61cf24'), value: 'receiving' },
          { label: t('wms.inbound_order_page.status_completed'), value: 'completed' },
          { label: t('wms.inbound_order_page.status_cancelled'), value: 'cancelled' },
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
        label: t('wms.inbound_order_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('wms.inbound_order_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('wms.inbound_order_page.action_delete'),
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
      title={t('wms.inbound_order_page.inbound')}
      subtitle={t('wms.inbound_order_page.order_date')}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.inbound_order_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.inbound_order_page.breadcrumb_module'), href: WMS_PATHS.root },
          { label: t('wms.inbound_order_page.inbound_1') },
        ]}
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.inbound_order_page.order_number_1')}
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
            label: t('wms.inbound_order_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('wms.inbound_order_page.no_data')}
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
              label={t('wms.inbound_order_page.order_number_2')}
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
                label={t('wms.inbound_order_page.order_type_1')}
                onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
              >
                <MenuItem value='purchase_in'>采购入库</MenuItem>
                <MenuItem value='return_in'>退货入库</MenuItem>
                <MenuItem value='transfer_in'>调拨入库</MenuItem>
                <MenuItem value='other_in'>其他入库</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('wms.inbound_order_page.warehouse')}
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.inbound_order_page.supplier')}
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.inbound_order_page.supplier_name')}
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.inbound_order_page.field_expected_date')}
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
                label={t('wms.inbound_order_page.order_number')}
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
                  label={t('wms.inbound_order_page.order_type')}
                  onChange={(e) => setEditFormData({ ...editFormData, order_type: e.target.value })}
                >
                  <MenuItem value='purchase_in'>采购入库</MenuItem>
                  <MenuItem value='return_in'>退货入库</MenuItem>
                  <MenuItem value='transfer_in'>调拨入库</MenuItem>
                  <MenuItem value='other_in'>其他入库</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('wms.inbound_order_page.warehouse')}
                value={editFormData.warehouse_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, warehouse_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.inbound_order_page.supplier')}
                value={editFormData.supplier_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, supplier_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.inbound_order_page.supplier_name')}
                value={editFormData.supplier_name || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, supplier_name: e.target.value })
                }
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.inbound_order_page.field_expected_date')}
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
                label={t('wms.inbound_order_page.order_number')}
                value={selectedOrder.order_number}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.inbound_order_page.order_type')}
                value={getOrderTypeLabel(selectedOrder.order_type)}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.inbound_order_page.filter_warehouse')}
                value={selectedOrder.warehouse_id}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.inbound_order_page.field_supplier')}
                value={selectedOrder.supplier_name || selectedOrder.supplier_id || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.inbound_order_page.date')}
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
                label={t('wms.inbound_order_page.amount')}
                value={selectedOrder.total_amount || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <Box>
                <TextField
                  label={t('wms.inbound_order_page.filter_status')}
                  value={statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  size='small'
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
              </Box>
              <TextField
                label={t('wms.inbound_order_page.column_created_at')}
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
        title={t('wms.inbound_order_page.dialog_delete_title')}
        message={t('wms.inbound_order_page.confirm')}
        danger
      />
    </PageContainer>
  );
};

export default InboundOrderPage;
