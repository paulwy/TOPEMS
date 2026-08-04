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
  Button,
} from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Factory,
  Search,
  ChevronRight,
  Play,
  Pause,
  Clock,
  Wrench,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Plus,
  Barcode,
  Monitor,
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
import { mobileApi, type ProductionOrder, type WorkReport, type Equipment } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';

const MobileProductionPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [reportForm, setReportForm] = useState({
    quantity: 0,
    good_quantity: 0,
    bad_quantity: 0,
  });

  const tabs = ['生产工单', '报工记录', '设备状态'];

  const queryClient = useQueryClient();

  const ordersQuery = useQuery<ProductionOrder[]>({
    queryKey: ['mobile-production-orders', user?.fullName],
    queryFn: async () => {
      const mockOrders: ProductionOrder[] = [
        {
          id: '1',
          orderNo: 'PO-2024-06-001',
          product_name: '智能传感器模块',
          quantity: 500,
          completed_quantity: 320,
          status: 'in_progress',
          workstation: 'A生产线-工位1',
          start_time: '2024-06-28T08:00:00Z',
          due_date: '2024-06-30',
          created_at: '2024-06-25T09:00:00Z',
        },
        {
          id: '2',
          orderNo: 'PO-2024-06-002',
          product_name: '数据采集器',
          quantity: 200,
          completed_quantity: 0,
          status: 'pending',
          workstation: 'B生产线-工位3',
          due_date: '2024-07-02',
          created_at: '2024-06-27T10:00:00Z',
        },
        {
          id: '3',
          orderNo: 'PO-2024-05-098',
          product_name: 'PCB电路板组件',
          quantity: 1000,
          completed_quantity: 1000,
          status: 'completed',
          workstation: 'A生产线-工位2',
          start_time: '2024-06-20T08:00:00Z',
          end_time: '2024-06-26T17:00:00Z',
          due_date: '2024-06-27',
          created_at: '2024-06-18T09:00:00Z',
        },
        {
          id: '4',
          orderNo: 'PO-2024-06-003',
          product_name: '电源模块',
          quantity: 300,
          completed_quantity: 150,
          status: 'paused',
          workstation: 'C生产线-工位1',
          start_time: '2024-06-27T08:00:00Z',
          due_date: '2024-07-01',
          created_at: '2024-06-26T14:00:00Z',
        },
        {
          id: '5',
          orderNo: 'PO-2024-06-004',
          product_name: '通信模块',
          quantity: 400,
          completed_quantity: 0,
          status: 'pending',
          workstation: 'B生产线-工位2',
          due_date: '2024-07-03',
          created_at: '2024-06-28T08:30:00Z',
        },
      ];
      return mockOrders;
    },
    staleTime: 5 * 60 * 1000,
  });
  const productionOrders = ordersQuery.data ?? [];

  const reportsQuery = useQuery<WorkReport[]>({
    queryKey: ['mobile-production-reports', user?.fullName],
    queryFn: async () => {
      const mockReports: WorkReport[] = [
        {
          id: '1',
          order_id: '1',
          orderNo: 'PO-2024-06-001',
          workstation: 'A生产线-工位1',
          operator: user?.fullName || '',
          quantity: 100,
          good_quantity: 98,
          bad_quantity: 2,
          start_time: '2024-06-28T08:00:00Z',
          end_time: '2024-06-28T10:30:00Z',
          duration: 150,
          created_at: '2024-06-28T10:30:00Z',
        },
        {
          id: '2',
          order_id: '1',
          orderNo: 'PO-2024-06-001',
          workstation: 'A生产线-工位1',
          operator: user?.fullName || '',
          quantity: 120,
          good_quantity: 118,
          bad_quantity: 2,
          start_time: '2024-06-28T10:45:00Z',
          end_time: '2024-06-28T13:15:00Z',
          duration: 150,
          created_at: '2024-06-28T13:15:00Z',
        },
        {
          id: '3',
          order_id: '3',
          orderNo: 'PO-2024-05-098',
          workstation: 'A生产线-工位2',
          operator: '李华',
          quantity: 500,
          good_quantity: 495,
          bad_quantity: 5,
          start_time: '2024-06-25T08:00:00Z',
          end_time: '2024-06-25T17:00:00Z',
          duration: 540,
          created_at: '2024-06-25T17:00:00Z',
        },
      ];
      return mockReports;
    },
    staleTime: 5 * 60 * 1000,
  });
  const workReports = reportsQuery.data ?? [];

  const equipmentQuery = useQuery<Equipment[]>({
    queryKey: ['mobile-production-equipment'],
    queryFn: async () => {
      const mockEquipment: Equipment[] = [
        {
          id: '1',
          equipment_no: 'EQ-001',
          name: 'SMT贴片机 #1',
          type: '生产设备',
          status: 'running',
          location: 'A生产线',
          last_maintenance: '2024-06-20',
          next_maintenance: '2024-07-20',
          running_hours: 12580,
        },
        {
          id: '2',
          equipment_no: 'EQ-002',
          name: '回流焊机',
          type: '生产设备',
          status: 'running',
          location: 'A生产线',
          last_maintenance: '2024-06-15',
          next_maintenance: '2024-07-15',
          running_hours: 9876,
        },
        {
          id: '3',
          equipment_no: 'EQ-003',
          name: 'CNC加工中心 #3',
          type: '加工设备',
          status: 'maintenance',
          location: '机加工车间',
          last_maintenance: '2024-06-28',
          next_maintenance: '2024-07-28',
          running_hours: 15600,
        },
        {
          id: '4',
          equipment_no: 'EQ-004',
          name: '注塑机 #2',
          type: '成型设备',
          status: 'idle',
          location: 'B生产线',
          last_maintenance: '2024-06-10',
          next_maintenance: '2024-07-10',
          running_hours: 8500,
        },
        {
          id: '5',
          equipment_no: 'EQ-005',
          name: '老化测试台',
          type: '测试设备',
          status: 'fault',
          location: '质量部',
          last_maintenance: '2024-05-28',
          next_maintenance: '2024-06-28',
          running_hours: 6780,
        },
      ];
      return mockEquipment;
    },
    staleTime: 5 * 60 * 1000,
  });
  const equipmentList = equipmentQuery.data ?? [];
  const loading = ordersQuery.isLoading || reportsQuery.isLoading || equipmentQuery.isLoading;

  useEffect(() => {
    if (ordersQuery.isError) {
      apiLogger.error('加载生产工单失败:', ordersQuery.error);
    }
    if (reportsQuery.isError) {
      apiLogger.error('加载报工记录失败:', reportsQuery.error);
    }
    if (equipmentQuery.isError) {
      apiLogger.error('加载设备数据失败:', equipmentQuery.error);
    }
  }, [
    ordersQuery.isError,
    ordersQuery.error,
    reportsQuery.isError,
    reportsQuery.error,
    equipmentQuery.isError,
    equipmentQuery.error,
  ]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([ordersQuery.refetch(), reportsQuery.refetch(), equipmentQuery.refetch()]);
  }, [ordersQuery, reportsQuery, equipmentQuery]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: '待生产',
      in_progress: '生产中',
      paused: '已暂停',
      completed: '已完成',
      running: '运行中',
      idle: '空闲',
      maintenance: '维护中',
      fault: '故障',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default'> = {
      pending: 'warning',
      in_progress: 'primary',
      paused: 'warning',
      completed: 'success',
      running: 'success',
      idle: 'info',
      maintenance: 'warning',
      fault: 'error',
    };
    return map[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'in_progress':
        return <Play style={{ width: 20, height: 20 }} />;
      case 'paused':
      case 'idle':
        return <Pause style={{ width: 20, height: 20 }} />;
      case 'completed':
        return <CheckCircle style={{ width: 20, height: 20 }} />;
      case 'maintenance':
        return <Wrench style={{ width: 20, height: 20 }} />;
      case 'fault':
        return <AlertCircle style={{ width: 20, height: 20 }} />;
      default:
        return <Clock style={{ width: 20, height: 20 }} />;
    }
  };

  const filteredOrders = productionOrders.filter(
    (order) =>
      !searchQuery ||
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartReport = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setReportForm({
      quantity: 0,
      good_quantity: 0,
      bad_quantity: 0,
    });
    setReportDialogOpen(true);
  };

  const submitReportMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const now = new Date();
      const newReport: WorkReport = {
        id: Date.now().toString(),
        order_id: selectedOrder?.id || '',
        orderNo: selectedOrder?.orderNo || '',
        workstation: selectedOrder?.workstation || '',
        operator: user?.fullName || '',
        quantity: reportForm.quantity,
        good_quantity: reportForm.good_quantity,
        bad_quantity: reportForm.bad_quantity,
        start_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        end_time: now.toISOString(),
        duration: 120,
        created_at: now.toISOString(),
      };
      return newReport;
    },
    onSuccess: (newReport) => {
      queryClient.setQueryData<WorkReport[]>(
        ['mobile-production-reports', user?.fullName],
        (prev) => [newReport, ...(prev ?? [])]
      );
      if (selectedOrder) {
        queryClient.setQueryData<ProductionOrder[]>(
          ['mobile-production-orders', user?.fullName],
          (prev) =>
            (prev ?? []).map((o) => {
              if (o.id === selectedOrder.id) {
                const newCompleted = o.completed_quantity + reportForm.quantity;
                return {
                  ...o,
                  completed_quantity: newCompleted,
                  status: newCompleted >= o.quantity ? 'completed' : 'in_progress',
                };
              }
              return o;
            })
        );
      }
      setReportDialogOpen(false);
      addNotification({
        title: '报工成功',
        message: `已报工 ${reportForm.quantity} 件`,
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('报工失败:', err);
      addNotification({
        title: '报工失败',
        message: '报工失败，请重试',
        type: 'error',
      });
    },
  });

  const handleSubmitReport = () => {
    if (reportForm.quantity <= 0) {
      addNotification({
        title: '请输入数量',
        message: '请输入报工数量',
        type: 'warning',
      });
      return;
    }
    if (reportForm.good_quantity + reportForm.bad_quantity !== reportForm.quantity) {
      addNotification({
        title: '数量不匹配',
        message: '合格数+不合格数应等于总数量',
        type: 'warning',
      });
      return;
    }
    submitReportMutation.mutate();
  };

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (params: {
      order: ProductionOrder;
      action: 'start' | 'pause' | 'resume';
    }) => {
      return params;
    },
    onSuccess: ({ order, action }) => {
      queryClient.setQueryData<ProductionOrder[]>(
        ['mobile-production-orders', user?.fullName],
        (prev) =>
          (prev ?? []).map((o) => {
            if (o.id === order.id) {
              if (action === 'start') {
                return { ...o, status: 'in_progress', start_time: new Date().toISOString() };
              } else if (action === 'pause') {
                return { ...o, status: 'paused' };
              } else {
                return { ...o, status: 'in_progress' };
              }
            }
            return o;
          })
      );
      addNotification({
        title: '操作成功',
        message: '工单状态已更新',
        type: 'success',
      });
    },
  });

  const handleOrderAction = (order: ProductionOrder, action: 'start' | 'pause' | 'resume') => {
    updateOrderStatusMutation.mutate({ order, action });
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
      title='移动生产'
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
              placeholder='搜索产品名称、工单编号'
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
                  {filteredOrders.map((order, index) => {
                    const progress = (order.completed_quantity / order.quantity) * 100;
                    return (
                      <React.Fragment key={order.id}>
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
                                label={getStatusLabel(order.status)}
                                size='small'
                                color={
                                  getStatusColor(order.status) as React.ComponentProps<
                                    typeof Chip
                                  >['color']
                                }
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {order.orderNo}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography
                            variant='subtitle2'
                            sx={{ fontWeight: 600, mb: 1 }}
                          >
                            {order.product_name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                            <Box>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                计划数量
                              </Typography>
                              <Typography variant='body2'>{order.quantity}</Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                已完成
                              </Typography>
                              <Typography variant='body2'>{order.completed_quantity}</Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                工位
                              </Typography>
                              <Typography variant='body2'>{order.workstation}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mb: 1.5 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                生产进度
                              </Typography>
                              <Typography variant='caption'>{progress.toFixed(1)}%</Typography>
                            </Box>
                            <Box
                              sx={{
                                width: '100%',
                                height: 6,
                                bgcolor: 'grey.200',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${progress}%`,
                                  height: '100%',
                                  bgcolor:
                                    order.status === 'completed' ? 'success.main' : 'primary.main',
                                  borderRadius: 3,
                                  transition: 'width 0.3s',
                                }}
                              />
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
                              截止: {order.due_date}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {order.status === 'pending' && (
                                <MobileButton
                                  size='small'
                                  variant='contained'
                                  startIcon={<Play style={{ width: 16, height: 16 }} />}
                                  onClick={() => handleOrderAction(order, 'start')}
                                >
                                  开始
                                </MobileButton>
                              )}
                              {order.status === 'in_progress' && (
                                <>
                                  <MobileButton
                                    size='small'
                                    variant='outlined'
                                    startIcon={<Pause style={{ width: 16, height: 16 }} />}
                                    onClick={() => handleOrderAction(order, 'pause')}
                                  >
                                    暂停
                                  </MobileButton>
                                  <MobileButton
                                    size='small'
                                    variant='contained'
                                    startIcon={<Plus style={{ width: 16, height: 16 }} />}
                                    onClick={() => handleStartReport(order)}
                                  >
                                    报工
                                  </MobileButton>
                                </>
                              )}
                              {order.status === 'paused' && (
                                <MobileButton
                                  size='small'
                                  variant='contained'
                                  startIcon={<Play style={{ width: 16, height: 16 }} />}
                                  onClick={() => handleOrderAction(order, 'resume')}
                                >
                                  继续
                                </MobileButton>
                              )}
                              {order.status === 'completed' && (
                                <MobileButton
                                  size='small'
                                  variant='outlined'
                                  onClick={() =>
                                    addNotification({
                                      title: '查看详情',
                                      message: '查看工单详情',
                                      type: 'info',
                                    })
                                  }
                                >
                                  详情
                                </MobileButton>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                        {index < filteredOrders.length - 1 && <Divider sx={{ mx: 2 }} />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}

              {activeTab === 1 && (
                <List disablePadding>
                  {workReports.map((report, index) => (
                    <React.Fragment key={report.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: 'primary.lighter',
                              color: 'primary.main',
                            }}
                          >
                            <ClipboardList style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={report.orderNo}
                        subtitle={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant='body2'
                              sx={{ mb: 0.5 }}
                            >
                              {report.workstation}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`合格 ${report.good_quantity}`}
                                size='small'
                                color='success'
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={`不良 ${report.bad_quantity}`}
                                size='small'
                                color='error'
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </Box>
                          </Box>
                        }
                        showArrow
                        divider={index < workReports.length - 1}
                        rightContent={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='subtitle2'
                              sx={{ fontWeight: 600 }}
                            >
                              {report.quantity}件
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {Math.floor(report.duration / 60)}h{report.duration % 60}m
                            </Typography>
                          </Box>
                        }
                        badge={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Clock
                              style={{ width: 12, height: 12, color: theme.palette.text.secondary }}
                            />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(report.created_at).toLocaleDateString('zh-CN')}
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: '报工详情',
                            message: `查看 ${report.orderNo} 报工详情`,
                            type: 'info',
                          })
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}

              {activeTab === 2 && (
                <List disablePadding>
                  {equipmentList.map((equipment, index) => (
                    <React.Fragment key={equipment.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${getStatusColor(equipment.status)}.lighter`,
                              color: `${getStatusColor(equipment.status)}.main`,
                            }}
                          >
                            <Monitor style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={equipment.name}
                        subtitle={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {equipment.equipment_no} · {equipment.location}
                            </Typography>
                            <Chip
                              label={getStatusLabel(equipment.status)}
                              size='small'
                              color={
                                getStatusColor(equipment.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Box>
                        }
                        showArrow
                        divider={index < equipmentList.length - 1}
                        rightContent={
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              运行时长
                            </Typography>
                            <Typography variant='body2'>
                              {equipment.running_hours.toLocaleString()}h
                            </Typography>
                          </Box>
                        }
                        onClick={() =>
                          addNotification({
                            title: '设备详情',
                            message: `查看 ${equipment.name} 详情`,
                            type: 'info',
                          })
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </PullToRefresh>

        <Dialog
          open={reportDialogOpen}
          onClose={() => setReportDialogOpen(false)}
          fullWidth
          maxWidth='sm'
        >
          <DialogTitle>生产报工</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedOrder && (
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
                    当前工单
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedOrder.product_name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {selectedOrder.orderNo} · {selectedOrder.workstation}
                  </Typography>
                </Paper>
              )}
              <TextField
                fullWidth
                type='number'
                label='报工数量'
                value={reportForm.quantity}
                onChange={(e) =>
                  setReportForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                fullWidth
                type='number'
                label='合格数量'
                value={reportForm.good_quantity}
                onChange={(e) =>
                  setReportForm((prev) => ({
                    ...prev,
                    good_quantity: parseInt(e.target.value) || 0,
                  }))
                }
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                fullWidth
                type='number'
                label='不良数量'
                value={reportForm.bad_quantity}
                onChange={(e) =>
                  setReportForm((prev) => ({
                    ...prev,
                    bad_quantity: parseInt(e.target.value) || 0,
                  }))
                }
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setReportDialogOpen(false)}>取消</Button>
            <MobileButton
              variant='contained'
              onClick={handleSubmitReport}
              startIcon={<CheckSquare style={{ width: 18, height: 18 }} />}
            >
              提交报工
            </MobileButton>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </MobileLayout>
  );
};

export default MobileProductionPage;
