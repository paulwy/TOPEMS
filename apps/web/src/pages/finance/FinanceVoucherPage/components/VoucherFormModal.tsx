import React from 'react';
import { Typography, Box } from '@mui/material';
import { Plus, X } from 'lucide-react';
import { ActionButton, FormField, FormSelect, Dialog, CurrencyField } from '@/components/common';
import type { VoucherItemRequest, AccountingSubject } from '@/api/erp';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface NewVoucherState {
  voucher_number: string;
  voucher_date: string;
  period: string;
  attachment_count: number;
  summary: string;
  maker_name: string;
  items: VoucherItemRequest[];
}

interface VoucherFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  newVoucher: NewVoucherState;
  setNewVoucher: React.Dispatch<React.SetStateAction<NewVoucherState>>;
  onSubmit: () => void;
  addVoucherItem: () => void;
  updateVoucherItem: (
    index: number,
    field: keyof VoucherItemRequest,
    value: VoucherItemRequest[keyof VoucherItemRequest]
  ) => void;
  removeVoucherItem: (index: number) => void;
  subjects: AccountingSubject[];
  formatCurrency: (amount: number) => string;
}

const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  open,
  onClose,
  title,
  newVoucher,
  setNewVoucher,
  onSubmit,
  addVoucherItem,
  updateVoucherItem,
  removeVoucherItem,
  subjects,
  formatCurrency,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      cancelButton={{
        label: i18n.t('finance.finance_voucher_page_components__voucher_form_modal.cancel'),
        onClick: onClose,
      }}
      confirmButton={{
        label: i18n.t('finance.finance_voucher_page_components__voucher_form_modal.save'),
        onClick: onSubmit,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          <FormField
            name='voucher_number'
            label={i18n.t(
              'finance.finance_voucher_page_components__voucher_form_modal.text_7c0ad7'
            )}
            value={newVoucher.voucher_number}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewVoucher((prev) => ({
                ...prev,
                voucher_number: e.target.value,
              }))
            }
            placeholder={t(
              'finance.finance_voucher_page_components__voucher_form_modal.please_input'
            )}
          />
          <FormField
            name='voucher_date'
            label={i18n.t('finance.finance_voucher_page_components__voucher_form_modal.date')}
            type='date'
            value={newVoucher.voucher_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewVoucher((prev) => ({
                ...prev,
                voucher_date: e.target.value,
              }))
            }
          />
          <FormField
            name='period'
            label={t('finance.finance_voucher_page_components__voucher_form_modal.text_9d3080')}
            value={newVoucher.period}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewVoucher((prev) => ({
                ...prev,
                period: e.target.value,
              }))
            }
            placeholder={t(
              'finance.finance_voucher_page_components__voucher_form_modal.text_4c1005'
            )}
          />
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
          }}
        >
          <FormField
            name='attachment_count'
            label={t('finance.finance_voucher_page_components__voucher_form_modal.quantity')}
            type='number'
            value={newVoucher.attachment_count}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewVoucher((prev) => ({
                ...prev,
                attachment_count: parseInt(e.target.value) || 0,
              }))
            }
          />
          <FormField
            name='maker_name'
            label={t('finance.finance_voucher_page_components__voucher_form_modal.document_maker')}
            value={newVoucher.maker_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewVoucher((prev) => ({
                ...prev,
                maker_name: e.target.value,
              }))
            }
            placeholder={t(
              'finance.finance_voucher_page_components__voucher_form_modal.document_maker_1'
            )}
          />
        </Box>
        <FormField
          name='summary'
          label={t('finance.finance_voucher_page_components__voucher_form_modal.text_3ae146')}
          multiline
          rows={2}
          value={newVoucher.summary}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewVoucher((prev) => ({
              ...prev,
              summary: e.target.value,
            }))
          }
          placeholder={t('finance.finance_voucher_page_components__voucher_form_modal.text_95392b')}
        />

        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              凭证明细
            </Typography>
            <ActionButton
              label={t('finance.finance_voucher_page_components__voucher_form_modal.text_8f114f')}
              icon={<Plus size={16} />}
              variant='secondary'
              size='small'
              onClick={addVoucherItem}
            />
          </Box>
          <Box
            sx={{
              maxHeight: 256,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {newVoucher.items.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
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
                <FormSelect
                  name={`subject_code_${index}`}
                  label={t(
                    'finance.finance_voucher_page_components__voucher_form_modal.text_3a5553'
                  )}
                  value={item.subject_code}
                  onChange={(value: string | number | string[]) =>
                    updateVoucherItem(index, 'subject_code', value as string | number)
                  }
                  options={subjects.map((s) => ({
                    value: s.code,
                    label: `${s.code} - ${s.name}`,
                  }))}
                />
                <FormField
                  name={`subject_name_${index}`}
                  label=''
                  sx={{ width: 100 }}
                  value={item.subject_name}
                  slotProps={{ input: { readOnly: true } }}
                  placeholder={t(
                    'finance.finance_voucher_page_components__voucher_form_modal.name'
                  )}
                />
                <CurrencyField
                  name={`debit_amount_${index}`}
                  label=''
                  sx={{ width: 150 }}
                  value={item.debit_amount || 0}
                  onChange={(val: number) => updateVoucherItem(index, 'debit_amount', val)}
                  placeholder={t(
                    'finance.finance_voucher_page_components__voucher_form_modal.text_63e2bc'
                  )}
                />
                <CurrencyField
                  name={`credit_amount_${index}`}
                  label=''
                  sx={{ width: 150 }}
                  value={item.credit_amount || 0}
                  onChange={(val: number) => updateVoucherItem(index, 'credit_amount', val)}
                  placeholder={t(
                    'finance.finance_voucher_page_components__voucher_form_modal.text_9ff9a6'
                  )}
                />
                <ActionButton
                  label={t('finance.finance_voucher_page_components__voucher_form_modal.delete')}
                  icon={<X size={16} />}
                  variant='text'
                  size='small'
                  onClick={() => removeVoucherItem(index)}
                />
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 4,
              mt: 2,
            }}
          >
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                借方合计
              </Typography>
              <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {formatCurrency(newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0))}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                贷方合计
              </Typography>
              <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {formatCurrency(
                  newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0)
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default VoucherFormModal;
