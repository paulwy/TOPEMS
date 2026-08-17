import { Chip, Typography, Box, InputLabel, Button } from '@mui/material';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';
import { Building2, Receipt, Wallet } from 'lucide-react';
import { crmApi } from '@/api/crm';
import {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
} from '@/hooks/useCrmFinance';
import type { SalesInvoice, CollectionRecord } from '@/api/crmFinance';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { CRM_PATHS } from '@/modules/crm/config';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/utils/date';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const CustomerDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.CUSTOMER(id || ''),
    queryFn: () => crmApi.customers.get(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: financeInfo } = useCustomerFinanceInfo(id || '');
  const { data: invoicesData } = useSalesInvoices({
    customer_id: id,
    pagesize: 10,
  });
  const { data: collectionsData } = useCollectionRecords({
    customer_id: id,
    pagesize: 10,
  });

  const customer =
    customerQuery.data?.success && customerQuery.data.data ? customerQuery.data.data : null;
  const loading = customerQuery.isLoading;

  const formatCurrency = (amount?: number) => {
    if (!amount) return '¥0';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      active: { label: t('crm.customerDetail.status_active'), color: 'success' },
      inactive: { label: t('crm.customerDetail.status_inactive'), color: 'default' },
      prospect: { label: t('crm.customerDetail.status_prospect'), color: 'info' },
      blocked: { label: t('crm.customerDetail.status_blocked'), color: 'error' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={s.color}
        label={s.label}
      />
    );
  };

  const finInfo = financeInfo?.data;

  const basicInfoContent = useMemo(() => {
    if (!customer) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_name')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{customer.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_code')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_industry')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.industry || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_website')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.website || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_email')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.email || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_phone')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.phone || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: 'span 2' }}>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_address')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.address || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.customerDetail.field_status')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(customer.status)}</Box>
        </Box>
        {customer.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('crm.customerDetail.field_notes')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{customer.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [customer, t]);

  const financeInfoContent = useMemo(() => {
    if (!finInfo) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('crm.customerDetail.section_credit')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_credit_limit')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {formatCurrency(finInfo?.credit_limit)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_credit_term_days')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.credit_term_days || 0}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_payment_terms')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.payment_terms || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_customer_status')}
            </Typography>
            <Chip
              size='small'
              color={finInfo?.status === 'normal' ? 'success' : 'default'}
              label={
                finInfo?.status === 'normal'
                  ? t('crm.customerDetail.status_normal')
                  : finInfo?.status || '-'
              }
            />
          </Box>
        </Box>

        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('crm.customerDetail.section_receivable')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_accounts_receivable')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'warning.main' }}>
              {formatCurrency(finInfo?.accounts_receivable)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_overdue_receivable')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'error.main' }}>
              {formatCurrency(finInfo?.overdue_receivable)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_avg_collection_days')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {finInfo?.avg_collection_days || 0}{' '}
              {t('crm.customerDetail.field_avg_collection_days_unit')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_last_transaction_date')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {finInfo?.last_transaction_date ? formatDate(finInfo.last_transaction_date) : '-'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('crm.customerDetail.section_transaction')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_total_sales')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'success.main' }}>
              {formatCurrency(finInfo?.total_sales)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_total_received')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              {formatCurrency(finInfo?.total_received)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_receivable_balance')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'warning.main' }}>
              {formatCurrency((finInfo?.accounts_receivable || 0) - (finInfo?.total_received || 0))}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('crm.customerDetail.section_bank')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_bank_name')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.bank_name || '-'}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_bank_account')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.bank_account || '-'}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_account_name')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.account_name || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>
              {t('crm.customerDetail.field_tax_number')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.tax_number || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [finInfo, t]);

  const invoicesContent = useMemo(() => {
    const invoiceList = invoicesData?.data?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('crm.customerDetail.invoices_title')}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Receipt size={16} />}
          >
            {t('crm.customerDetail.invoices_new')}
          </Button>
        </Box>
        {invoiceList.length === 0 ? (
          <Typography
            color='text.secondary'
            sx={{ py: 8, textAlign: 'center' }}
          >
            {t('crm.customerDetail.invoices_empty')}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {invoiceList.map((invoice: SalesInvoice, _index: number) => (
              <Box
                key={invoice.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 100px 100px 100px 80px',
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 'medium' }}>{invoice.invoice_number}</Typography>
                <Typography align='right'>{formatCurrency(invoice.amount)}</Typography>
                <Typography align='right'>{formatCurrency(invoice.tax_amount)}</Typography>
                <Typography align='right'>{formatCurrency(invoice.total_amount)}</Typography>
                <Typography>{formatDate(invoice.invoice_date)}</Typography>
                <Typography>{formatDate(invoice.due_date)}</Typography>
                <Chip
                  size='small'
                  color={
                    invoice.status === 'issued'
                      ? 'success'
                      : invoice.status === 'draft'
                        ? 'default'
                        : invoice.status === 'cancelled'
                          ? 'error'
                          : 'info'
                  }
                  label={
                    invoice.status === 'draft'
                      ? t('crm.customerDetail.invoice_draft')
                      : invoice.status === 'issued'
                        ? t('crm.customerDetail.invoice_issued')
                        : invoice.status === 'paid'
                          ? t('crm.customerDetail.invoice_paid')
                          : invoice.status === 'overdue'
                            ? t('crm.customerDetail.invoice_overdue')
                            : invoice.status === 'cancelled'
                              ? t('crm.customerDetail.invoice_cancelled')
                              : invoice.status
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [invoicesData, t]);

  const collectionsContent = useMemo(() => {
    const collectionList = collectionsData?.data?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('crm.customerDetail.collections_title')}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Wallet size={16} />}
          >
            {t('crm.customerDetail.collections_new')}
          </Button>
        </Box>
        {collectionList.length === 0 ? (
          <Typography
            color='text.secondary'
            sx={{ py: 8, textAlign: 'center' }}
          >
            {t('crm.customerDetail.collections_empty')}
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {collectionList.map((record: CollectionRecord) => (
              <Box
                key={record.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 100px 80px',
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 'medium' }}>{record.collection_number}</Typography>
                <Typography align='right'>{formatCurrency(record.amount)}</Typography>
                <Typography>
                  {record.payment_method === 'bank_transfer'
                    ? t('crm.customerDetail.payment_bank_transfer')
                    : record.payment_method === 'cash'
                      ? t('crm.customerDetail.payment_cash')
                      : record.payment_method === 'check'
                        ? t('crm.customerDetail.payment_check')
                        : t('crm.customerDetail.payment_other')}
                </Typography>
                <Typography>{formatDate(record.collection_date)}</Typography>
                <Chip
                  size='small'
                  color={
                    record.status === 'confirmed'
                      ? 'success'
                      : record.status === 'pending'
                        ? 'warning'
                        : 'error'
                  }
                  label={
                    record.status === 'confirmed'
                      ? t('crm.customerDetail.collection_confirmed')
                      : record.status === 'pending'
                        ? t('crm.customerDetail.collection_pending')
                        : t('crm.customerDetail.collection_cancelled')
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [collectionsData, t]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!customer) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: t('crm.customerDetail.section_other'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.common.create_time')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {new Date(customer.created_at).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.common.update_time')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {new Date(customer.updated_at).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.customerDetail.field_customer_id')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 'medium',
                mt: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {customer.id.substring(0, 8)}...
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.customerDetail.field_status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(customer.status)}</Box>
          </Box>
        </Box>
      ),
    };
  }, [customer, t]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: t('crm.customerDetail.tab_basic'), content: basicInfoContent || <></> },
      {
        id: 'finance',
        label: t('crm.customerDetail.tab_finance'),
        content: financeInfoContent || <></>,
      },
      { id: 'invoices', label: t('crm.customerDetail.tab_invoices'), content: invoicesContent },
      {
        id: 'collections',
        label: t('crm.customerDetail.tab_collections'),
        content: collectionsContent,
      },
    ],
    [basicInfoContent, financeInfoContent, invoicesContent, collectionsContent, t]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Building2
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: customer?.name,
      subtitle: customer?.code || undefined,
      tags: customer?.industry ? [customer.industry] : [],
      stats: [
        {
          label: t('crm.customerDetail.field_credit_limit'),
          value: formatCurrency(finInfo?.credit_limit),
        },
        {
          label: t('crm.customerDetail.field_accounts_receivable'),
          value: formatCurrency(finInfo?.accounts_receivable),
        },
        {
          label: t('crm.customerDetail.field_overdue_receivable'),
          value: formatCurrency(finInfo?.overdue_receivable),
        },
        {
          label: t('crm.customerDetail.field_total_sales'),
          value: formatCurrency(finInfo?.total_sales),
        },
      ],
    }),
    [customer, finInfo, t]
  );

  const sections = useMemo<SectionConfig[]>(() => [footerSection], [footerSection]);

  return (
    <PageContainer
      title={t('crm.customerDetail.title')}
      subtitle={t('crm.customerDetail.subtitle')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={customer?.name || customer?.code || t('crm.customer_detail_page.k0')}
        backHref={CRM_PATHS.customers}
        loading={loading}
        onEdit={() => {}}
        infoCard={infoCard}
        tabs={tabs}
        sections={sections}
      />
    </PageContainer>
  );
};

export default CustomerDetailPage;
