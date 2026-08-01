/**
 * LeaveApplicationDialog - Leave application form dialog
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MobileButton } from '@/components/mobile';
import type { LeaveApplication } from '@/api/mobile';
import type { LeaveForm } from '../hooks/useMobileAttendance';

interface LeaveApplicationDialogProps {
  open: boolean;
  leaveForm: LeaveForm;
  isSubmitting: boolean;
  onClose: () => void;
  onFormChange: (updater: (prev: LeaveForm) => LeaveForm) => void;
  onSubmit: () => void;
}

export const LeaveApplicationDialog: React.FC<LeaveApplicationDialogProps> = ({
  open,
  leaveForm,
  isSubmitting,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
    >
      <DialogTitle>{t('mobile.attendance.action.apply_leave')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            fullWidth
            label={t('mobile.attendance.field.leave_type')}
            value={leaveForm.leave_type}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                leave_type: e.target.value as LeaveApplication['leave_type'],
              }))
            }
          >
            <MenuItem value='annual'>{t('mobile.attendance.leave_type.annual')}</MenuItem>
            <MenuItem value='sick'>{t('mobile.attendance.leave_type.sick')}</MenuItem>
            <MenuItem value='personal'>{t('mobile.attendance.leave_type.personal')}</MenuItem>
            <MenuItem value='maternity'>{t('mobile.attendance.leave_type.maternity')}</MenuItem>
            <MenuItem value='paternity'>{t('mobile.attendance.leave_type.paternity')}</MenuItem>
            <MenuItem value='other'>{t('mobile.attendance.leave_type.other')}</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label={t('mobile.attendance.field.start_date')}
            type='date'
            value={leaveForm.start_date}
            onChange={(e) => onFormChange((prev) => ({ ...prev, start_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
          <TextField
            fullWidth
            label={t('mobile.attendance.field.end_date')}
            type='date'
            value={leaveForm.end_date}
            onChange={(e) => onFormChange((prev) => ({ ...prev, end_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('mobile.attendance.field.leave_reason')}
            value={leaveForm.reason}
            onChange={(e) => onFormChange((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder={t('mobile.attendance.field.reason_placeholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('mobile.attendance.action.cancel')}</Button>
        <MobileButton
          variant='contained'
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {t('mobile.attendance.action.submit')}
        </MobileButton>
      </DialogActions>
    </Dialog>
  );
};
