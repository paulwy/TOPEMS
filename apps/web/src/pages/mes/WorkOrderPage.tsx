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
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  ListParams,
} from '@/api/mes';
import { workOrderApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Edit,
  Trash2,
  Eye,
  FileText,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  Save,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const WorkOrderPage: React.FC = () => {
  const queryClient = useQueryClient();
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
    process_id: '',
    work_station_id: '',
    team_id: '',
    quantity: 1,
    planned_start_time: '',
    planned_end_time: '',
    priority: 'normal',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: workOrdersData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.WORK_ORDERS, params],
    queryFn: async () => {
      const response = await workOrderApi.list(params);
      if (response.success && response.data) {
        return {
          workOrders: response.data.work_orders || [],
          total: response.data.total || 0,
        };
      }
      return { workOrders: [], total: 0 };
    },
  });

  const workOrders = workOrdersData?.workOrders || [];
  const total = workOrdersData?.total || 0;

  const invalidateWorkOrders = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.WORK_ORDERS });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkOrderRequest) => workOrderApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新工单已创建' });
      invalidateWorkOrders();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '创建工单失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderRequest }) =>
      workOrderApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '工单信息已更新' });
      invalidateWorkOrders();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新工单失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '工单已删除' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除工单' });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.start(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工单已开始' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '开始工单失败' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.complete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工单已完成' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '完成工单失败' });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.pause(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工单已暂停' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '暂停工单失败' });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.resume(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工单已恢复' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '恢复工单失败' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => workOrderApi.cancel(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工单已取消' });
      invalidateWorkOrders();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '取消工单失败' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待开始',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: Record<string, string> = {
      high: '高',
      normal: '普通',
      low: '低',
    };
    return priorityMap[priority] || priority;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkOrder) {
      updateMutation.mutate({ id: selectedWorkOrder.id, data: formData as UpdateWorkOrderRequest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个工单吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setFormData({
      order_id: workOrder.order_id,
      process_id: workOrder.process_id || '',
      work_station_id: workOrder.work_station_id || '',
      team_id: workOrder.team_id || '',
      quantity: workOrder.quantity,
      planned_start_time: workOrder.planned_start_time || '',
      planned_end_time: workOrder.planned_end_time || '',
      priority: workOrder.priority || 'normal',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedWorkOrder(null);
    setFormData({
      order_id: '',
      process_id: '',
      work_station_id: '',
      team_id: '',
      quantity: 1,
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
      pending: { label: '待开始', bg: 'grey.100', color: 'text.secondary' },
      in_progress: { label: '进行中', bg: 'info.lighter', color: 'info.700' },
      paused: { label: '已暂停', bg: 'warning.light', color: 'warning.700' },
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

  const columns: ColumnDef<WorkOrder>[] = useMemo(
    () => [
      { id: 'work_order_no', label: '工单编号', sortable: true },
      { id: 'order_number', label: '订单编号', sortable: true },
      { id: 'process_name', label: '工序名称' },
      { id: 'work_station_name', label: '工作站' },
      {
        id: 'quantity',
        label: '数量',
        render: (row) => `${row.completed_quantity || 0}/${row.quantity}`,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'planned_start_time',
        label: '计划开始时间',
        render: (row) =>
          row.planned_start_time
            ? new Date(row.planned_start_time).toLocaleDateString('zh-CN')
            : '-',
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
          { label: '待开始', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已暂停', value: 'paused' },
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
        label: '开始',
        icon: <PlayCircle size={16} />,
        onClick: (row) => startMutation.mutate(row.id),
        show: (row) => row.status === 'pending',
      },
      {
        label: '完成',
        icon: <CheckCircle size={16} />,
        onClick: (row) => completeMutation.mutate(row.id),
        show: (row) => row.status === 'in_progress',
      },
      {
        label: '暂停',
        icon: <PauseCircle size={16} />,
        onClick: (row) => pauseMutation.mutate(row.id),
        show: (row) => row.status === 'in_progress',
      },
      {
        label: '恢复',
        icon: <PlayCircle size={16} />,
        onClick: (row) => resumeMutation.mutate(row.id),
        show: (row) => row.status === 'paused',
      },
      {
        label: '取消',
        icon: <XCircle size={16} />,
        onClick: (row) => cancelMutation.mutate(row.id),
        show: (row) => row.status === 'pending' || row.status === 'paused',
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
    [startMutation, completeMutation, pauseMutation, resumeMutation, cancelMutation]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FileText
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            工单总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>
          {workOrders.length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>进行中</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>
          {workOrders.filter((w) => w.status === 'in_progress').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已完成</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {workOrders.filter((w) => w.status === 'completed').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已暂停</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {workOrders.filter((w) => w.status === 'paused').length}
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
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
        searchPlaceholder='搜索工单编号或订单编号...'
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
            icon: <FileText size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无工单数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
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
                <InputLabel htmlFor='order_id'>订单ID *</InputLabel>
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
                  required
                  size='small'
                  type='number'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='process_id'>工序ID</InputLabel>
                <TextField
                  id='process_id'
                  size='small'
                  value={formData.process_id || ''}
                  onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='work_station_id'>工作站ID</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='team_id'>班组ID</InputLabel>
                <TextField
                  id='team_id'
                  size='small'
                  value={formData.team_id || ''}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
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
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='normal'>普通</MenuItem>
                    <MenuItem value='low'>低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_start_time'>计划开始时间</InputLabel>
                <TextField
                  id='planned_start_time'
                  size='small'
                  type='datetime-local'
                  value={formData.planned_start_time || ''}
                  onChange={(e) => setFormData({ ...formData, planned_start_time: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_end_time'>计划结束时间</InputLabel>
                <TextField
                  id='planned_end_time'
                  size='small'
                  type='datetime-local'
                  value={formData.planned_end_time || ''}
                  onChange={(e) => setFormData({ ...formData, planned_end_time: e.target.value })}
                />
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
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
                startIcon={<Save size={16} />}
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
        <DialogTitle>工单详情</DialogTitle>
        <DialogContent>
          {selectedWorkOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工单编号</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>{selectedWorkOrder.work_order_no}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单编号</InputLabel>
                  <Box component='span'>{selectedWorkOrder.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序名称</InputLabel>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedWorkOrder.status)}</Box>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>良品数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.good_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
                  <Box component='span'>{selectedWorkOrder.bad_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>优先级</InputLabel>
                  <Box component='span'>
                    {getPriorityText(selectedWorkOrder.priority || 'normal')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.planned_start_time
                      ? new Date(selectedWorkOrder.planned_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.planned_end_time
                      ? new Date(selectedWorkOrder.planned_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    实际开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.actual_start_time
                      ? new Date(selectedWorkOrder.actual_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    实际结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedWorkOrder.actual_end_time
                      ? new Date(selectedWorkOrder.actual_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                {selectedWorkOrder.remark && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                    <Box component='span'>{selectedWorkOrder.remark}</Box>
                  </Box>
                )}
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
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default WorkOrderPage;
