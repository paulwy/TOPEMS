import React from 'react';
import { FileText, Clock, User, Eye } from 'lucide-react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AuditLog } from '@/api/system';
import type { AuditLogPagination } from '../hooks/useAuditLog';

interface AuditLogTableProps {
  logs: AuditLog[];
  totalCount: number;
  isLoading: boolean;
  pagination: AuditLogPagination;
  setPagination: (pagination: AuditLogPagination) => void;
  onViewDetail: (log: AuditLog) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatAction: (action: string) => string;
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  totalCount,
  isLoading,
  pagination,
  setPagination,
  onViewDetail,
  getStatusBadge,
  formatAction,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold', width: 80 }}>
                {t('system.field.operation')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.time')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.user')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.operation_type')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.entity_type')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.ip_address')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.status')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('system.field.detail')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  sx={{ py: 8, textAlign: 'center' }}
                >
                  <FileText
                    sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('system.message.no_audit_logs')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  hover
                >
                  <TableCell>
                    <Tooltip title={t('system.action.view_detail')}>
                      <IconButton
                        size='small'
                        onClick={() => onViewDetail(log)}
                      aria-label="查看"
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Clock
                        size={14}
                        style={{ opacity: 0.5 }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary' }}
                      >
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'primary.100',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={14} />
                      </Box>
                      <Typography sx={{ fontWeight: 500 }}>{log.user_name || '-'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatAction(log.action)}
                      size='small'
                      color='primary'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {log.ip_address || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    {log.error_message ? (
                      <Typography
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'error.main',
                          fontSize: '0.875rem',
                        }}
                      >
                        {log.error_message}
                      </Typography>
                    ) : log.request_details ? (
                      <Typography
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.875rem',
                        }}
                      >
                        {typeof log.request_details === 'string'
                          ? log.request_details
                          : JSON.stringify(log.request_details)}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={totalCount}
        page={pagination.page}
        onPageChange={(_, newPage) => setPagination({ ...pagination, page: newPage })}
        rowsPerPage={pagination.rowsPerPage}
        onRowsPerPageChange={(e) => {
          setPagination({
            ...pagination,
            rowsPerPage: parseInt(e.target.value, 10),
            page: 0,
          });
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={t('system.field.rows_per_page')}
      />
    </>
  );
};

export default AuditLogTable;
