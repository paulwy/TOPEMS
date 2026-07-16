import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Check, XCircle, Lock } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';

const ScmPurchaseOrderPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    order_number: '',
    supplier_id: '',
    order_date: '',
    delivery_date: '',
    total_amount: 0,
    remarks: '',
  });

  const { addNotification } = useNotificationStore();

  const ordersQuery = useQuery({
    queryKey: [...QUERY_KEYS.SCM.PURCHASE_ORDERS, currentPage, pageSize],
    queryFn: async () => {
      const response = await scmApi.purchaseOrders.list({
        page: currentPage,
        pageSize,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载采购订单失败');
      }
      return {
        items: response.data.items || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const loading = ordersQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: CreatePurchaseOrderRequest) => {
      const response = await scmApi.purchaseOrders.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新采购订单已创建',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建采购订单失败',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderRequest }) => {
      const response = await scmApi.purchaseOrders.update(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '采购订单已更新',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('更新采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '更新采购订单失败',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await scmApi.purchaseOrders.approve(id);
      if (!response.success) {
        throw new Error(response.message || '审批采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '审批成功',
        message: '采购订单已审批通过',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('审批采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '审批失败',
        message: '审批采购订单失败',
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await scmApi.purchaseOrders.confirm(id);
      if (!response.success) {
        throw new Error(response.message || '确认采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '确认成功',
        message: '采购订单已确认',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('确认采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '确认失败',
        message: '确认采购订单失败',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await scmApi.purchaseOrders.cancel(id);
      if (!response.success) {
        throw new Error(response.message || '取消采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '取消成功',
        message: '采购订单已取消',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('取消采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '取消失败',
        message: '取消采购订单失败',
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await scmApi.purchaseOrders.close(id);
      if (!response.success) {
        throw new Error(response.message || '关闭采购订单失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS });
      addNotification({
        type: 'success',
        title: '关闭成功',
        message: '采购订单已关闭',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('关闭采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '关闭失败',
        message: '关闭采购订单失败',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedOrder) {
        const updateData: UpdatePurchaseOrderRequest = {
          supplier_id: formData.supplier_id,
          delivery_date: formData.delivery_date,
          total_amount: formData.total_amount,
          status: selectedOrder.status,
          remarks: formData.remarks,
        };
        await updateMutation.mutateAsync({ id: selectedOrder.id, data: updateData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch {}
  };

  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      supplier_id: order.supplier_id || '',
      order_date: order.order_date,
      delivery_date: order.delivery_date || '',
      total_amount: order.total_amount || 0,
      remarks: order.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (order: PurchaseOrder) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除采购订单 "${order.order_number}" 吗？`,
      onConfirm: async () => {
        try {
          await updateMutation.mutateAsync({
            id: order.id,
            data: { status: 'cancelled' } as UpdatePurchaseOrderRequest,
          });
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '采购订单已删除',
          });
        } catch {}
      },
      danger: true,
    });
  };

  const handleApprove = useCallback(
    (order: PurchaseOrder) => {
      openConfirmDialog({
        title: '确认审批',
        message: `确定要审批采购订单 "${order.order_number}" 吗？`,
        onConfirm: async () => {
          try {
            await approveMutation.mutateAsync(order.id);
          } catch {}
        },
      });
    },
    [approveMutation]
  );

  const handleConfirm = useCallback(
    (order: PurchaseOrder) => {
      openConfirmDialog({
        title: '确认订单',
        message: `确定要确认采购订单 "${order.order_number}" 吗？`,
        onConfirm: async () => {
          try {
            await confirmMutation.mutateAsync(order.id);
          } catch {}
        },
      });
    },
    [confirmMutation]
  );

  const handleCancel = useCallback(
    (order: PurchaseOrder) => {
      openConfirmDialog({
        title: '确认取消',
        message: `确定要取消采购订单 "${order.order_number}" 吗？`,
        onConfirm: async () => {
          try {
            await cancelMutation.mutateAsync(order.id);
          } catch {}
        },
        danger: true,
      });
    },
    [cancelMutation]
  );

  const handleClose = useCallback(
    (order: PurchaseOrder) => {
      openConfirmDialog({
        title: '确认关闭',
        message: `确定要关闭采购订单 "${order.order_number}" 吗？`,
        onConfirm: async () => {
          try {
            await closeMutation.mutateAsync(order.id);
          } catch {}
        },
      });
    },
    [closeMutation]
  );

  const resetForm = () => {
    setFormData({
      order_number: '',
      supplier_id: '',
      order_date: '',
      delivery_date: '',
      total_amount: 0,
      remarks: '',
    });
    setIsEditing(false);
    setSelectedOrder(null);
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const isMutationPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    approveMutation.isPending ||
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    closeMutation.isPending;

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(
    () => [
      {
        id: 'order_number',
        label: '订单号',
        render: (row) => <Box sx={{ fontWeight: 500 }}>{row.order_number}</Box>,
      },
      {
        id: 'supplier_id',
        label: '供应商ID',
      },
      {
        id: 'order_date',
        label: '订单日期',
        render: (row) => (
          <Box sx={{ fontSize: '0.875rem' }}>
            {new Date(row.order_date).toLocaleDateString('zh-CN')}
          </Box>
        ),
      },
      {
        id: 'delivery_date',
        label: '交付日期',
        render: (row) => (
          <Box sx={{ fontSize: '0.875rem' }}>
            {row.delivery_date ? new Date(row.delivery_date).toLocaleDateString('zh-CN') : '-'}
          </Box>
        ),
      },
      {
        id: 'total_amount',
        label: '总金额',
        align: 'right',
        render: (row) => <Box>{row.total_amount || 0}</Box>,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            size='small'
            label={row.status}
            variant='outlined'
          />
        ),
      },
      {
        id: 'remarks',
        label: '备注',
        render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.remarks || '-'}</Box>,
      },
      {
        id: 'status_actions',
        label: '状态操作',
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {row.status === 'pending' && (
              <>
                <Button
                  size='small'
                  color='success'
                  onClick={() => handleApprove(row)}
                  startIcon={<Check size={12} />}
                  disabled={approveMutation.isPending}
                >
                  审批
                </Button>
                <Button
                  size='small'
                  color='error'
                  onClick={() => handleCancel(row)}
                  startIcon={<XCircle size={12} />}
                  disabled={cancelMutation.isPending}
                >
                  取消
                </Button>
              </>
            )}
            {row.status === 'approved' && (
              <>
                <Button
                  size='small'
                  color='success'
                  onClick={() => handleConfirm(row)}
                  startIcon={<Check size={12} />}
                  disabled={confirmMutation.isPending}
                >
                  确认
                </Button>
                <Button
                  size='small'
                  color='error'
                  onClick={() => handleCancel(row)}
                  startIcon={<XCircle size={12} />}
                  disabled={cancelMutation.isPending}
                >
                  取消
                </Button>
              </>
            )}
            {row.status === 'confirmed' && (
              <Button
                size='small'
                color='warning'
                onClick={() => handleClose(row)}
                startIcon={<Lock size={12} />}
                disabled={closeMutation.isPending}
              >
                关闭
              </Button>
            )}
          </Box>
        ),
      },
    ],
    [
      handleApprove,
      handleConfirm,
      handleCancel,
      handleClose,
      approveMutation.isPending,
      confirmMutation.isPending,
      cancelMutation.isPending,
      closeMutation.isPending,
    ]
  );

  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: PurchaseOrder) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: PurchaseOrder) => handleDelete(row),
    },
  ];

  return (
    <PageContainer>
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={orders}
        loading={loading || isMutationPending}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新增采购订单',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.PURCHASE_ORDERS })
        }
        emptyMessage='暂无采购订单数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑采购订单' : '新增采购订单'}</DialogTitle>
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
                label='订单号 *'
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
              />
              <TextField
                label='订单日期 *'
                type='date'
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } } as const}
                disabled={isEditing}
              />
              <TextField
                label='交付日期'
                type='date'
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
              <TextField
                label='总金额'
                type='number'
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_amount: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
            </Box>
            <TextField
              label='备注'
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
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? '更新' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default ScmPurchaseOrderPage;
