import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer, StatCardGroup } from '@/components/common';
import { Tabs, Tab, Box, Typography, Chip } from '@mui/material';
import { ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { receivableSchema, payableSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useTranslation } from 'react-i18next';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';

const receivableAdapter = createCrudPageAdapter({
  list: (params?: Record<string, unknown>) =>
    financeApi.receivablePayable.listSalesInvoices(params),
  create: (data: unknown) =>
    financeApi.receivablePayable.createSalesInvoice(
      data as Parameters<typeof financeApi.receivablePayable.createSalesInvoice>[0]
    ),
  update: (id: string, data: unknown) =>
    financeApi.receivablePayable.updateSalesInvoice(
      id,
      data as Parameters<typeof financeApi.receivablePayable.updateSalesInvoice>[1]
    ),
  delete: (id: string) => financeApi.receivablePayable.deleteSalesInvoice(id),
});

const payableAdapter = createCrudPageAdapter({
  list: (params?: Record<string, unknown>) =>
    financeApi.receivablePayable.listPurchaseInvoices(params),
  create: (data: unknown) =>
    financeApi.receivablePayable.createPurchaseInvoice(
      data as Parameters<typeof financeApi.receivablePayable.createPurchaseInvoice>[0]
    ),
  update: (id: string, data: unknown) =>
    financeApi.receivablePayable.updatePurchaseInvoice(
      id,
      data as Parameters<typeof financeApi.receivablePayable.updatePurchaseInvoice>[1]
    ),
  delete: (id: string) => financeApi.receivablePayable.deletePurchaseInvoice(id),
});

export default function FinanceReceivablePayablePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('receivable');

  const receivablesQuery = useQuery({
    queryKey: QUERY_KEYS.FINANCE.RECEIVABLES,
    queryFn: async () => {
      const res = await financeApi.receivablePayable.listSalesInvoices();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const payablesQuery = useQuery({
    queryKey: QUERY_KEYS.FINANCE.PAYABLES,
    queryFn: async () => {
      const res = await financeApi.receivablePayable.listPurchaseInvoices();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const receivables = receivablesQuery.data || [];
  const payables = payablesQuery.data || [];

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isPaid = (status: string) => status === 'posted';

  const totalReceivable = receivables.reduce(
    (sum: number, r: any) => sum + (r.total_amount || 0),
    0
  );
  const pendingReceivable = receivables
    .filter((r: any) => !isPaid(r.status))
    .reduce((sum: number, r: any) => sum + ((r.total_amount || 0) - (r.received_amount || 0)), 0);
  const overdueReceivable = receivables
    .filter((r: any) => isOverdue(r.due_date) && !isPaid(r.status))
    .reduce((sum: number, r: any) => sum + ((r.total_amount || 0) - (r.received_amount || 0)), 0);

  const totalPayable = payables.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
  const pendingPayable = payables
    .filter((p: any) => !isPaid(p.status))
    .reduce((sum: number, p: any) => sum + ((p.total_amount || 0) - (p.paid_amount || 0)), 0);
  const overduePayable = payables
    .filter((p: any) => isOverdue(p.due_date) && !isPaid(p.status))
    .reduce((sum: number, p: any) => sum + ((p.total_amount || 0) - (p.paid_amount || 0)), 0);

  const statCards = useMemo(
    () => [
      {
        title: t('finance.finance_receivable_payable_page.text_9ef10c'),
        value: formatCurrency(totalReceivable),
        icon: <ArrowUpRight size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_receivable_payable_page.text_1a8469'),
        value: formatCurrency(totalPayable),
        icon: <ArrowDownRight size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.finance_receivable_payable_page.amount'),
        value: formatCurrency(pendingReceivable),
        icon: <CreditCard size={24} />,
        color: 'warning' as const,
      },
      {
        title: t('finance.finance_receivable_payable_page.amount_1'),
        value: formatCurrency(pendingPayable),
        icon: <CreditCard size={24} />,
        color: 'secondary' as const,
      },
    ],
    [totalReceivable, totalPayable, pendingReceivable, pendingPayable]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('finance.finance_receivable_payable_page.text_4dd1f8')}
      subtitle={t('finance.finance_receivable_payable_page.text_551864')}
      autoTitle
      autoBreadcrumbs
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold' }}
          >
            应收应付管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            管理企业应收账款和应付账款
          </Typography>
        </Box>
      </Box>

      <StatCardGroup
        stats={statCards}
        columns={4}
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            value='receivable'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowUpRight sx={{ width: 16, height: 16 }} />
                <span>应收账款</span>
                {overdueReceivable > 0 && (
                  <Chip
                    size='small'
                    color='error'
                    label={`逾期 ${formatCurrency(overdueReceivable)}`}
                  />
                )}
              </Box>
            }
          />
          <Tab
            value='payable'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowDownRight sx={{ width: 16, height: 16 }} />
                <span>应付账款</span>
                {overduePayable > 0 && (
                  <Chip
                    size='small'
                    color='error'
                    label={`逾期 ${formatCurrency(overduePayable)}`}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {activeTab === 'receivable' && (
        <CrudPage
          schema={receivableSchema as EntitySchema & SchemaExtensions}
          apiAdapter={receivableAdapter}
          breadcrumbs={[{ label: '财务' }, { label: '应收应付' }, { label: '应收单' }]}
        />
      )}

      {activeTab === 'payable' && (
        <CrudPage
          schema={payableSchema as EntitySchema & SchemaExtensions}
          apiAdapter={payableAdapter}
          breadcrumbs={[{ label: '财务' }, { label: '应收应付' }, { label: '应付单' }]}
        />
      )}
    </PageContainer>
  );
}
