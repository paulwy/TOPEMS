import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Check, XCircle, AlertCircle, Lock } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

const ScmPurchaseOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    order_number: '',
    supplier_id: '',
    order_date: '',
    delivery_date: '',
    total_amount: 0,
    remarks: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseOrders.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setOrders(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载采购订单失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载采购订单',
      });
    } finally {
      setLoading(false);
    }
  };

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
        await scmApi.purchaseOrders.update(selectedOrder.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '采购订单已更新',
        });
      } else {
        await scmApi.purchaseOrders.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新采购订单已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新采购订单失败' : '创建采购订单失败',
      });
    }
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
    if (!window.confirm(`确定要删除采购订单 "${order.order_number}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseOrders.update(order.id, { status: 'cancelled' } as any);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '采购订单已删除',
      });
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除采购订单失败',
      });
    }
  };

  const handleApprove = useCallback(async (order: PurchaseOrder) => {
    if (!window.confirm(`确定要审批采购订单 "${order.order_number}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseOrders.approve(order.id);
      addNotification({
        type: 'success',
        title: '审批成功',
        message: '采购订单已审批通过',
      });
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('审批失败:', error);
      addNotification({
        type: 'error',
        title: '审批失败',
        message: '审批采购订单失败',
      });
    }
  }, [addNotification]);

  const handleConfirm = useCallback(async (order: PurchaseOrder) => {
    if (!window.confirm(`确定要确认采购订单 "${order.order_number}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseOrders.confirm(order.id);
      addNotification({
        type: 'success',
        title: '确认成功',
        message: '采购订单已确认',
      });
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('确认失败:', error);
      addNotification({
        type: 'error',
        title: '确认失败',
        message: '确认采购订单失败',
      });
    }
  }, [addNotification]);

  const handleCancel = useCallback(async (order: PurchaseOrder) => {
    if (!window.confirm(`确定要取消采购订单 "${order.order_number}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseOrders.cancel(order.id);
      addNotification({
        type: 'success',
        title: '取消成功',
        message: '采购订单已取消',
      });
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('取消失败:', error);
      addNotification({
        type: 'error',
        title: '取消失败',
        message: '取消采购订单失败',
      });
    }
  }, [addNotification]);

  const handleClose = useCallback(async (order: PurchaseOrder) => {
    if (!window.confirm(`确定要关闭采购订单 "${order.order_number}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseOrders.close(order.id);
      addNotification({
        type: 'success',
        title: '关闭成功',
        message: '采购订单已关闭',
      });
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('关闭失败:', error);
      addNotification({
        type: 'error',
        title: '关闭失败',
        message: '关闭采购订单失败',
      });
    }
  }, [addNotification]);

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

  // 表格列定义
  const columns: ColumnDef<PurchaseOrder>[] = [
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
              >
                审批
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleCancel(row)}
                startIcon={<XCircle size={12} />}
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
              >
                确认
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleCancel(row)}
                startIcon={<XCircle size={12} />}
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
            >
              关闭
            </Button>
          )}
        </Box>
      ),
    },
  ];

  // 行操作
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
    <>
      <ListPageTemplate
        title='采购订单管理'
        subtitle='管理采购订单,包括订单号、供应商、订单日期、交付日期等'
        columns={columns}
        data={orders}
        loading={loading}
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
        onRefresh={loadOrders}
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
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={isEditing}
              />
              <TextField
                label='交付日期'
                type='date'
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
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
              >
                {isEditing ? '更新' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScmPurchaseOrderPage;
