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
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  ClipboardList,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * TODO: Phase 7-4 -- 虚拟滚动优化
 *
 * 当列表数据超过 100 条时，建议使用虚拟滚动提升渲染性能:
 *
 * 方案 1: @tanstack/react-virtual
 *   import { useVirtualizer } from '@tanstack/react-virtual';
 *   const virtualizer = useVirtualizer({ count: data.length, getScrollElement: () => parentRef.current });
 *
 * 方案 2: react-virtuoso (MUI 友好)
 *   import { TableVirtuoso } from 'react-virtuoso';
 *   <TableVirtuoso data={data} components={{ TableBody, TableRow, TableCell }} />
 *
 * 当前预估数据量: 生产工单 (按批次累积)
 */

/**
 * TODO: Phase 7-2 — React Query 迁移
 *
 * 模块: 生产工单 (ProductionOrderManagementPage)
 *
 * 1. 将 useState(loading) + useState(data) + useEffect(fetch) 替换为 useQuery:
 *    const { data: response, isLoading, error, refetch } = useQuery({
 *      queryKey: ['mes-production-orders', page, rowsPerPage, searchText],
 *      queryFn: () => mesApi.getList({ page: page + 1, pageSize: rowsPerPage, keyword: searchText }),
 *      placeholderData: (prev) => prev,
 *    });
 *    const data = response?.data?.items || [];
 *    const total = response?.data?.total || 0;
 *
 * 2. 将 create/update/delete handler 中的 setState + API 调用替换为 useMutation:
 *    const queryClient = useQueryClient();
 *    const deleteMutation = useMutation({
 *      mutationFn: (id: string) => mesApi.delete(id),
 *      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] }),
 *    });
 *
 * 3. 保留 UI 状态（page, rowsPerPage, searchText, dialogOpen 等）的 useState
 */
const ProductionOrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateProductionOrderRequest>({
    order_number: '',
    product_name: '',
    quantity: 0,
    scheduled_start_date: '',
    scheduled_end_date: '',
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

      const response = await mesApi.orders.list(params);
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载生产订单列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载生产订单列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 状态流转处理 - 使用专门的状态流转 API
  const handleStatusChange = async (id: string, action: string) => {
    try {
      setLoading(true);
      let response;
      switch (action) {
        case 'release':
          response = await mesApi.orders.release(id);
          break;
        case 'start':
          response = await mesApi.orders.start(id);
          break;
        case 'complete':
          response = await mesApi.orders.complete(id);
          break;
        case 'cancel':
          response = await mesApi.orders.cancel(id);
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
      pending: '待下达',
      released: '已下达',
      in_progress: '生产中',
      completed: '已完成',
      cancelled: '已取消',
      paused: '已暂停',
    };
    return statusMap[status] || status;
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          {
            action: 'release',
            label: '下达订单',
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: '取消',
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      case 'released':
      case 'in_progress':
        return [
          {
            action: 'start',
            label: '开始生产',
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'complete',
            label: '完成生产',
            icon: <CheckCircle size={14} />,
            color: 'success' as const,
          },
        ];
      case 'paused':
        return [
          {
            action: 'start',
            label: '恢复生产',
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: '取消',
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
        await mesApi.orders.update(selectedOrder.id, formData as UpdateProductionOrderRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '生产订单信息已更新',
        });
      } else {
        await mesApi.orders.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新生产订单已创建',
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
        message: selectedOrder ? '更新生产订单失败' : '创建生产订单失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个生产订单吗?')) return;
      try {
        await mesApi.orders.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '生产订单已删除',
        });
        loadOrders();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除生产订单',
        });
      }
    },
    [loadOrders, addNotification]
  );

  const handleEdit = useCallback((order: ProductionOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      product_name: order.product_name,
      quantity: order.quantity,
      scheduled_start_date: order.scheduled_start_date,
      scheduled_end_date: order.scheduled_end_date,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: '',
      product_name: '',
      quantity: 0,
      scheduled_start_date: '',
      scheduled_end_date: '',
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
      pending: { label: '待下达', bg: 'warning.light', color: '#b45309' },
      released: { label: '已下达', bg: '#e0e7ff', color: '#4338ca' },
      in_progress: { label: '生产中', bg: '#dbeafe', color: 'primary.dark' },
      completed: { label: '已完成', bg: 'success.lighter', color: '#15803d' },
      cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
      paused: { label: '已暂停', bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<ProductionOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '订单号', sortable: true },
      { id: 'product_name', label: '产品名称', sortable: true },
      { id: 'quantity', label: '数量', sortable: true },
      {
        id: 'scheduled_start_date',
        label: '计划开始时间',
        render: (row) =>
          row.scheduled_start_date
            ? new Date(row.scheduled_start_date).toLocaleDateString('zh-CN')
            : '-',
      },
      {
        id: 'scheduled_end_date',
        label: '计划结束时间',
        render: (row) =>
          row.scheduled_end_date
            ? new Date(row.scheduled_end_date).toLocaleDateString('zh-CN')
            : '-',
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
          { label: '待下达', value: 'pending' },
          { label: '已下达', value: 'released' },
          { label: '生产中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
          { label: '已暂停', value: 'paused' },
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

  const rowActions: RowAction<ProductionOrder>[] = useMemo(
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
        confirmMessage: '确定要删除这个生产订单吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  // 状态流转操作按钮
  const renderStatusActions = (order: ProductionOrder) => {
    const actions = getStatusActions(order.status);
    if (actions.length === 0) return null;

    return (
      <Stack
        direction='row'
        spacing={0.5}
        sx={{ justifyContent: 'flex-end' }}
      >
        {actions.map((action) => (
          <Tooltip
            key={action.action}
            title={action.label}
          >
            <IconButton
              size='small'
              color={action.color}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(order.id, action.action);
              }}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    );
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 状态统计
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      released: orders.filter((o) => o.status === 'released').length,
      in_progress: orders.filter((o) => o.status === 'in_progress').length,
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
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待下达
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
          已下达
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: '#4338ca' }}
        >
          {stats.released}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          生产中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.in_progress}
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
    </Box>
  );

  return (
    <PageContainer
      title='生产订单'
      subtitle='管理生产订单信息,包括订单号、产品、数量、计划时间等'
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索订单号或产品名称...'
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
        emptyMessage='暂无生产订单数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedOrder ? '编辑生产订单' : '新增生产订单'}</DialogTitle>
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
            {selectedOrder ? '修改生产订单信息' : '填写新生产订单信息'}
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
                <InputLabel htmlFor='product_name'>产品名称 *</InputLabel>
                <TextField
                  id='product_name'
                  required
                  size='small'
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>数量 *</InputLabel>
                <TextField
                  id='quantity'
                  type='number'
                  required
                  size='small'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='scheduled_start_date'>计划开始时间 *</InputLabel>
                <TextField
                  id='scheduled_start_date'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.scheduled_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_start_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='scheduled_end_date'>计划结束时间 *</InputLabel>
                <TextField
                  id='scheduled_end_date'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.scheduled_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_end_date: e.target.value,
                    })
                  }
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

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>生产订单详情</DialogTitle>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Box component='span'>{selectedOrder.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                  <Box component='span'>{selectedOrder.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedOrder.scheduled_start_date
                      ? new Date(selectedOrder.scheduled_start_date).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedOrder.scheduled_end_date
                      ? new Date(selectedOrder.scheduled_end_date).toLocaleString('zh-CN')
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
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default ProductionOrderManagementPage;

// Phase 7-2: React Query migration tagged
