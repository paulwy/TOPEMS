import React, { useState, useCallback } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  CalendarCheck,
  Clock,
  MapPin,
  FileText,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MobileLayout,
  PullToRefresh,
  MobileSkeleton,
  MobileCard,
  MobileButton,
} from '@/components/mobile';
import { useNotificationStore } from '@/store';
import { mobileApi, type AttendanceStats, type LeaveApplication } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';


import { QUERY_KEYS } from '@/lib/reactQuery';

const MobileAttendancePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'annual' as LeaveApplication['leave_type'],
    start_date: '',
    end_date: '',
    reason: '',
  });

  const queryClient = useQueryClient();
  const tabs = ['打卡', '记录', '请假'];

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE,
    queryFn: async () => {
      const res = await mobileApi.getAttendanceStats();
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const recordsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_RECORDS_BASE,
    queryFn: async () => {
      const res = await mobileApi.listAttendanceRecords({ page: 1, pagesize: 20 });
      return res.data?.items || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const leavesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_LEAVE_APPLICATIONS_BASE,
    queryFn: async () => {
      const res = await mobileApi.listLeaveApplications({ page: 1, pagesize: 20 });
      return res.data?.items || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const loading = statsQuery.isLoading || recordsQuery.isLoading || leavesQuery.isLoading;
  const attendanceStats = statsQuery.data ?? null;
  const records = recordsQuery.data || [];
  const leaves = leavesQuery.data || [];

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const result = await mobileApi.checkIn({ lat: 0, lng: 0 });
      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE });
      const previousStats = queryClient.getQueryData<AttendanceStats | null>([
        'mobile-attendance-stats',
      ]);
      if (previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], {
          ...previousStats,
          today_status: 'checked_in',
        } as AttendanceStats);
      }
      return { previousStats };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<AttendanceStats | null>(['mobile-attendance-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today_status: 'checked_in',
          today_check_in: data?.check_in_time,
        };
      });
      addNotification({
        title: '打卡成功',
        message: '上班打卡成功，祝您工作顺利！',
        type: 'success',
      });
    },
    onError: (err, _, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], context.previousStats);
      }
      apiLogger.error('打卡失败:', err);
      addNotification({
        title: '打卡失败',
        message: '打卡失败，请稍后重试',
        type: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_RECORDS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const result = await mobileApi.checkOut({ lat: 0, lng: 0 });
      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE });
      const previousStats = queryClient.getQueryData<AttendanceStats | null>([
        'mobile-attendance-stats',
      ]);
      if (previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], {
          ...previousStats,
          today_status: 'checked_out',
        } as AttendanceStats);
      }
      return { previousStats };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<AttendanceStats | null>(['mobile-attendance-stats'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today_status: 'checked_out',
          today_check_out: data?.check_out_time,
        };
      });
      addNotification({
        title: '打卡成功',
        message: '下班打卡成功，辛苦了！',
        type: 'success',
      });
    },
    onError: (err, _, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], context.previousStats);
      }
      apiLogger.error('打卡失败:', err);
      addNotification({
        title: '打卡失败',
        message: '打卡失败，请稍后重试',
        type: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_RECORDS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async (data: {
      leave_type: LeaveApplication['leave_type'];
      start_date: string;
      end_date: string;
      reason: string;
    }) => {
      const res = await mobileApi.applyLeave(data);
      if (!res.success) {
        throw new Error('提交失败');
      }
      return res.data;
    },
    onSuccess: () => {
      setLeaveDialogOpen(false);
      setLeaveForm({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
      });
      addNotification({
        title: '提交成功',
        message: '请假申请已提交，请等待审批',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MOBILE_LEAVE_APPLICATIONS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err) => {
      apiLogger.error('提交请假申请失败:', err);
      addNotification({
        title: '提交失败',
        message: '提交失败，请稍后重试',
        type: 'error',
      });
    },
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([statsQuery.refetch(), recordsQuery.refetch(), leavesQuery.refetch()]);
  }, [statsQuery, recordsQuery, leavesQuery]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCheckIn = () => {
    if (attendanceStats?.today_status !== 'not_checked_in') return;
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    if (attendanceStats?.today_status !== 'checked_in') return;
    checkOutMutation.mutate();
  };

  const handleSubmitLeave = () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      addNotification({
        title: '请填写完整',
        message: '请填写完整的请假信息',
        type: 'warning',
      });
      return;
    }
    applyLeaveMutation.mutate(leaveForm);
  };

  const checkingIn = checkInMutation.isPending || checkOutMutation.isPending;

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      normal: '正常',
      late: '迟到',
      early_leave: '早退',
      absent: '缺勤',
      leave: '请假',
      business_trip: '出差',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      normal: 'success',
      late: 'warning',
      early_leave: 'warning',
      absent: 'error',
      leave: 'info',
      business_trip: 'info',
    };
    return map[status] || 'default';
  };

  const getLeaveTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      annual: '年假',
      sick: '病假',
      personal: '事假',
      maternity: '产假',
      paternity: '陪产假',
      funeral: '丧假',
      other: '其他',
    };
    return map[type] || type;
  };

  const getLeaveStatusColor = (status: string) => {
    const map: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      cancelled: 'default',
    };
    return map[status] || 'default';
  };

  const getLeaveStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已驳回',
      cancelled: '已取消',
    };
    return map[status] || status;
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

  const todayStatus = attendanceStats?.today_status;

  return (
    <MobileLayout
      title='考勤打卡'
      showBack
      onBackClick={() => navigate(MOBILE_PATHS.workbench)}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab=''
      onTabChange={handleBottomTabChange}
      rightActions={
        <Button
          size='small'
          onClick={() => setLeaveDialogOpen(true)}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          <Plus style={{ width: 20, height: 20 }} />
        </Button>
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

        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <MobileSkeleton
              type='list'
              count={6}
            />
          ) : (
            <>
              {activeTab === 0 && (
                <Box sx={{ p: 2, pb: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      mb: 3,
                      textAlign: 'center',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      color: 'common.white',
                    }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {new Date().toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ opacity: 0.9, mb: 3 }}
                    >
                      {new Date().toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}
                    </Typography>

                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        margin: '0 auto 20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.disabledBackground',
                        cursor: checkingIn ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s',
                        '&:active': {
                          transform: 'scale(0.95)',
                        },
                      }}
                      onClick={() => {
                        if (todayStatus === 'not_checked_in') {
                          handleCheckIn();
                        } else if (todayStatus === 'checked_in') {
                          handleCheckOut();
                        }
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <CalendarCheck style={{ width: 40, height: 40, margin: '0 auto 4px' }} />
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {todayStatus === 'not_checked_in'
                            ? '上班打卡'
                            : todayStatus === 'checked_in'
                              ? '下班打卡'
                              : '已打卡'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='body2'
                          sx={{ opacity: 0.7, mb: 0.5 }}
                        >
                          上班时间
                        </Typography>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {attendanceStats?.today_check_in || '--:--'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='body2'
                          sx={{ opacity: 0.7, mb: 0.5 }}
                        >
                          下班时间
                        </Typography>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {attendanceStats?.today_check_out || '--:--'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      mb: 3,
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <MapPin style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        考勤位置
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        公司总部 · 北京市朝阳区xxx路xxx号
                      </Typography>
                    </Box>
                    <Chip
                      label='范围内'
                      size='small'
                      color='success'
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600 }}
                      >
                        本月统计
                      </Typography>
                      <Typography
                        variant='caption'
                        color='primary'
                        sx={{ cursor: 'pointer' }}
                      >
                        查看明细
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', mb: 2 }}>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography
                            variant='h6'
                            sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}
                          >
                            {attendanceStats?.work_days_this_month || 0}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            出勤天数
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography
                            variant='h6'
                            sx={{ fontWeight: 700, color: 'warning.main', mb: 0.5 }}
                          >
                            {attendanceStats?.late_days_this_month || 0}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            迟到次数
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography
                            variant='h6'
                            sx={{ fontWeight: 700, color: 'success.main', mb: 0.5 }}
                          >
                            {attendanceStats?.total_work_hours || 0}h
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            总工时
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              )}

              {activeTab === 1 && (
                <List disablePadding>
                  {records.map((record, index) => (
                    <React.Fragment key={record.id}>
                      <MobileCard
                        leftIcon={
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${getStatusColor(record.status)}.lighter`,
                              color: `${getStatusColor(record.status)}.main`,
                            }}
                          >
                            <Clock style={{ width: 20, height: 20 }} />
                          </Avatar>
                        }
                        title={record.date}
                        subtitle={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={getStatusLabel(record.status)}
                              size='small'
                              color={
                                getStatusColor(record.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {record.check_in_time || '--:--'} - {record.check_out_time || '--:--'}
                            </Typography>
                          </Box>
                        }
                        showArrow
                        divider={index < records.length - 1}
                        rightContent={
                          record.work_hours ? (
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {record.work_hours}h
                            </Typography>
                          ) : undefined
                        }
                      />
                    </React.Fragment>
                  ))}
                </List>
              )}

              {activeTab === 2 && (
                <Box sx={{ p: 2, pb: 3 }}>
                  {leaves.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 10,
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <FileText
                          style={{ width: 32, height: 32, color: theme.palette.text.secondary }}
                        />
                      </Box>
                      <Typography
                        variant='subtitle1'
                        sx={{ mb: 1, fontWeight: 500 }}
                      >
                        暂无请假记录
                      </Typography>
                      <MobileButton
                        variant='contained'
                        startIcon={<Plus style={{ width: 18, height: 18 }} />}
                        onClick={() => setLeaveDialogOpen(true)}
                      >
                        申请请假
                      </MobileButton>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {leaves.map((leave, index) => (
                        <React.Fragment key={leave.id}>
                          <Paper
                            elevation={0}
                            sx={{
                              mx: 2,
                              mb: 2,
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
                                  label={getLeaveTypeLabel(leave.leave_type)}
                                  size='small'
                                  color='primary'
                                  sx={{ height: 22, fontSize: '0.75rem' }}
                                />
                                <Chip
                                  label={getLeaveStatusLabel(leave.status)}
                                  size='small'
                                  color={
                                    getLeaveStatusColor(leave.status) as React.ComponentProps<
                                      typeof Chip
                                    >['color']
                                  }
                                  sx={{ height: 22, fontSize: '0.75rem' }}
                                />
                              </Box>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {leave.days}天
                              </Typography>
                            </Box>
                            <Typography
                              variant='body2'
                              sx={{ mb: 1, fontWeight: 500 }}
                            >
                              {leave.start_date} 至 {leave.end_date}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                              sx={{ fontSize: '0.85rem' }}
                            >
                              {leave.reason}
                            </Typography>
                          </Paper>
                          {index < leaves.length - 1 && <Divider sx={{ mx: 2 }} />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </>
          )}
        </PullToRefresh>

        <Dialog
          open={leaveDialogOpen}
          onClose={() => setLeaveDialogOpen(false)}
          fullWidth
          maxWidth='sm'
        >
          <DialogTitle>申请请假</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                fullWidth
                label='请假类型'
                value={leaveForm.leave_type}
                onChange={(e) =>
                  setLeaveForm((prev) => ({
                    ...prev,
                    leave_type: e.target.value as LeaveApplication['leave_type'],
                  }))
                }
              >
                <MenuItem value='annual'>年假</MenuItem>
                <MenuItem value='sick'>病假</MenuItem>
                <MenuItem value='personal'>事假</MenuItem>
                <MenuItem value='maternity'>产假</MenuItem>
                <MenuItem value='paternity'>陪产假</MenuItem>
                <MenuItem value='other'>其他</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label='开始日期'
                type='date'
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, start_date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
              <TextField
                fullWidth
                label='结束日期'
                type='date'
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, end_date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label='请假原因'
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder='请输入请假原因'
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLeaveDialogOpen(false)}>取消</Button>
            <MobileButton
              variant='contained'
              onClick={handleSubmitLeave}
              disabled={applyLeaveMutation.isPending}
            >
              提交申请
            </MobileButton>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </MobileLayout>
  );
};

export default MobileAttendancePage;
