import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, X } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
} from '@mui/material';
import type { OperationLog } from '@/api/admin/operationAudit';

interface OperationAuditLogDetailProps {
  showDetailModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  currentLog: OperationLog | null;
  getModuleLabel: (code: string) => string;
  getOperationLabel: (code: string) => string;
  getResponseStatusBadge: (status?: number) => React.ReactNode;
}

const OperationAuditLogDetail: React.FC<OperationAuditLogDetailProps> = ({
  showDetailModal,
  setShowDetailModal,
  currentLog,
  getModuleLabel,
  getOperationLabel,
  getResponseStatusBadge,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={showDetailModal}
      onClose={() => setShowDetailModal(false)}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileText size={24} />
          <Typography variant='h6'>
            {t('admin.operation_audit_log.operation_audit_log_detail')}
          </Typography>
        </Box>
        <IconButton
          onClick={() => setShowDetailModal(false)}
          aria-label='关闭'
        >
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
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {t('admin.operation_audit_log_page.text_6ea1fe')}
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
                        {t('admin.operation_audit_log_page.text_6e491f')}
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
                        {t('admin.operation_audit_log_page.text_fac54c')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {getModuleLabel(currentLog.module)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('admin.operation_audit_log_page.text_2b6bc0')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {getOperationLabel(currentLog.operation)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('admin.operation_audit_log_page.text_14871a')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                      >
                        {currentLog.resource_type || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('admin.operation_audit_log_page.text_044449')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                      >
                        {currentLog.resource_id || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('admin.operation_audit_log_page.text_092798')}
                      </Typography>
                      {getResponseStatusBadge(currentLog.response_status)}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('admin.operation_audit_log_page.text_eca37c')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {new Date(currentLog.created_at).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {t('admin.operation_audit_log_page.text_d587e0')}
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
                        {t('admin.operation_audit_log_page.text_e53376')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, fontFamily: 'monospace' }}
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
                        {t('admin.operation_audit_log_page.text_819767')}
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
                        {t('admin.operation_audit_log_page.text_c10992')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, fontFamily: 'monospace' }}
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
                        User Agent
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 500,
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentLog.user_agent || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        Trace ID
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                      >
                        {currentLog.trace_id || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  {currentLog.description && (
                    <Grid size={{ xs: 12 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        gutterBottom
                      >
                        {t('admin.operation_audit_log_page.text_3bdd08')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {currentLog.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Grid>
            {currentLog.request_data && (
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    gutterBottom
                  >
                    {t('admin.operation_audit_log_page.text_466a83')}
                  </Typography>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      color: 'grey.800',
                      margin: 0,
                      maxHeight: 320,
                      overflow: 'auto',
                    }}
                  >
                    {typeof currentLog.request_data === 'string'
                      ? currentLog.request_data
                      : JSON.stringify(currentLog.request_data, null, 2)}
                  </pre>
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setShowDetailModal(false)}>
          {t('admin.operation_audit_log.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OperationAuditLogDetail;
