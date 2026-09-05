import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/store';
import { DataExport } from '@/components/common';
import { StatCardGroup } from '@/components';
import type { StatCard } from '@/components/templates/DashboardTemplate';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { financeApi } from '@/api/finance';
import type { SalesInvoice, PurchaseInvoice } from '@/types/finance';
import { taxSchema, TAX_TYPE_LABELS } from '@/schemas/finance';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box as MuiBox,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import i18n from '@/i18n';

// ============ 类型定义 ============

type TaxType = 'vat' | 'output' | 'input' | 'income' | 'other';
type TaxStatus = 'declared' | 'paid' | 'overdue' | 'pending';

interface TaxEntry {
  id: string;
  tax_type: TaxType;
  declaration_period: string;
  taxable_income: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  owed_amount: number;
  status: TaxStatus;
  related_document?: string;
}

// ============ 数据聚合逻辑 ============
// 保留原有聚合逻辑：同时获取销售发票（销项税）和采购发票（进项税），合并为 TaxEntry 列表

const aggregateTaxEntries = async (): Promise<TaxEntry[]> => {
  const [salesInvoicesRes, purchaseInvoicesRes] = await Promise.all([
    financeApi.receivablePayable.listSalesInvoices(),
    financeApi.receivablePayable.listPurchaseInvoices(),
  ]);

  const receivableTaxEntries: TaxEntry[] = (
    (salesInvoicesRes.success && salesInvoicesRes.data?.items) ||
    []
  ).map((r: SalesInvoice) => {
    const taxAmount = r.tax_amount || Math.round(r.amount * 0.13);
    const paidAmount = r.received_amount || 0;
    return {
      id: r.id,
      tax_type: 'output',
      declaration_period: r.invoice_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
      taxable_income: r.amount,
      tax_rate: 13,
      tax_amount: taxAmount,
      paid_amount: paidAmount,
      owed_amount: Math.max(0, taxAmount - paidAmount),
      status:
        r.status === 'received' ? 'paid' : r.status === 'partial_received' ? 'overdue' : 'pending',
      related_document: r.invoice_no,
    };
  });

  const payableTaxEntries: TaxEntry[] = (
    (purchaseInvoicesRes.success && purchaseInvoicesRes.data?.items) ||
    []
  ).map((p: PurchaseInvoice) => {
    const taxAmount = p.tax_amount || Math.round(p.amount * 0.25);
    const paidAmount = p.paid_amount || 0;
    return {
      id: p.id,
      tax_type: 'input',
      declaration_period: p.invoice_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
      taxable_income: p.amount,
      tax_rate: 25,
      tax_amount: taxAmount,
      paid_amount: paidAmount,
      owed_amount: Math.max(0, taxAmount - paidAmount),
      status: p.status === 'received' ? 'paid' : 'overdue',
      related_document: p.invoice_no,
    };
  });

  return [...receivableTaxEntries, ...payableTaxEntries];
};

// ============ API 适配器 ============
// list 方法保留聚合逻辑，并在前端执行筛选、搜索和分页

const taxApiAdapter: CrudApiAdapter<TaxEntry> = {
  list: async (params) => {
    const all = await aggregateTaxEntries();

    let filtered = all;

    // 应用筛选
    if (params?.tax_type && params.tax_type !== 'all') {
      filtered = filtered.filter((t) => t.tax_type === params.tax_type);
    }
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    // 应用搜索（同时匹配枚举值和中文标签）
    if (params?.search) {
      const query = params.search.toLowerCase();
      filtered = filtered.filter((t) => {
        const typeLabel = TAX_TYPE_LABELS[t.tax_type] || t.tax_type;
        return (
          t.tax_type.toLowerCase().includes(query) ||
          typeLabel.toLowerCase().includes(query) ||
          t.declaration_period.toLowerCase().includes(query)
        );
      });
    }

    const total = filtered.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return { data, total };
  },
  create: async () => {
    throw new Error(i18n.t('finance.finance_tax_page.k0'));
  },
  update: async () => {
    throw new Error(i18n.t('finance.finance_tax_page.k1'));
  },
  delete: async () => {
    throw new Error(i18n.t('finance.finance_tax_page.k2'));
  },
};

// ============ 统计卡片 + 导出 ============

