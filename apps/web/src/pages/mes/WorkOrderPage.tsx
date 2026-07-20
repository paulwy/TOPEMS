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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useResponsive } from '@/hooks/useResponsive';
import { useCrudMutations } from '@/hooks';
import { Hidden } from '@topems/shared-components';
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

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const WorkOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useResponsive();
  const theme = useTheme();

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

  const { data, isError, error, isLoading } = useQuery({
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
  });
  const workOrders = data?.workOrders || [];
  const total = data?.total || 0;
  const loading = isLoading;

  useEffect(() => {
    if (isError && error) {
      apiLogger.error(t('mes.work_order_page.list'), error);
      addNotification({
        type: 'error',
        title: t('mes.work_order_page.fail'),
        message: t('mes.work_order_page.list_1'),
      });
    }
  }, [isError, error]);

  const {
    createMutation: createWorkOrderMutation,
    updateMutation: updateWorkOrderMutation,
    deleteMutation: deleteWorkOrderMutation,
  } = useCrudMutations<CreateWorkOrderRequest, UpdateWorkOrderRequest, string>({
    queryKeyToInvalidate: ['mes-work-orders'],
    createFn: async (data) => {
      const response = await mesApi.workOrders.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建工单失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await mesApi.workOrders.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新工单失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await mesApi.workOrders.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除工单失败');
      }
      return response.data;
    },
    entityName: '工单',
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
        title: t('mes.work_order_page.update_4'),
        message: `工单状态已更新为"${getStatusText(response.data?.status)}"`,
      });
      queryClient.invalidateQueries({ queryKey: ['mes-work-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_order_page.update_5'), error);
      addNotification({
        type: 'error',
        title: t('mes.work_order_page.update_6'),
        message: t('mes.work_order_page.work_order_status_1'),
      });
    },
  });

  const handleStatusChange = async (id: string, action: string) => {
    await statusMutation.mutateAsync({ id, action });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('mes.work_order_page.text_051f08'),
      in_progress: t('mes.work_order_page.in_progress'),
      paused: t('mes.work_order_page.status_paused'),
      completed: t('mes.work_order_page.completed'),
      cancelled: t('mes.work_order_page.status_cancelled'),
      closed: t('mes.work_order_page.text_039892'),
    };
    return statusMap[status] || status;
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          {
            action: 'start',
            label: t('mes.work_order_page.production'),
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: t('mes.work_order_page.cancel'),
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      case 'in_progress':
        return [
          {
            action: 'pause',
            label: t('mes.work_order_page.action_pause'),
            icon: <Pause size={14} />,
            color: 'warning' as const,
          },
          {
            action: 'complete',
            label: t('mes.work_order_page.completed_1'),
            icon: <CheckCircle size={14} />,
            color: 'success' as const,
          },
        ];
      case 'paused':
        return [
          {
            action: 'resume',
            label: t('mes.work_order_page.action_resume'),
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: t('mes.work_order_page.cancel'),
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
      apiLogger.error(t('mes.work_order_page.operation_failed_1'), error);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('mes.work_order_page.confirm'))) return;
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
      pending: { label: t('mes.work_order_page.text_051f08'), bg: 'warning.light', color: 'warning.700' },
      in_progress: { label: t('mes.work_order_page.in_progress'), bg: 'primary.100', color: 'primary.dark' },
      paused: { label: t('mes.work_order_page.status_paused'), bg: 'grey.100', color: 'text.secondary' },
      completed: { label: t('mes.work_order_page.completed'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.work_order_page.status_cancelled'), bg: 'error.lighter', color: 'error.dark' },
      closed: { label: t('mes.work_order_page.text_039892'), bg: 'grey.200', color: 'text.primary' },
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
      urgent: { label: t('mes.work_order_page.text_cb0ed5'), bg: 'error.lighter', color: 'error.dark' },
      high: { label: t('mes.work_order_page.text_4296d7'), bg: 'warning.light', color: 'warning.700' },
      normal: { label: t('mes.work_order_page.text_35242c'), bg: 'primary.100', color: 'primary.dark' },
      low: { label: t('mes.work_order_page.text_19ac67'), bg: 'grey.100', color: 'text.secondary' },
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
    () => {
      const baseColumns = [
        { id: 'work_order_no', label: t('mes.work_order_page.column_order_no'), sortable: true },
        { id: 'quantity', label: t('mes.work_order_page.column_planned_quantity'), sortable: true },
        {
          id: 'priority',
          label: t('mes.work_order_page.field_priority'),
          render: (row: WorkOrder) => getPriorityBadge(row.priority),
        },
        {
          id: 'status',
          label: t('mes.work_order_page.filter_status'),
          render: (row: WorkOrder) => getStatusBadge(row.status),
        },
      ];

      if (isMobile) {
        return baseColumns;
      }

      if (isTablet) {
        return [
          ...baseColumns.slice(0, 1),
          { id: 'order_number', label: t('mes.work_order_page.production_1'), sortable: true },
          { id: 'completed_quantity', label: t('mes.work_order_page.completed_quantity'), sortable: true },
          ...baseColumns.slice(1),
        ];
      }

      return [
        ...baseColumns.slice(0, 1),
        { id: 'order_number', label: t('mes.work_order_page.production_1'), sortable: true },
        { id: 'process_name', label: t('mes.work_order_page.process'), sortable: true },
        { id: 'work_station_name', label: t('mes.work_order_page.text_909250'), sortable: true },
        { id: 'team_name', label: t('mes.work_order_page.team'), sortable: true },
        ...baseColumns.slice(1),
        { id: 'completed_quantity', label: t('mes.work_order_page.completed_quantity'), sortable: true },
        {
          id: 'planned_start_time',
          label: t('mes.work_order_page.field_planned_start'),
          render: (row: WorkOrder) =>
            row.planned_start_time
              ? new Date(row.planned_start_time).toLocaleDateString('zh-CN')
              : '-',
        },
        {
          id: 'planned_end_time',
          label: t('mes.work_order_page.field_planned_end'),
          render: (row: WorkOrder) =>
            row.planned_end_time ? new Date(row.planned_end_time).toLocaleDateString('zh-CN') : '-',
        },
      ];
    },
    [isMobile, isTablet]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.work_order_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.work_order_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.work_order_page.text_051f08'), value: 'pending' },
          { label: t('mes.work_order_page.in_progress'), value: 'in_progress' },
          { label: t('mes.work_order_page.status_paused'), value: 'paused' },
          { label: t('mes.work_order_page.completed'), value: 'completed' },
          { label: t('mes.work_order_page.status_cancelled'), value: 'cancelled' },
          { label: t('mes.work_order_page.text_039892'), value: 'closed' },
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
        label: t('mes.work_order_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.work_order_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.work_order_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.work_order_page.confirm'),
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
      title={t('mes.work_order_page.work_order')}
      subtitle={t('mes.work_order_page.work_order_number')}
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
        searchPlaceholder={t('mes.work_order_page.work_order_number_1')}
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
            label: t('mes.work_order_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.work_order_page.empty_message')}
        getRowId={(row) => row.id}
        mobileCardTitleKey='product_name'
        mobileCardSubtitleKey='work_order_number'
        mobileCardDisplayFields={['status', 'quantity', 'completed_quantity', 'work_center']}
        mobileCardFieldLabels={{
          status: t('mes.work_order_page.filter_status'),
          quantity: t('mes.work_order_page.column_planned_quantity'),
          completed_quantity: t('mes.work_order_page.completed_quantity'),
          work_center: t('mes.work_order_page.text_8ee6a4'),
        }}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth={isMobile ? 'sm' : 'md'}
        fullWidth={isMobile}
      >
        <DialogTitle>{selectedWorkOrder ? t('mes.work_order_page.dialog_edit_title') : t('mes.work_order_page.dialog_create_title')}</DialogTitle>
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
            {selectedWorkOrder ? t('mes.work_order_page.info') : t('mes.work_order_page.info_1')}
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
        maxWidth={isMobile ? 'sm' : 'md'}
        fullWidth={isMobile}
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
