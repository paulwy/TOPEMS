import React from 'react';
import { FileText, X } from 'lucide-react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Grid,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AuditLog } from '@/api/system';

interface AuditLogDetailDialogProps {
  open: boolean;
  onClose: () => void;
  currentLog: AuditLog | null;
  getStatusBadge: (status: string) => React.ReactNode;
  formatAction: (action: string) => string;
}

const AuditLogDetailDialog: React.FC<AuditLogDetailDialogProps> = ({
  open,
  onClose,
  currentLog,
  getStatusBadge,
  formatAction,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileText size={24} />
          <Typography variant='h6'>{t('system.audit_page.detail_title')}</Typography>
        </Box>
        <IconButton onClick={onClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {currentLog && (
          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {t('system.audit_page.basic_info')}
                </Typography>
                <Grid
                  container
                  spacing={2}
                >
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.id_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.id}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.operation_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {formatAction(currentLog.action)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.entity_type_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.entity_type}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.entity_id_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.entity_id || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.status_label')}
                      </Typography>
                      {getStatusBadge(currentLog.status)}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {t('system.audit_page.user_info')}
                </Typography>
                <Grid
                  container
                  spacing={2}
                >
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.user_id_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.user_id || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.username_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.user_name || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.ip_address_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.ip_address || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('system.audit_page.created_at_label')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {new Date(currentLog.created_at).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                  </Grid>
                  {currentLog.duration_ms !== undefined && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {t('system.audit_page.duration_label')}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {currentLog.duration_ms}ms
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>
            {currentLog.error_message && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: 'error.light' }}>
                  <Typography
                    variant='subtitle2'
                    color='error.main'
                    gutterBottom
                  >
                    {t('system.audit_page.error_info')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='error.main'
                  >
                    {currentLog.error_message}
                  </Typography>
                </Paper>
              </Grid>
            )}
            {currentLog.request_details && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    gutterBottom
                  >
                    {t('system.audit_page.request_details')}
                  </Typography>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      color: 'grey.800',
                    }}
                  >
                    {typeof currentLog.request_details === 'string'
                      ? currentLog.request_details
                      : JSON.stringify(currentLog.request_details, null, 2)}
                  </pre>
                </Paper>
              </Grid>
            )}
            {currentLog.response_details && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    gutterBottom
                  >
                    {t('system.audit_page.response_details')}
                  </Typography>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      color: 'grey.800',
                    }}
                  >
                    {typeof currentLog.response_details === 'string'
                      ? currentLog.response_details
                      : JSON.stringify(currentLog.response_details, null, 2)}
                  </pre>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('system.action.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditLogDetailDialog;
