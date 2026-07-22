import React from 'react';
import { Typography, Box } from '@mui/material';
import { AlertCircle, Download } from 'lucide-react';
import { ActionButton, FormField, Dialog } from '@/components/common';
import { useNotificationStore } from '@/store';

import { useTranslation } from 'react-i18next';
interface VoucherImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (fileContent: string) => Promise<void>;
}

const VoucherImportModal: React.FC<VoucherImportModalProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('finance.finance_voucher_page_components__voucher_import_modal.import')}
      cancelButton={{
        label: t('finance.finance_voucher_page_components__voucher_import_modal.cancel'),
        onClick: onClose,
      }}
      confirmButton={{
        label: t('finance.finance_voucher_page_components__voucher_import_modal.import_1'),
        onClick: () => {
          const content = (document.getElementById('importData') as HTMLTextAreaElement).value;
          if (!content.trim()) {
            addNotification({
              title: t('finance.finance_voucher_page_components__voucher_import_modal.hint'),
              message: t('finance.finance_voucher_page_components__voucher_import_modal.please_input'),
              type: 'warning',
            });
            return;
          }
          onImport(content);
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box sx={{ p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
          <AlertCircle sx={{ width: 20, height: 20, color: 'blue.600', mb: 1 }} />
          <Typography
            variant='body2'
            sx={{ color: 'blue.800' }}
          >
            请将用友U8系统导出的凭证数据粘贴到下方文本框中。支持JSON格式数据导入。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            用友凭证数据 (JSON格式)
          </Typography>
          <FormField
            name='importData'
            id='importData'
            label=''
            multiline
            rows={12}
            placeholder={t('finance.finance_voucher_page_components__voucher_import_modal.text_a77173')}
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ActionButton
            label={t('finance.finance_voucher_page_components__voucher_import_modal.text_b7a702')}
            icon={<Download size={16} />}
            variant='secondary'
            onClick={() => {
              const sampleData = JSON.stringify(
                [
                  {
                    voucher_number: t('finance.finance_voucher_page_components__voucher_import_modal.text_6357ac'),
                    voucher_date: '2024-01-15',
                    period: '2024-01',
                    summary: t('finance.finance_voucher_page_components__voucher_import_modal.text_e64dd8'),
                    maker: t('finance.finance_voucher_page_components__voucher_import_modal.text_615db5'),
                    items: [
                      {
                        line_number: 1,
                        subject_code: '6602',
                        subject_name: t('finance.finance_voucher_page_components__voucher_import_modal.text_9d7181'),
                        summary: t('finance.finance_voucher_page_components__voucher_import_modal.text_a554c6'),
                        debit_amount: 500.0,
                        credit_amount: 0,
                      },
                      {
                        line_number: 2,
                        subject_code: '1002',
                        subject_name: t('finance.finance_voucher_page_components__voucher_import_modal.text_54b4fb'),
                        summary: '',
                        debit_amount: 0,
                        credit_amount: 500.0,
                      },
                    ],
                  },
                ],
                null,
                2
              );
              (document.getElementById('importData') as HTMLTextAreaElement).value = sampleData;
            }}
          />
        </Box>
      </Box>
    </Dialog>
  );
};

export default VoucherImportModal;
