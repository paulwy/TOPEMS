import { designTokens } from '@topems/tokens';
/**
 * AttendanceRecordsTab - Attendance records list
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import React from 'react';
import { Box, Typography, List, Avatar, Chip } from '@mui/material';
import { Clock } from 'lucide-react';
import { MobileCard } from '@/components/mobile';
import type { AttendanceRecord } from '@/api/mobile';
import i18n from '@/i18n';

interface AttendanceRecordsTabProps {
  records: AttendanceRecord[];
}
const AttendanceRecordsTab: React.FC<AttendanceRecordsTabProps> = ({ records }) => {
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      normal: i18n.t('mobile.attendance.status.normal'),
      late: i18n.t('mobile.attendance.status.late'),
      early_leave: i18n.t('mobile.attendance.status.early_leave'),
      absent: i18n.t('mobile.attendance.status.absent'),
      leave: i18n.t('mobile.attendance.section.leave'),
      business_trip: i18n.t('mobile.attendance.leave_type.business'),
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
  return (
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
                    getStatusColor(record.status) as React.ComponentProps<typeof Chip>['color']
                  }
                  sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
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
  );
};
