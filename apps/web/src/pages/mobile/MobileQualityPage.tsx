import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  useTheme,
  List,
  Divider,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  ClipboardCheck,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Plus,
  Barcode,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MobileLayout,
  PullToRefresh,
  MobileSkeleton,
  MobileCard,
  MobileButton,
} from '@/components/mobile';
import { useNotificationStore, useAuthStore } from '@/store';
import { mobileApi, type QualityTask, type DefectRecord } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';

const MobileQualityPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<QualityTask | null>(null);
  const [defectForm, setDefectForm] = useState({
    defect_type: '',
    severity: 'minor' as DefectRecord['severity'],
    quantity: 1,
    description: '',
  });

  const tabs = ['质检任务', '缺陷上报'];

  const queryClient = useQueryClient();

  const tasksQuery = useQuery<QualityTask[]>({
    queryKey: ['mobile-quality-tasks', user?.fullName],
    queryFn: async () => {
      const mockTasks: QualityTask[] = [
        {
          id: '1',
          task_no: 'QT-2024-06-001',
          type: 'incoming',
          product_name: '电子元件 电阻10kΩ',
          batch_no: 'B20240601',
          quantity: 5000,
          status: 'pending',
          inspector: user?.fullName || '',
          due_date: '2024-06-28',
          created_at: '2024-06-28T08:00:00Z',
        },
        {
          id: '2',
          task_no: 'QT-2024-06-002',
          type: 'process',
          product_name: 'PCB电路板焊接',
          batch_no: 'B20240602',
          quantity: 1000,
          status: 'in_progress',
          inspector: user?.fullName || '',
          due_date: '2024-06-28',
          created_at: '2024-06-28T09:30:00Z',
        },
        {
          id: '3',
          task_no: 'QT-2024-06-003',
          type: 'finished',
          product_name: '智能传感器模块',
          batch_no: 'FG20240625',
          quantity: 320,
          status: 'passed',
          inspector: '李华',
          due_date: '2024-06-27',
          created_at: '2024-06-27T10:00:00Z',
        },
        {
          id: '4',
          task_no: 'QT-2024-06-004',
          type: 'outgoing',
          product_name: '数据采集器',
          batch_no: 'FG20240620',
          quantity: 150,
          status: 'failed',
          inspector: '王强',
          due_date: '2024-06-26',
          created_at: '2024-06-26T14:00:00Z',
        },
        {
          id: '5',
          task_no: 'QT-2024-06-005',
          type: 'incoming',
          product_name: '塑料外壳',
          batch_no: 'B20240603',
          quantity: 2000,
          status: 'pending',
          inspector: user?.fullName || '',
          due_date: '2024-06-29',
          created_at: '2024-06-28T10:00:00Z',
        },
      ];
      return mockTasks;
    },
    staleTime: 5 * 60 * 1000,
  });
  const qualityTasks = tasksQuery.data ?? [];

  const defectsQuery = useQuery<DefectRecord[]>({
    queryKey: ['mobile-quality-defects', user?.fullName],
    queryFn: async () => {
      const mockDefects: DefectRecord[] = [
        {
          id: '1',
          task_id: 'QT-2024-06-002',
          product_name: 'PCB电路板焊接',
          batch_no: 'B20240602',
          defect_type: '虚焊',
          severity: 'major',
          quantity: 5,
          description: '部分焊点存在虚焊问题，需要返工',
          reporter: user?.fullName || '',
          reported_at: '2024-06-28T10:30:00Z',
          status: 'open',
        },
        {
          id: '2',
          task_id: 'QT-2024-06-004',
          product_name: '数据采集器',
          batch_no: 'FG20240620',
          defect_type: '外观划痕',
          severity: 'minor',
          quantity: 3,
          description: '外壳表面有轻微划痕，不影响功能',
          reporter: '王强',
          reported_at: '2024-06-26T15:00:00Z',
          status: 'closed',
        },
        {
          id: '3',
          task_id: 'QT-2024-06-002',
          product_name: 'PCB电路板焊接',
          batch_no: 'B20240602',
          defect_type: '元件错位',
          severity: 'critical',
          quantity: 2,
          description: '关键元件位置偏移，可能导致功能故障',
          reporter: user?.fullName || '',
          reported_at: '2024-06-28T11:00:00Z',
          status: 'processing',
        },
      ];
      return mockDefects;
    },
    staleTime: 5 * 60 * 1000,
  });
  const defectRecords = defectsQuery.data ?? [];
  const loading = tasksQuery.isLoading || defectsQuery.isLoading;

  useEffect(() => {
    if (tasksQuery.isError) {
      apiLogger.error('加载质检任务失败:', tasksQuery.error);
    }
    if (defectsQuery.isError) {
      apiLogger.error('加载缺陷记录失败:', defectsQuery.error);
    }
  }, [tasksQuery.isError, tasksQuery.error, defectsQuery.isError, defectsQuery.error]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([tasksQuery.refetch(), defectsQuery.refetch()]);
  }, [tasksQuery, defectsQuery]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      incoming: '来料检验',
      process: '过程检验',
      finished: '成品检验',
      outgoing: '出厂检验',
    };
    return map[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: '待检验',
      in_progress: '检验中',
      passed: '合格',
      failed: '不合格',
      open: '待处理',
      processing: '处理中',
      closed: '已关闭',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default'> = {
      pending: 'warning',
      in_progress: 'primary',
      passed: 'success',
      failed: 'error',
      open: 'warning',
      processing: 'primary',
      closed: 'success',
    };
    return map[status] || 'default';
  };

  const getSeverityLabel = (severity: string) => {
    const map: Record<string, string> = {
      minor: '轻微',
      major: '严重',
      critical: '致命',
    };
    return map[severity] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const map: Record<string, 'warning' | 'error' | 'default'> = {
      minor: 'warning',
      major: 'error',
      critical: 'error',
    };
    return map[severity] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle style={{ width: 20, height: 20 }} />;
      case 'failed':
        return <XCircle style={{ width: 20, height: 20 }} />;
      case 'pending':
        return <Clock style={{ width: 20, height: 20 }} />;
      default:
        return <ClipboardCheck style={{ width: 20, height: 20 }} />;
    }
  };

  const filteredTasks = qualityTasks.filter(
    (task) =>
      !searchQuery ||
      task.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.batch_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReportDefect = (task: QualityTask) => {
    setSelectedTask(task);
    setDefectForm({
      defect_type: '',
      severity: 'minor',
      quantity: 1,
      description: '',
    });
    setDefectDialogOpen(true);
  };

  const submitDefectMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newDefect: DefectRecord = {
        id: Date.now().toString(),
        task_id: selectedTask?.task_no || '',
        product_name: selectedTask?.product_name || '',
        batch_no: selectedTask?.batch_no || '',
        defect_type: defectForm.defect_type,
        severity: defectForm.severity,
        quantity: defectForm.quantity,
        description: defectForm.description,
        reporter: user?.fullName || '',
        reported_at: new Date().toISOString(),
        status: 'open',
      };
      return newDefect;
    },
    onSuccess: (newDefect) => {
      queryClient.setQueryData<DefectRecord[]>(
        ['mobile-quality-defects', user?.fullName],
        (prev) => [newDefect, ...(prev ?? [])]
      );
      setDefectDialogOpen(false);
      addNotification({
        title: '上报成功',
        message: '缺陷已成功上报',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('缺陷上报失败:', err);
      addNotification({
        title: '上报失败',
        message: '缺陷上报失败，请重试',
        type: 'error',
      });
    },
  });

  const handleSubmitDefect = () => {
    if (!defectForm.defect_type || !defectForm.description) {
      addNotification({
        title: '请填写完整',
        message: '请填写缺陷类型和描述',
        type: 'warning',
      });
      return;
    }
    submitDefectMutation.mutate();
  };

  const updateTaskStatusMutation = useMutation({
    mutationFn: async (params: { task: QualityTask; action: 'start' | 'pass' | 'fail' }) => {
      return params;
    },
    onSuccess: ({ task, action }) => {
      queryClient.setQueryData<QualityTask[]>(['mobile-quality-tasks', user?.fullName], (prev) =>
        (prev ?? []).map((t) => {
          if (t.id === task.id) {
            if (action === 'start') {
              return { ...t, status: 'in_progress' };
            } else if (action === 'pass') {
              return { ...t, status: 'passed' };
            } else {
              return { ...t, status: 'failed' };
            }
          }
          return t;
        })
      );
      addNotification({
        title: '操作成功',
        message: `任务状态已更新`,
        type: 'success',
      });
    },
  });

  const handleTaskAction = (task: QualityTask, action: 'start' | 'pass' | 'fail') => {
    updateTaskStatusMutation.mutate({ task, action });
  };

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.workbench);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };

  const bottomTabs = [
    { id: 'home', label: '工作台', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='移动质检'
      showBack
      onBackClick={() => navigate(MOBILE_PATHS.workbench)}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab=''
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
          onClick={() => navigate(MOBILE_PATHS.scanPage)}
        >
          <Barcode style={{ width: 20, height: 20 }} />
        </IconButton>
      }
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant='fullWidth'
          sx={{
            '& .MuiTab-root': {
              minHeight: 44,
              fontSize: '0.875rem',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab}
            />
          ))}
        </Tabs>

        {activeTab === 0 && (
          <Box sx={{ px: 2, pt: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder='搜索产品名称、任务编号、批次号'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  minHeight: 44,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search style={{ width: 20, height: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}

        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <MobileSkeleton
              type='list'
              count={6}
            />
          ) : (
            <>
              {activeTab === 0 && (
                <List disablePadding>
                  {filteredTasks.map((task, index) => (
                    <React.Fragment key={task.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          mx: 2,
                          my: 1,
                          p: 2,
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={getTypeLabel(task.type)}
                              size='small'
                              color='primary'
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Chip
                              label={getStatusLabel(task.status)}
                              size='small'
                              color={getStatusColor(task.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {task.task_no}
                          </Typography>
                        </Box>
                        <Typography
                          variant='subtitle2'
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          {task.product_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                          <Box>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              批次号
                            </Typography>
                            <Typography variant='body2'>{task.batch_no}</Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              数量
                            </Typography>
                            <Typography variant='body2'>
                              {task.quantity.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              检验员
                            </Typography>
                            <Typography variant='body2'>{task.inspector}</Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pt: 1.5,
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            截止日期: {task.due_date}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {task.status === 'pending' && (
                              <MobileButton
                                size='small'
                                variant='contained'
                                onClick={() => handleTaskAction(task, 'start')}
                              >
                                开始检验
                              </MobileButton>
                            )}
                            {task.status === 'in_progress' && (
                              <>
                                <MobileButton
                                  size='small'
                                  variant='outlined'
                                  color='error'
                                  onClick={() => handleReportDefect(task)}
                                >
                                  报缺陷
                                </MobileButton>
                                <MobileButton
                                  size='small'
                                  variant='contained'
                                  color='success'
                                  onClick={() => handleTaskAction(task, 'pass')}
                                >
                                  合格
                                </MobileButton>
                              </>
                            )}
                            {(task.status === 'passed' || task.status === 'failed') && (
                              <MobileButton
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                  addNotification({
                                    title: '查看报告',
                                    message: '查看检验报告详情',
                                    type: 'info',
                                  })
                                }
                              >
                                查看报告
                              </MobileButton>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                      {index < filteredTasks.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}

              {activeTab === 1 && (
                <List disablePadding>
                  {defectRecords.map((defect, index) => (
                    <React.Fragment key={defect.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          mx: 2,
                          my: 1,
                          p: 2,
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AlertTriangle
                              style={{
                                width: 18,
                                height: 18,
                                color:
                                  defect.severity === 'critical'
                                    ? theme.palette.error.main
                                    : defect.severity === 'major'
                                      ? theme.palette.warning.main
                                      : theme.palette.info.main,
                              }}
                            />
                            <Typography
                              variant='subtitle2'
                              sx={{ fontWeight: 600 }}
                            >
                              {defect.defect_type}
                            </Typography>
                          </Box>
                          <Chip
                            label={getSeverityLabel(defect.severity)}
                            size='small'
                            color={getSeverityColor(defect.severity) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          sx={{ mb: 1 }}
                        >
                          {defect.product_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            批次: {defect.batch_no}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            数量: {defect.quantity}
                          </Typography>
                        </Box>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ fontSize: '0.85rem', mb: 1.5 }}
                        >
                          {defect.description}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pt: 1,
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {defect.reporter} ·{' '}
                            {new Date(defect.reported_at).toLocaleDateString('zh-CN')}
                          </Typography>
                          <Chip
                            label={getStatusLabel(defect.status)}
                            size='small'
                            color={getStatusColor(defect.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Paper>
                      {index < defectRecords.length - 1 && <Divider sx={{ mx: 2 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </PullToRefresh>

        <Dialog
          open={defectDialogOpen}
          onClose={() => setDefectDialogOpen(false)}
          fullWidth
          maxWidth='sm'
        >
          <DialogTitle>上报缺陷</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedTask && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'grey.50',
                  }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    当前任务
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTask.product_name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {selectedTask.task_no} · 批次 {selectedTask.batch_no}
                  </Typography>
                </Paper>
              )}
              <TextField
                fullWidth
                label='缺陷类型'
                value={defectForm.defect_type}
                onChange={(e) =>
                  setDefectForm((prev) => ({ ...prev, defect_type: e.target.value }))
                }
                placeholder='请输入缺陷类型'
              />
              <TextField
                select
                fullWidth
                label='严重程度'
                value={defectForm.severity}
                onChange={(e) =>
                  setDefectForm((prev) => ({
                    ...prev,
                    severity: e.target.value as DefectRecord['severity'],
                  }))
                }
              >
                <MenuItem value='minor'>轻微</MenuItem>
                <MenuItem value='major'>严重</MenuItem>
                <MenuItem value='critical'>致命</MenuItem>
              </TextField>
              <TextField
                fullWidth
                type='number'
                label='缺陷数量'
                value={defectForm.quantity}
                onChange={(e) =>
                  setDefectForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
                slotProps={{ input: { min: 1 } } as const}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label='缺陷描述'
                value={defectForm.description}
                onChange={(e) =>
                  setDefectForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder='请详细描述缺陷情况'
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='outlined'
                  startIcon={<Camera style={{ width: 18, height: 18 }} />}
                  fullWidth
                >
                  拍照上传
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDefectDialogOpen(false)}>取消</Button>
            <MobileButton
              variant='contained'
              color='error'
              onClick={handleSubmitDefect}
              startIcon={<AlertTriangle style={{ width: 18, height: 18 }} />}
            >
              提交上报
            </MobileButton>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </MobileLayout>
  );
};

export default MobileQualityPage;
