import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Plus,
  ClipboardList,
  ShoppingCart,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  Play,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { srmApi } from '@/api/srm';
import type { PurchaseOrder, CreatePurchaseOrderRequest } from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';

const SrmOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePurchaseOrderRequest>>({
    po_no: '',
    supplier_id: '',
    total_amount: 0,
    status: 'pending',
    currency: 'CNY',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listPurchaseOrders();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.orders || [];
        const adapted = items.map((item: { [key: string]: unknown }) => ({
          ...item,
          total_amount: item.total_amount || item.amount || 0,
          status:
            item.status === 'pending'
              ? '待处理'
              : item.status === 'processing'
                ? '处理中'
                : item.status === 'delivered'
                  ? '已交付'
                  : item.status === 'completed'
                    ? '已完成'
                    : item.status === 'cancelled'
                      ? '已取消'
                      : item.status,
          order_date: item.order_date || item.created_at,
        }));
        setOrders(adapted);
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载订单数据失败:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待处理: { bg: 'warning.light', color: '#b45309' },
      处理中: { bg: '#dbeafe', color: 'primary.dark' },
      已交付: { bg: 'success.lighter', color: '#15803d' },
      已完成: { bg: 'secondary.light', color: 'primary.light' },
      已取消: { bg: 'error.lighter', color: 'error.darker' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: '#475569' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(
    () => [
      { id: 'po_no', label: '订单编号' },
      { id: 'supplier_id', label: '供应商ID' },
      {
        id: 'total_amount',
        label: '订单金额',
        render: (row) => (
          <Typography sx={{ fontWeight: 600, color: 'grey.800' }}>
            ¥{(row.total_amount || 0).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'order_date',
        label: '下单日期',
        render: (row) => {
          const date = row.order_date;
          return date ? new Date(date).toLocaleDateString('zh-CN') : '';
        },
      },
    ],
    []
  );

  const rowActions: RowAction<PurchaseOrder>[] = useMemo(
    () => [
      {
        label: '查看',
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: () => {},
      },
      {
        label: '编辑',
        icon: <Edit2 style={{ width: 16, height: 16 }} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: handleDelete,
        color: 'error',
      },
      {
        label: '确认',
        icon: <Check style={{ width: 16, height: 16 }} />,
        onClick: handleConfirm,
        color: 'success',
      },
      {
        label: '处理中',
        icon: <Play style={{ width: 16, height: 16 }} />,
        onClick: handleProcess,
        color: 'primary',
      },
      {
        label: '关闭',
        icon: <X style={{ width: 16, height: 16 }} />,
        onClick: handleClose,
        color: 'error',
      },
    ],
    []
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      return (
        o.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.supplier_id && o.supplier_id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [orders, searchTerm]);

  const handleCreate = () => {
    setFormData({
      po_no: '',
      supplier_id: '',
      total_amount: 0,
      status: 'pending',
      currency: 'CNY',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createPurchaseOrder({
        po_no: formData.po_no || '',
        supplier_id: formData.supplier_id || '',
        total_amount: formData.total_amount || 0,
        status: formData.status || 'pending',
        currency: formData.currency || 'CNY',
      });
      addNotification({ title: '成功', message: '订单创建成功', type: 'success' });
      setShowCreateModal(false);
      loadOrders();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建订单失败:', err);
    }
  };

  const handleEdit = (row: PurchaseOrder) => {
    setEditingId(row.id);
    setFormData({
      po_no: row.po_no,
      supplier_id: row.supplier_id,
      total_amount: row.total_amount || 0,
      status:
        row.status === '待处理'
          ? 'pending'
          : row.status === '处理中'
            ? 'processing'
            : row.status === '已交付'
              ? 'delivered'
              : row.status === '已完成'
                ? 'completed'
                : row.status === '已取消'
                  ? 'cancelled'
                  : row.status,
      currency: row.currency,
      remarks: row.remarks,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await srmApi.updatePurchaseOrder(editingId, {
        po_no: formData.po_no || '',
        supplier_id: formData.supplier_id || '',
        total_amount: formData.total_amount || 0,
        status: formData.status || 'pending',
        currency: formData.currency || 'CNY',
        remarks: formData.remarks,
      });
      addNotification({ title: '成功', message: '订单更新成功', type: 'success' });
      setShowEditModal(false);
      setEditingId(null);
      loadOrders();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
      apiLogger.error('更新订单失败:', err);
    }
  };

  const handleDelete = async (row: PurchaseOrder) => {
    try {
      const response = await srmApi.deletePurchaseOrder(row.id);
      if (response.success) {
        addNotification({ title: '成功', message: '订单删除成功', type: 'success' });
        loadOrders();
      } else {
        addNotification({ title: '错误', message: '删除失败', type: 'error' });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除订单失败:', err);
    }
  };

  const handleConfirm = async (row: PurchaseOrder) => {
    try {
      await srmApi.updatePurchaseOrder(row.id, {
        po_no: row.po_no,
        supplier_id: row.supplier_id,
        total_amount: row.total_amount || 0,
        status: 'processing',
        currency: row.currency,
        remarks: row.remarks,
      });
      addNotification({ title: '成功', message: '订单已确认', type: 'success' });
      loadOrders();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '确认失败', type: 'error' });
      apiLogger.error('确认订单失败:', err);
    }
  };

  const handleProcess = async (row: PurchaseOrder) => {
    try {
      await srmApi.updatePurchaseOrder(row.id, {
        po_no: row.po_no,
        supplier_id: row.supplier_id,
        total_amount: row.total_amount || 0,
        status: 'delivered',
        currency: row.currency,
        remarks: row.remarks,
      });
      addNotification({ title: '成功', message: '订单已交付', type: 'success' });
      loadOrders();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
      apiLogger.error('更新订单状态失败:', err);
    }
  };

  const handleClose = async (row: PurchaseOrder) => {
    try {
      await srmApi.updatePurchaseOrder(row.id, {
        po_no: row.po_no,
        supplier_id: row.supplier_id,
        total_amount: row.total_amount || 0,
        status: 'completed',
        currency: row.currency,
        remarks: row.remarks,
      });
      addNotification({ title: '成功', message: '订单已关闭', type: 'success' });
      loadOrders();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '关闭失败', type: 'error' });
      apiLogger.error('关闭订单失败:', err);
    }
  };

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === '待处理').length,
      processing: orders.filter((o) => o.status === '处理中').length,
      completed: orders.filter((o) => o.status === '已完成').length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    };
  }, [orders]);

  const headerContent = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={{ bgcolor: '#dbeafe' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.light',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  订单总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'warning.light',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  待处理
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.pending}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#dbeafe',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  处理中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.processing}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已完成
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.completed}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'secondary.light',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingCart sx={{ width: 20, height: 20, color: 'primary.light' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  订单总额
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  ¥{stats.totalAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    ),
    [stats]
  );

  return (
    <PageContainer
      title='采购订单'
      subtitle='Purchase Orders'
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%)',
      }}
      padding={false}
    >
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <ListPageTemplate
          title=''
          subtitle=''
          columns={columns}
          data={filteredOrders}
          loading={loading}
          rowActions={rowActions}
          searchable
          searchPlaceholder='搜索订单编号或供应商...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          actions={[
            {
              label: '新增订单',
              icon: <Plus style={{ width: 18, height: 18 }} />,
              onClick: handleCreate,
              variant: 'contained',
            },
          ]}
          onRefresh={loadOrders}
          emptyMessage='暂无订单数据'
          emptyIcon={<ClipboardList style={{ width: 48, height: 48, color: 'text.disabled' }} />}
          headerContent={headerContent}
          getRowId={(row) => row.id || row.po_no || Math.random().toString()}
        />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='订单编号 *'
                value={formData.po_no}
                onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                placeholder='请输入订单编号'
              />
              <TextField
                fullWidth
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                placeholder='请输入供应商ID'
              />
              <TextField
                fullWidth
                label='订单金额'
                type='number'
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })
                }
                placeholder='请输入订单金额'
              />
            </Box>
            <TextField
              fullWidth
              select
              label='状态'
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value='pending'>待处理</option>
              <option value='processing'>处理中</option>
              <option value='delivered'>已交付</option>
              <option value='completed'>已完成</option>
              <option value='cancelled'>已取消</option>
            </TextField>
            <TextField
              fullWidth
              label='备注'
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder='请输入备注'
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'primary.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingId(null);
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='订单编号 *'
                value={formData.po_no}
                onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                placeholder='请输入订单编号'
              />
              <TextField
                fullWidth
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                placeholder='请输入供应商ID'
              />
              <TextField
                fullWidth
                label='订单金额'
                type='number'
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })
                }
                placeholder='请输入订单金额'
              />
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value='pending'>待处理</option>
                <option value='processing'>处理中</option>
                <option value='delivered'>已交付</option>
                <option value='completed'>已完成</option>
                <option value='cancelled'>已取消</option>
              </TextField>
            </Box>
            <TextField
              fullWidth
              label='备注'
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder='请输入备注'
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowEditModal(false);
              setEditingId(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
            sx={{ bgcolor: 'primary.main' }}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </PageContainer>
  );
};

export default SrmOrderPage;
