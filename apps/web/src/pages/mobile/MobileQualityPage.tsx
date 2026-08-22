import { designTokens } from '@topems/tokens';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
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
import i18n from '@/i18n';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  ClipboardCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Barcode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton, MobileButton } from '@/components/mobile';
import { useNotificationStore, useAuthStore } from '@/store';
import { type QualityTask, type DefectRecord } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';

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
  const tabs = [i18n.t('mobile.mobile_quality_page.k1'), i18n.t('mobile.mobile_quality_page.k0')];
  const queryClient = useQueryClient();
  const tasksQuery = useQuery<QualityTask[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.MOBILE_QUALITY_TASKS_BASE, user?.fullName],
    queryFn: async () => {
      const mockTasks: QualityTask[] = [
        {
          id: '1',
          task_no: 'QT-2024-06-001',
          type: 'incoming',
          product_name: i18n.t('pages.mobile_quality_page.10k_0'),
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
          product_name: i18n.t('pages.mobile_quality_page.pcb_1'),
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
          product_name: i18n.t('mobile.mobile_quality_page.k2'),
          batch_no: 'FG20240625',
          quantity: 320,
          status: 'passed',
          inspector: i18n.t('mobile.mobile_quality_page.k3'),
          due_date: '2024-06-27',
          created_at: '2024-06-27T10:00:00Z',
        },
        {
          id: '4',
          task_no: 'QT-2024-06-004',
          type: 'outgoing',
          product_name: i18n.t('mobile.mobile_quality_page.k4'),
          batch_no: 'FG20240620',
          quantity: 150,
          status: 'failed',
          inspector: i18n.t('mobile.mobile_quality_page.k5'),
          due_date: '2024-06-26',
          created_at: '2024-06-26T14:00:00Z',
        },
        {
          id: '5',
          task_no: 'QT-2024-06-005',
          type: 'incoming',
          product_name: i18n.t('mobile.mobile_quality_page.k6'),
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
    queryKey: [...QUERY_KEYS.AD_HOC.MOBILE_QUALITY_DEFECTS_BASE, user?.fullName],
    queryFn: async () => {
      const mockDefects: DefectRecord[] = [
        {
          id: '1',
          task_id: 'QT-2024-06-002',
          product_name: i18n.t('pages.mobile_quality_page.pcb_2'),
          batch_no: 'B20240602',
          defect_type: i18n.t('mobile.mobile_quality_page.k7'),
          severity: 'major',
          quantity: 5,
          description: i18n.t('mobile.mobile_quality_page.k8'),
          reporter: user?.fullName || '',
          reported_at: '2024-06-28T10:30:00Z',
          status: 'open',
        },
        {
          id: '2',
          task_id: 'QT-2024-06-004',
          product_name: i18n.t('mobile.mobile_quality_page.k9'),
          batch_no: 'FG20240620',
          defect_type: i18n.t('mobile.mobile_quality_page.k10'),
          severity: 'minor',
          quantity: 3,
          description: i18n.t('mobile.mobile_quality_page.k11'),
          reporter: i18n.t('mobile.mobile_quality_page.k12'),
          reported_at: '2024-06-26T15:00:00Z',
          status: 'closed',
        },
        {
          id: '3',
          task_id: 'QT-2024-06-002',
          product_name: i18n.t('pages.mobile_quality_page.pcb_3'),
          batch_no: 'B20240602',
          defect_type: i18n.t('mobile.mobile_quality_page.k13'),
          severity: 'critical',
          quantity: 2,
          description: i18n.t('mobile.mobile_quality_page.k14'),
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
      apiLogger.error(i18n.t('pages.mobile_quality_page.k4'), tasksQuery.error);
    }
    if (defectsQuery.isError) {
      apiLogger.error(i18n.t('pages.mobile_quality_page.k5'), defectsQuery.error);
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
      incoming: i18n.t('mobile.mobile_quality_page.k15'),
      process: i18n.t('mobile.mobile_quality_page.k16'),
      finished: i18n.t('mobile.mobile_quality_page.k17'),
      outgoing: i18n.t('mobile.mobile_quality_page.k18'),
    };
    return map[type] || type;
  };
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: i18n.t('mobile.mobile_quality_page.k19'),
      in_progress: i18n.t('mobile.mobile_quality_page.k20'),
      passed: i18n.t('mobile.mobile_quality_page.k21'),
      failed: i18n.t('mobile.mobile_quality_page.k22'),
      open: i18n.t('mobile.mobile_quality_page.k23'),
      processing: i18n.t('mobile.mobile_quality_page.k24'),
      closed: i18n.t('mobile.mobile_quality_page.k25'),
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
      minor: i18n.t('mobile.mobile_quality_page.k26'),
      major: i18n.t('mobile.mobile_quality_page.k27'),
      critical: i18n.t('mobile.mobile_quality_page.k28'),
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
        title: i18n.t('mobile.mobile_quality_page.k29'),
        message: i18n.t('mobile.mobile_quality_page.k30'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.mobile_quality_page.k6'), err);
      addNotification({
        title: i18n.t('mobile.mobile_quality_page.k31'),
        message: i18n.t('mobile.mobile_quality_page.k32'),
        type: 'error',
      });
    },
  });
  const handleSubmitDefect = () => {
    if (!defectForm.defect_type || !defectForm.description) {
      addNotification({
        title: i18n.t('mobile.mobile_quality_page.k33'),
        message: i18n.t('mobile.mobile_quality_page.k34'),
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
        title: i18n.t('mobile.mobile_quality_page.k35'),
        message: i18n.t('pages.mobile_quality_page.k0'),
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
    {
      id: 'home',
      label: i18n.t('mobile.mobile_quality_page.k36'),
      icon: <Home style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_quality_page.k37'),
      icon: <ListTodo style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_quality_page.k38'),
      icon: <ScanLine style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_quality_page.k39'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_quality_page.k40'),
      icon: <User style={{ width: 22, height: 22 }} />,
    },
  ];
  return (
    <MobileLayout
      title={i18n.t('mobile.mobile_quality_page.k41')}
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
          aria-label={i18n.t('mobile.mobile_quality_page.k42')}
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
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
              placeholder={i18n.t('mobile.mobile_quality_page.k43')}
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
                              sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
                            />
                            <Chip
                              label={getStatusLabel(task.status)}
                              size='small'
                              color={
                                getStatusColor(task.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                              sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
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
                              {i18n.t('pages.mobile_quality_page.k1')}
                            </Typography>
                            <Typography variant='body2'>{task.batch_no}</Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {i18n.t('pages.mobile_quality_page.k2')}
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
                              {i18n.t('pages.mobile_quality_page.k3')}
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
                            [i18n.t('pages.mobile_quality_page.k4')]: {task.due_date}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {task.status === 'pending' && (
                              <MobileButton
                                size='small'
                                variant='contained'
                                onClick={() => handleTaskAction(task, 'start')}
                              >
                                {i18n.t('pages.mobile_quality_page.k5')}
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
                                  {i18n.t('pages.mobile_quality_page.k6')}
                                </MobileButton>
                                <MobileButton
                                  size='small'
                                  variant='contained'
                                  color='success'
                                  onClick={() => handleTaskAction(task, 'pass')}
                                >
                                  {i18n.t('pages.mobile_quality_page.k7')}
                                </MobileButton>
                              </>
                            )}
                            {(task.status === 'passed' || task.status === 'failed') && (
                              <MobileButton
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                  addNotification({
                                    title: i18n.t('mobile.mobile_quality_page.k44'),
                                    message: i18n.t('mobile.mobile_quality_page.k45'),
                                    type: 'info',
                                  })
                                }
                              >
                                {i18n.t('pages.mobile_quality_page.k8')}
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
                            color={
                              getSeverityColor(defect.severity) as React.ComponentProps<
                                typeof Chip
                              >['color']
                            }
                            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
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
                            [i18n.t('pages.mobile_quality_page.k9')]: {defect.batch_no}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            [i18n.t('pages.mobile_quality_page.k10')]: {defect.quantity}
                          </Typography>
                        </Box>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ fontSize: designTokens.typography.fontSize.scale['0.85rem'], mb: 1.5 }}
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
                            color={
                              getStatusColor(defect.status) as React.ComponentProps<
                                typeof Chip
                              >['color']
                            }
                            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
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
          <DialogTitle>{i18n.t('mobile.mobile_quality_page.k46')}</DialogTitle>
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
                    {i18n.t('pages.mobile_quality_page.k11')}
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
                    {selectedTask.task_no} {i18n.t('pages.mobile_quality_page.k0')}{' '}
                    {selectedTask.batch_no}
                  </Typography>
                </Paper>
              )}
              <TextField
                fullWidth
                label={i18n.t('mobile.mobile_quality_page.k47')}
                value={defectForm.defect_type}
                onChange={(e) =>
                  setDefectForm((prev) => ({ ...prev, defect_type: e.target.value }))
                }
                placeholder={i18n.t('mobile.mobile_quality_page.k48')}
              />
              <TextField
                select
                fullWidth
                label={i18n.t('mobile.mobile_quality_page.k49')}
                value={defectForm.severity}
                onChange={(e) =>
                  setDefectForm((prev) => ({
                    ...prev,
                    severity: e.target.value as DefectRecord['severity'],
                  }))
                }
              >
                <MenuItem value='minor'>{i18n.t('mobile.mobile_quality_page.k50')}</MenuItem>
                <MenuItem value='major'>{i18n.t('mobile.mobile_quality_page.k51')}</MenuItem>
                <MenuItem value='critical'>{i18n.t('mobile.mobile_quality_page.k52')}</MenuItem>
              </TextField>
              <TextField
                fullWidth
                type='number'
                label={i18n.t('mobile.mobile_quality_page.k53')}
                value={defectForm.quantity}
                onChange={(e) =>
                  setDefectForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label={i18n.t('mobile.mobile_quality_page.k54')}
                value={defectForm.description}
                onChange={(e) =>
                  setDefectForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={i18n.t('mobile.mobile_quality_page.k55')}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='outlined'
                  startIcon={<Camera style={{ width: 18, height: 18 }} />}
                  fullWidth
                >
                  {i18n.t('pages.mobile_quality_page.k12')}
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDefectDialogOpen(false)}>
              {i18n.t('mobile.mobile_quality_page.k56')}
            </Button>
            <MobileButton
              variant='contained'
              color='error'
              onClick={handleSubmitDefect}
              startIcon={<AlertTriangle style={{ width: 18, height: 18 }} />}
            >
              {i18n.t('pages.mobile_quality_page.k13')}
            </MobileButton>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </MobileLayout>
  );
};
export default MobileQualityPage;
