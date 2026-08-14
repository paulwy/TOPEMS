import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { FileText, Calendar, User, Building2, Banknote } from 'lucide-react';
import type { Payment } from '@/api/finance/payment';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { designTokens, semanticTokens } from '@topems/tokens';

interface PaymentPrintTemplateProps {
  payment: Payment;
}

const paymentMethodOptions = [
  { value: 'bank_transfer', label: i18n.t('finance.payment_print_template.text_02ab80') },
  { value: 'cash', label: i18n.t('finance.payment_print_template.text_e7c090') },
  { value: 'check', label: i18n.t('finance.payment_print_template.text_5605e0') },
  { value: 'acceptance_bill', label: i18n.t('finance.payment_print_template.text_6b4832') },
  { value: 'other', label: i18n.t('finance.payment_print_template.other') },
];

const statusOptions: Record<string, string> = {
  draft: i18n.t('finance.payment_print_template.text_22b433'),
  submitted: i18n.t('finance.payment_print_template.text_b0bf01'),
  approved: i18n.t('finance.payment_print_template.text_618acb'),
  posted: i18n.t('finance.payment_print_template.text_aaea67'),
  rejected: i18n.t('finance.payment_print_template.text_81233d'),
  cancelled: i18n.t('finance.payment_print_template.cancelled'),
};

export const PaymentPrintTemplate: React.FC<PaymentPrintTemplateProps> = ({ payment }) => {
  const { t } = useTranslation();
  return (
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      padding={false}
      paper={false}
    >
      <Box
        className='payment-print-container'
        sx={{ padding: 2.5, maxWidth: '800px', margin: '0 auto' }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, mb: 1 }}
          >
            付款单
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            Payment Order
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                付款单号：
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 600, fontFamily: 'monospace' }}
              >
                {payment.paymentNo}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                创建日期：
              </Typography>
              <Typography variant='body1'>
                {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('zh-CN') : '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Building2
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                供应商：
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 600 }}
              >
                {payment.supplierName || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <User
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                制单人：
              </Typography>
              <Typography variant='body1'>{payment.createdBy || '-'}</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Banknote
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                付款方式：
              </Typography>
              <Typography variant='body1'>
                {paymentMethodOptions.find((m) => m.value === payment.paymentMethod)?.label ||
                  payment.paymentMethod}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                状态：
              </Typography>
              <Typography variant='body1'>
                {statusOptions[payment.status] || payment.status}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                货币：
              </Typography>
              <Typography variant='body1'>{payment.currency || 'CNY'}</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar
                size={16}
                color={designTokens.colors.primary.dark}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                计划付款日期：
              </Typography>
              <Typography variant='body1'>
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleDateString('zh-CN')
                  : '-'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {payment.bankName && payment.bankAccountNo && (
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: 2, mb: 4 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              银行信息
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  开户银行：
                </Typography>
                <Typography variant='body1'>{payment.bankName}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  银行账号：
                </Typography>
                <Typography variant='body1'>{payment.bankAccountNo}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {(payment.actualPaymentDate || payment.bankTransactionNo || payment.executedBy) && (
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: 2, mb: 4 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              付款执行信息
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  实际付款日期：
                </Typography>
                <Typography variant='body1'>
                  {payment.actualPaymentDate
                    ? new Date(payment.actualPaymentDate).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  银行流水号：
                </Typography>
                <Typography variant='body1'>{payment.bankTransactionNo || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  执行人员：
                </Typography>
                <Typography variant='body1'>{payment.executedBy || '-'}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {payment.items && payment.items.length > 0 && (
          <>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              付款明细
            </Typography>
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'surface.100' }}>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell>发票号</TableCell>
                    <TableCell align='right'>应付金额</TableCell>
                    <TableCell align='right'>本次付款</TableCell>
                    <TableCell align='right'>已核销金额</TableCell>
                    <TableCell align='right'>剩余金额</TableCell>
                    <TableCell>核销状态</TableCell>
                    <TableCell>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payment.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.invoiceNo || '-'}</TableCell>
                      <TableCell align='right'>
                        {(item.payableAmount || 0).toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align='right'>
                        {(item.paymentAmount || 0).toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align='right'>
                        {(item.writeOffAmount || 0).toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align='right'>
                        {(item.remainingAmount || 0).toLocaleString('zh-CN', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        {item.writeOffStatus === 'completed'
                          ? t('finance.payment_print_template.text_77af84')
                          : item.writeOffStatus === 'partial'
                            ? t('finance.payment_print_template.text_8f9319')
                            : t('finance.payment_print_template.text_e9cbed')}
                      </TableCell>
                      <TableCell>{item.remark || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 280px', minWidth: '280px' }} />
            <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
              <Box
                sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 1 }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  付款总金额：
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'info.600' }}
                >
                  ¥
                  {payment.totalAmount.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {payment.remark && (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'surface.50', borderRadius: '4px' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              备注：{payment.remark}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 8, pt: 4, borderTop: '1px dashed #bdbdbd' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                制单：
              </Typography>
              <Box sx={{ height: '40px', borderBottom: '1px solid #e0e0e0', mt: 1 }} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                审核：
              </Typography>
              <Box sx={{ height: '40px', borderBottom: '1px solid #e0e0e0', mt: 1 }} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                审批：
              </Typography>
              <Box sx={{ height: '40px', borderBottom: '1px solid #e0e0e0', mt: 1 }} />
            </Box>
          </Box>
        </Box>

        <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .payment-print-container,
          .payment-print-container * {
            visibility: visible;
          }
          .payment-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          @page {
            margin: 20mm;
          }
        }
      `}</style>
      </Box>
    </PageContainer>
  );
};
