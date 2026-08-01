/**
 * AttendanceLeaveTab - Leave applications list
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import React from 'react';
import { Box, Typography, Paper, Chip, List, Divider, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FileText, Plus } from 'lucide-react';
import { MobileButton } from '@/components/mobile';
import type { LeaveApplication } from '@/api/mobile';

interface AttendanceLeaveTabProps {
  leaves: LeaveApplication[];
  onOpenLeaveDialog: () => void;
}

export const AttendanceLeaveTab: React.FC<AttendanceLeaveTabProps> = ({
  leaves,
  onOpenLeaveDialog,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const getLeaveTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      annual: t('mobile.attendance.leave_type.annual'),
      sick: t('mobile.attendance.leave_type.sick'),
      personal: t('mobile.attendance.leave_type.personal'),
      maternity: t('mobile.attendance.leave_type.maternity'),
      paternity: t('mobile.attendance.leave_type.paternity'),
      funeral: t('mobile.attendance.leave_type.bereavement'),
      other: t('mobile.attendance.leave_type.other'),
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
      pending: t('mobile.attendance.status.pending'),
      approved: t('mobile.attendance.status.approved'),
      rejected: t('mobile.attendance.status.rejected'),
      cancelled: t('mobile.attendance.status.cancelled'),
    };
    return map[status] || status;
  };

  return (
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
            <FileText style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
          </Box>
          <Typography
            variant='subtitle1'
            sx={{ mb: 1, fontWeight: 500 }}
          >
            {t('mobile.attendance.status.empty_leave')}
          </Typography>
          <MobileButton
            variant='contained'
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={onOpenLeaveDialog}
          >
            {t('mobile.attendance.action.apply_leave')}
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
                          typeof import('@mui/material/Chip').default
                        >['color']
                      }
                      sx={{ height: 22, fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {leave.days}
                    {t('mobile.attendance.unit.day')}
                  </Typography>
                </Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  {leave.start_date} {t('mobile.attendance.label.to')} {leave.end_date}
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
  );
};
