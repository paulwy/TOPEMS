import React from 'react';
import { Typography, Box } from '@mui/material';
import { Dialog, StatusBadge } from '@/components/common';
import type { FinancialVoucher, VoucherItem } from '@/api/erp';

import { useTranslation } from 'react-i18next';

interface VoucherDetailModalProps {
  open: boolean;
  onClose: () => void;
  currentVoucher: FinancialVoucher | null;
  voucherItems: VoucherItem[];
  getStatusBadge: (status: string) => React.ReactNode;
  formatCurrency: (amount: number) => string;
}

const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  open,
  onClose,
  currentVoucher,
  voucherItems,
  getStatusBadge,
  formatCurrency,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('finance.finance_voucher_page_components__voucher_detail_modal.detail')}
    >
      {currentVoucher && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                凭证编号
              </Typography>
              <Typography
                variant='h6'
                sx={{ color: 'indigo.600', fontWeight: 'bold' }}
              >
                {currentVoucher.voucher_number}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                凭证日期
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
                sx={{ color: 'grey.500' }}
              >
                期间
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {currentVoucher.period}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                状态
              </Typography>
              {getStatusBadge(currentVoucher.status)}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              摘要
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 500 }}
            >
              {currentVoucher.summary || '-'}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                制单人
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {currentVoucher.maker_name || '-'}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                审核人
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {currentVoucher.checker_name || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              凭证明细
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {voucherItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      sx={{
                        width: 24,
                        textAlign: 'center',
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.line_number}
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>{item.subject_code}</Typography>
                    <Typography>{item.subject_name}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {item.summary}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                    </Typography>
                    <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                mt: 3,
                borderTop: 1,
                borderColor: 'divider',
                pt: 2,
              }}
            >
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  借方合计
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: 'error.main', fontWeight: 'bold' }}
                >
                  {formatCurrency(currentVoucher.total_debit)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  贷方合计
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: 'success.main', fontWeight: 'bold' }}
                >
                  {formatCurrency(currentVoucher.total_credit)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default VoucherDetailModal;
