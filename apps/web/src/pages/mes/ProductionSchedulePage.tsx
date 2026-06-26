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
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ProductionSchedule,
  CreateProductionScheduleRequest,
  UpdateProductionScheduleRequest,
  AdjustScheduleRequest,
  GanttData,
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

const ProductionSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [ganttData, setGanttData] = useState<GanttData | null>(null);
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

  const { addNotification } = useAppStore();

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.schedules.list(params);
      if (response.success && response.data) {
        setSchedules(response.data.schedules || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载生产排程列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载生产排程列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  const loadGanttData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mesApi.schedules.getGanttData();
      if (response.success && response.data) {
        setGanttData(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载甘特图数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadSchedules();
    } else {
      loadGanttData();
    }
  }, [activeTab, loadSchedules, loadGanttData]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      scheduled: '已排程',
      in_progress: '执行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSchedule && !showAdjustDialog) {
        await mesApi.schedules.update(selectedSchedule.id, formData as UpdateProductionScheduleRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '生产排程信息已更新',
        });
      } else if (showAdjustDialog && selectedSchedule) {
        await mesApi.schedules.adjust(selectedSchedule.id, adjustData);
        addNotification({
          type: 'success',
          title: '调整成功',
          message: '生产排程已调整',
        });
      } else {
        await mesApi.schedules.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新生产排程已创建',
        });
      }
      setShowDialog(false);
      setShowAdjustDialog(false);
      resetForm();
      loadSchedules();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedSchedule ? '更新生产排程失败' : '创建生产排程失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个生产排程吗?')) return;
      try {
        await mesApi.schedules.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '生产排程已删除',
        });
        loadSchedules();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除生产排程',
        });
      }
    },
    [loadSchedules, addNotification]
  );

  const handleEdit = useCallback((schedule: ProductionSchedule) => {
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
  }, []);

  const handleAdjust = useCallback((schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule);
    setAdjustData({
      planned_start_time: schedule.planned_start_time,
      planned_end_time: schedule.planned_end_time,
      work_station_id: schedule.work_station_id,
      reason: '',
    });
    setShowAdjustDialog(true);
  }, []);

  const handleViewDetail = useCallback((schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailDialog(true);
  }, []);

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
      scheduled: { label: '已排程', bg: '#e0e7ff', color: '#4338ca' },
      in_progress: { label: '执行中', bg: '#dbeafe', color: 'primary.dark' },
      completed: { label: '已完成', bg: 'success.lighter', color: '#15803d' },
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

  const columns: ColumnDef<ProductionSchedule>[] = useMemo(
    () => [
      { id: 'order_number', label: '工单号', sortable: true },
      { id: 'process_name', label: '工序', sortable: true },
      { id: 'work_station_name', label: '工位', sortable: true },
      { id: 'quantity', label: '数量', sortable: true },
      {
        id: 'planned_start_time',
        label: '计划开始时间',
        render: (row) =>
          row.planned_start_time
            ? new Date(row.planned_start_time).toLocaleString('zh-CN')
            : '-',
      },
      {
        id: 'planned_end_time',
        label: '计划结束时间',
        render: (row) =>
          row.planned_end_time
            ? new Date(row.planned_end_time).toLocaleString('zh-CN')
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
          { label: '已排程', value: 'scheduled' },
          { label: '执行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
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

  const rowActions: RowAction<ProductionSchedule>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '调整排程',
        icon: <RefreshCw size={16} />,
        onClick: handleAdjust,
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
        confirmMessage: '确定要删除这个生产排程吗?',
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
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          已排程
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700, color: '#4338ca' }}>
          {stats.scheduled}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          执行中
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.in_progress}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          已完成
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.completed}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          已取消
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {stats.cancelled}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          总数
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
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
          <GanttChart size={48} strokeWidth={1.5} />
          <Typography sx={{ mt: 2 }}>暂无甘特图数据</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ minWidth: 800 }}>
          {ganttData.work_stations.map((ws) => (
            <Box key={ws.id} sx={{ mb: 2 }}>
              <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 600 }}>
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

                    let bgColor = '#6366f1';
                    if (task.status === 'in_progress') bgColor = '#3b82f6';
                    if (task.status === 'completed') bgColor = '#22c55e';
                    if (task.status === 'cancelled') bgColor = '#ef4444';

                    return (
                      <Tooltip key={task.id} title={`${task.name} - ${task.order_number}`}>
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
    <>
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Calendar size={16} />}
            iconPosition='start'
            label='排程列表'
          />
          <Tab
            icon={<GanttChart size={16} />}
            iconPosition='start'
            label='甘特图视图'
          />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <ListPageTemplate
          title='生产排程管理'
          subtitle='管理生产排程信息,包括工单、工序、工位、计划时间等'
          columns={columns}
          data={schedules}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder='搜索工单号或工序名称...'
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
              label: '新增排程',
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          rowActions={rowActions}
          headerContent={statsContent}
          emptyMessage='暂无生产排程数据'
          getRowId={(row) => row.id}
        />
      ) : (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6'>甘特图视图</Typography>
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={loadGanttData}
              size='small'
            >
              刷新
            </Button>
          </Box>
          {renderGanttView()}
        </Box>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth='md'>
        <DialogTitle>{selectedSchedule ? '编辑生产排程' : '新增生产排程'}</DialogTitle>
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
            {selectedSchedule ? '修改生产排程信息' : '填写新生产排程信息'}
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
                  onChange={(e) =>
                    setFormData({ ...formData, work_station_id: e.target.value })
                  }
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
                <FormControl fullWidth size='small'>
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
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained'>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 调整排程对话框 */}
      <Dialog open={showAdjustDialog} onClose={() => setShowAdjustDialog(false)} maxWidth='sm'>
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
              <Button type='submit' variant='contained'>
                确认调整
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth='md'>
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
                  <Box component='span' sx={{ fontWeight: 500 }}>
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
    </>
  );
};

export default ProductionSchedulePage;
