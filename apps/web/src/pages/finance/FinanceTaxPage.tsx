import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Download,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useNotificationStore } from '@/store';
import { DataExport, PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { StatCardGroup } from '@/components';
import type { StatCard } from '@/components/templates/DashboardTemplate';
import { financeApi } from '@/api/finance';
import type { SalesInvoice, PurchaseInvoice } from '@/types/finance';
import { apiLogger } from '@/utils/logger';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';

interface TaxEntry {
  id: string;
  tax_type: string;
  declaration_period: string;
  taxable_income: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  owed_amount: number;
  status: string;
  related_document?: string;
}

const FinanceTaxPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxEntry | null>(null);

  const taxQuery = useQuery<TaxEntry[]>({
    queryKey: QUERY_KEYS.FINANCE.TAX,
    queryFn: async () => {
      const [salesInvoicesRes, purchaseInvoicesRes] = await Promise.all([
        financeApi.receivablePayable.listSalesInvoices(),
        financeApi.receivablePayable.listPurchaseInvoices(),
      ]);

      const receivableTaxEntries: TaxEntry[] = (
        (salesInvoicesRes.success && salesInvoicesRes.data?.items) ||
        []
      ).map((r: SalesInvoice) => ({
        id: r.id,
        tax_type: '增值税',
        declaration_period: r.invoice_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
        taxable_income: r.amount,
        tax_rate: 13,
        tax_amount: r.tax_amount || Math.round(r.amount * 0.13),
        paid_amount: r.received_amount || 0,
        owed_amount: Math.max(
          0,
          (r.tax_amount || Math.round(r.amount * 0.13)) - (r.received_amount || 0)
        ),
        status:
          r.status === 'received'
            ? '已申报'
            : r.status === 'partial_received'
              ? '待缴纳'
              : '待申报',
        related_document: r.invoice_no,
      }));

      const payableTaxEntries: TaxEntry[] = (
        (purchaseInvoicesRes.success && purchaseInvoicesRes.data?.items) ||
        []
      ).map((p: PurchaseInvoice) => ({
        id: p.id,
        tax_type: '企业所得税',
        declaration_period: p.invoice_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
        taxable_income: p.amount,
        tax_rate: 25,
        tax_amount: p.tax_amount || Math.round(p.amount * 0.25),
        paid_amount: p.paid_amount || 0,
        owed_amount: Math.max(
          0,
          (p.tax_amount || Math.round(p.amount * 0.25)) - (p.paid_amount || 0)
        ),
        status: p.status === 'received' ? '已申报' : '待缴纳',
        related_document: p.invoice_no,
      }));

      return [...receivableTaxEntries, ...payableTaxEntries];
    },
  });

  const taxData = taxQuery.data || [];
  const loading = taxQuery.isLoading;
  const error = taxQuery.error ? '加载税务数据失败' : undefined;

  const filteredData = useMemo(() => {
    return taxData.filter((tax) => {
      if (filterType && tax.tax_type !== filterType) return false;
      if (filterStatus && tax.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !tax.tax_type.toLowerCase().includes(query) &&
          !tax.declaration_period.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [taxData, filterType, filterStatus, searchQuery]);

  const totalOwed = useMemo(
    () => taxData.filter((t) => t.status === '待缴纳').reduce((sum, t) => sum + t.owed_amount, 0),
    [taxData]
  );
  const totalPaid = useMemo(() => taxData.reduce((sum, t) => sum + t.paid_amount, 0), [taxData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: 'success' | 'warning' | 'error' | 'default';
        icon: React.ReactNode;
      }
    > = {
      已申报: { color: 'success', icon: <CheckCircle size={12} /> },
      已缴纳: { color: 'success', icon: <CheckCircle size={12} /> },
      待申报: { color: 'warning', icon: <Clock size={12} /> },
      待缴纳: { color: 'error', icon: <AlertTriangle size={12} /> },
    };
    return configs[status] || { color: 'default', icon: null };
  };

  const handleDeclare = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowDeclareModal(true);
  };

  const confirmDeclare = () => {
    if (!selectedTax) return;
    addNotification({
      title: '成功',
      message: '税务申报成功',
      type: 'success',
    });
    setShowDeclareModal(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCE.TAX });
  };

  const handlePay = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowPayModal(true);
  };

  const confirmPay = () => {
    if (!selectedTax) return;
    addNotification({
      title: '成功',
      message: '税款缴纳成功',
      type: 'success',
    });
    setShowPayModal(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCE.TAX });
  };

  const handleAnalysis = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowAnalysisModal(true);
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '税务数据已导出',
      type: 'success',
    });
  };

  const totalTaxAmount = useMemo(
    () => taxData.reduce((sum, t) => sum + t.tax_amount, 0),
    [taxData]
  );

  const statCards: StatCard[] = [
    {
      id: 'total-tax',
      title: '总应纳税额',
      value: `¥${totalTaxAmount.toLocaleString()}`,
      color: 'primary',
      icon: <Receipt size={24} />,
    },
    {
      id: 'total-paid',
      title: '已缴税额',
      value: `¥${totalPaid.toLocaleString()}`,
      color: 'success',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'total-owed',
      title: '欠税金额',
      value: `¥${totalOwed.toLocaleString()}`,
      color: totalOwed > 0 ? 'error' : 'success',
      icon: totalOwed > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />,
    },
  ];

  const filters = useMemo(
    () => [
      {
        id: 'tax_type',
        label: '税种',
        type: 'select' as const,
        options: [
          { value: '增值税', label: '增值税' },
          { value: '企业所得税', label: '企业所得税' },
          { value: '个人所得税', label: '个人所得税' },
          { value: '消费税', label: '消费税' },
        ],
        value: filterType,
        onChange: (value: unknown) => setFilterType(value as string),
      },
      {
        id: 'status',
        label: '申报状态',
        type: 'select' as const,
        options: [
          { value: '已申报', label: '已申报' },
          { value: '已缴纳', label: '已缴纳' },
          { value: '待申报', label: '待申报' },
          { value: '待缴纳', label: '待缴纳' },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterType, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'tax_type', title: '税种' },
      { key: 'declaration_period', title: '申报期' },
      { key: 'taxable_income', title: '应税收入' },
      { key: 'tax_rate', title: '税率' },
      { key: 'tax_amount', title: '税额' },
      { key: 'paid_amount', title: '已缴金额' },
      { key: 'owed_amount', title: '应缴金额' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, pt: 3 }}>
        <StatCardGroup
          stats={statCards}
          columns={3}
        />
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <ListPageTemplate
          title='税务管理'
          subtitle='管理税务申报、税款缴纳和税务分析'
          backButton={{
            href: '/dashboard',
          }}
          columns={[
            {
              id: 'tax_type',
              label: '税种',
              render: (row: TaxEntry) => (
                <Chip
                  label={row.tax_type}
                  size='small'
                  color='primary'
                />
              ),
            },
            {
              id: 'declaration_period',
              label: '申报期间',
              render: (row: TaxEntry) => (
                <MuiBox sx={{ fontWeight: 500 }}>{row.declaration_period}</MuiBox>
              ),
            },
            {
              id: 'taxable_income',
              label: '应税收入',
              render: (row: TaxEntry) => (
                <MuiBox sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  ¥{row.taxable_income.toLocaleString()}
                </MuiBox>
              ),
            },
            {
              id: 'tax_rate',
              label: '税率',
              render: (row: TaxEntry) => (
                <Chip
                  label={`${row.tax_rate}%`}
                  size='small'
                  variant='outlined'
                />
              ),
            },
            {
              id: 'tax_amount',
              label: '应纳税额',
              render: (row: TaxEntry) => (
                <MuiBox
                  sx={{
                    fontWeight: 700,
                    color: 'primary.main',
                    fontFamily: 'monospace',
                  }}
                >
                  ¥{row.tax_amount.toLocaleString()}
                </MuiBox>
              ),
            },
            {
              id: 'paid_amount',
              label: '已缴税额',
              render: (row: TaxEntry) => (
                <MuiBox sx={{ color: 'success.main', fontFamily: 'monospace' }}>
                  ¥{row.paid_amount.toLocaleString()}
                </MuiBox>
              ),
            },
            {
              id: 'owed_amount',
              label: '欠税金额',
              render: (row: TaxEntry) => (
                <MuiBox
                  sx={{
                    fontWeight: 600,
                    color: row.owed_amount > 0 ? 'error.main' : 'success.main',
                    fontFamily: 'monospace',
                  }}
                >
                  ¥{row.owed_amount.toLocaleString()}
                </MuiBox>
              ),
            },
            {
              id: 'status',
              label: '状态',
              render: (row: TaxEntry) => {
                const config = getStatusConfig(row.status);
                return (
                  <Chip
                    label={row.status}
                    size='small'
                    color={config.color}
                    icon={config.icon as React.ReactElement}
                  />
                );
              },
            },
          ]}
          data={filteredData}
          loading={loading}
          error={error}
          filters={filters}
          searchable
          searchPlaceholder='搜索税种、申报期间...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          actions={[
            {
              label: '导出报表',
              icon: <Download size={18} />,
              onClick: handleExport,
              variant: 'outlined',
            },
            {
              label: '数据导出',
              icon: <Download size={18} />,
              onClick: () => {},
              variant: 'outlined',
            },
          ]}
          headerContent={
            <DataExport
              data={taxData as unknown as Record<string, unknown>[]}
              fields={exportFields}
              defaultFileName='税务数据'
              buttonText=''
            />
          }
          rowActions={[
            {
              label: '税务申报',
              icon: <FileText sx={{ width: 16, height: 16 }} />,
              color: 'success' as const,
              onClick: (row: TaxEntry) => row.status === '待申报' && handleDeclare(row),
              show: (row: TaxEntry) => row.status === '待申报',
            },
            {
              label: '税款缴纳',
              icon: <DollarSign sx={{ width: 16, height: 16 }} />,
              color: 'warning' as const,
              onClick: (row: TaxEntry) => row.status === '待缴纳' && handlePay(row),
              show: (row: TaxEntry) => row.status === '待缴纳',
            },
            {
              label: '税务分析',
              icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
              onClick: (row: TaxEntry) => handleAnalysis(row),
            },
          ]}
          onRefresh={() => taxQuery.refetch()}
        />
      </MuiBox>

      <Dialog
        open={showDeclareModal}
        onClose={() => setShowDeclareModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>税务申报</DialogTitle>
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
                    税种
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    申报期间
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
                    应税收入
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
                    税率
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
                  申报税额
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
          <Button onClick={() => setShowDeclareModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmDeclare}
          >
            确认申报
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>税款缴纳</DialogTitle>
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
                    税种
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    申报期间
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
                    已缴税额
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
                    欠税金额
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
                  本次缴纳金额
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
          <Button onClick={() => setShowPayModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='warning'
            onClick={confirmPay}
          >
            确认缴纳
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>税务分析</DialogTitle>
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
                    税种
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    申报期间
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
                    应税收入
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
                    税率
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
                    已缴税额
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
                  税务分析
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ mt: 1 }}
                >
                  {selectedTax.owed_amount > 0
                    ? `该纳税人本期应缴纳税额 ¥${selectedTax.tax_amount.toLocaleString()}，已缴纳 ¥${selectedTax.paid_amount.toLocaleString()}，尚欠税款 ¥${selectedTax.owed_amount.toLocaleString()}，需要在规定期限内完成缴纳。`
                    : `该纳税人本期应缴纳税额 ¥${selectedTax.tax_amount.toLocaleString()}，已全部缴纳完毕，税务合规。`}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysisModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceTaxPage;
