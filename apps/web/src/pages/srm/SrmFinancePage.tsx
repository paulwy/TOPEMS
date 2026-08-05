import React, { useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { DollarSign, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { srmApi } from '@/api/srm';
import type { SupplierContract, PurchaseOrder } from '@/api/srm';
import { PageContainer } from '@/components/common';
import { MetricCard } from '@/components/bi/MetricCard';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { financeSchema } from '@/schemas/srm';

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
              ? '有效'
              : item.status === 'expired'
                ? '已过期'
                : item.status === 'draft'
                  ? '草稿'
                  : item.status === 'terminated'
                    ? '已终止'
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
              ? '待处理'
              : item.status === 'processing'
                ? '处理中'
                : item.status === 'delivered'
                  ? '已交付'
                  : item.status === 'completed'
                    ? '已完成'
                    : item.status === 'cancelled'
                      ? '已取消'
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

  const records = recordsQuery.data ?? [];

  const stats = useMemo(() => {
    return {
      totalRecords: records.length,
      totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
      orders: records.filter((r) => r.type === 'order').length,
      contracts: records.filter((r) => r.type === 'contract').length,
      pendingAmount: records
        .filter((r) => r.status === '待处理' || r.status === '处理中' || r.status === '有效')
        .reduce((sum, r) => sum + r.amount, 0),
      completedAmount: records
        .filter((r) => r.status === '已完成' || r.status === '已交付')
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
            title='单据总数'
            value={stats.totalRecords}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle={`${stats.orders}个订单, ${stats.contracts}份合同`}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='订单数量'
            value={stats.orders}
            icon={<CreditCard style={{ width: 24, height: 24 }} />}
            gradient={['primary.main', ct.primary.dark]}
            subtitle='已记录订单'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='合同数量'
            value={stats.contracts}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={[ct.teal.main, ct.teal.dark]}
            subtitle='已记录合同'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='总金额'
            value={`¥${stats.totalAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={[ct.secondary.main, ct.secondary.dark]}
            subtitle='所有单据合计'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='待结算'
            value={`¥${stats.pendingAmount.toLocaleString()}`}
            icon={<TrendingUp style={{ width: 24, height: 24 }} />}
            gradient={['warning.main', ct.warning.dark]}
            subtitle='待处理/处理中/有效'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='已完成'
            value={`¥${stats.completedAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle='已完成/已交付'
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
        breadcrumbs={[{ label: 'SRM' }, { label: '财务管理' }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default SrmFinancePage;
