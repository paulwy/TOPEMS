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
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const WorkOrderPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateWorkOrderRequest>({
    order_id: '',
    quantity: 0,
    planned_start_time: '',
    planned_end_time: '',
    priority: 'normal',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const workOrdersQuery = useQuery({
    queryKey: ['mes-work-orders', searchTerm, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.workOrders.list(params);
      if (response.success && response.data) {
        return { workOrders: response.data.work_orders || [], total: response.data.total || 0 };
      }
      return { workOrders: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
    onError: (error: unknown) => {
      apiLogger.error('加载工单列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工单列表',
      });
    },
  });
  const workOrders = workOrdersQuery.data?.workOrders || [];
  const total = workOrdersQuery.data?.total || 0;
  const loading = workOrdersQuery.isLoading;

  const createWorkOrderMutation = useMutation({
    mutationFn: (data: CreateWorkOrderRequest) => mesApi.workOrders.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新工单已创建',
      });
      queryClient.invalidateQueries({ queryKey: ['mes-work-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建工单失败',
      });
    },
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderRequest }) =>
      mesApi.workOrders.update(id, data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '工单信息已更新',
      });
      queryClient.invalidateQueries({ queryKey: ['mes-work-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('更新失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '更新工单失败',
      });
    },
  });

  const deleteWorkOrderMutation = useMutation({
    mutationFn: (id: string) => mesApi.workOrders.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '工单已删除',
      });
      queryClient.invalidateQueries({ queryKey: ['mes-work-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除工单',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      switch (action) {
        case 'start':
          return mesApi.workOrders.start(id);
        case 'complete':
          return mesApi.workOrders.complete(id);
        case 'cancel':
          return mesApi.workOrders.cancel(id);
        case 'pause':
          return mesApi.workOrders.pause(id);
        case 'resume':
          return mesApi.workOrders.resume(id);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        title: '状态更新成功',
        message: `工单状态已更新为"${getStatusText(response.data?.status)}"`,
      });
      queryClient.invalidateQueries({ queryKey: ['mes-work-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error('状态更新失败:', error);
      addNotification({
        type: 'error',
        title: '状态更新失败',
        message: '无法更新工单状态',
      });
    },
  });

  const handleStatusChange = async (id: string, action: string) => {
    await statusMutation.mutateAsync({ id, action });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待开工',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
      closed: '已结案',
    };
    return statusMap[status] || status;
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          {
            action: 'start',
            label: '开始生产',
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
      case 'in_progress':
        return [
          {
            action: 'pause',
            label: '暂停',
            icon: <Pause size={14} />,
            color: 'warning' as const,
          },
          {
            action: 'complete',
            label: '完成',
            icon: <CheckCircle size={14} />,
            color: 'success' as const,
          },
        ];
      case 'paused':
        return [
          {
            action: 'resume',
            label: '恢复',
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
      if (selectedWorkOrder) {
        await updateWorkOrderMutation.mutateAsync({
          id: selectedWorkOrder.id,
          data: formData as UpdateWorkOrderRequest,
        });
      } else {
        await createWorkOrderMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个工单吗?')) return;
      await deleteWorkOrderMutation.mutateAsync(id);
    },
    [deleteWorkOrderMutation]
  );

  const handleEdit = useCallback((workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setFormData({
      order_id: workOrder.order_id,
      process_id: workOrder.process_id,
      work_station_id: workOrder.work_station_id,
      team_id: workOrder.team_id,
      quantity: workOrder.quantity,
      planned_start_time: workOrder.planned_start_time,
      planned_end_time: workOrder.planned_end_time,
      priority: workOrder.priority,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedWorkOrder(null);
    setFormData({
      order_id: '',
      quantity: 0,
      planned_start_time: '',
      planned_end_time: '',
      priority: 'normal',
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
      pending: { label: '待开工', bg: 'warning.light', color: 'warning.700' },
      in_progress: { label: '进行中', bg: 'primary.100', color: 'primary.dark' },
      paused: { label: '已暂停', bg: 'grey.100', color: 'text.secondary' },
      completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
      closed: { label: '已结案', bg: 'grey.200', color: 'text.primary' },
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

  const getPriorityBadge = (priority?: string) => {
    const priorityMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      urgent: { label: '紧急', bg: 'error.lighter', color: 'error.dark' },
      high: { label: '高', bg: 'warning.light', color: 'warning.700' },
      normal: { label: '普通', bg: 'primary.100', color: 'primary.dark' },
      low: { label: '低', bg: 'grey.100', color: 'text.secondary' },
    };
    const p = priorityMap[priority || 'normal'] || priorityMap.normal;
    return (
      <Chip
        size='small'
        label={p.label}
        sx={{ backgroundColor: p.bg, color: p.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<WorkOrder>[] = useMemo(
    () => [
      { id: 'work_order_no', label: '工单号', sortable: true },
      { id: 'order_number', label: '生产订单', sortable: true },
      { id: 'process_name', label: '工序', sortable: true },
      { id: 'work_station_name', label: '工作站', sortable: true },
      { id: 'team_name', label: '班组', sortable: true },
      { id: 'quantity', label: '计划数量', sortable: true },
      { id: 'completed_quantity', label: '完成数量', sortable: true },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority),
      },
      {
        id: 'planned_start_time',
        label: '计划开始',
        render: (row) =>
          row.planned_start_time
            ? new Date(row.planned_start_time).toLocaleDateString('zh-CN')
            : '-',
      },
      {
        id: 'planned_end_time',
        label: '计划结束',
        render: (row) =>
          row.planned_end_time ? new Date(row.planned_end_time).toLocaleDateString('zh-CN') : '-',
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
          { label: '待开工', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已暂停', value: 'paused' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
          { label: '已结案', value: 'closed' },
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

  const rowActions: RowAction<WorkOrder>[] = useMemo(
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
        confirmMessage: '确定要删除这个工单吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const renderStatusActions = (workOrder: WorkOrder) => {
    const actions = getStatusActions(workOrder.status);
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
                handleStatusChange(workOrder.id, action.action);
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

  const stats = useMemo(() => {
    return {
      total: workOrders.length,
      pending: workOrders.filter((o) => o.status === 'pending').length,
      in_progress: workOrders.filter((o) => o.status === 'in_progress').length,
      completed: workOrders.filter((o) => o.status === 'completed').length,
      total_quantity: workOrders.reduce((sum, o) => sum + o.quantity, 0),
    };
  }, [workOrders]);

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
          总工单数
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
          待开工
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.pending}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          进行中
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总数量
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.total_quantity}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='工单管理'
      subtitle='管理生产工单信息,包括工单号、工序、工作站、班组、数量等'
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={workOrders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索工单号或生产订单...'
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
            label: '新增工单',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无工单数据'
        getRowId={(row) => row.id}
        mobileCardTitleKey='product_name'
        mobileCardSubtitleKey='work_order_number'
        mobileCardDisplayFields={['status', 'quantity', 'completed_quantity', 'work_center']}
        mobileCardFieldLabels={{
          status: '状态',
          quantity: '计划数量',
          completed_quantity: '完成数量',
          work_center: '工作中心',
        }}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedWorkOrder ? '编辑工单' : '新增工单'}</DialogTitle>
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
            {selectedWorkOrder ? '修改工单信息' : '填写新工单信息'}
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
                <InputLabel htmlFor='order_id'>生产订单ID *</InputLabel>
                <TextField
                  id='order_id'
                  required
                  size='small'
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
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
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='priority'>优先级</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='priority'
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <MenuItem value='low'>低</MenuItem>
                    <MenuItem value='normal'>普通</MenuItem>
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='urgent'>紧急</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='work_station_id'>工作站</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_start_time'>计划开始时间</InputLabel>
                <TextField
                  id='planned_start_time'
                  type='datetime-local'
                  size='small'
                  value={formData.planned_start_time || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      planned_start_time: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_end_time'>计划结束时间</InputLabel>
                <TextField
                  id='planned_end_time'
                  type='datetime-local'
                  size='small'
                  value={formData.planned_end_time || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      planned_end_time: e.target.value,
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

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>工单详情</DialogTitle>
        <DialogContent>
          {selectedWorkOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedWorkOrder.work_order_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产订单</InputLabel>
                  <Box component='span'>{selectedWorkOrder.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序</InputLabel>
                  <Box component='span'>{selectedWorkOrder.process_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工作站</InputLabel>
                  <Box component='span'>{selectedWorkOrder.work_station_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组</InputLabel>
                  <Box component='span'>{selectedWorkOrder.team_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>优先级</InputLabel>
                  <Box>{getPriorityBadge(selectedWorkOrder.priority)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>完成数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.completed_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.good_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.bad_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedWorkOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划开始</InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.planned_start_time
                      ? new Date(selectedWorkOrder.planned_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划结束</InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.planned_end_time
                      ? new Date(selectedWorkOrder.planned_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>实际开始</InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.actual_start_time
                      ? new Date(selectedWorkOrder.actual_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>实际结束</InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.actual_end_time
                      ? new Date(selectedWorkOrder.actual_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedWorkOrder.remark || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkOrder.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkOrder.updated_at).toLocaleString('zh-CN')}
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

export default WorkOrderPage;
