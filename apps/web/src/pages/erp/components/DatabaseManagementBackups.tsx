import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Database, Download, Upload, Trash2, Play } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import type { BackupRecord } from '../hooks/useDatabaseManagement';

interface DatabaseManagementBackupsProps {
  backups: BackupRecord[];
  loading: boolean;
  onBackup: () => void;
  onRestore: (backupId: string) => void;
  onDelete: (backupId: string) => void;
}

export const DatabaseManagementBackups: React.FC<DatabaseManagementBackupsProps> = ({
  backups,
  loading,
  onBackup,
  onRestore,
  onDelete,
}) => {
  const { t } = useTranslation();

  const getBackupStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { color: 'success' | 'error' | 'info' | 'default'; label: string; icon: React.ReactNode }
    > = {
      success: {
        color: 'success',
        label: t('erp.database.status.success'),
        icon: <CheckCircle size={14} />,
      },
      failed: {
        color: 'error',
        label: t('erp.database.status.failed'),
        icon: <AlertCircle size={14} />,
      },
      running: {
        color: 'info',
        label: t('erp.database.status.running'),
        icon: <CircularProgress size={14} />,
      },
    };
    const config = badges[status] || { color: 'default', label: status, icon: <Info size={14} /> };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        icon={config.icon}
      />
    );
  };

  return (
    <>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant='outlined'
          size='small'
          startIcon={<Upload size={16} />}
          onClick={() => {}}
        >
          {t('erp.database.label.upload_backup')}
        </Button>
        <Button
          variant='contained'
          size='small'
          startIcon={<Play size={16} />}
          onClick={onBackup}
        >
          {t('erp.database.label.backup_now')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <MuiTable>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {t('erp.database.label.backup_name')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('erp.database.label.type')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {t('erp.database.label.file_size')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('erp.database.label.status')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {t('erp.database.label.created_by')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {t('erp.database.label.created_at')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('erp.database.label.remark')}</TableCell>
                <TableCell
                  align='center'
                  sx={{ fontWeight: 'bold', width: 160 }}
                >
                  {t('erp.database.label.operation')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    sx={{ py: 8, textAlign: 'center' }}
                  >
                    <Download
                      sx={{
                        width: 48,
                        height: 48,
                        color: 'text.disabled',
                        mx: 'auto',
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.secondary' }}
                    >
                      {t('erp.database.label.no_backups')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((backup) => (
                  <TableRow
                    key={backup.id}
                    hover
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Database
                          size={16}
                          style={{ opacity: 0.5 }}
                        />
                        <Typography
                          sx={{
                            fontWeight: 500,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                          }}
                        >
                          {backup.backup_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          backup.backup_type === 'full'
                            ? ` + ${t('erp.database.label.full_backup')} + `
                            : t('erp.database.label.incremental_backup')
                        }
                        size='small'
                        color={backup.backup_type === 'full' ? 'primary' : 'default'}
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>{backup.filesize}</TableCell>
                    <TableCell>{getBackupStatusBadge(backup.status)}</TableCell>
                    <TableCell>{backup.created_by}</TableCell>
                    <TableCell>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary' }}
                      >
                        {backup.created_at}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'text.secondary',
                        }}
                      >
                        {backup.remark || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title={t('erp.database.label.download')}>
                          <IconButton
                            size='small'
                            color='primary'
                          >
                            <Download size={16} />
                          </IconButton>
                        </Tooltip>
                        {backup.status === 'success' && (
                          <Tooltip title={t('erp.database.label.restore')}>
                            <IconButton
                              size='small'
                              color='warning'
                              onClick={() => onRestore(backup.id)}
                            >
                              <Upload size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t('erp.database.label.delete')}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => onDelete(backup.id)}
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
          </MuiTable>
        </TableContainer>
      )}
    </>
  );
};

// Helper icons for status badge
const CheckCircle = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
    <polyline points='22 4 12 14.01 9 11.01' />
  </svg>
);

const AlertCircle = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle
      cx='12'
      cy='12'
      r='10'
    />
    <line
      x1='12'
      y1='8'
      x2='12'
      y2='12'
    />
    <line
      x1='12'
      y1='16'
      x2='12.01'
      y2='16'
    />
  </svg>
);

const Info = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle
      cx='12'
      cy='12'
      r='10'
    />
    <line
      x1='12'
      y1='16'
      x2='12'
      y2='12'
    />
    <line
      x1='12'
      y1='8'
      x2='12.01'
      y2='8'
    />
  </svg>
);
