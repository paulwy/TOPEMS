import React, { useState } from 'react';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  ClipboardList,
  Plus,
  Eye,
  Play,
  CheckCircle,
  X,
  UserPlus,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import type { SelectChangeEvent } from '@mui/material';
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
  MenuItem,
  Button,
  Avatar,
  Stack,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Divider,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import {
  limsApi,
  type Sample,
  type InspectionProcess,
  type InspectionTask,
  type InspectionRecord,
  type CreateInspectionTaskRequest,
  type CreateInspectionRecordRequest,
} from '@/api/lims';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { GRADIENTS } from '@topems/shared-constants';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const ct = designTokens.colors;

interface RawTask extends Partial<InspectionTask> {
  status?: string;
}

interface LimsListResponse<T> {
  items?: T[];
  samples?: T[];
  processes?: T[];
  tasks?: T[];
  records?: T[];
}

const InspectionTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<CreateInspectionTaskRequest>({
    sample_id: '',
    process_id: '',
    inspector: '',
  });
  const [recordFormData, setRecordFormData] = useState<CreateInspectionRecordRequest>({
    task_id: '',
    step_id: '',
    step_name: '',
    result: '',
    conclusion: '',
    inspector: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '待分配',
      assigned: '已分配',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已终止',
      received: '待分配',
    };
    return statusMap[status] || status;
  };

  const { data: samplesData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLES,
    queryFn: async () => {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        const sampleData = response.data as LimsListResponse<Sample> | Sample[];
        if (Array.isArray(sampleData)) return sampleData;
        if (sampleData.samples && Array.isArray(sampleData.samples)) return sampleData.samples;
        if (sampleData.items && Array.isArray(sampleData.items)) return sampleData.items;
      }
      return [];
    },
  });

  const { data: processesData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.PROCESSES,
    queryFn: async () => {
      const response = await limsApi.listProcesses();
      if (response.success && response.data) {
        const processData = response.data as
          LimsListResponse<InspectionProcess> | InspectionProcess[];
        if (Array.isArray(processData)) return processData;
        if (processData.processes && Array.isArray(processData.processes))
          return processData.processes;
        if (processData.items && Array.isArray(processData.items)) return processData.items;
      }
      return [];
    },
  });

  const { data: tasksData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.TASKS,
    queryFn: async () => {
      const response = await limsApi.listTasks();
      if (response.success && response.data) {
        const taskData = response.data as LimsListResponse<RawTask> | RawTask[];
        let rawTasks: RawTask[] = [];
        if (Array.isArray(taskData)) {
          rawTasks = taskData;
        } else if (taskData.tasks && Array.isArray(taskData.tasks)) {
          rawTasks = taskData.tasks;
        } else if (taskData.items && Array.isArray(taskData.items)) {
          rawTasks = taskData.items;
        }
        const adaptedTasks = rawTasks.map((t: RawTask) => ({
          ...t,
          status: mapStatusToChinese(t.status || ''),
        }));
        return adaptedTasks as InspectionTask[];
      }
      return [];
    },
  });

  const { data: taskRecordsData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.RECORDS_BY_TASK(selectedTask?.id || ''),
    queryFn: async () => {
      if (!selectedTask) return [];
      const response = await limsApi.listRecordsByTask(selectedTask.id);
      if (response.success && response.data) {
        const recordData = response.data as LimsListResponse<InspectionRecord> | InspectionRecord[];
        if (Array.isArray(recordData)) return recordData;
        if (recordData.records && Array.isArray(recordData.records)) return recordData.records;
        if (recordData.items && Array.isArray(recordData.items)) return recordData.items;
      }
      return [];
    },
    enabled: !!selectedTask && showDetailModal,
  });

  const samples = samplesData || [];
  const processes = processesData || [];
  const tasks = tasksData || [];
  const selectedTaskRecords = taskRecordsData || [];

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateInspectionTaskRequest) => {
      const response = await limsApi.createTask(data);
      if (!response.success) {
        throw new Error(response.message || '创建失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.TASKS });
      setShowTaskModal(false);
    },
    onError: (error: unknown) => {
      logger.error('创建检验任务失败:', error);
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateInspectionRecordRequest }) => {
      const response = await limsApi.completeStep(id, data);
      if (!response.success) {
        throw new Error(response.message || '操作失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.TASKS });
      if (selectedTask) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LIMS.RECORDS_BY_TASK(selectedTask.id),
        });
      }
      setShowRecordModal(false);
    },
    onError: (error: unknown) => {
      logger.error('完成检验步骤失败:', error);
    },
  });

  const creating = createTaskMutation.isPending || completeStepMutation.isPending;

  const handleCreateTask = async () => {
    if (!taskFormData.sample_id || !taskFormData.process_id || !taskFormData.inspector.trim()) {
      addNotification({
        title: '错误',
        message: '请填写完整信息',
        type: 'error',
      });
      return;
    }
    await createTaskMutation.mutateAsync(taskFormData);
  };

  const handleCompleteStep = async () => {
    if (!selectedTask) return;
    if (!recordFormData.result.trim()) {
      addNotification({
        title: '错误',
        message: '请输入检验结果',
        type: 'error',
      });
      return;
    }
    await completeStepMutation.mutateAsync({
      id: selectedTask.id,
      data: recordFormData,
    });
  };

  const openTaskDetailModal = (task: InspectionTask) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const openRecordModal = (task: InspectionTask) => {
    const process = processes.find((p) => p.id === task.process_id);
    const currentStepObj = process?.steps.find((_, idx) => idx + 1 === task.current_step);

    setRecordFormData({
      task_id: task.id,
      step_id: currentStepObj?.id || '',
      step_name: currentStepObj?.name || '',
      result: '',
      conclusion: '',
      inspector: '',
    });
    setShowRecordModal(true);
  };

  const safeSamples = Array.isArray(samples) ? samples : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const getSampleName = (sampleId: string) => {
    const sample = safeSamples.find((s) => s.id === sampleId);
    return sample ? sample.name : '未知样品';
  };

  const getProcessName = (processId: string) => {
    const process = safeProcesses.find((p) => p.id === processId);
    return process ? process.name : '未知流程';
  };

  const getCurrentStepName = (task: InspectionTask) => {
    const process = safeProcesses.find((p) => p.id === task.process_id);
    if (!process) return '未知步骤';
    const step = process.steps[task.current_step - 1];
    return step ? step.name : '已完成';
  };

  const getStatusColor = (status: string): { bgcolor: string; color: string } => {
    if (!status) return { bgcolor: 'grey.100', color: 'text.secondary' };
    switch (status) {
      case '进行中':
        return { bgcolor: 'primary.light', color: 'primary.dark' };
      case '已完成':
        return { bgcolor: 'success.lighter', color: 'success.dark' };
      case '已终止':
        return { bgcolor: 'error.lighter', color: 'error.dark' };
      case '待分配':
        return { bgcolor: 'warning.light', color: 'warning.dark' };
      case '已分配':
        return { bgcolor: 'secondary.light', color: 'secondary.dark' };
      default:
        return { bgcolor: 'grey.100', color: 'text.secondary' };
    }
  };

  const filteredTasks = safeTasks.filter((t) => {
    const matchesSearch =
      getSampleName(t.sample_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessName(t.process_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.task_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredTasks.slice(page * pageSize, page * pageSize + pageSize);

  const columns: ColumnDef<InspectionTask>[] = [
    {
      id: 'task_no',
      label: '任务编号',
      render: (row) => row.task_no || row.id,
    },
    {
      id: 'sample_name',
      label: '样品名称',
      render: (row) => getSampleName(row.sample_id),
    },
    {
      id: 'process_name',
      label: '检验流程',
      render: (row) => getProcessName(row.process_id),
    },
    {
      id: 'current_step',
      label: '当前步骤',
      render: (row) => getCurrentStepName(row),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={row.status}
          size='small'
          sx={{
            backgroundColor: getStatusColor(row.status).bgcolor,
            color: getStatusColor(row.status).color,
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      id: 'inspector',
      label: '检验员',
      render: (row) => row.inspector || '-',
    },
    {
      id: 'started_at',
      label: '开始时间',
      render: (row) =>
        row.started_at ? new Date(row.started_at).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const rowActions: RowAction<InspectionTask>[] = [
    {
      label: '查看详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => openTaskDetailModal(row),
    },
    {
      label: '执行检验',
      icon: <Play style={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status === '进行中' || row.status === '已分配',
      onClick: (row) => openRecordModal(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待分配', value: '待分配' },
        { label: '已分配', value: '已分配' },
        { label: '进行中', value: '进行中' },
        { label: '已完成', value: '已完成' },
        { label: '已终止', value: '已终止' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const stats = {
    total: safeTasks.length,
    pending: safeTasks.filter((t) => t.status === '待分配' || t.status === '已分配').length,
    inProgress: safeTasks.filter((t) => t.status === '进行中').length,
    completed: safeTasks.filter((t) => t.status === '已完成').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.light',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck sx={{ width: 20, height: 20, color: 'secondary.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                任务总数
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
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待执行
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
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
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
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: GRADIENTS.accent,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress
            sx={{ width: 240, mb: 3, borderRadius: 1 }}
            color='secondary'
          />
          <Typography color='text.secondary'>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='检验任务'
      subtitle='Inspection Task Management'
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '检验任务' },
        ]}
        backButton={{ onClick: () => navigate(DASHBOARD_PATHS.dashboard) }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索任务编号或样品名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredTasks.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新建任务',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: () => setShowTaskModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            新建检验任务
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>样品</InputLabel>
              <Select
                value={taskFormData.sample_id}
                label='样品'
                onChange={(e: SelectChangeEvent<string>) =>
                  setTaskFormData({
                    ...taskFormData,
                    sample_id: e.target.value,
                  })
                }
              >
                <MenuItem value=''>请选择样品</MenuItem>
                {safeSamples.map((sample) => (
                  <MenuItem
                    key={sample.id}
                    value={sample.id}
                  >
                    {sample.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>检验流程</InputLabel>
              <Select
                value={taskFormData.process_id}
                label='检验流程'
                onChange={(e: SelectChangeEvent<string>) =>
                  setTaskFormData({
                    ...taskFormData,
                    process_id: e.target.value,
                  })
                }
              >
                <MenuItem value=''>请选择流程</MenuItem>
                {safeProcesses.map((process) => (
                  <MenuItem
                    key={process.id}
                    value={process.id}
                  >
                    {process.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='检验员'
              required
              fullWidth
              value={taskFormData.inspector}
              onChange={(e) => setTaskFormData({ ...taskFormData, inspector: e.target.value })}
              placeholder='请输入检验员姓名'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowTaskModal(false)}
            variant='outlined'
            color='inherit'
          >
            取消
          </Button>
          <Button
            onClick={handleCreateTask}
            disabled={creating}
            variant='contained'
            color='secondary'
          >
            {creating ? '创建中...' : '创建任务'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            完成检验步骤
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                当前步骤
              </Typography>
              <Typography
                color='secondary.main'
                sx={{ fontWeight: 'medium' }}
              >
                {recordFormData.step_name}
              </Typography>
            </Box>
            <TextField
              label='检验结果'
              required
              fullWidth
              multiline
              rows={4}
              value={recordFormData.result}
              onChange={(e) => setRecordFormData({ ...recordFormData, result: e.target.value })}
              placeholder='请输入检验结果'
            />
            <TextField
              label='结论'
              fullWidth
              multiline
              rows={2}
              value={recordFormData.conclusion}
              onChange={(e) => setRecordFormData({ ...recordFormData, conclusion: e.target.value })}
              placeholder='请输入检验结论'
            />
            <TextField
              label='检验员'
              required
              fullWidth
              value={recordFormData.inspector}
              onChange={(e) => setRecordFormData({ ...recordFormData, inspector: e.target.value })}
              placeholder='请输入检验员姓名'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRecordModal(false)}
            variant='outlined'
            color='inherit'
          >
            取消
          </Button>
          <Button
            onClick={handleCompleteStep}
            disabled={creating}
            variant='contained'
            color='success'
          >
            {creating ? '处理中...' : '完成步骤'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            检验任务详情
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'semibold', mb: 0.5 }}
                  >
                    {getSampleName(selectedTask.sample_id)}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    检验流程: {getProcessName(selectedTask.process_id)}
                  </Typography>
                </Box>
                <Chip
                  size='small'
                  label={selectedTask.status}
                  sx={{
                    bgcolor: getStatusColor(selectedTask.status).bgcolor,
                    color: getStatusColor(selectedTask.status).color,
                    fontWeight: 500,
                    px: 1.5,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr' },
                  gap: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1.5,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    任务编号
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 'medium' }}>
                    {selectedTask.task_no || selectedTask.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    当前步骤
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {getCurrentStepName(selectedTask)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    检验员
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {selectedTask.inspector || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    开始时间
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {selectedTask.started_at
                      ? new Date(selectedTask.started_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    完成时间
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {selectedTask.completed_at
                      ? new Date(selectedTask.completed_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ mb: 2, fontWeight: 'semibold' }}>检验记录</Typography>
                {selectedTaskRecords.length === 0 ? (
                  <Typography
                    color='text.secondary'
                    sx={{ textAlign: 'center', py: 2 }}
                  >
                    暂无检验记录
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {selectedTaskRecords.map((record, idx) => (
                      <Card
                        key={record.id}
                        variant='outlined'
                        sx={{ p: 2, borderRadius: 1.5 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography sx={{ fontWeight: 'medium', color: 'secondary.main' }}>
                            步骤 {idx + 1}: {record.step_name}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {new Date(record.recorded_at).toLocaleString('zh-CN')}
                          </Typography>
                        </Box>
                        <Typography sx={{ mb: 1 }}>结果: {record.result}</Typography>
                        {record.conclusion && (
                          <Typography
                            variant='body2'
                            color='success.main'
                            sx={{ mb: 1 }}
                          >
                            结论: {record.conclusion}
                          </Typography>
                        )}
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          检验员: {record.inspector}
                        </Typography>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDetailModal(false)}
            variant='contained'
            color='inherit'
            sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default InspectionTaskPage;
