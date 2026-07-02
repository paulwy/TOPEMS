import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from '@/api/erp';
import { erpApi } from '@/api/erp';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const PurchaseOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    order_number: '',
    supplier_id: '',
    supplier_name: '',
    total_amount: 0,
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    remark: '',
  });

  const { addNotification } = useAppStore();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await erpApi.purchaseOrders.list(params);
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载采购订单列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载采购订单列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (id: string, action: string) => {
    try {
      setLoading(true);
      let response;
      switch (action) {
        case 'approve':
          response = await erpApi.purchaseOrders.approve(id);
          break;
        case 'cancel':
          response = await erpApi.purchaseOrders.cancel(id);
          break;
        default:
          return;
      }
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: '状态更新成功',
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
      loadOrders();
    } catch (error: unknown) {
      apiLogger.error('状态更新失败:', error);
      addNotification({
        type: 'error',
        title: '状态更新失败',
        message: '无法更新订单状态',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      pending: '待审批',
      approved: '已审批',
      partially_received: '部分收货',
      received: '已收货',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'draft':
      case 'pending':
        return [
          {
            action: 'approve',
            label: '审批通过',
            icon: <CheckCircle size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: '取消订单',
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      case 'approved':
        return [
          {
            action: 'cancel',
            label: '取消订单',
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOrder) {
        await erpApi.purchaseOrders.update(
          selectedOrder.id,
          formData as UpdatePurchaseOrderRequest
        );
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '采购订单信息已更新',
        });
      } else {
        await erpApi.purchaseOrders.create(formData);
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
        message: selectedOrder ? '更新采购订单失败' : '创建采购订单失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个采购订单吗?')) return;
      try {
        await erpApi.purchaseOrders.delete(id);
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
          message: '无法删除采购订单',
        });
      }
    },
    [loadOrders, addNotification]
  );

  const handleEdit = useCallback((order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      supplier_name: order.supplier_name,
      total_amount: order.total_amount,
      currency: order.currency,
      order_date: order.order_date,
      expected_date: order.expected_date,
      remark: order.remark,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: '',
      supplier_id: '',
      supplier_name: '',
      total_amount: 0,
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      remark: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
      pending: { label: '待审批', bg: 'warning.light', color: '#b45309' },
      approved: { label: '已审批', bg: '#e0e7ff', color: '#4338ca' },
      partially_received: { label: '部分收货', bg: '#dbeafe', color: 'primary.dark' },
      received: { label: '已收货', bg: 'success.lighter', color: '#15803d' },
      cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '订单号', sortable: true },
      { id: 'supplier_name', label: '供应商名称', sortable: true },
      {
        id: 'total_amount',
        label: '订单金额',
        sortable: true,
        render: (row) =>
          `¥${row.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      {
        id: 'order_date',
        label: '订单日期',
        render: (row) =>
          row.order_date ? new Date(row.order_date).toLocaleDateString('zh-CN') : '-',
      },
      {
        id: 'expected_date',
        label: '预计到货',
        render: (row) =>
          row.expected_date ? new Date(row.expected_date).toLocaleDateString('zh-CN') : '-',
      },
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
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '待审批', value: 'pending' },
          { label: '已审批', value: 'approved' },
          { label: '部分收货', value: 'partially_received' },
          { label: '已收货', value: 'received' },
          { label: '已取消', value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<PurchaseOrder>[] = useMemo(
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
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个采购订单吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      received: orders.filter((o) => o.status === 'received').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待审批
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.pending}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已审批
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: '#4338ca' }}
        >
          {stats.approved}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已收货
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.received}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已取消
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.dark' }}
        >
          {stats.cancelled}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='采购订单管理'
      subtitle='管理采购订单信息，包括订单号、供应商、金额、状态等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索订单号或供应商名称...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增订单',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无采购订单数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedOrder ? '编辑采购订单' : '新增采购订单'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedOrder ? '修改采购订单信息' : '填写新采购订单信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='order_number'>订单号 *</InputLabel>
                <TextField
                  id='order_number'
                  required
                  size='small'
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='supplier_name'>供应商名称 *</InputLabel>
                <TextField
                  id='supplier_name'
                  required
                  size='small'
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='total_amount'>订单金额 *</InputLabel>
                <TextField
                  id='total_amount'
                  type='number'
                  required
                  size='small'
                  value={formData.total_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='order_date'>订单日期 *</InputLabel>
                <TextField
                  id='order_date'
                  type='date'
                  required
                  size='small'
                  value={formData.order_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='expected_date'>预计到货日期</InputLabel>
                <TextField
                  id='expected_date'
                  type='date'
                  size='small'
                  value={formData.expected_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='currency'>币种</InputLabel>
                <FormControl size='small'>
                  <Select
                    id='currency'
                    value={formData.currency || 'CNY'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <MenuItem value='CNY'>人民币 (CNY)</MenuItem>
                    <MenuItem value='USD'>美元 (USD)</MenuItem>
                    <MenuItem value='EUR'>欧元 (EUR)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='remark'>备注</InputLabel>
                <TextField
                  id='remark'
                  size='small'
                  multiline
                  rows={3}
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>采购订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedOrder.order_number}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>供应商</InputLabel>
                  <Box component='span'>{selectedOrder.supplier_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单金额</InputLabel>
                  <Box component='span'>
                    ¥
                    {selectedOrder.total_amount.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单日期</InputLabel>
                  <Box component='span'>
                    {selectedOrder.order_date
                      ? new Date(selectedOrder.order_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>预计到货</InputLabel>
                  <Box component='span'>
                    {selectedOrder.expected_date
                      ? new Date(selectedOrder.expected_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedOrder.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedOrder.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                {selectedOrder.remark && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                    <Box component='span'>{selectedOrder.remark}</Box>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                {getStatusActions(selectedOrder.status).map((action) => (
                  <Button
                    key={action.action}
                    size='small'
                    variant='outlined'
                    color={action.color}
                    onClick={() => {
                      setShowDetailDialog(false);
                      handleStatusChange(selectedOrder.id, action.action);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default PurchaseOrderPage;
