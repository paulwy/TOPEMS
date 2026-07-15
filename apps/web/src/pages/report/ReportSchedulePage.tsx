import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormGroup,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Play as PlayIcon,
  History as HistoryIcon,
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportApi,
  type ReportSchedule,
  type ReportTemplate,
  type CreateScheduleRequest,
  type UpdateScheduleRequest,
  type ScheduleType,
  type ScheduleStatus,
  type ScheduleExecutionRecord,
} from '@/api/report';
import { logger } from '@/utils/logger';

const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'cron', label: 'Cron表达式' },
  { value: 'interval', label: '时间间隔' },
  { value: 'one_time', label: '一次性' },
];

const SCHEDULE_STATUS_OPTIONS: {
  value: ScheduleStatus;
  label: string;
  color: string;
}[] = [
  { value: 'active', label: '运行中', color: 'success' },
  { value: 'paused', label: '已暂停', color: 'warning' },
  { value: 'completed', label: '已完成', color: 'info' },
  { value: 'failed', label: '执行失败', color: 'error' },
];

const ReportSchedulePage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<ReportSchedule | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ScheduleExecutionRecord[]>([]);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<CreateScheduleRequest | UpdateScheduleRequest>({
    name: '',
    template_id: '',
    schedule_type: 'cron',
    schedule_expression: '',
    recipients: [],
  });

  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['report-schedules'],
    queryFn: async () => {
      const response = await reportApi.listSchedules();
      if (!response.success) {
        throw new Error(response.message || '获取定时任务列表失败');
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const response = await reportApi.listTemplates();
      if (!response.success) {
        throw new Error(response.message || '获取报表模板失败');
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateScheduleRequest) => {
      const response = await reportApi.createSchedule(data);
      if (!response.success) {
        throw new Error(response.message || '创建定时任务失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || '创建定时任务失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateScheduleRequest }) => {
      const response = await reportApi.updateSchedule(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新定时任务失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || '更新定时任务失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reportApi.deleteSchedule(id);
      if (!response.success) {
        throw new Error(response.message || '删除定时任务失败');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || '删除定时任务失败');
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reportApi.executeSchedule(id);
      if (!response.success) {
        throw new Error(response.message || '执行定时任务失败');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
    onError: (err: unknown) => {
      setError((err as Error).message || '执行定时任务失败');
    },
  });

  const historyQuery = useQuery({
    queryKey: ['report-schedule-history', currentSchedule?.id],
    queryFn: async () => {
      if (!currentSchedule?.id) return [];
      const response = await reportApi.getExecutionHistory(currentSchedule.id);
      if (!response.success) {
        throw new Error(response.message || '获取执行历史失败');
      }
      return response.data || [];
    },
    enabled: historyDialogOpen && !!currentSchedule?.id,
    staleTime: 1 * 60 * 1000,
  });

  const schedules = schedulesQuery.data || [];
  const templates = templatesQuery.data || [];
  const loading =
    schedulesQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    executeMutation.isPending;

  const handleOpenCreateDialog = () => {
    setEditMode(false);
    setCurrentSchedule(null);
    setError('');
    setFormData({
      name: '',
      template_id: '',
      schedule_type: 'cron',
      schedule_expression: '',
      recipients: [],
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (schedule: ReportSchedule) => {
    setEditMode(true);
    setCurrentSchedule(schedule);
    setError('');
    setFormData({
      name: schedule.name,
      template_id: schedule.template_id,
      schedule_type: schedule.schedule_type,
      schedule_expression: schedule.schedule_expression,
      recipients: schedule.recipients,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError('');
    setFormData({
      name: '',
      template_id: '',
      schedule_type: 'cron',
      schedule_expression: '',
      recipients: [],
    });
  };

  const handleFormChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...(formData.recipients || [])];
    newRecipients[index] = value;
    setFormData((prev) => ({ ...prev, recipients: newRecipients }));
  };

  const handleAddRecipient = () => {
    setFormData((prev) => ({
      ...prev,
      recipients: [...(prev.recipients || []), ''],
    }));
  };

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = (formData.recipients || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, recipients: newRecipients }));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      if (editMode && currentSchedule) {
        await updateMutation.mutateAsync({
          id: currentSchedule.id,
          data: formData as UpdateScheduleRequest,
        });
      } else {
        await createMutation.mutateAsync(formData as CreateScheduleRequest);
      }
      setDialogOpen(false);
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个定时任务吗？')) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleExecute = async (id: string) => {
    setError('');
    try {
      await executeMutation.mutateAsync(id);
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleViewHistory = async (schedule: ReportSchedule) => {
    setCurrentSchedule(schedule);
    setError('');
    setHistoryDialogOpen(true);
  };

  const getStatusChip = (status: ScheduleStatus) => {
    const statusInfo = SCHEDULE_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any}
        size='small'
      />
    );
  };

  const getScheduleTypeLabel = (type: ScheduleType) => {
    return SCHEDULE_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
  };

  return (
    <PageContainer
      title='定时任务管理'
      subtitle='管理报表定时任务，支持 Cron 表达式、时间间隔和一次性任务'
      headerProps={{
        actions: [
          {
            label: '新建任务',
            icon: <PlusIcon />,
            onClick: handleOpenCreateDialog,
            variant: 'contained',
          },
        ],
      }}
    >
      {(error || schedulesQuery.error) && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
        >
          {error || (schedulesQuery.error as Error)?.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>任务名称</TableCell>
                  <TableCell>报表模板</TableCell>
                  <TableCell>调度类型</TableCell>
                  <TableCell>执行表达式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>执行次数</TableCell>
                  <TableCell>上次执行</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      <Typography variant='body1'>加载中...</Typography>
                    </TableCell>
                  </TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      <Typography variant='body1'>暂无定时任务</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.name}</TableCell>
                      <TableCell>{schedule.template_name || schedule.template_id}</TableCell>
                      <TableCell>{getScheduleTypeLabel(schedule.schedule_type)}</TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          noWrap
                        >
                          {schedule.schedule_expression}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(schedule.status)}</TableCell>
                      <TableCell>{schedule.run_count}</TableCell>
                      <TableCell>
                        {schedule.last_run_at ? (
                          <Typography variant='body2'>
                            {new Date(schedule.last_run_at).toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            从未执行
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title='执行'>
                            <IconButton
                              size='small'
                              color='primary'
                              onClick={() => handleExecute(schedule.id)}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='查看历史'>
                            <IconButton
                              size='small'
                              color='info'
                              onClick={() => handleViewHistory(schedule)}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='编辑'>
                            <IconButton
                              size='small'
                              color='warning'
                              onClick={() => handleOpenEditDialog(schedule)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='删除'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editMode ? '编辑定时任务' : '新建定时任务'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label='任务名称'
              value={formData.name as string}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <FormControl
              fullWidth
              required
            >
              <InputLabel>报表模板</InputLabel>
              <Select
                value={(formData as CreateScheduleRequest).template_id as string}
                onChange={(e) => handleFormChange('template_id', e.target.value)}
                label='报表模板'
              >
                {templates.map((template) => (
                  <MenuItem
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>调度类型</InputLabel>
              <Select
                value={(formData as CreateScheduleRequest).schedule_type as ScheduleType}
                onChange={(e) => handleFormChange('schedule_type', e.target.value)}
                label='调度类型'
              >
                {SCHEDULE_TYPE_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='执行表达式'
              value={formData.schedule_expression as string}
              onChange={(e) => handleFormChange('schedule_expression', e.target.value)}
              fullWidth
              required
              helperText={
                (formData as CreateScheduleRequest).schedule_type === 'cron'
                  ? '例如: 0 0 8 * * * (每天早上8点)'
                  : (formData as CreateScheduleRequest).schedule_type === 'interval'
                    ? '例如: 1 hour (每小时)'
                    : '例如: 2024-01-15 08:00:00'
              }
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ mb: 2 }}
              >
                接收人邮箱
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(formData.recipients as string[]).map((recipient, index) => (
                  <Box
                    key={index}
                    sx={{ display: 'flex', gap: 1 }}
                  >
                    <TextField
                      label={`接收人 ${index + 1}`}
                      value={recipient}
                      onChange={(e) => handleRecipientChange(index, e.target.value)}
                      fullWidth
                    />
                    <IconButton
                      onClick={() => handleRemoveRecipient(index)}
                      color='error'
                    >
                      <XIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant='outlined'
                  startIcon={<PlusIcon />}
                  onClick={handleAddRecipient}
                  sx={{ mt: 1 }}
                >
                  添加接收人
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
          >
            {editMode ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>执行历史</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>执行时间</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>输出路径</TableCell>
                  <TableCell>错误信息</TableCell>
                  <TableCell>完成时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography variant='body1'>加载中...</Typography>
                    </TableCell>
                  </TableRow>
                ) : (historyQuery.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography variant='body1'>暂无执行记录</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (historyQuery.data || []).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.started_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          color={record.status === 'completed' ? 'success' : 'error'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          noWrap
                        >
                          {record.output_path || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          color='error'
                        >
                          {record.error_message || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {record.completed_at ? (
                          <Typography variant='body2'>
                            {new Date(record.completed_at).toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            执行中
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ReportSchedulePage;
