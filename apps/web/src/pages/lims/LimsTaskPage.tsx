import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Clock,
  ClipboardCheck,
  Play,
  CheckCircle,
  X,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  LinearProgress,
  Avatar,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import type {
  Sample,
  InspectionProcess,
  InspectionTask,
  InspectionRecord,
  CreateInspectionTaskRequest,
  CreateInspectionRecordRequest,
  LimsStatistics,
} from '@/api/lims';
import { limsApi } from '@/api/lims';
import { GRADIENTS } from '@/constants/colors';
import { PageHeader } from '@/components/templates/PageHeader';
import { CardListTemplate } from '@/components/templates/CardListTemplate';
import { apiLogger } from '@/utils/logger';

const LimsTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [processes, setProcesses] = useState<InspectionProcess[]>([]);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [stats, setStats] = useState<LimsStatistics>({
    total_samples: 0,
    pending_samples: 0,
    testing_samples: 0,
    completed_samples: 0,
    cancelled_samples: 0,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    total_processes: 0,
    total_instruments: 0,
    normal_instruments: 0,
    calibration_instruments: 0,
    maintenance_instruments: 0,
    disabled_instruments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    lims: false,
  });

  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  const checkServiceStatus = async (
    serviceName: string,
    port: number,
    setStatus: (up: boolean) => void
  ) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('lims', 8022, (up) =>
        setServiceStatuses((prev) => ({ ...prev, lims: up }))
      );
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [selectedTaskRecords, setSelectedTaskRecords] = useState<InspectionRecord[]>([]);
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
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isServiceUp('lims')) {
      loadAllData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceStatuses.lims]);

  const loadStatistics = async () => {
    try {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      apiLogger.error('加载统计数据失败:', err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSamples(), loadProcesses(), loadTasks(), loadStatistics()]);
    } finally {
      setLoading(false);
    }
  };

  const adaptSample = (s: any): Sample => {
    return {
      ...s,
      received_date: s.received_date || s.created_at,
    };
  };

  const loadSamples = async () => {
    try {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        let sampleData = response.data as any;
        let rawSamples: any[] = [];

        if (Array.isArray(sampleData)) {
          rawSamples = sampleData;
        } else if (sampleData.samples && Array.isArray(sampleData.samples)) {
          rawSamples = sampleData.samples;
        }

        const adaptedSamples = rawSamples.map((s) => adaptSample(s));
        setSamples(adaptedSamples);
      } else {
        setSamples([]);
      }
    } catch (err) {
      apiLogger.error('加载样品失败:', err);
      setSamples([]);
    }
  };

  const loadProcesses = async () => {
    try {
      const response = await limsApi.listProcesses();
      if (response.success && response.data) {
        let processData = response.data as any;
        let rawProcesses: any[] = [];

        if (Array.isArray(processData)) {
          rawProcesses = processData;
        } else if (processData.processes && Array.isArray(processData.processes)) {
          rawProcesses = processData.processes;
        }

        setProcesses(rawProcesses);
      } else {
        setProcesses([]);
      }
    } catch (err) {
      apiLogger.error('加载检验流程失败:', err);
      setProcesses([]);
    }
  };

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '待测试',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已终止',
      received: '待测试',
    };
    return statusMap[status] || status;
  };

  const adaptTask = (t: any): InspectionTask => {
    return {
      ...t,
      status: mapStatusToChinese(t.status),
    };
  };

  const loadTasks = async () => {
    try {
      const response = await limsApi.listTasks();
      if (response.success && response.data) {
        let taskData = response.data as any;
        let rawTasks: any[] = [];

        if (Array.isArray(taskData)) {
          rawTasks = taskData;
        } else if (taskData.tasks && Array.isArray(taskData.tasks)) {
          rawTasks = taskData.tasks;
        }

        const adaptedTasks = rawTasks.map((t) => adaptTask(t));
        setTasks(adaptedTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      apiLogger.error('加载检验任务失败:', err);
      setTasks([]);
    }
  };

  const loadTaskRecords = async (taskId: string) => {
    try {
      const response = await limsApi.listRecordsByTask(taskId);
      if (response.success && response.data) {
        let recordData = response.data as any;
        let rawRecords: any[] = [];

        if (Array.isArray(recordData)) {
          rawRecords = recordData;
        } else if (recordData.records && Array.isArray(recordData.records)) {
          rawRecords = recordData.records;
        } else {
          rawRecords = [];
        }

        setSelectedTaskRecords(rawRecords);
      } else {
        setSelectedTaskRecords([]);
      }
    } catch (err) {
      apiLogger.error('加载检验记录失败:', err);
      setSelectedTaskRecords([]);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleCreateTask = async () => {
    if (!taskFormData.sample_id || !taskFormData.process_id || !taskFormData.inspector.trim()) {
      showNotification('error', '请填写完整信息');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.createTask(taskFormData);
      if (response.success) {
        showNotification('success', '检验任务创建成功');
        setShowTaskModal(false);
        loadTasks();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建检验任务失败');
      apiLogger.error('创建检验任务失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!recordFormData.result.trim()) {
      showNotification('error', '请输入检验结果');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.completeStep(selectedTask!.id, recordFormData);
      if (response.success) {
        showNotification('success', '检验步骤完成');
        setShowRecordModal(false);
        loadTasks();
        if (selectedTask) {
          loadTaskRecords(selectedTask.id);
        }
      } else {
        showNotification('error', response.message || '操作失败');
      }
    } catch (err) {
      showNotification('error', '完成检验步骤失败');
      apiLogger.error('完成检验步骤失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const openTaskDetailModal = async (task: InspectionTask) => {
    setSelectedTask(task);
    await loadTaskRecords(task.id);
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
    if (!status) return { bgcolor: '#f1f5f9', color: '#475569' };
    switch (status) {
      case '进行中':
        return { bgcolor: '#dbeafe', color: '#1d4ed8' };
      case '已完成':
        return { bgcolor: '#dcfce7', color: '#15803d' };
      case '已终止':
        return { bgcolor: '#fee2e2', color: '#b91c1c' };
      case '待测试':
        return { bgcolor: '#fef3c7', color: '#b45309' };
      case '测试中':
        return { bgcolor: '#f3e8ff', color: '#7e22ce' };
      default:
        return { bgcolor: '#f1f5f9', color: '#475569' };
    }
  };

  const filteredTasks = safeTasks.filter(
    (t) =>
      getSampleName(t.sample_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessName(t.process_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 统计概览配置
  const metricStats = [
    {
      id: 'total',
      title: '任务总数',
      value: safeTasks.length,
      icon: <ClipboardCheck size={24} />,
      gradient: ['#6366F1', '#4F46E5'] as [string, string],
    },
    {
      id: 'in_progress',
      title: '进行中',
      value: safeTasks.filter((t) => t.status === '进行中').length,
      icon: <Clock size={24} />,
      color: 'primary' as const,
    },
    {
      id: 'completed',
      title: '已完成',
      value: safeTasks.filter((t) => t.status === '已完成').length,
      icon: <CheckCircle size={24} />,
      color: 'success' as const,
    },
    {
      id: 'pending',
      title: '待测试',
      value: safeTasks.filter((t) => t.status === '待测试').length,
      icon: <Clock size={24} />,
      color: 'warning' as const,
    },
  ];

  // 卡片配置
  const cardConfig = {
    title: (item: InspectionTask) => getSampleName(item.sample_id),
    description: (item: InspectionTask) => `检验流程: ${getProcessName(item.process_id)}`,
    status: {
      field: 'status',
      options: {
        进行中: { label: '进行中', color: 'primary' },
        已完成: { label: '已完成', color: 'success' },
        已终止: { label: '已终止', color: 'error' },
        待测试: { label: '待测试', color: 'warning' },
      },
    },
    meta: [
      {
        field: 'process_id',
        label: '检验流程',
        format: (_: any, item: InspectionTask) => getProcessName(item.process_id),
      },
      {
        field: 'current_step',
        label: '当前步骤',
        format: (_: any, item: InspectionTask) => getCurrentStepName(item),
      },
      {
        field: 'inspector',
        label: '检验员',
      },
      {
        field: 'started_at',
        label: '开始时间',
        format: (value: string) => new Date(value).toLocaleDateString('zh-CN'),
      },
    ],
    icon: <ClipboardCheck size={24} />,
    iconBgColor: '#e0e7ff',
  };

  // 卡片操作
  const cardActions = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (item: InspectionTask) => openTaskDetailModal(item),
      color: 'primary' as const,
      variant: 'text' as const,
    },
    {
      label: '完成步骤',
      icon: <CheckCircle size={16} />,
      onClick: (item: InspectionTask) => openRecordModal(item),
      color: 'success' as const,
      variant: 'text' as const,
      disabled: (item: InspectionTask) => item.status !== '进行中',
    },
  ];

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

  if (!isServiceUp('lims')) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 3,
              bgcolor: 'info.light',
            }}
          >
            <ClipboardList
              size={32}
              color='#0891b2'
            />
          </Avatar>
          <Typography
            variant='h5'
            sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}
          >
            实验室管理服务未启动
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mb: 3 }}
          >
            LIMS 服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
          </Typography>
          <Button
            variant='contained'
            color='primary'
            onClick={() => navigate('/dashboard')}
          >
            返回首页
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      }}
    >
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || 'success'}
          variant='filled'
          sx={{ borderRadius: 2 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <CardListTemplate
        title='检验任务'
        subtitle='Inspection Tasks'
        data={filteredTasks}
        cardConfig={cardConfig}
        cardActions={cardActions}
        metricStats={metricStats}
        metricColumns={4}
        loading={loading}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索样品...',
        }}
        addButton={{
          text: '新建任务',
          icon: <Play style={{ width: 18, height: 18 }} />,
          onClick: () => setShowTaskModal(true),
        }}
        onRefresh={loadAllData}
        onCardClick={openTaskDetailModal}
        emptyState={{
          emoji: '📋',
          title: '暂无检验任务',
          description: '点击上方按钮创建新的检验任务',
        }}
        gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
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
          <IconButton
            size='small'
            onClick={() => setShowTaskModal(false)}
          >
            <X size={20} />
          </IconButton>
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
                onChange={(e) =>
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
                onChange={(e) =>
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
          <IconButton
            size='small'
            onClick={() => setShowRecordModal(false)}
          >
            <X size={20} />
          </IconButton>
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
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  conclusion: e.target.value,
                })
              }
              placeholder='请输入检验结论'
            />
            <TextField
              label='检验员'
              required
              fullWidth
              value={recordFormData.inspector}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  inspector: e.target.value,
                })
              }
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
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 3 }}>
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
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'semibold' }}
                >
                  检验任务详情
                </Typography>
                <IconButton onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </IconButton>
              </Box>

              <Stack spacing={3}>
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'semibold' }}
                    >
                      {getSampleName(selectedTask.sample_id)}
                    </Typography>
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
                  <Typography
                    color='text.secondary'
                    sx={{ mb: 1 }}
                  >
                    检验流程: {getProcessName(selectedTask.process_id)}
                  </Typography>
                  <Typography
                    color='secondary.main'
                    sx={{ fontWeight: 'medium' }}
                  >
                    当前步骤: {getCurrentStepName(selectedTask)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr' },
                    gap: 2,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1.5,
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
                    <Typography
                      sx={{
                        ...{ fontFamily: 'monospace', fontSize: 14 },
                        fontWeight: 'medium',
                      }}
                    >
                      {selectedTask.id}
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
                    <Typography sx={{ fontWeight: 'medium' }}>{selectedTask.inspector}</Typography>
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
                      {new Date(selectedTask.started_at).toLocaleString('zh-CN')}
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
                  <Typography sx={{ ...{ mb: 1.5 }, fontWeight: 'semibold' }}>检验记录</Typography>
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
                        <Paper
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
                            <Typography
                              sx={{ fontWeight: 'medium' }}
                              color='secondary.main'
                            >
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
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => setShowDetailModal(false)}
                    variant='contained'
                    color='inherit'
                    sx={{
                      bgcolor: 'grey.100',
                      '&:hover': { bgcolor: 'grey.200' },
                    }}
                  >
                    关闭
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LimsTaskPage;