const TaxHeader: React.FC = () => {
  const { t } = useTranslation();
  const { data: taxData = [] } = useQuery<TaxEntry[]>({
    queryKey: QUERY_KEYS.FINANCE.TAX,
    queryFn: aggregateTaxEntries,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const totalTaxAmount = useMemo(
    () => taxData.reduce((sum, item) => sum + item.tax_amount, 0),
    [taxData]
  );
  const totalPaid = useMemo(
    () => taxData.reduce((sum, item) => sum + item.paid_amount, 0),
    [taxData]
  );
  const totalOwed = useMemo(
    () =>
      taxData
        .filter((item) => item.status === 'overdue')
        .reduce((sum, item) => sum + item.owed_amount, 0),
    [taxData]
  );
  const pendingCount = useMemo(
    () => taxData.filter((item) => item.status === 'pending').length,
    [taxData]
  );

  const statCards: StatCard[] = [
    {
      id: 'total-tax',
      title: t('finance.finance_tax_page.text_d752a2'),
      value: `¥${totalTaxAmount.toLocaleString()}`,
      color: 'primary',
      icon: <Receipt size={24} />,
    },
    {
      id: 'total-paid',
      title: t('finance.finance_tax_page.text_585a98'),
      value: `¥${totalPaid.toLocaleString()}`,
      color: 'success',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'total-owed',
      title: t('finance.finance_tax_page.amount'),
      value: `¥${totalOwed.toLocaleString()}`,
      color: totalOwed > 0 ? 'error' : 'success',
      icon: totalOwed > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />,
    },
    {
      id: 'pending',
      title: t('finance.finance_tax_page.text_ee8231'),
      value: t('finance.finance_tax_page.e1'),
      color: 'warning',
      icon: <Clock size={24} />,
    },
  ];

  const exportFields = useMemo(
    () => [
      { key: 'tax_type', title: i18n.t('finance.finance_tax_page.text_185dea') },
      { key: 'declaration_period', title: i18n.t('finance.finance_tax_page.text_b107cc') },
      { key: 'taxable_income', title: i18n.t('finance.finance_tax_page.text_45aec3') },
      { key: 'tax_rate', title: i18n.t('finance.finance_tax_page.text_2a79a7') },
      { key: 'tax_amount', title: i18n.t('finance.finance_tax_page.text_87b755') },
      { key: 'paid_amount', title: i18n.t('finance.finance_tax_page.amount_1') },
      { key: 'owed_amount', title: i18n.t('finance.finance_tax_page.amount_2') },
      { key: 'status', title: i18n.t('finance.finance_tax_page.status_1') },
    ],
    []
  );

  return (
    <>
      <StatCardGroup
        stats={statCards}
        columns={4}
      />
      <MuiBox sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <DataExport
          data={taxData as unknown as Record<string, unknown>[]}
          fields={exportFields}
          defaultFileName={t('finance.finance_tax_page.text_f50d30')}
          buttonText=''
        />
      </MuiBox>
    </>
  );
};

// ============ 页面组件 ============

const FinanceTaxPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // 页面级 Dialog 状态
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxEntry | null>(null);

  const invalidateTaxData = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.FINANCE.TAX,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.FINANCE_TAX_BASE,
      exact: false,
      refetchType: 'active',
    });
  };

  const handleDeclare = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowDeclareModal(true);
  };

  const confirmDeclare = () => {
    if (!selectedTax) return;
    addNotification({
      title: t('finance.finance_tax_page.success'),
      message: t('finance.finance_tax_page.success_1'),
      type: 'success',
    });
    setShowDeclareModal(false);
    invalidateTaxData();
  };

  const handlePay = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowPayModal(true);
  };

  const confirmPay = () => {
    if (!selectedTax) return;
    addNotification({
      title: t('finance.finance_tax_page.success'),
      message: t('finance.finance_tax_page.success_2'),
      type: 'success',
    });
    setShowPayModal(false);
    invalidateTaxData();
  };

  const handleAnalysis = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowAnalysisModal(true);
  };

  // 自定义行操作：申报 / 缴税 / 分析
  const customRowActions: RowAction[] = [
    {
      label: t('finance.finance_tax_page.text_e54080'),
      icon: <FileText sx={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleDeclare(row as unknown as TaxEntry),
    },
    {
      label: t('finance.finance_tax_page.text_78da3e'),
      icon: <DollarSign sx={{ width: 16, height: 16 }} />,
      color: 'warning',
      show: (row) => row.status === 'overdue',
      onClick: (row) => handlePay(row as unknown as TaxEntry),
    },
    {
      label: t('finance.finance_tax_page.text_5ddaa7'),
      icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
      onClick: (row) => handleAnalysis(row as unknown as TaxEntry),
    },
  ];

  return (
    <>
      <CrudPage
        schema={taxSchema}
        apiAdapter={taxApiAdapter}
        breadcrumbs={[
          { label: t('finance.finance_tax_page.k4') },
          { label: t('finance.finance_tax_page.k3') },
        ]}
        headerContent={<TaxHeader />}
        customRowActions={customRowActions}
      />

      {/* 申报 Dialog */}
      <Dialog
        open={showDeclareModal}
        onClose={() => setShowDeclareModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.finance_tax_page.k5')}</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e2')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {TAX_TYPE_LABELS[selectedTax.tax_type] || selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e3')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTax.declaration_period}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e4')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    ¥{selectedTax.taxable_income.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e5')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {selectedTax.tax_rate}%
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: 'primary.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_tax_page.e6')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  ¥{selectedTax.tax_amount.toLocaleString()}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeclareModal(false)}>
            {t('finance.finance_tax_page.k6')}
          </Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmDeclare}
          >
            {t('finance.finance_tax_page.e7')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 缴税 Dialog */}
      <Dialog
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.finance_tax_page.k7')}</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e2')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {TAX_TYPE_LABELS[selectedTax.tax_type] || selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e3')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTax.declaration_period}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e10')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{selectedTax.paid_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e11')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    ¥{selectedTax.owed_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_tax_page.e12')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'warning.main' }}
                >
                  ¥{selectedTax.owed_amount.toLocaleString()}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPayModal(false)}>{t('finance.finance_tax_page.k8')}</Button>
          <Button
            variant='contained'
            color='warning'
            onClick={confirmPay}
          >
            {t('finance.finance_tax_page.e13')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分析 Dialog */}
      <Dialog
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.finance_tax_page.k9')}</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e2')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {TAX_TYPE_LABELS[selectedTax.tax_type] || selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e3')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTax.declaration_period}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e4')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    ¥{selectedTax.taxable_income.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e5')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {selectedTax.tax_rate}%
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_tax_page.e10')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{selectedTax.paid_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_tax_page.e19')}
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ mt: 1 }}
                >
                  {selectedTax.owed_amount > 0
                    ? t('finance.finance_tax_page.e20', {
                        v1: selectedTax.tax_amount.toLocaleString(),
                        v2: selectedTax.paid_amount.toLocaleString(),
                        v3: selectedTax.owed_amount.toLocaleString(),
                      })
                    : t('finance.finance_tax_page.e21', {
                        v1: selectedTax.tax_amount.toLocaleString(),
                      })}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysisModal(false)}>
            {t('finance.finance_tax_page.k10')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceTaxPage;
