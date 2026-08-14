import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Upload,
  Trash2,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  Eye,
  Package,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/date';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

type BackupRecord = {
  id: string;
  backup_type: string;
  status: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  backup_id?: string;
  backup_name?: string;
  duration_seconds?: number;
  file_path?: string;
  error_message?: string;
};

const BackupPage: React.FC = () => {
  const { t } = useTranslation('system');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);

  const [backupName, setBackupName] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'schema'>('full');
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const {
    data: backups = [],
    isPending,
    error,
    refetch,
  } = useQuery<BackupRecord[]>({
    queryKey: [QUERY_KEYS.ADMIN.BACKUP, page + 1, rowsPerPage],
    queryFn: async () => {
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: t('system.backup_page.k0'),
        message: t('system.backup_page.k1'),
        type: 'success',
      });
      setShowCreateModal(false);
      setBackupName('');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN.BACKUP],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err) => {
      addNotification({
        title: t('system.backup_page.k2'),
        message: extractErrorMessage(err, t('system.backup_page.k3')),
        type: 'error',
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (_backupId: string) => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: t('system.backup_page.k4'),
        message: t('system.backup_page.k5'),
        type: 'success',
      });
      setShowRestoreModal(false);
      setSelectedBackup(null);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN.BACKUP],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err) => {
      addNotification({
        title: t('system.backup_page.k6'),
        message: extractErrorMessage(err, t('system.backup_page.k7')),
        type: 'error',
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (_backupId: string) => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: t('system.backup_page.k8'),
        message: t('system.backup_page.k9'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN.BACKUP],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err) => {
      addNotification({
        title: t('system.backup_page.k10'),
        message: extractErrorMessage(err, t('system.backup_page.k11')),
        type: 'error',
      });
    },
  });

  const handleCreateBackup = useCallback(() => {
    createBackupMutation.mutate();
  }, [createBackupMutation]);

  const handleRestoreBackup = useCallback(() => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup.id);
    }
  }, [selectedBackup, restoreBackupMutation]);

  const handleDeleteBackup = useCallback(
    (backupId: string) => {
      openConfirmDialog({
        title: t('system.backup_page.k12'),
        message: t('system.backup_page.k13'),
        danger: true,
        onConfirm: () => {
          deleteBackupMutation.mutate(backupId);
        },
      });
    },
    [deleteBackupMutation, openConfirmDialog]
  );

  const handleOpenRestoreModal = useCallback((backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  }, []);

  const handleOpenDetailModal = useCallback((backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowDetailModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowCreateModal(false);
    setShowRestoreModal(false);
    setShowDetailModal(false);
    setSelectedBackup(null);
  }, []);

  const getBackupTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full: t('system.backup_page.k14'),
      incremental: t('system.backup_page.k15'),
      schema: t('system.backup_page.k16'),
    };
    return labels[type] || type;
  };

  const getBackupTypeChip = (type: string) => {
    const chips: Record<string, { color: 'primary' | 'secondary' | 'default'; label: string }> = {
      full: { color: 'primary', label: t('system.backup_page.k17') },
      incremental: { color: 'secondary', label: t('system.backup_page.k18') },
      schema: { color: 'default', label: t('system.backup_page.k19') },
    };
    const chip = chips[type];
    return (
      <Chip
        size='small'
        label={chip?.label || type}
        color={chip?.color}
      />
    );
  };

  const getStatusChip = (status: string) => {
    const chips: Record<
      string,
      { color: 'success' | 'error' | 'warning' | 'default'; label: string }
    > = {
      completed: { color: 'success', label: t('system.backup_page.k20') },
      failed: { color: 'error', label: t('system.backup_page.k21') },
      in_progress: { color: 'warning', label: t('system.backup_page.k22') },
      pending: { color: 'default', label: t('system.backup_page.k23') },
    };
    const chip = chips[status];
    return (
      <Chip
        size='small'
        label={chip?.label || status}
        color={chip?.color}
      />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const displayBackups = backups || [];

  return (
    <PageContainer title={t('system.backup_page.k24')}>
      <Box sx={{ mb: 3 }}>
        <Button
          variant='contained'
          startIcon={<Package />}
          onClick={() => setShowCreateModal(true)}
          disabled={createBackupMutation.isPending}
        >
          {createBackupMutation.isPending ? (
            <CircularProgress
              size={18}
              sx={{ mr: 1 }}
            />
          ) : null}
          {t('system.backup_page.e1')}
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('system.backup_page.k25')}</TableCell>
                  <TableCell>{t('system.backup_page.k26')}</TableCell>
                  <TableCell>{t('system.backup_page.k27')}</TableCell>
                  <TableCell>{t('system.backup_page.k28')}</TableCell>
                  <TableCell>{t('system.backup_page.k29')}</TableCell>
                  <TableCell>{t('system.backup_page.k30')}</TableCell>
                  <TableCell>{t('system.backup_page.k31')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <Alert severity='error'>
                        {extractErrorMessage(error, t('system.backup_page.k32'))}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : displayBackups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <Typography color='text.secondary'>{t('system.backup_page.k33')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayBackups.map((backup) => (
                    <TableRow key={backup.backup_id}>
                      <TableCell>
                        <Tooltip title={backup.backup_name}>
                          <Typography noWrap>{backup.backup_name}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{getBackupTypeChip(backup.backup_type)}</TableCell>
                      <TableCell>{getStatusChip(backup.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileText size={14} />
                          <Typography>{formatFileSize(backup.file_size || 0)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={14} />
                          <Typography>{formatDateTime(backup.created_at)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={14} />
                          <Typography>{backup.duration_seconds}秒</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={t('system.backup_page.k34')}>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenDetailModal(backup)}
                              aria-label={t('system.backup_page.k35')}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {backup.status === 'completed' && (
                            <Tooltip title={t('system.backup_page.k36')}>
                              <IconButton
                                size='small'
                                onClick={() => handleOpenRestoreModal(backup)}
                                disabled={restoreBackupMutation.isPending}
                                aria-label={t('system.backup_page.k37')}
                              >
                                <Upload size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {backup.status === 'completed' && (
                            <Tooltip title={t('system.backup_page.k38')}>
                              <IconButton
                                size='small'
                                aria-label={t('system.backup_page.k39')}
                              >
                                <Download size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={t('system.backup_page.k40')}>
                            <IconButton
                              size='small'
                              onClick={() => handleDeleteBackup(backup.id)}
                              disabled={deleteBackupMutation.isPending}
                              sx={{ color: 'error.main' }}
                              aria-label={t('system.backup_page.k41')}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={showCreateModal}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('system.backup_page.k42')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label={t('system.backup_page.k43')}
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder={t('system.backup_page.k44')}
              margin='normal'
            />
            <FormControl
              fullWidth
              margin='normal'
            >
              <InputLabel>{t('system.backup_page.k45')}</InputLabel>
              <Select
                value={backupType}
                onChange={(e) => setBackupType(e.target.value as 'full' | 'incremental' | 'schema')}
                label={t('system.backup_page.k46')}
              >
                <MenuItem value='full'>{t('system.backup_page.k47')}</MenuItem>
                <MenuItem value='incremental'>{t('system.backup_page.k48')}</MenuItem>
                <MenuItem value='schema'>{t('system.backup_page.k49')}</MenuItem>
              </Select>
            </FormControl>
            <Alert
              severity='info'
              sx={{ mt: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertCircle size={16} />
                <Typography variant='body2'>{t('system.backup_page.e2')}</Typography>
              </Box>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>{t('system.backup_page.k50')}</Button>
          <Button
            variant='contained'
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <CircularProgress
                size={18}
                sx={{ mr: 1 }}
              />
            ) : null}
            {t('system.backup_page.e3')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRestoreModal}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('system.backup_page.k51')}</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {t('system.backup_page.e4')}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography>{selectedBackup.backup_name}</Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('system.backup_page.r1', {
                    v1: getBackupTypeLabel(selectedBackup.backup_type),
                  })}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('system.backup_page.r2', {
                    v1: formatFileSize(selectedBackup.file_size || 0),
                  })}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('system.backup_page.r3', { v1: formatDateTime(selectedBackup.created_at) })}
                </Typography>
              </Box>
              <Alert
                severity='warning'
                sx={{ mt: 3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AlertCircle size={16} />
                  <Typography variant='body2'>{t('system.backup_page.e5')}</Typography>
                </Box>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>{t('system.backup_page.k52')}</Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handleRestoreBackup}
            disabled={restoreBackupMutation.isPending}
          >
            {restoreBackupMutation.isPending ? (
              <CircularProgress
                size={18}
                sx={{ mr: 1 }}
              />
            ) : null}
            {t('system.backup_page.e6')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={handleCloseModal}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{t('system.backup_page.k53')}</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e7')}
                  </Typography>
                  <Typography>{selectedBackup.backup_name}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e8')}
                  </Typography>
                  <Typography>{getBackupTypeLabel(selectedBackup.backup_type)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e9')}
                  </Typography>
                  {getStatusChip(selectedBackup.status)}
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e10')}
                  </Typography>
                  <Typography>{formatFileSize(selectedBackup.file_size || 0)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e11')}
                  </Typography>
                  <Typography>{formatDateTime(selectedBackup.created_at)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e12')}
                  </Typography>
                  <Typography>{selectedBackup.duration_seconds}秒</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e13')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {selectedBackup.backup_id}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('system.backup_page.e14')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {selectedBackup.file_path || '-'}
                  </Typography>
                </Box>
                {selectedBackup.error_message && (
                  <Box sx={{ width: '100%' }}>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                      color='error'
                    >
                      {t('system.backup_page.e15')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='error'
                    >
                      {selectedBackup.error_message}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>{t('system.backup_page.k54')}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default BackupPage;
