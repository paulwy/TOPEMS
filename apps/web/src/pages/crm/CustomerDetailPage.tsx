import {
  Chip,
  Typography,
  Box,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import React, { useMemo, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';
import { Building2, Receipt, Wallet, Download } from 'lucide-react';
import { crmApi } from '@/api/crm';
import {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
  useCreateSalesInvoice,
  useIssueSalesInvoice,
  useRedFlushSalesInvoice,
  useDeleteSalesInvoice,
  useCreateCollectionRecord,
  useConfirmCollection,
  useExportSalesInvoices,
  useExportCollectionRecords,
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
  // ===== ⑬ 前端 UI 入口：操作状态与 mutations =====
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [redFlushTarget, setRedFlushTarget] = useState<SalesInvoice | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    amount: '',
    tax_rate: '13',
    invoice_type: 'tax',
  });
  const [collectionDraft, setCollectionDraft] = useState({
    collection_date: new Date().toISOString().slice(0, 10),
    amount: '',
    payment_method: 'bank_transfer',
    remark: '',
  });
  const [redFlushReason, setRedFlushReason] = useState('');

  const createInvoiceMutation = useCreateSalesInvoice();
  const issueInvoiceMutation = useIssueSalesInvoice();
  const redFlushMutation = useRedFlushSalesInvoice();
  const deleteInvoiceMutation = useDeleteSalesInvoice();
  const createCollectionMutation = useCreateCollectionRecord();
  const confirmCollectionMutation = useConfirmCollection();
  const exportInvoicesMutation = useExportSalesInvoices();
  const exportCollectionsMutation = useExportCollectionRecords();

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleCreateInvoice = useCallback(() => {
    if (!id) return;
    const amount = Number(invoiceDraft.amount);
    if (!amount || amount <= 0) return;
    const taxRate = Number(invoiceDraft.tax_rate || 0) / 100;
    const taxAmount = Math.round(amount * taxRate * 100) / 100;
    createInvoiceMutation.mutate(
      {
        customer_id: id,
        customer_name: customer?.name || '',
        invoice_date: invoiceDraft.invoice_date,
        due_date: invoiceDraft.due_date || invoiceDraft.invoice_date,
        amount,
        tax_amount: taxAmount,
        total_amount: Math.round((amount + taxAmount) * 100) / 100,
        invoice_type: invoiceDraft.invoice_type as SalesInvoice['invoice_type'],
      },
      {
        onSuccess: () => {
          setInvoiceDialogOpen(false);
          setInvoiceDraft({
            invoice_date: new Date().toISOString().slice(0, 10),
            due_date: '',
            amount: '',
            tax_rate: '13',
            invoice_type: 'tax',
          });
        },
      }
    );
  }, [id, invoiceDraft, createInvoiceMutation, customer]);

  const handleCreateCollection = useCallback(() => {
    if (!id) return;
    const amount = Number(collectionDraft.amount);
    if (!amount || amount <= 0) return;
    createCollectionMutation.mutate(
      {
        customer_id: id,
        customer_name: customer?.name || '',
        collection_date: collectionDraft.collection_date,
        amount,
        payment_method: collectionDraft.payment_method as CollectionRecord['payment_method'],
        remark: collectionDraft.remark || undefined,
      },
      {
        onSuccess: () => {
          setCollectionDialogOpen(false);
          setCollectionDraft({
            collection_date: new Date().toISOString().slice(0, 10),
            amount: '',
            payment_method: 'bank_transfer',
            remark: '',
          });
        },
      }
    );
  }, [id, collectionDraft, createCollectionMutation, customer]);

  const handleConfirmRedFlush = useCallback(() => {
    if (!redFlushTarget) return;
    redFlushMutation.mutate(
      { invoiceId: redFlushTarget.id, reason: redFlushReason || undefined },
      {
        onSuccess: () => {
          setRedFlushTarget(null);
          setRedFlushReason('');
        },
      }
    );
  }, [redFlushTarget, redFlushReason, redFlushMutation]);

  const formatCurrency = useCallback((amount?: number) => {
    if (!amount) return '¥0';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const getStatusBadge = useCallback(
    (status: string) => {
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
    },
    [t]
  );

  // crmFinanceApi 经 handleResponse 解包后直接返回业务载荷（H9 双重包装修复）
  const finInfo = financeInfo;

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
  }, [customer, t, getStatusBadge]);

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
  }, [finInfo, t, formatCurrency]);

  const invoicesContent = useMemo(() => {
    const invoiceList = invoicesData?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('crm.customerDetail.invoices_title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Download size={16} />}
              onClick={() => {
                exportInvoicesMutation.mutate(
                  { customer_id: id, format: 'csv' },
                  {
                    onSuccess: (blob) => downloadBlob(blob, `invoices-${id}.csv`),
                  }
                );
              }}
            >
              {t('crm.customerDetail.invoices_export')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Receipt size={16} />}
              onClick={() => setInvoiceDialogOpen(true)}
            >
              {t('crm.customerDetail.invoices_new')}
            </Button>
          </Box>
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
                  gridTemplateColumns: '1fr 100px 100px 100px 100px 100px 80px 150px',
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
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {invoice.status === 'draft' && (
                    <>
                      <Button
                        size='small'
                        variant='contained'
                        onClick={() => issueInvoiceMutation.mutate(invoice.id)}
                        disabled={issueInvoiceMutation.isPending}
                      >
                        {t('crm.customerDetail.invoice_issue')}
                      </Button>
                      <Button
                        size='small'
                        color='error'
                        onClick={() => deleteInvoiceMutation.mutate(invoice.id)}
                        disabled={deleteInvoiceMutation.isPending}
                      >
                        {t('crm.customerDetail.invoice_delete')}
                      </Button>
                    </>
                  )}
                  {(invoice.status === 'issued' || invoice.status === 'paid') && (
                    <Button
                      size='small'
                      color='error'
                      variant='outlined'
                      onClick={() => {
                        setRedFlushTarget(invoice);
                        setRedFlushReason('');
                      }}
                    >
                      {t('crm.customerDetail.invoice_red_flush')}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [
    invoicesData,
    t,
    formatCurrency,
    id,
    issueInvoiceMutation,
    deleteInvoiceMutation,
    exportInvoicesMutation,
    downloadBlob,
  ]);

  const collectionsContent = useMemo(() => {
    const collectionList = collectionsData?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('crm.customerDetail.collections_title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Download size={16} />}
              onClick={() => {
                exportCollectionsMutation.mutate(
                  { customer_id: id, format: 'csv' },
                  {
                    onSuccess: (blob) => downloadBlob(blob, `collections-${id}.csv`),
                  }
                );
              }}
            >
              {t('crm.customerDetail.collections_export')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Wallet size={16} />}
              onClick={() => setCollectionDialogOpen(true)}
            >
              {t('crm.customerDetail.collections_new')}
            </Button>
          </Box>
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
                  gridTemplateColumns: '1fr 100px 100px 100px 80px 130px',
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
                {record.status === 'pending' && (
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => confirmCollectionMutation.mutate(record.id)}
                    disabled={confirmCollectionMutation.isPending}
                  >
                    {t('crm.customerDetail.collection_confirm')}
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [
    collectionsData,
    t,
    formatCurrency,
    id,
    confirmCollectionMutation,
    exportCollectionsMutation,
    downloadBlob,
  ]);

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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
  }, [customer, t, getStatusBadge]);

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
    [customer, finInfo, t, formatCurrency]
  );

  // ===== ⑬ 操作 Dialog =====
  const invoiceDialog = (
    <Dialog
      open={invoiceDialogOpen}
      onClose={() => setInvoiceDialogOpen(false)}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('crm.customerDetail.invoices_new')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
        <TextField
          label={t('crm.customerDetail.field_invoice_date')}
          type='date'
          size='small'
          value={invoiceDraft.invoice_date}
          onChange={(e) => setInvoiceDraft({ ...invoiceDraft, invoice_date: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } } as const}
        />
        <TextField
          label={t('crm.customerDetail.field_due_date')}
          type='date'
          size='small'
          value={invoiceDraft.due_date}
          onChange={(e) => setInvoiceDraft({ ...invoiceDraft, due_date: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } } as const}
        />
        <TextField
          label={t('crm.customerDetail.field_amount')}
          type='number'
          size='small'
          value={invoiceDraft.amount}
          onChange={(e) => setInvoiceDraft({ ...invoiceDraft, amount: e.target.value })}
        />
        <TextField
          label={t('crm.customerDetail.field_tax_rate')}
          type='number'
          size='small'
          value={invoiceDraft.tax_rate}
          onChange={(e) => setInvoiceDraft({ ...invoiceDraft, tax_rate: e.target.value })}
          helperText={t('crm.customerDetail.invoice_tax_helper')}
        />
        <TextField
          select
          label={t('crm.customerDetail.field_invoice_type')}
          size='small'
          value={invoiceDraft.invoice_type}
          onChange={(e) => setInvoiceDraft({ ...invoiceDraft, invoice_type: e.target.value })}
        >
          <MenuItem value='tax'>{t('crm.customerDetail.invoice_type_tax')}</MenuItem>
          <MenuItem value='普通发票'>{t('crm.customerDetail.invoice_type_normal')}</MenuItem>
          <MenuItem value='专用发票'>{t('crm.customerDetail.invoice_type_special')}</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInvoiceDialogOpen(false)}>
          {t('crm.customerDetail.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={handleCreateInvoice}
          disabled={createInvoiceMutation.isPending || !Number(invoiceDraft.amount)}
        >
          {t('crm.customerDetail.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const collectionDialog = (
    <Dialog
      open={collectionDialogOpen}
      onClose={() => setCollectionDialogOpen(false)}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('crm.customerDetail.collections_new')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
        <TextField
          label={t('crm.customerDetail.field_collection_date')}
          type='date'
          size='small'
          value={collectionDraft.collection_date}
          onChange={(e) =>
            setCollectionDraft({ ...collectionDraft, collection_date: e.target.value })
          }
          slotProps={{ inputLabel: { shrink: true } } as const}
        />
        <TextField
          label={t('crm.customerDetail.field_amount')}
          type='number'
          size='small'
          value={collectionDraft.amount}
          onChange={(e) => setCollectionDraft({ ...collectionDraft, amount: e.target.value })}
        />
        <TextField
          select
          label={t('crm.customerDetail.field_payment_method')}
          size='small'
          value={collectionDraft.payment_method}
          onChange={(e) =>
            setCollectionDraft({ ...collectionDraft, payment_method: e.target.value })
          }
        >
          <MenuItem value='bank_transfer'>{t('crm.customerDetail.payment_bank_transfer')}</MenuItem>
          <MenuItem value='cash'>{t('crm.customerDetail.payment_cash')}</MenuItem>
          <MenuItem value='check'>{t('crm.customerDetail.payment_check')}</MenuItem>
          <MenuItem value='other'>{t('crm.customerDetail.payment_other')}</MenuItem>
        </TextField>
        <TextField
          label={t('crm.customerDetail.field_remark')}
          size='small'
          value={collectionDraft.remark}
          onChange={(e) => setCollectionDraft({ ...collectionDraft, remark: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCollectionDialogOpen(false)}>
          {t('crm.customerDetail.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={handleCreateCollection}
          disabled={createCollectionMutation.isPending || !Number(collectionDraft.amount)}
        >
          {t('crm.customerDetail.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const redFlushDialog = (
    <Dialog
      open={!!redFlushTarget}
      onClose={() => setRedFlushTarget(null)}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('crm.customerDetail.invoice_red_flush')}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          label={t('crm.customerDetail.field_reason')}
          size='small'
          fullWidth
          value={redFlushReason}
          onChange={(e) => setRedFlushReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRedFlushTarget(null)}>{t('crm.customerDetail.cancel')}</Button>
        <Button
          variant='contained'
          color='error'
          onClick={handleConfirmRedFlush}
          disabled={redFlushMutation.isPending}
        >
          {t('crm.customerDetail.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
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
      {invoiceDialog}
      {collectionDialog}
      {redFlushDialog}
    </PageContainer>
  );
};

export default CustomerDetailPage;
