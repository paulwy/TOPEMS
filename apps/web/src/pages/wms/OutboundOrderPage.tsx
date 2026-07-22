import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Button,
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OutboundOrder,
  CreateOutboundOrderRequest,
  UpdateOutboundOrderRequest,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import { useCrudMutations } from '@/hooks';

const OutboundOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'success' | 'warning' | 'error' }
  > = {
    pending: { label: t('wms.outbound_order_page.pending'), color: 'warning' },
    confirmed: { label: t('wms.outbound_order_page.confirmed'), color: 'success' },
    picking: { label: t('wms.outbound_order_page.text_1e6430'), color: 'default' },
    packing: { label: t('wms.outbound_order_page.text_7ced0c'), color: 'default' },
    shipped: { label: t('wms.outbound_order_page.text_355409'), color: 'default' },
    completed: { label: t('wms.outbound_order_page.status_completed'), color: 'success' },
    cancelled: { label: t('wms.outbound_order_page.status_cancelled'), color: 'error' },
  };

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateOutboundOrderRequest>({
    order_number: '',
    order_type: 'sales_out',
    warehouse_id: '',
    customer_id: '',
    customer_name: '',
    order_date: '',
    expected_delivery: '',
    total_amount: 0,
    remarks: '',
    items: [],
  });

  const [editFormData, setEditFormData] = useState<UpdateOutboundOrderRequest>({});

  const { data: ordersData = { items: [], total: 0 }, isLoading: ordersLoading } = useQuery({
    queryKey: ['wms-outbound-orders-detail', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: currentPage, pagesize: pageSize };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await wmsApi.outboundOrders.list(params);
      return response.success && response.data ? response.data : { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateOutboundOrderRequest,
    UpdateOutboundOrderRequest,
    string
  >({
    queryKeyToInvalidate: ['wms-outbound-orders-detail'],
    createFn: async (data) => {
      const response = await wmsApi.outboundOrders.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建出库单失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await wmsApi.outboundOrders.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新出库单失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await wmsApi.outboundOrders.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除出库单失败');
      }
      return response.data;
    },
    entityName: '出库单',
    onCreateSuccess: () => {
      setShowCreateDialog(false);
      resetForm();
    },
    onUpdateSuccess: () => {
      setShowEditDialog(false);
    },
  });

  const handleCreate = () => {
    if (!formData.order_number) {
      addNotification({ type: 'warning', title: t('wms.outbound_order_page.error'), message: t('wms.outbound_order_page.please_fill') });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedOrder) return;
    updateMutation.mutate({ id: selectedOrder.id, data: editFormData });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOrderId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!deleteOrderId) return;
    deleteMutation.mutate(deleteOrderId);
    setShowDeleteConfirm(false);
  };

  const handleEdit = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setEditFormData({
      order_number: order.order_number,
      order_type: order.order_type,
      warehouse_id: order.warehouse_id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      expected_delivery: order.expected_delivery,
      total_amount: order.total_amount,
      remarks: order.remarks,
    });
    setShowEditDialog(true);
  };

  const handleViewDetail = (order: OutboundOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      order_number: '',
      order_type: 'sales_out',
      warehouse_id: '',
      customer_id: '',
      customer_name: '',
      order_date: '',
      expected_delivery: '',
      total_amount: 0,
      remarks: '',
      items: [],
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

  const columns: ColumnDef<OutboundOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: t('wms.outbound_order_page.order_number'), sortable: true },
      { id: 'warehouse_id', label: t('wms.outbound_order_page.filter_warehouse') },
      { id: 'customer_name', label: t('wms.outbound_order_page.field_customer') },
      {
        id: 'order_date',
        label: t('wms.outbound_order_page.order_date'),
        render: (row) =>
          row.order_date ? new Date(row.order_date).toLocaleDateString('zh-CN') : '-',
      },
      {
        id: 'expected_delivery',
        label: t('wms.outbound_order_page.text_e5fa8a'),
        render: (row) =>
          row.expected_delivery ? new Date(row.expected_delivery).toLocaleDateString('zh-CN') : '-',
      },
      { id: 'total_amount', label: t('wms.outbound_order_page.amount') },
      { id: 'status', label: t('wms.outbound_order_page.filter_status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.outbound_order_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.outbound_order_page.filter_option_all_status'), value: '' },
          { label: t('wms.outbound_order_page.pending'), value: 'pending' },
          { label: t('wms.outbound_order_page.confirmed'), value: 'confirmed' },
          { label: t('wms.outbound_order_page.text_1e6430'), value: 'picking' },
          { label: t('wms.outbound_order_page.text_7ced0c'), value: 'packing' },
          { label: t('wms.outbound_order_page.text_355409'), value: 'shipped' },
          { label: t('wms.outbound_order_page.status_completed'), value: 'completed' },
          { label: t('wms.outbound_order_page.status_cancelled'), value: 'cancelled' },
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

  const rowActions: RowAction<OutboundOrder>[] = useMemo(
    () => [
      { label: t('wms.outbound_order_page.action_view_detail'), icon: <Eye size={16} />, onClick: handleViewDetail },
      { label: t('wms.outbound_order_page.action_edit'), icon: <Edit size={16} />, onClick: handleEdit },
      {
        label: t('wms.outbound_order_page.action_delete'),
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
    resetForm();
    setShowCreateDialog(true);
  };

  return (
    <PageContainer
      title={t('wms.outbound_order_page.outbound')}
      subtitle={t('wms.outbound_order_page.order_date_1')}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.outbound_order_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.outbound_order_page.breadcrumb_module'), href: '/wms' },
          { label: t('wms.outbound_order_page.outbound_1') },
        ]}
        columns={columns}
        data={ordersData.items}
        loading={ordersLoading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.outbound_order_page.order_number_1')}
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total: ordersData.total,
          onPageChange: setCurrentPage,
        }}
        actions={[{ label: t('wms.outbound_order_page.add'), icon: <Plus size={16} />, onClick: handleOpenCreate }]}
        rowActions={rowActions}
        emptyMessage={t('wms.outbound_order_page.no_data')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增出库订单</DialogTitle>
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
              label={t('wms.outbound_order_page.order_number_2')}
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              size='small'
              required
              fullWidth
            />
            <TextField
              label={t('wms.outbound_order_page.warehouse')}
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.outbound_order_page.customer')}
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.outbound_order_page.customer_name')}
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              size='small'
              fullWidth
            />
            <TextField
              label={t('wms.outbound_order_page.order_date_2')}
              type='date'
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              size='small'
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              label={t('wms.outbound_order_page.text_e5fa8a')}
              type='date'
              value={formData.expected_delivery}
              onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
              size='small'
              fullWidth
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              label={t('wms.outbound_order_page.amount')}
              type='number'
              value={formData.total_amount}
              onChange={(e) =>
                setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })
              }
              size='small'
              fullWidth
            />
          </Box>
          <TextField
            label={t('wms.outbound_order_page.field_remark')}
            multiline
            rows={2}
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            fullWidth
            size='small'
            sx={{ mt: 2 }}
          />
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
              disabled={createMutation.isPending}
            >
              保存
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑出库订单</DialogTitle>
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
                label={t('wms.outbound_order_page.order_number')}
                value={editFormData.order_number || ''}
                onChange={(e) => setEditFormData({ ...editFormData, order_number: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.outbound_order_page.warehouse')}
                value={editFormData.warehouse_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, warehouse_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.outbound_order_page.customer')}
                value={editFormData.customer_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, customer_id: e.target.value })}
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.outbound_order_page.customer_name')}
                value={editFormData.customer_name || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, customer_name: e.target.value })
                }
                size='small'
                fullWidth
              />
              <TextField
                label={t('wms.outbound_order_page.text_e5fa8a')}
                type='date'
                value={editFormData.expected_delivery || ''}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, expected_delivery: e.target.value })
                }
                size='small'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
              <TextField
                label={t('wms.outbound_order_page.amount')}
                type='number'
                value={editFormData.total_amount ?? ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    total_amount: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
                fullWidth
              />
            </Box>
          )}
          <TextField
            label={t('wms.outbound_order_page.field_remark')}
            multiline
            rows={2}
            value={editFormData.remarks || ''}
            onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
            fullWidth
            size='small'
            sx={{ mt: 2 }}
          />
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
              disabled={updateMutation.isPending}
            >
              保存
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>出库订单详情</DialogTitle>
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
                label={t('wms.outbound_order_page.order_number')}
                value={selectedOrder.order_number}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.outbound_order_page.filter_warehouse')}
                value={selectedOrder.warehouse_id}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.outbound_order_page.field_customer')}
                value={selectedOrder.customer_name || selectedOrder.customer_id || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.outbound_order_page.order_date')}
                value={
                  selectedOrder.order_date
                    ? new Date(selectedOrder.order_date).toLocaleDateString('zh-CN')
                    : '-'
                }
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.outbound_order_page.text_e5fa8a')}
                value={
                  selectedOrder.expected_delivery
                    ? new Date(selectedOrder.expected_delivery).toLocaleDateString('zh-CN')
                    : '-'
                }
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label={t('wms.outbound_order_page.amount')}
                value={selectedOrder.total_amount || '-'}
                size='small'
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <Box>
                <TextField
                  label={t('wms.outbound_order_page.filter_status')}
                  value={statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  size='small'
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
              </Box>
              <TextField
                label={t('wms.outbound_order_page.column_created_at')}
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('wms.outbound_order_page.dialog_delete_title')}
        message={t('wms.outbound_order_page.confirm')}
        danger
      />
    </PageContainer>
  );
};

export default OutboundOrderPage;
