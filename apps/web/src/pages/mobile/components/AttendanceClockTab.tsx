/**
 * AttendanceClockTab - Clock in/out UI section
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import React from 'react';
import { Box, Typography, Paper, Chip, useTheme } from '@mui/material';
import { CalendarCheck, MapPin } from 'lucide-react';
import type { AttendanceStats } from '@/api/mobile';
import i18n from '@/i18n';

interface AttendanceClockTabProps {
  attendanceStats: AttendanceStats | null;
  checkingIn: boolean;
  todayStatus: string | undefined;
  onCheckIn: () => void;
  onCheckOut: () => void;
}
export const AttendanceClockTab: React.FC<AttendanceClockTabProps> = ({
  attendanceStats,
  checkingIn,
  todayStatus,
  onCheckIn,
  onCheckOut,
}) => {
  const theme = useTheme();
  const handleClockClick = () => {
    if (todayStatus === 'not_checked_in') {
      onCheckIn();
    } else if (todayStatus === 'checked_in') {
      onCheckOut();
    }
  };
  return (
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
            bgcolor: 'alpha(common.white, 0.2)',
            cursor: checkingIn ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s',
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
          onClick={handleClockClick}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CalendarCheck style={{ width: 40, height: 40, margin: '0 auto 4px' }} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {todayStatus === 'not_checked_in'
                ? i18n.t('mobile.attendance.action.clock_in')
                : todayStatus === 'checked_in'
                  ? i18n.t('mobile.attendance.action.clock_out')
                  : i18n.t('mobile.attendance.label.checked_in')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant='body2'
              sx={{ opacity: 0.7, mb: 0.5 }}
            >
              {i18n.t('mobile.attendance.label.clock_in_time')}
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
              {i18n.t('mobile.attendance.label.clock_out_time')}
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
            {i18n.t('mobile.attendance.section.location')}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('mobile.attendance.field.company_address')}
          </Typography>
        </Box>
        <Chip
          label={i18n.t('mobile.attendance.status.in_range')}
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
            {i18n.t('mobile.attendance.section.monthly_stats')}
          </Typography>
          <Typography
            variant='caption'
            color='primary'
            sx={{ cursor: 'pointer' }}
          >
            {i18n.t('mobile.attendance.action.view_detail')}
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
                {i18n.t('mobile.attendance.stat.attendance_days')}
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
                {i18n.t('mobile.attendance.stat.late_count')}
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
                {i18n.t('mobile.attendance.stat.total_hours')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
