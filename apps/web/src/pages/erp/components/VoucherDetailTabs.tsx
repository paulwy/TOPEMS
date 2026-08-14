import React from 'react';
import { Eye } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import i18n from '@/i18n';
import type { VoucherManagementReturn } from '../hooks/useVoucherManagement';
export type VoucherDetailTabsProps = VoucherManagementReturn;
const VoucherDetailTabs: React.FC<VoucherDetailTabsProps> = (vm) => {
  const {
    showDetailModal,
    setShowDetailModal,
    currentVoucher,
    voucherItems,
    formatCurrency,
    getStatusBadgeConfig,
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
  return (
    <Dialog
      open={showDetailModal}
      onClose={() => setShowDetailModal(false)}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Eye size={20} />
          {i18n.t('erp.voucher_mgmt.label.voucher_detail')}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {currentVoucher && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.voucher_number')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: 'primary.main', fontWeight: 'bold' }}
                >
                  {currentVoucher.voucher_number}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.voucher_date')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {currentVoucher.voucher_date?.split('T')[0]}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.status')}
                </Typography>
                <Box sx={{ mt: 0.5 }}>{renderStatusBadge(currentVoucher.status)}</Box>
              </Box>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                {i18n.t('erp.voucher_mgmt.label.summary')}
              </Typography>
              <Typography>{currentVoucher.summary || '-'}</Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.maker')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{currentVoucher.maker_name || '-'}</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.checker')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {currentVoucher.checker_name || '-'}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.period')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{currentVoucher.period}</Typography>
              </Box>
            </Box>
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('erp.voucher_mgmt.label.voucher_items')}
              </Typography>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ width: 60, fontWeight: 'bold' }}>
                        {i18n.t('erp.voucher_mgmt.label.line_number')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('erp.voucher_mgmt.label.subject_code')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('erp.voucher_mgmt.label.subject_name')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {i18n.t('erp.voucher_mgmt.label.summary')}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'bold' }}
                      >
                        {i18n.t('erp.voucher_mgmt.label.debit')}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'bold' }}
                      >
                        {i18n.t('erp.voucher_mgmt.label.credit')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {voucherItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.line_number}</TableCell>
                        <TableCell>{item.subject_code}</TableCell>
                        <TableCell>{item.subject_name}</TableCell>
                        <TableCell>{item.summary || '-'}</TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'error.main' }}
                        >
                          {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'success.main' }}
                        >
                          {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 4,
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('erp.voucher_mgmt.label.debit_total')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', color: 'error.main' }}
                  >
                    {formatCurrency(currentVoucher.total_debit)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('erp.voucher_mgmt.label.credit_total')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', color: 'success.main' }}
                  >
                    {formatCurrency(currentVoucher.total_credit)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setShowDetailModal(false)}>
          {i18n.t('erp.voucher_mgmt.label.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default VoucherDetailTabs;