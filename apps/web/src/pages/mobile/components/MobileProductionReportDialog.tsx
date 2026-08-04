/**
 * MobileProduction work report dialog component
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 */
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CheckSquare } from 'lucide-react';
import { MobileButton } from '@/components/mobile';
import type { ProductionOrder } from '@/api/mobile';
import type { ReportForm } from '../hooks/useMobileProduction';

interface MobileProductionReportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedOrder: ProductionOrder | null;
  reportForm: ReportForm;
  onReportFormChange: (form: ReportForm) => void;
  onSubmit: () => void;
}

export const MobileProductionReportDialog: React.FC<MobileProductionReportDialogProps> = ({
  open,
  onClose,
  selectedOrder,
  reportForm,
  onReportFormChange,
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
      <DialogTitle>{t('mobile.production.dialog.report_title')}</DialogTitle>
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
                {t('mobile.production.label.current_order')}
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
            label={t('mobile.production.label.report_quantity')}
            value={reportForm.quantity}
            onChange={(e) =>
              onReportFormChange({
                ...reportForm,
                quantity: parseInt(e.target.value) || 0,
              })
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            fullWidth
            type='number'
            label={t('mobile.production.label.good_quantity')}
            value={reportForm.good_quantity}
            onChange={(e) =>
              onReportFormChange({
                ...reportForm,
                good_quantity: parseInt(e.target.value) || 0,
              })
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            fullWidth
            type='number'
            label={t('mobile.production.label.bad_quantity')}
            value={reportForm.bad_quantity}
            onChange={(e) =>
              onReportFormChange({
                ...reportForm,
                bad_quantity: parseInt(e.target.value) || 0,
              })
            }
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('mobile.production.action.cancel')}</Button>
        <MobileButton
          variant='contained'
          onClick={onSubmit}
          startIcon={<CheckSquare style={{ width: 18, height: 18 }} />}
        >
          {t('mobile.production.action.submit_report')}
        </MobileButton>
      </DialogActions>
    </Dialog>
  );
};
