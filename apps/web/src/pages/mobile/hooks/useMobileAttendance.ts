/**
 * MobileAttendance state management and API calls hook
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store';
import { mobileApi, type AttendanceStats, type LeaveApplication } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface LeaveForm {
  leave_type: LeaveApplication['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}
export const useMobileAttendance = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const tabs = [
    i18n.t('mobile.attendance.action.clock'),
    i18n.t('mobile.attendance.section.records'),
    i18n.t('mobile.attendance.section.leave'),
  ];
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
        title: i18n.t('mobile.attendance.message.clock_success'),
        message: i18n.t('mobile.attendance.message.clock_in_success'),
        type: 'success',
      });
    },
    onError: (err, _, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], context.previousStats);
      }
      apiLogger.error(i18n.t('mobile.attendance.message.clock_failed'), err);
      addNotification({
        title: i18n.t('mobile.attendance.message.clock_failed'),
        message: i18n.t('mobile.attendance.message.clock_retry'),
        type: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_RECORDS_BASE,
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
        title: i18n.t('mobile.attendance.message.clock_success'),
        message: i18n.t('mobile.attendance.message.clock_out_success'),
        type: 'success',
      });
    },
    onError: (err, _, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(['mobile-attendance-stats'], context.previousStats);
      }
      apiLogger.error(i18n.t('mobile.attendance.message.clock_failed'), err);
      addNotification({
        title: i18n.t('mobile.attendance.message.clock_failed'),
        message: i18n.t('mobile.attendance.message.clock_retry'),
        type: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_STATS_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_ATTENDANCE_RECORDS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
  const applyLeaveMutation = useMutation({
    mutationFn: async (data: LeaveForm) => {
      const res = await mobileApi.applyLeave(data);
      if (!res.success) {
        throw new Error(i18n.t('mobile.attendance.message.submit_failed'));
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
        title: i18n.t('mobile.attendance.message.submit_success'),
        message: i18n.t('mobile.attendance.message.leave_submitted'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_LEAVE_APPLICATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err) => {
      apiLogger.error(i18n.t('mobile.attendance.message.leave_submit_failed'), err);
      addNotification({
        title: i18n.t('mobile.attendance.message.submit_failed'),
        message: i18n.t('mobile.attendance.message.submit_retry'),
        type: 'error',
      });
    },
  });
  const handleRefresh = useCallback(async () => {
    await Promise.all([statsQuery.refetch(), recordsQuery.refetch(), leavesQuery.refetch()]);
  }, [statsQuery, recordsQuery, leavesQuery]);
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);
  const handleCheckIn = useCallback(() => {
    if (attendanceStats?.today_status !== 'not_checked_in') return;
    checkInMutation.mutate();
  }, [attendanceStats?.today_status, checkInMutation]);
  const handleCheckOut = useCallback(() => {
    if (attendanceStats?.today_status !== 'checked_in') return;
    checkOutMutation.mutate();
  }, [attendanceStats?.today_status, checkOutMutation]);
  const handleSubmitLeave = useCallback(() => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      addNotification({
        title: i18n.t('mobile.attendance.message.fill_complete'),
        message: i18n.t('mobile.attendance.message.fill_leave_info'),
        type: 'warning',
      });
      return;
    }
    applyLeaveMutation.mutate(leaveForm);
  }, [leaveForm, applyLeaveMutation, addNotification]);
  const handleBottomTabChange = useCallback(
    (tabId: string) => {
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
    },
    [navigate]
  );
  const checkingIn = checkInMutation.isPending || checkOutMutation.isPending;
  const todayStatus = attendanceStats?.today_status;
  return {
    activeTab,
    setActiveTab,
    leaveDialogOpen,
    setLeaveDialogOpen,
    leaveForm,
    setLeaveForm,
    tabs,
    loading,
    attendanceStats,
    records,
    leaves,
    checkingIn,
    todayStatus,
    checkInMutation,
    checkOutMutation,
    applyLeaveMutation,
    handleRefresh,
    handleTabChange,
    handleCheckIn,
    handleCheckOut,
    handleSubmitLeave,
    handleBottomTabChange,
  };
};
