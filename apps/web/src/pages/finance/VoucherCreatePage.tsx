import { designTokens } from '@topems/tokens';
import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  Card,
  CardContent,
  TextField,
  Typography,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import { FormPageTemplate } from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  voucherApi,
  accountingSubjectApi,
  type AccountingSubject,
  type VoucherItemRequest,
} from '@/api/erp';
import { useNotificationStore } from '@/store';

import { useTranslation } from 'react-i18next';

interface FormSection {
  id: string;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'autocomplete';
    required?: boolean;
    span?: number;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  collapsible?: boolean;
}

const VoucherCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    voucher_number: '',
    voucher_date: '',
    period: '',
    attachment_count: 0,
    summary: '',
  });

  const [voucherItems, setVoucherItems] = useState<VoucherItemRequest[]>([]);

  const subjectsQuery = useQuery<AccountingSubject[]>({
    queryKey: QUERY_KEYS.FINANCE.ACCOUNTS,
    queryFn: async () => {
      const result = await accountingSubjectApi.list();
      if (result.success && result.data) {
        return result.data.items || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const subjects = subjectsQuery.data || [];

  useEffect(() => {
    initializeForm();
  }, []);

  const initializeForm = () => {
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setFormData((prev) => ({
      ...prev,
      period,
    }));

    // 添加两行空白的凭证明细
    addVoucherItem();
    addVoucherItem();
  };

  const handleFieldChange = (
    field: keyof typeof formData,
    value: (typeof formData)[keyof typeof formData]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: voucherItems.length + 1,
      subject_code: '',
      subject_name: '',
      summary: '',
      debit_amount: 0,
      credit_amount: 0,
    };
    setVoucherItems((prev) => [...prev, newItem]);
  };

  const updateVoucherItem = (
    index: number,
    field: keyof VoucherItemRequest,
    value: VoucherItemRequest[keyof VoucherItemRequest]
  ) => {
    const items = [...voucherItems];

    if (field === 'subject_code') {
      const subject = subjects.find((s) => s.code === value);
      items[index] = {
        ...items[index],
        subject_code: String(value),
        subject_name: subject?.name || '',
      };
    } else {
      items[index] = { ...items[index], [field]: value };
    }

    setVoucherItems(items);
  };

  const removeVoucherItem = (index: number) => {
    const items = voucherItems.filter((_, i) => i !== index);
    setVoucherItems(items.map((item, i) => ({ ...item, line_number: i + 1 })));
  };

  const validateForm = (): boolean => {
    if (!formData.voucher_number) {
      addNotification({
        title: t('finance.voucher_create_page.error'),
        message: t('finance.voucher_create_page.please_input'),
        type: 'warning',
      });
      return false;
    }

    if (!formData.voucher_date) {
      addNotification({
        title: t('finance.voucher_create_page.error'),
        message: t('finance.voucher_create_page.please_input_1'),
        type: 'warning',
      });
      return false;
    }

    if (!formData.period) {
      addNotification({
        title: t('finance.voucher_create_page.error'),
        message: t('finance.voucher_create_page.please_input_2'),
        type: 'warning',
      });
      return false;
    }

    if (voucherItems.length < 2) {
      addNotification({
        title: t('finance.voucher_create_page.error'),
        message: t('finance.voucher_create_page.text_abf017'),
        type: 'warning',
      });
      return false;
    }

    const totalDebit = voucherItems.reduce((sum, item) => sum + (item.debit_amount || 0), 0);
    const totalCredit = voucherItems.reduce((sum, item) => sum + (item.credit_amount || 0), 0);

    if (totalDebit !== totalCredit || totalDebit === 0) {
      addNotification({
        title: t('finance.voucher_create_page.error'),
        message: t('finance.voucher_create_page.amount'),
        type: 'error',
      });
      return false;
    }

    return true;
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      voucher_number: string;
      voucher_date: string;
      period: string;
      attachment_count: number;
      summary: string;
      items: VoucherItemRequest[];
    }) => {
      const result = await voucherApi.create(data);
      if (!result.success) {
        throw new Error(result.message || t('finance.voucher_create_page.create'));
      }
      return result;
    },
    onSuccess: () => {
      addNotification({
        title: t('finance.voucher_create_page.success'),
        message: t('finance.voucher_create_page.create_1'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.FINANCE.VOUCHERS,
        exact: false,
        refetchType: 'active',
      });
      navigate(FINANCE_PATHS.vouchers);
    },
    onError: (err: Error) => {
      addNotification({
        title: t('finance.voucher_create_page.error_1'),
        message: err.message || t('finance.voucher_create_page.create'),
        type: 'error',
      });
    },
  });

  const handleSubmit = () => {
    if (!validateForm()) return;
    setSubmitting(true);
    createMutation.mutate(
      {
        ...formData,
        items: voucherItems.filter(
          (item) => item.subject_code && (item.debit_amount > 0 || item.credit_amount > 0)
        ),
      },
      {
        onSettled: () => setSubmitting(false),
      }
    );
  };

  const handleCancel = () => {
    navigate(FINANCE_PATHS.vouchers);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalDebit = voucherItems.reduce((sum, item) => sum + (item.debit_amount || 0), 0);
  const totalCredit = voucherItems.reduce((sum, item) => sum + (item.credit_amount || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const basicInfoSection = (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          {t('finance.voucher_create_page.e1')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <TextField
            label={t('finance.voucher_create_page.text_7c0ad7')}
            value={formData.voucher_number}
            onChange={(e) => handleFieldChange('voucher_number', e.target.value)}
            placeholder={t('finance.voucher_create_page.text_c87953')}
            required
            fullWidth
            size='small'
          />
          <TextField
            label={t('finance.voucher_create_page.date')}
            type='date'
            value={formData.voucher_date}
            onChange={(e) => handleFieldChange('voucher_date', e.target.value)}
            required
            fullWidth
            size='small'
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
          <TextField
            label={t('finance.voucher_create_page.text_2902c0')}
            value={formData.period}
            onChange={(e) => handleFieldChange('period', e.target.value)}
            placeholder={t('finance.voucher_create_page.text_b2fa57')}
            required
            fullWidth
            size='small'
            helperText={t('finance.voucher_create_page.text_b526f6')}
          />
          <TextField
            label={t('finance.voucher_create_page.quantity')}
            type='number'
            value={formData.attachment_count}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0) {
                handleFieldChange('attachment_count', val);
              } else if (e.target.value === '') {
                handleFieldChange('attachment_count', 0);
              }
            }}
            fullWidth
            size='small'
          />
          <Box sx={{ gridColumn: 'span 2' }}>
            <TextField
              label={t('finance.voucher_create_page.text_95392b')}
              value={formData.summary}
              onChange={(e) => handleFieldChange('summary', e.target.value)}
              placeholder={t('finance.voucher_create_page.text_8e986b')}
              fullWidth
              size='small'
              multiline
              rows={1}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const voucherItemsSection = (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e8')}
            </Typography>
            {!isBalanced && totalDebit > 0 && (
              <Chip
                size='small'
                icon={<AlertCircle size={14} />}
                label={t('finance.voucher_create_page.text_f4cec4')}
                color='warning'
                variant='outlined'
              />
            )}
          </Box>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Plus size={16} />}
            onClick={addVoucherItem}
          >
            {t('finance.voucher_create_page.e3')}
          </Button>
        </Box>

        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>
                  {t('finance.voucher_create_page.k0')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('finance.voucher_create_page.k1')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('finance.voucher_create_page.k2')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 180, textAlign: 'right' }}>
                  {t('finance.voucher_create_page.e4')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 180, textAlign: 'right' }}>
                  {t('finance.voucher_create_page.e5')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>
                  {t('finance.voucher_create_page.k3')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voucherItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {item.line_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size='small'
                      options={subjects}
                      getOptionLabel={(option) => `${option.code} - ${option.name}`}
                      value={subjects.find((s) => s.code === item.subject_code) || null}
                      onChange={(_, newValue) => {
                        updateVoucherItem(index, 'subject_code', newValue?.code || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={t('finance.voucher_create_page.search')}
                          size='small'
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size='small'
                      placeholder={t('finance.voucher_create_page.text_5b1bed')}
                      value={item.summary}
                      onChange={(e) => updateVoucherItem(index, 'summary', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size='small'
                      type='number'
                      placeholder='0.00'
                      value={item.debit_amount || ''}
                      onChange={(e) =>
                        updateVoucherItem(index, 'debit_amount', parseFloat(e.target.value) || 0)
                      }
                      sx={{
                        '& input': {
                          textAlign: 'right',
                          color: 'error.main',
                          fontWeight: 500,
                        },
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography
                              sx={{
                                color: 'error.main',
                                mr: 0.5,
                                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                              }}
                            >
                              ¥
                            </Typography>
                          ),
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size='small'
                      type='number'
                      placeholder='0.00'
                      value={item.credit_amount || ''}
                      onChange={(e) =>
                        updateVoucherItem(index, 'credit_amount', parseFloat(e.target.value) || 0)
                      }
                      sx={{
                        '& input': {
                          textAlign: 'right',
                          color: 'success.main',
                          fontWeight: 500,
                        },
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography
                              sx={{
                                color: 'success.main',
                                mr: 0.5,
                                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                              }}
                            >
                              ¥
                            </Typography>
                          ),
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => removeVoucherItem(index)}
                      disabled={voucherItems.length <= 1}
                      aria-label={t('finance.voucher_create_page.k4')}
                    >
                      <Trash2 size={16} />
                    </IconButton>
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
            mt: 3,
            pt: 2,
            borderTop: 2,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e9')}
            </Typography>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 'bold',
                color: isBalanced ? 'error.main' : 'error.main',
              }}
            >
              {formatCurrency(totalDebit)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_voucher_page_components_voucher_detail_modal.e10')}
            </Typography>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 'bold',
                color: isBalanced ? 'success.main' : 'error.main',
              }}
            >
              {formatCurrency(totalCredit)}
            </Typography>
          </Box>
        </Box>

        {!isBalanced && totalDebit > 0 && (
          <Alert
            severity='warning'
            icon={<Calculator size={20} />}
            sx={{ mt: 2 }}
          >
            <Typography variant='body2'>
              {t('finance.voucher_create_page.e1', {
                v1: t('finance.voucher_create_page.m1'),
                v2: formatCurrency(totalDebit),
              })}
              {t('finance.voucher_create_page.e1', { v1: formatCurrency(totalCredit) })}
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </Typography>
          </Alert>
        )}

        {isBalanced && (
          <Alert
            severity='success'
            icon={<Calculator size={20} />}
            sx={{ mt: 2 }}
          >
            <Typography variant='body2'>
              {t('finance.voucher_create_page.e2', { v1: t('finance.voucher_create_page.k5') })}
              {formatCurrency(totalDebit)}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const sections = [
    {
      id: 'basic',
      title: t('finance.voucher_create_page.info'),
      content: basicInfoSection,
      collapsible: false,
      fields: [],
    },
    {
      id: 'items',
      title: t('finance.voucher_create_page.text_5f3e09'),
      content: voucherItemsSection,
      collapsible: false,
      fields: [],
    },
  ];

  return (
    <PageContainer backButton={{ href: FINANCE_PATHS.vouchers }}>
      <FormPageTemplate
        title=''
        backHref={FINANCE_PATHS.vouchers}
        sections={sections}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={t('finance.voucher_create_page.save')}
        submitting={submitting}
      />
    </PageContainer>
  );
};

export default VoucherCreatePage;
