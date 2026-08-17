import React from 'react';
import { Eye, Edit, Check, Trash2, BookOpen, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material';
import i18n from '@/i18n';
import type { VoucherManagementReturn } from '../hooks/useVoucherManagement';

export type VoucherTableProps = VoucherManagementReturn;
const VoucherTable: React.FC<VoucherTableProps> = (vm) => {
  const {
    loading,
    vouchers,
    totalCount,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
    handleViewDetail,
    handleAudit,
    handlePost,
    handleDelete,
    formatCurrency,
    getStatusBadgeConfig,
    getVoucherTypeConfig,
  } = vm;
  const renderStatusBadge = (status: string) => {
    const config = getStatusBadgeConfig(status);
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
      />
    );
  };
  const renderVoucherTypeBadge = (type: string) => {
    const config = getVoucherTypeConfig(type);
    return (
      <Chip
        label={config.label}
        size='small'
        color={config.color}
        variant='outlined'
      />
    );
  };
  if (loading) {
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
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.voucher_number')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.type')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.date')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.period')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.summary')}
              </TableCell>
              <TableCell
                align='right'
                sx={{ fontWeight: 'bold' }}
              >
                {i18n.t('erp.voucher_mgmt.label.debit_amount')}
              </TableCell>
              <TableCell
                align='right'
                sx={{ fontWeight: 'bold' }}
              >
                {i18n.t('erp.voucher_mgmt.label.credit_amount')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.maker')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {i18n.t('erp.voucher_mgmt.label.status')}
              </TableCell>
              <TableCell
                align='center'
                sx={{ fontWeight: 'bold', width: 200 }}
              >
                {i18n.t('erp.voucher_mgmt.label.operation')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  sx={{ py: 8, textAlign: 'center' }}
                >
                  <FileText
                    sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('erp.voucher_mgmt.message.no_voucher_data')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((voucher) => (
                <TableRow
                  key={voucher.id}
                  hover
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
                      {voucher.voucher_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {renderVoucherTypeBadge(
                      voucher.voucher_number?.split('-')[0] ||
                        i18n.t('erp.voucher_mgmt.voucher_type_short.accounting')
                    )}
                  </TableCell>
                  <TableCell>{voucher.voucher_date?.split('T')[0] || '-'}</TableCell>
                  <TableCell>{voucher.period}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {voucher.summary || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'error.main', fontWeight: 500 }}
                  >
                    {formatCurrency(voucher.total_debit)}
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'success.main', fontWeight: 500 }}
                  >
                    {formatCurrency(voucher.total_credit)}
                  </TableCell>
                  <TableCell>{voucher.maker_name || '-'}</TableCell>
                  <TableCell>{renderStatusBadge(voucher.status)}</TableCell>
                  <TableCell align='center'>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title={i18n.t('erp.voucher_mgmt.label.view_detail')}>
                        <IconButton
                          size='small'
                          onClick={() => handleViewDetail(voucher)}
                          aria-label={i18n.t('erp.voucher_table.k0')}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      {voucher.status === 'draft' && (
                        <Tooltip title={i18n.t('erp.voucher_mgmt.label.edit')}>
                          <IconButton
                            size='small'
                            color='primary'
                            aria-label={i18n.t('erp.voucher_table.k1')}
                          >
                            <Edit size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {voucher.status === 'draft' || voucher.status === 'pending' ? (
                        <Tooltip title={i18n.t('erp.voucher_mgmt.label.audit')}>
                          <IconButton
                            size='small'
                            color='success'
                            onClick={() => handleAudit(voucher)}
                            aria-label={i18n.t('erp.voucher_table.k2')}
                          >
                            <Check size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {voucher.status === 'approved' && (
                        <Tooltip title={i18n.t('erp.voucher_mgmt.label.post')}>
                          <IconButton
                            size='small'
                            color='primary'
                            onClick={() => handlePost(voucher)}
                            aria-label={i18n.t('erp.voucher_table.k3')}
                          >
                            <BookOpen size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(voucher.status === 'draft' || voucher.status === 'pending') && (
                        <Tooltip title={i18n.t('erp.voucher_mgmt.label.delete')}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDelete(voucher.id)}
                            aria-label={i18n.t('erp.voucher_table.k4')}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
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
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={i18n.t('erp.voucher_mgmt.label.rows_per_page')}
      />
    </>
  );
};
export default VoucherTable;
