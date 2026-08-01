/**
 * MobileQuality defect report dialog component
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import { Camera, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileButton } from '@/components/mobile';
import type { QualityTask, DefectRecord } from '@/api/mobile';
import type { DefectForm } from '../hooks/useMobileQuality';

interface MobileQualityDefectDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTask: QualityTask | null;
  defectForm: DefectForm;
  setDefectForm: React.Dispatch<React.SetStateAction<DefectForm>>;
  onSubmit: () => void;
  submitting: boolean;
}

export const MobileQualityDefectDialog: React.FC<MobileQualityDefectDialogProps> = ({
  open,
  onClose,
  selectedTask,
  defectForm,
  setDefectForm,
  onSubmit,
  submitting,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
    >
      <DialogTitle>{t('mobile.quality.dialog.report_defect_title')}</DialogTitle>
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
                {t('mobile.quality.label.current_task')}
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
                {selectedTask.task_no} · {t('mobile.quality.label.batch')} {selectedTask.batch_no}
              </Typography>
            </Paper>
          )}
          <TextField
            fullWidth
            label={t('mobile.quality.label.defect_type')}
            value={defectForm.defect_type}
            onChange={(e) => setDefectForm((prev) => ({ ...prev, defect_type: e.target.value }))}
            placeholder={t('mobile.quality.placeholder.defect_type')}
          />
          <TextField
            select
            fullWidth
            label={t('mobile.quality.label.severity')}
            value={defectForm.severity}
            onChange={(e) =>
              setDefectForm((prev) => ({
                ...prev,
                severity: e.target.value as DefectRecord['severity'],
              }))
            }
          >
            <MenuItem value='minor'>{t('mobile.quality.severity.minor')}</MenuItem>
            <MenuItem value='major'>{t('mobile.quality.severity.major')}</MenuItem>
            <MenuItem value='critical'>{t('mobile.quality.severity.critical')}</MenuItem>
          </TextField>
          <TextField
            fullWidth
            type='number'
            label={t('mobile.quality.label.defect_quantity')}
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
            label={t('mobile.quality.label.defect_description')}
            value={defectForm.description}
            onChange={(e) => setDefectForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('mobile.quality.placeholder.defect_description')}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<Camera style={{ width: 18, height: 18 }} />}
              fullWidth
            >
              {t('mobile.quality.action.photo_upload')}
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
        >
          {t('mobile.quality.action.cancel')}
        </Button>
        <MobileButton
          variant='contained'
          color='error'
          onClick={onSubmit}
          startIcon={<AlertTriangle style={{ width: 18, height: 18 }} />}
          disabled={submitting}
        >
          {t('mobile.quality.action.submit_report')}
        </MobileButton>
      </DialogActions>
    </Dialog>
  );
};
