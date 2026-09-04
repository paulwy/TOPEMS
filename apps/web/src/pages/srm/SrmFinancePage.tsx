import React, { useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { DollarSign, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { srmApi } from '@/api/srm';
import type { SupplierContract, PurchaseOrder } from '@/api/srm';
import { PageContainer } from '@/components/common';
import { MetricCard } from '@/components/bi/MetricCard';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { financeSchema } from '@/schemas/srm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

interface FinanceRecord {
  id: string;
  record_no: string;
  supplier_name: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  description: string;
}

const financeAdapter: CrudApiAdapter<FinanceRecord> = {
  list: async () => {
    const [contractsRes, ordersRes] = await Promise.all([
      srmApi.listContracts(),
      srmApi.listPurchaseOrders(),
    ]);

    const paymentRecords: FinanceRecord[] = [];
    const invoiceRecords: FinanceRecord[] = [];

    if (contractsRes.success && contractsRes.data) {
      const data = contractsRes.data as unknown as
        SupplierContract[] | { contracts: SupplierContract[] };
      const items = Array.isArray(data)
        ? data
        : (data as { contracts: SupplierContract[] }).contracts || [];
      invoiceRecords.push(
        ...items.map((item: SupplierContract) => ({
          ...item,
          record_no: item.contractNo || '',
          supplier_name: item.supplier_name || '',
          type: 'contract',
          amount: item.total_amount || 0,
          status:
            item.status === 'active'
              ? i18n.t('pages.srm_finance_page.k0')
              : item.status === 'expired'
                ? i18n.t('pages.srm_finance_page.k1')
                : item.status === 'draft'
                  ? i18n.t('pages.srm_finance_page.k2')
                  : item.status === 'terminated'
                    ? i18n.t('pages.srm_finance_page.k3')
                    : item.status,
          date: item.sign_date || item.start_date || item.created_at,
          description: item.remarks || '',
        }))
      );
    }

    if (ordersRes.success && ordersRes.data) {
      const data = ordersRes.data as unknown as PurchaseOrder[] | { orders: PurchaseOrder[] };
      const items = Array.isArray(data) ? data : (data as { orders: PurchaseOrder[] }).orders || [];
      paymentRecords.push(
        ...items.map((item: PurchaseOrder) => ({
          ...item,
          record_no: item.po_no || '',
          supplier_name: '',
          type: 'order',
          amount: item.total_amount || 0,
          status:
            item.status === 'pending'
              ? i18n.t('pages.srm_finance_page.k4')
              : item.status === 'processing'
                ? i18n.t('pages.srm_finance_page.k5')
                : item.status === 'delivered'
                  ? i18n.t('pages.srm_finance_page.k6')
                  : item.status === 'completed'
                    ? i18n.t('pages.srm_finance_page.k7')
                    : item.status === 'cancelled'
                      ? i18n.t('pages.srm_finance_page.k8')
                      : item.status,
          date: item.order_date || item.created_at,
          description: item.remarks || '',
        }))
      );
    }

    const allRecords = [...paymentRecords, ...invoiceRecords];
    return { data: allRecords, total: allRecords.length };
  },
  create: async (data) => {
    const record = data as unknown as FinanceRecord;
    if (record.type === 'order') {
      const res = await srmApi.createPurchaseOrder({
        po_no: record.record_no,
        supplier_id: (record as unknown as { supplier_id: string }).supplier_id || '',
        total_amount: record.amount,
        status: record.status,
        currency: 'CNY',
        remarks: record.description,
      });
      return {
        ...res.data,
        type: 'order',
        record_no: (res.data as PurchaseOrder)?.po_no || '',
      } as unknown as FinanceRecord;
    } else {
      const res = await srmApi.createContract({
        contractNo: record.record_no,
        supplier_id: (record as unknown as { supplier_id: string }).supplier_id || '',
        supplier_name: record.supplier_name,
        title: record.record_no,
        contract_type: 'purchase',
        total_amount: record.amount,
        currency: 'CNY',
        status: record.status,
        remarks: record.description,
      });
      return {
        ...res.data,
        type: 'contract',
        record_no: (res.data as SupplierContract)?.contractNo || '',
      } as unknown as FinanceRecord;
    }
  },
  update: async () => ({}) as FinanceRecord,
  delete: async () => {},
};

const SrmFinancePage: React.FC = () => {
  const recordsQuery = useQuery<FinanceRecord[]>({
    queryKey: QUERY_KEYS.SRM.FINANCE,
    queryFn: async () => {
      const result = await financeAdapter.list();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);

  const stats = useMemo(() => {
    return {
      totalRecords: records.length,
      totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
      orders: records.filter((r) => r.type === 'order').length,
      contracts: records.filter((r) => r.type === 'contract').length,
      pendingAmount: records
        .filter(
          (r) =>
            r.status === i18n.t('pages.srm_finance_page.k11') ||
            r.status === i18n.t('pages.srm_finance_page.k10') ||
            r.status === i18n.t('pages.srm_finance_page.k9')
        )
        .reduce((sum, r) => sum + r.amount, 0),
      completedAmount: records
        .filter(
          (r) =>
            r.status === i18n.t('pages.srm_finance_page.k13') ||
            r.status === i18n.t('pages.srm_finance_page.k12')
        )
        .reduce((sum, r) => sum + r.amount, 0),
    };
  }, [records]);

  const headerContent = () => (
    <Box sx={{ mb: 3 }}>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k14')}
            value={stats.totalRecords}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle={`${stats.orders}${i18n.t('pages.srm_finance_page.k0')}${stats.contracts}${i18n.t('pages.srm_finance_page.k1')}`}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k15')}
            value={stats.orders}
            icon={<CreditCard style={{ width: 24, height: 24 }} />}
            gradient={['primary.main', ct.primary.dark]}
            subtitle={i18n.t('pages.srm_finance_page.k16')}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k17')}
            value={stats.contracts}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={[ct.teal.main, ct.teal.dark]}
            subtitle={i18n.t('pages.srm_finance_page.k18')}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k19')}
            value={`¥${stats.totalAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={[ct.secondary.main, ct.secondary.dark]}
            subtitle={i18n.t('pages.srm_finance_page.k20')}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k21')}
            value={`¥${stats.pendingAmount.toLocaleString()}`}
            icon={<TrendingUp style={{ width: 24, height: 24 }} />}
            gradient={['warning.main', ct.warning.dark]}
            subtitle={i18n.t('pages.srm_finance_page.k22')}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title={i18n.t('pages.srm_finance_page.k23')}
            value={`¥${stats.completedAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle={i18n.t('pages.srm_finance_page.k24')}
            trend='neutral'
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <PageContainer>
      <CrudPage
        schema={financeSchema}
        apiAdapter={financeAdapter}
        breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_finance_page.k25') }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default SrmFinancePage;
