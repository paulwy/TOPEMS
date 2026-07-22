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
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  ProductionSchedule,
  CreateProductionScheduleRequest,
  UpdateProductionScheduleRequest,
  AdjustScheduleRequest,
  GanttData,
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
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  GanttChart,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProductionSchedulePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<CreateProductionScheduleRequest>({
    order_id: '',
    planned_start_time: '',
    planned_end_time: '',
    quantity: 0,
  });
  const [adjustData, setAdjustData] = useState<AdjustScheduleRequest>({
    planned_start_time: '',
    planned_end_time: '',
    reason: '',
  });

  const { addNotification } = useNotificationStore();

  const listParams: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) listParams.search = searchTerm;
  if (statusFilter !== 'all') listParams.status = statusFilter;

  const { data: schedulesData, isLoading: listLoading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PRODUCTION_SCHEDULES, listParams],
    queryFn: async () => {
      const response = await mesApi.schedules.list(listParams);
      if (response.success && response.data) {
        return {
          schedules: response.data.schedules || [],
          total: response.data.total || 0,
        };
      }
      return { schedules: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: ganttData, isLoading: ganttLoading } = useQuery<GanttData | null>({
    queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
    queryFn: async () => {
      const response = await mesApi.schedules.getGanttData();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 1,
  });

  const loading = activeTab === 0 ? listLoading : ganttLoading;
  const schedules = schedulesData?.schedules || [];
  const total = schedulesData?.total || 0;

  const invalidateSchedules = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      scheduled: t('mes.production_schedule_page.status_scheduled'),
      in_progress: t('mes.production_schedule_page.text_46e386'),
      completed: t('mes.production_schedule_page.status_completed'),
      cancelled: t('mes.production_schedule_page.status_cancelled'),
    };
    return statusMap[status] || status;
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateProductionScheduleRequest) => mesApi.schedules.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.production_schedule_page.create'), message: t('mes.production_schedule_page.create_1') });
      invalidateSchedules();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_schedule_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.production_schedule_page.operation_failed_1'), message: t('mes.production_schedule_page.create_2') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductionScheduleRequest }) =>
      mesApi.schedules.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.production_schedule_page.update'), message: t('mes.production_schedule_page.update_1') });
      invalidateSchedules();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_schedule_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.production_schedule_page.operation_failed_1'), message: t('mes.production_schedule_page.update_2') });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustScheduleRequest }) =>
      mesApi.schedules.adjust(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.production_schedule_page.success'), message: t('mes.production_schedule_page.production') });
      invalidateSchedules();
      setShowAdjustDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_schedule_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.production_schedule_page.operation_failed_1'), message: t('mes.production_schedule_page.fail') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.schedules.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.production_schedule_page.delete_success'), message: t('mes.production_schedule_page.deleted') });
      invalidateSchedules();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_schedule_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.production_schedule_page.delete_1'), message: t('mes.production_schedule_page.delete_2') });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchedule && !showAdjustDialog) {
      updateMutation.mutate({
        id: selectedSchedule.id,
        data: formData as UpdateProductionScheduleRequest,
      });
    } else if (showAdjustDialog && selectedSchedule) {
      adjustMutation.mutate({ id: selectedSchedule.id, data: adjustData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.production_schedule_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      order_id: schedule.order_id,
      process_id: schedule.process_id,
      work_station_id: schedule.work_station_id,
      planned_start_time: schedule.planned_start_time,
      planned_end_time: schedule.planned_end_time,
      quantity: schedule.quantity,
      priority: schedule.priority,
      notes: schedule.notes,
    });
    setShowDialog(true);
  };

  const handleAdjust = (schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule);
    setAdjustData({
      planned_start_time: schedule.planned_start_time,
      planned_end_time: schedule.planned_end_time,
      work_station_id: schedule.work_station_id,
      reason: '',
    });
    setShowAdjustDialog(true);
  };

  const handleViewDetail = (schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedSchedule(null);
    setFormData({
      order_id: '',
      planned_start_time: '',
      planned_end_time: '',
      quantity: 0,
    });
    setAdjustData({
      planned_start_time: '',
      planned_end_time: '',
      reason: '',
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
      scheduled: { label: t('mes.production_schedule_page.status_scheduled'), bg: ct.secondary[100], color: 'secondary.700' },
      in_progress: { label: t('mes.production_schedule_page.text_46e386'), bg: 'primary.100', color: 'primary.dark' },
      completed: { label: t('mes.production_schedule_page.status_completed'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.production_schedule_page.status_cancelled'), bg: 'error.lighter', color: 'error.dark' },
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

  const columns: ColumnDef<ProductionSchedule>[] = useMemo(
    () => [
      { id: 'order_number', label: t('mes.production_schedule_page.field_work_order'), sortable: true },
      { id: 'process_name', label: t('mes.production_schedule_page.process'), sortable: true },
      { id: 'work_station_name', label: t('mes.production_schedule_page.text_ab5bf8'), sortable: true },
      { id: 'quantity', label: t('mes.production_schedule_page.quantity'), sortable: true },
      {
        id: 'planned_start_time',
        label: t('mes.production_schedule_page.start_time'),
        render: (row) =>
          row.planned_start_time ? new Date(row.planned_start_time).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'planned_end_time',
        label: t('mes.production_schedule_page.end_time'),
        render: (row) =>
          row.planned_end_time ? new Date(row.planned_end_time).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'status',
        label: t('mes.production_schedule_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.production_schedule_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.production_schedule_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.production_schedule_page.status_scheduled'), value: 'scheduled' },
          { label: t('mes.production_schedule_page.text_46e386'), value: 'in_progress' },
          { label: t('mes.production_schedule_page.status_completed'), value: 'completed' },
          { label: t('mes.production_schedule_page.status_cancelled'), value: 'cancelled' },
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

  const rowActions: RowAction<ProductionSchedule>[] = useMemo(
    () => [
      {
        label: t('mes.production_schedule_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.production_schedule_page.action_adjust'),
        icon: <RefreshCw size={16} />,
        onClick: handleAdjust,
      },
      {
        label: t('mes.production_schedule_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.production_schedule_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.production_schedule_page.confirm'),
      },
    ],
    [handleViewDetail, handleAdjust, handleEdit, handleDelete]
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
      total: schedules.length,
      scheduled: schedules.filter((o) => o.status === 'scheduled').length,
      in_progress: schedules.filter((o) => o.status === 'in_progress').length,
      completed: schedules.filter((o) => o.status === 'completed').length,
      cancelled: schedules.filter((o) => o.status === 'cancelled').length,
    };
  }, [schedules]);

  if (loading && activeTab === 0) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已排程
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.scheduled}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          执行中
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
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已取消
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.cancelled}
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

  const renderGanttView = () => {
    if (loading) return <LoadingSpinner />;
    if (!ganttData || ganttData.tasks.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            color: 'text.secondary',
          }}
        >
          <GanttChart
            size={48}
            strokeWidth={1.5}
          />
          <Typography sx={{ mt: 2 }}>暂无甘特图数据</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ minWidth: 800 }}>
          {ganttData.work_stations.map((ws) => (
            <Box
              key={ws.id}
              sx={{ mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ mb: 1, fontWeight: 600 }}
              >
                {ws.name}
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  height: 40,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {ganttData.tasks
                  .filter((t) => t.work_station_id === ws.id)
                  .map((task) => {
                    const start = new Date(task.start_time).getTime();
                    const end = new Date(task.end_time).getTime();
                    const totalStart = new Date(ganttData.date_range.start).getTime();
                    const totalEnd = new Date(ganttData.date_range.end).getTime();
                    const totalDuration = totalEnd - totalStart;
                    const left = ((start - totalStart) / totalDuration) * 100;
                    const width = ((end - start) / totalDuration) * 100;

                    let bgColor = ct.secondary[400];
                    if (task.status === 'in_progress') bgColor = 'primary.main';
                    if (task.status === 'completed') bgColor = 'success.main';
                    if (task.status === 'cancelled') bgColor = 'error.main';

                    return (
                      <Tooltip
                        key={task.id}
                        title={`${task.name} - ${task.order_number}`}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${left}%`,
                            width: `${Math.max(width, 2)}%`,
                            top: 4,
                            bottom: 4,
                            bgcolor: bgColor,
                            borderRadius: 0.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            color: 'white',
                            fontSize: 12,
                          }}
                        >
                          {task.name}
                        </Box>
                      </Tooltip>
                    );
                  })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Calendar style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[500]} 0%, ${ct.secondary[700]} 100%)`,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Calendar size={16} />}
            iconPosition='start'
            label={t('mes.production_schedule_page.list')}
          />
          <Tab
            icon={<GanttChart size={16} />}
            iconPosition='start'
            label={t('mes.production_schedule_page.text_136365')}
          />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <ListPageTemplate
          title=''
          subtitle=''
          columns={columns}
          data={schedules}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder={t('mes.production_schedule_page.process_name')}
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
              label: t('mes.production_schedule_page.dialog_create_title'),
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          rowActions={rowActions}
          headerContent={statsContent}
          emptyMessage={t('mes.production_schedule_page.no_data')}
          getRowId={(row) => row.id}
        />
      ) : (
        <Box>
          <Box
            sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant='h6'>甘特图视图</Typography>
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: QUERY_KEYS.MES.PRODUCTION_SCHEDULE_GANTT,
                })
              }
              size='small'
            >
              刷新
            </Button>
          </Box>
          {renderGanttView()}
        </Box>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedSchedule ? t('mes.production_schedule_page.edit') : t('mes.production_schedule_page.add')}</DialogTitle>
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
            {selectedSchedule ? t('mes.production_schedule_page.info') : t('mes.production_schedule_page.info_1')}
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
                <InputLabel htmlFor='order_id'>工单ID *</InputLabel>
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
                      quantity: parseFloat(e.target.value),
                    })
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
                <InputLabel htmlFor='work_station_id'>工位ID</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_start_time'>计划开始时间 *</InputLabel>
                <TextField
                  id='planned_start_time'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.planned_start_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      planned_start_time: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='planned_end_time'>计划结束时间 *</InputLabel>
                <TextField
                  id='planned_end_time'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.planned_end_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      planned_end_time: e.target.value,
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
                <InputLabel htmlFor='notes'>备注</InputLabel>
                <TextField
                  id='notes'
                  size='small'
                  multiline
                  rows={1}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

      {/* 调整排程对话框 */}
      <Dialog
        open={showAdjustDialog}
        onClose={() => setShowAdjustDialog(false)}
        maxWidth='sm'
      >
        <DialogTitle>调整排程</DialogTitle>
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
            调整生产排程时间或工位
          </Box>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_start_time'>计划开始时间</InputLabel>
                <TextField
                  id='adjust_start_time'
                  type='datetime-local'
                  size='small'
                  value={adjustData.planned_start_time || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, planned_start_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_end_time'>计划结束时间</InputLabel>
                <TextField
                  id='adjust_end_time'
                  type='datetime-local'
                  size='small'
                  value={adjustData.planned_end_time || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, planned_end_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_workstation'>工位ID</InputLabel>
                <TextField
                  id='adjust_workstation'
                  size='small'
                  value={adjustData.work_station_id || ''}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, work_station_id: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='adjust_reason'>调整原因</InputLabel>
                <TextField
                  id='adjust_reason'
                  size='small'
                  multiline
                  rows={2}
                  value={adjustData.reason || ''}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowAdjustDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                确认调整
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
        <DialogTitle>生产排程详情</DialogTitle>
        <DialogContent>
          {selectedSchedule && (
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
                    {selectedSchedule.order_number || '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                  <Box component='span'>{selectedSchedule.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序</InputLabel>
                  <Box component='span'>{selectedSchedule.process_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工位</InputLabel>
                  <Box component='span'>{selectedSchedule.work_station_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedSchedule.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>优先级</InputLabel>
                  <Box component='span'>{selectedSchedule.priority || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedSchedule.planned_start_time
                      ? new Date(selectedSchedule.planned_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedSchedule.planned_end_time
                      ? new Date(selectedSchedule.planned_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    实际开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedSchedule.actual_start_time
                      ? new Date(selectedSchedule.actual_start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    实际结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedSchedule.actual_end_time
                      ? new Date(selectedSchedule.actual_end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedSchedule.notes || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedSchedule.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedSchedule.updated_at).toLocaleString('zh-CN')}
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

export default ProductionSchedulePage;
