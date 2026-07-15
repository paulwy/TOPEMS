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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SalesOrder, CreateSalesOrderRequest, UpdateSalesOrderRequest } from '@/api/erp';
import { erpApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Truck, ShoppingBag } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const SalesOrderPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateSalesOrderRequest>({
    order_number: '',
    customer_id: '',
    customer_name: '',
    total_amount: 0,
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    remark: '',
  });

  const { addNotification } = useNotificationStore();

  const queryClient = useQueryClient();

  const ordersQuery = useQuery<{ items: SalesOrder[]; total: number }>({
    queryKey: [...QUERY_KEYS.ERP.SALES_ORDERS, currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await erpApi.salesOrders.list(params);
      if (response.success && response.data) {
        return { items: response.data.orders || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const loading = ordersQuery.isLoading;

  useEffect(() => {
    if (ordersQuery.isError) {
      apiLogger.error('加载销售订单列表失败:', ordersQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载销售订单列表',
      });
    }
  }, [ordersQuery.isError, ordersQuery.error, addNotification]);

  const invalidateOrders = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.SALES_ORDERS });

  const createMutation = useMutation({
    mutationFn: (data: CreateSalesOrderRequest) => erpApi.salesOrders.create(data),
    onSuccess: () => {
      invalidateOrders();
      addNotification({ type: 'success', title: '创建成功', message: '新销售订单已创建' });
      setShowDialog(false);
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({ type: 'error', title: '操作失败', message: '创建销售订单失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateSalesOrderRequest }) =>
      erpApi.salesOrders.update(params.id, params.data),
    onSuccess: () => {
      invalidateOrders();
      addNotification({ type: 'success', title: '更新成功', message: '销售订单信息已更新' });
      setShowDialog(false);
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({ type: 'error', title: '操作失败', message: '更新销售订单失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => erpApi.salesOrders.delete(id),
    onSuccess: () => {
      invalidateOrders();
      addNotification({ type: 'success', title: '删除成功', message: '销售订单已删除' });
    },
    onError: (err: unknown) => {
      apiLogger.error('删除失败:', err);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除销售订单' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      pending: '待审批',
      approved: '已审批',
      partially_shipped: '部分发货',
      shipped: '已发货',
      completed: '已完成',
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
      case 'partially_shipped':
        return [
          {
            action: 'ship',
            label: '发货',
            icon: <Truck size={14} />,
            color: 'primary' as const,
          },
          {
            action: 'cancel',
            label: '取消订单',
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      case 'shipped':
        return [
          {
            action: 'complete',
            label: '完成订单',
            icon: <ShoppingBag size={14} />,
            color: 'success' as const,
          },
        ];
      default:
        return [];
    }
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => erpApi.salesOrders.approve(id),
    onSuccess: (response) => {
      if (response.success && response.data) {
        invalidateOrders();
        addNotification({
          type: 'success',
          title: '状态更新成功',
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('状态更新失败:', err);
      addNotification({ type: 'error', title: '状态更新失败', message: '无法更新订单状态' });
    },
  });

  const shipMutation = useMutation({
    mutationFn: (id: string) => erpApi.salesOrders.ship(id),
    onSuccess: (response) => {
      if (response.success && response.data) {
        invalidateOrders();
        addNotification({
          type: 'success',
          title: '状态更新成功',
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('状态更新失败:', err);
      addNotification({ type: 'error', title: '状态更新失败', message: '无法更新订单状态' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => erpApi.salesOrders.complete(id),
    onSuccess: (response) => {
      if (response.success && response.data) {
        invalidateOrders();
        addNotification({
          type: 'success',
          title: '状态更新成功',
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('状态更新失败:', err);
      addNotification({ type: 'error', title: '状态更新失败', message: '无法更新订单状态' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => erpApi.salesOrders.cancel(id),
    onSuccess: (response) => {
      if (response.success && response.data) {
        invalidateOrders();
        addNotification({
          type: 'success',
          title: '状态更新成功',
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('状态更新失败:', err);
      addNotification({ type: 'error', title: '状态更新失败', message: '无法更新订单状态' });
    },
  });

  const actionLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    approveMutation.isPending ||
    shipMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data: formData as UpdateSalesOrderRequest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (id: string, action: string) => {
    switch (action) {
      case 'approve':
        approveMutation.mutate(id);
        break;
      case 'ship':
        shipMutation.mutate(id);
        break;
      case 'complete':
        completeMutation.mutate(id);
        break;
      case 'cancel':
        cancelMutation.mutate(id);
        break;
      default:
        return;
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个销售订单吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = useCallback((order: SalesOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      currency: order.currency,
      order_date: order.order_date,
      delivery_date: order.delivery_date,
      remark: order.remark,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: '',
      customer_id: '',
      customer_name: '',
      total_amount: 0,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
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
      pending: { label: '待审批', bg: 'warning.light', color: 'warning.700' },
      approved: { label: '已审批', bg: ct.secondary[100], color: 'secondary.700' },
      partially_shipped: { label: '部分发货', bg: 'primary.100', color: 'primary.dark' },
      shipped: { label: '已发货', bg: ct.info[200], color: ct.info[700] },
      completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
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

  const columns: ColumnDef<SalesOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '订单号', sortable: true },
      { id: 'customer_name', label: '客户名称', sortable: true },
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
        id: 'delivery_date',
        label: '交货日期',
        render: (row) =>
          row.delivery_date ? new Date(row.delivery_date).toLocaleDateString('zh-CN') : '-',
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
          { label: '部分发货', value: 'partially_shipped' },
          { label: '已发货', value: 'shipped' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<SalesOrder>[] = useMemo(
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
        confirmMessage: '确定要删除这个销售订单吗?',
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
      shipped: orders.filter((o) => o.status === 'shipped').length,
      completed: orders.filter((o) => o.status === 'completed').length,
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已审批
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.approved}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.info[200], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已发货
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: ct.info[700] }}
        >
          {stats.shipped}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已完成
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.completed}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='销售订单管理'
      subtitle='管理销售订单信息，包括订单号、客户、金额、状态等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索订单号或客户名称...'
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
        emptyMessage='暂无销售订单数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedOrder ? '编辑销售订单' : '新增销售订单'}</DialogTitle>
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
            {selectedOrder ? '修改销售订单信息' : '填写新销售订单信息'}
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
                <InputLabel htmlFor='customer_name'>客户名称 *</InputLabel>
                <TextField
                  id='customer_name'
                  required
                  size='small'
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
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
                <InputLabel htmlFor='delivery_date'>交货日期</InputLabel>
                <TextField
                  id='delivery_date'
                  type='date'
                  size='small'
                  value={formData.delivery_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_date: e.target.value,
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
                disabled={actionLoading}
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
        <DialogTitle>销售订单详情</DialogTitle>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>客户名称</InputLabel>
                  <Box component='span'>{selectedOrder.customer_name}</Box>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>交货日期</InputLabel>
                  <Box component='span'>
                    {selectedOrder.delivery_date
                      ? new Date(selectedOrder.delivery_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                {selectedOrder.actual_delivery_date && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                      实际发货日期
                    </InputLabel>
                    <Box component='span'>
                      {new Date(selectedOrder.actual_delivery_date).toLocaleDateString('zh-CN')}
                    </Box>
                  </Box>
                )}
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
                  flexWrap: 'wrap',
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

export default SalesOrderPage;
