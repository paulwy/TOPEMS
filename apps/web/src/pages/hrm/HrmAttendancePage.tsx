import React, { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Check,
  X,
  Download,
} from 'lucide-react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { attendanceSchema, leaveSchema } from '@/schemas/hrm';
import { attendanceApi, leaveApi } from '@/api/hrm';
import type { AttendanceRecord, LeaveRequest } from '@/api/hrm';
import { apiLogger } from '@/utils/logger';


import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const attendanceAdapter = createCrudPageAdapter(attendanceApi);
const leaveAdapter = createCrudPageAdapter(leaveApi);

const HrmAttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve'
        ? leaveApi.approve(id, 'current_user')
        : leaveApi.reject(id, 'current_user', ''),
    onSuccess: (_, variables) => {
      addNotification({
        title: t('hrm.hrm_attendance_page.success'),
        message:
          variables.action === 'approve'
            ? t('hrm.hrm_attendance_page.text_337737')
            : t('hrm.hrm_attendance_page.text_81233d'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.HRM_LEAVES_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        title: t('hrm.hrm_attendance_page.fail'),
        message: t('hrm.hrm_attendance_page.operation_failed'),
        type: 'error',
      });
    },
  });

  const handleLeaveAction = useCallback(
    (id: string, action: 'approve' | 'reject') => {
      const confirmAction = async () => {
        try {
          await approveLeaveMutation.mutateAsync({ id, action });
        } catch (err: unknown) {
          apiLogger.error('Failed to process leave:', err);
        }
      };
      setConfirmDialogConfig({
        title: t('hrm.hrm_attendance_page.action'),
        message:
          action === 'approve'
            ? t('hrm.hrm_attendance_page.confirm')
            : t('hrm.hrm_attendance_page.confirm_1'),
        onConfirm: confirmAction,
        danger: action === 'reject',
      });
      setConfirmDialogOpen(true);
    },
    [approveLeaveMutation, t]
  );

  const leaveCustomRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'approve',
        label: t('hrm.hrm_attendance_page.text_7a712b'),
        icon: <Check size={16} />,
        color: 'success',
        show: (row: Record<string, unknown>) => (row.status as string) === 'pending',
        onClick: (row: Record<string, unknown>) => handleLeaveAction(row.id as string, 'approve'),
      },
      {
        key: 'reject',
        label: t('hrm.hrm_attendance_page.text_7173f8'),
        icon: <X size={16} />,
        color: 'error',
        divider: true,
        show: (row: Record<string, unknown>) => (row.status as string) === 'pending',
        onClick: (row: Record<string, unknown>) => handleLeaveAction(row.id as string, 'reject'),
      },
    ],
    [handleLeaveAction, t]
  );

  const statisticsContent = useMemo(
    () => <StatisticsContent selectedDate={selectedDate} />,
    [selectedDate]
  );

  const handleExport = useCallback(() => {
    addNotification({
      title: t('hrm.hrm_attendance_page.success'),
      message: '导出功能触发',
      type: 'info',
    });
  }, [addNotification, t]);

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_attendance_page.text_2a2338')}
      subtitle={t('hrm.hrm_attendance_page.view')}
      autoTitle
      autoBreadcrumbs
    >
      <CrudPage
        schema={attendanceSchema}
        apiAdapter={attendanceAdapter}
        breadcrumbs={[{ label: 'HRM' }, { label: '考勤管理' }]}
        extraQueryParams={{ date: selectedDate }}
        headerContent={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                type='date'
                size='small'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                sx={{ bgcolor: 'common.white', borderRadius: 1 }}
              />
              <Button
                variant='outlined'
                startIcon={<Download size={18} />}
                onClick={handleExport}
              >
                导出
              </Button>
            </Box>
            <StatisticsChips selectedDate={selectedDate} />
          </Box>
        }
        tabs={[
          {
            id: 'records',
            label: '考勤记录',
            content: null,
          },
          {
            id: 'leaves',
            label: '请假申请',
            content: (
              <CrudPage
                schema={leaveSchema}
                apiAdapter={leaveAdapter}
                breadcrumbs={[{ label: 'HRM' }, { label: '请假申请' }]}
                customRowActions={leaveCustomRowActions}
              />
            ),
          },
          {
            id: 'statistics',
            label: '考勤统计',
            content: statisticsContent,
          },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

const StatisticsChips: React.FC<{ selectedDate: string }> = ({ selectedDate }) => {
  const { t } = useTranslation();

  const { data: records = [] } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_ATTENDANCE_RECORDS_BASE, selectedDate],
    queryFn: async () => {
      const res = await attendanceApi.list({ date: selectedDate, pagesize: 100 });
      if (res.code === 200) {
        return res.data?.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const total = records.length;
    const late = records.filter((r) => r.status === 'late').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const present = total - absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, late, absent, present, rate };
  }, [records]);

  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          bgcolor: 'success.50',
          borderRadius: 1,
        }}
      >
        <CheckCircle
          size={16}
          color={designTokens.colors.success.dark}
        />
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {t('hrm.hrm_attendance_page.text_675ff6')}: {stats.present}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          bgcolor: 'warning.50',
          borderRadius: 1,
        }}
      >
        <AlertCircle
          size={16}
          color='colors.orange.700'
        />
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {t('hrm.hrm_attendance_page.text_7344c8')}: {stats.late}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          bgcolor: 'error.50',
          borderRadius: 1,
        }}
      >
        <XCircle
          size={16}
          color={designTokens.colors.error.dark}
        />
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {t('hrm.hrm_attendance_page.text_7dddee')}: {stats.absent}
        </Typography>
      </Box>
    </Box>
  );
};

