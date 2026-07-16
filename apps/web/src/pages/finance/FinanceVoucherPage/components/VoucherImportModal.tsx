import React from 'react';
import { Typography, Box } from '@mui/material';
import { AlertCircle, Download } from 'lucide-react';
import { ActionButton, FormField, Dialog } from '@/components/common';
import { useNotificationStore } from '@/store';

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
  const addNotification = useNotificationStore((state) => state.addNotification);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title='导入用友财务凭证'
      cancelButton={{
        label: '取消',
        onClick: onClose,
      }}
      confirmButton={{
        label: '开始导入',
        onClick: () => {
          const content = (document.getElementById('importData') as HTMLTextAreaElement).value;
          if (!content.trim()) {
            addNotification({
              title: '提示',
              message: '请输入凭证数据',
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
            placeholder='[{"voucher_number": "记-001", "voucher_date": "2024-01-15", "period": "2024-01", "summary": "支付办公费用", "maker": "张三", "items": [{"line_number": 1, "subject_code": "6602", "subject_name": "管理费用", "summary": "办公用品", "debit_amount": 500.00, "credit_amount": 0}]}]'
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ActionButton
            label='加载示例数据'
            icon={<Download size={16} />}
            variant='secondary'
            onClick={() => {
              const sampleData = JSON.stringify(
                [
                  {
                    voucher_number: '记-001',
                    voucher_date: '2024-01-15',
                    period: '2024-01',
                    summary: '支付办公费用',
                    maker: '张三',
                    items: [
                      {
                        line_number: 1,
                        subject_code: '6602',
                        subject_name: '管理费用',
                        summary: '办公用品',
                        debit_amount: 500.0,
                        credit_amount: 0,
                      },
                      {
                        line_number: 2,
                        subject_code: '1002',
                        subject_name: '银行存款',
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
