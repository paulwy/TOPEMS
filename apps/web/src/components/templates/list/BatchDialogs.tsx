import React from 'react';
import { AlertTriangle as WarningIcon } from 'lucide-react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface BatchConfirmDialogProps {
  open: boolean;
  actionLabel: string;
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 批量操作确认对话框
 */
export const BatchConfirmDialog: React.FC<BatchConfirmDialogProps> = ({
  open,
  actionLabel,
  selectedCount,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {t('components.components.batchdialogs.key_e83a25')}
        {actionLabel}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
          <Typography variant='body1'>
            <span>{selectedCount}</span>{' '}
            {t('component.template.confirmAction', {
              count: selectedCount,
              action: actionLabel,
            })}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ gap: 2 }}>
        <Button onClick={onCancel}>{t('components.components.batchdialogs.key_625fb2')}</Button>
        <Button
          onClick={onConfirm}
          color='primary'
          variant='contained'
        >
          {t('components.components.batchdialogs.key_e83a25')}
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export interface BatchProgressDialogProps {
  open: boolean;
  actionLabel: string;
  processed: number;
  total: number;
  isCancelled: boolean;
  onCancel: () => void;
}

/**
 * 批量操作进度对话框
 */
export const BatchProgressDialog: React.FC<BatchProgressDialogProps> = ({
  open,
  actionLabel,
  processed,
  total,
  isCancelled,
  onCancel,
}) => {
  const { t } = useTranslation();
  const progress = total > 0 ? (processed / total) * 100 : 0;

  return (
    <Dialog
      open={open}
      sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isCancelled
          ? `${actionLabel}${t('components.components.batchdialogs.key_653e79')}`
          : `${actionLabel}${t('components.components.batchdialogs.key_d6dbbd')}`}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant='body1'>
            {isCancelled ? (
              <span>{t('components.components.batchdialogs.key_4a8a98')}</span>
            ) : (
              <span>
                {t('components.components.batchdialogs.key_aa7d85')}{' '}
                <strong>
                  {processed}/{total}
                </strong>{' '}
                {t('components.components.batchdialogs.key_f932ef')}
              </span>
            )}
          </Typography>
        </Box>
        <LinearProgress
          variant='determinate'
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </DialogContent>
      <DialogActions sx={{ gap: 2 }}>
        {!isCancelled && (
          <Button
            onClick={onCancel}
            color='error'
          >
            {t('components.components.batchdialogs.key_170933')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