const StatisticsContent: React.FC<{ selectedDate: string }> = ({ selectedDate }) => {
  const { t } = useTranslation();

  const { data: records = [], isPending} = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_ATTENDANCE_RECORDS_BASE, selectedDate],
    queryFn: async () => {
      const res = await attendanceApi.list({ date: selectedDate, pagesize: 100 });
      if (res.code === 200) {
        return res.data?.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.HRM_LEAVE_REQUESTS_BASE,
    queryFn: async () => {
      const res = await leaveApi.list({ pagesize: 100 });
      if (res.code === 200) {
        return (res.data?.items as LeaveRequest[]) || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const totalEmployees = records.length;
    const totalPresent = records.filter((r) => r.status !== 'absent').length;
    const totalLate = records.filter((r) => r.status === 'late').length;
    const totalAbsent = records.filter((r) => r.status === 'absent').length;
    const presentRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;
    const avgWorkHours =
      records.length > 0
        ? Math.round(
            (records.reduce((sum, r) => sum + (r.work_hours || 0), 0) /
              records.length) *
              10
          ) / 10
        : 0;
    const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;

    return {
      totalEmployees,
      totalPresent,
      totalLate,
      totalAbsent,
      presentRate,
      avgWorkHours,
      pendingLeaves,
    };
  }, [records, leaves]);

  const statCards = [
    {
      id: 'totalEmployees',
      title: t('hrm.hrm_attendance_page.text_cf4555'),
      value: stats.totalEmployees,
      icon: <Users size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'totalPresent',
      title: t('hrm.hrm_attendance_page.text_675ff6'),
      value: stats.totalPresent,
      icon: <CheckCircle size={20} />,
      color: 'success' as const,
    },
    {
      id: 'presentRate',
      title: t('hrm.hrm_attendance_page.text_91d77e'),
      value: `${stats.presentRate}%`,
      icon: <BarChart3 size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'avgWorkHours',
      title: t('hrm.hrm_attendance_page.text_7e3b68'),
      value: `${stats.avgWorkHours}h`,
      icon: <Clock size={20} />,
      color: 'warning' as const,
    },
    {
      id: 'totalLate',
      title: t('hrm.hrm_attendance_page.text_7344c8'),
      value: stats.totalLate,
      icon: <AlertCircle size={20} />,
      color: 'warning' as const,
    },
    {
      id: 'totalAbsent',
      title: t('hrm.hrm_attendance_page.text_7dddee'),
      value: stats.totalAbsent,
      icon: <XCircle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'pendingLeaves',
      title: t('hrm.hrm_attendance_page.text_7c3c05'),
      value: stats.pendingLeaves,
      icon: <Clock size={20} />,
      color: 'info' as const,
    },
  ];

  if (isPending) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color='text.secondary'>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
        {statCards.map((card) => (
          <Box
            key={card.id}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: `${card.color}.50`,
                color: `${card.color}.main`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {card.title}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {card.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('hrm.hrm_attendance_page.text_d88c02')}
        </Typography>
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color='text.secondary'>{t('hrm.hrm_attendance_page.view_1')}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default HrmAttendancePage;
