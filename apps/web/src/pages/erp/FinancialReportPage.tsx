import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Wallet,
  Building2,
  FileText,
} from 'lucide-react';
import i18n from '@/i18n';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';
import { financeReportApi } from '@/api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

const FinancialReportPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [periodType, setPeriodType] = useState('year');
  const [period, setPeriod] = useState('2024');

  const balanceSheetQuery = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(period),
    queryFn: async () => {
      const res = await financeReportApi.balanceSheet({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'balance-sheet',
    staleTime: 5 * 60 * 1000,
  });
  const incomeStatementQuery = useQuery<IncomeStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(period),
    queryFn: async () => {
      const res = await financeReportApi.incomeStatement({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'income-statement',
    staleTime: 5 * 60 * 1000,
  });
  const cashFlowQuery = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(period),
    queryFn: async () => {
      const res = await financeReportApi.cashFlowStatement({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'cash-flow',
    staleTime: 5 * 60 * 1000,
  });

  const balanceSheet = balanceSheetQuery.data ?? null;
  const incomeStatement = incomeStatementQuery.data ?? null;
  const cashFlowStatement = cashFlowQuery.data ?? null;
  const loading =
    (activeTab === 'balance-sheet' && balanceSheetQuery.isLoading) ||
    (activeTab === 'income-statement' && incomeStatementQuery.isLoading) ||
    (activeTab === 'cash-flow' && cashFlowQuery.isLoading);
  const error =
    (activeTab === 'balance-sheet' && balanceSheetQuery.isError) ||
    (activeTab === 'income-statement' && incomeStatementQuery.isError) ||
    (activeTab === 'cash-flow' && cashFlowQuery.isError)
      ? i18n.t('erp.financial_report_page.k0')
      : null;

  useEffect(() => {
    if (balanceSheetQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k0'), balanceSheetQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k2'),
        message: i18n.t('erp.financial_report_page.k1'),
        type: 'error',
      });
    }
  }, [balanceSheetQuery.isError, balanceSheetQuery.error, addNotification]);
  useEffect(() => {
    if (incomeStatementQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k1'), incomeStatementQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k4'),
        message: i18n.t('erp.financial_report_page.k3'),
        type: 'error',
      });
    }
  }, [incomeStatementQuery.isError, incomeStatementQuery.error, addNotification]);
  useEffect(() => {
    if (cashFlowQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k2'), cashFlowQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k6'),
        message: i18n.t('erp.financial_report_page.k5'),
        type: 'error',
      });
    }
  }, [cashFlowQuery.isError, cashFlowQuery.error, addNotification]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const handleExport = () => {
    addNotification({
      title: i18n.t('erp.financial_report_page.k7'),
      message: i18n.t('erp.financial_report_page.excel_8'),
      type: 'success',
    });
  };

  const periodOptions = useMemo(() => {
    if (periodType === 'year') {
      return [
        { value: '2024', label: i18n.t('pages.financial_report_page.2024_3') },
        { value: '2023', label: i18n.t('pages.financial_report_page.2023_4') },
        { value: '2022', label: i18n.t('pages.financial_report_page.2022_5') },
        { value: '2021', label: i18n.t('pages.financial_report_page.2021_6') },
      ];
    } else if (periodType === 'quarter') {
      return [
        { value: '2024-Q1', label: i18n.t('pages.financial_report_page.2024_7') },
        { value: '2024-Q2', label: i18n.t('pages.financial_report_page.2024_8') },
        { value: '2024-Q3', label: i18n.t('pages.financial_report_page.2024_9') },
        { value: '2024-Q4', label: i18n.t('pages.financial_report_page.2024_10') },
      ];
    } else {
      return [
        { value: '2024-01', label: i18n.t('pages.financial_report_page.202401_11') },
        { value: '2024-02', label: i18n.t('pages.financial_report_page.202402_12') },
        { value: '2024-03', label: i18n.t('pages.financial_report_page.202403_13') },
        { value: '2024-04', label: i18n.t('pages.financial_report_page.202404_14') },
        { value: '2024-05', label: i18n.t('pages.financial_report_page.202405_15') },
        { value: '2024-06', label: i18n.t('pages.financial_report_page.202406_16') },
      ];
    }
  }, [periodType]);

  const tabs = useMemo(
    () => [
      {
        label: i18n.t('erp.financial_report_page.k9'),
        value: 'balance-sheet',
        icon: <PieChart sx={{ width: 16, height: 16 }} />,
      },
      {
        label: i18n.t('erp.financial_report_page.k10'),
        value: 'income-statement',
        icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
      },
      {
        label: i18n.t('erp.financial_report_page.k11'),
        value: 'cash-flow',
        icon: <Activity sx={{ width: 16, height: 16 }} />,
      },
      {
        label: i18n.t('erp.financial_report_page.k12'),
        value: 'equity-change',
        icon: <Building2 sx={{ width: 16, height: 16 }} />,
      },
    ],
    []
  );

  const statCards = useMemo<StatCard[]>(() => {
    if (activeTab === 'balance-sheet' && balanceSheet) {
      return [
        {
          id: 'total-assets',
          title: i18n.t('pages.financial_report_page.k0'),
          value: formatCurrency(balanceSheet.total_assets),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          color: 'primary',
        },
        {
          id: 'total-liabilities',
          title: i18n.t('pages.financial_report_page.k1'),
          value: formatCurrency(balanceSheet.total_liabilities),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          color: 'warning',
        },
        {
          id: 'total-equity',
          title: i18n.t('pages.financial_report_page.k2'),
          value: formatCurrency(balanceSheet.total_equity),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
      ];
    }
    if (activeTab === 'income-statement' && incomeStatement) {
      return [
        {
          id: 'revenue',
          title: i18n.t('pages.financial_report_page.k3'),
          value: formatCurrency(incomeStatement.revenues.reduce((sum, r) => sum + r.amount, 0)),
          icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
        {
          id: 'cost',
          title: i18n.t('pages.financial_report_page.k4'),
          value: formatCurrency(incomeStatement.expenses.reduce((sum, e) => sum + e.amount, 0)),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          color: 'error',
        },
        {
          id: 'operating-profit',
          title: i18n.t('pages.financial_report_page.k5'),
          value: formatCurrency(incomeStatement.operating_profit),
          icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
          color: 'primary',
        },
        {
          id: 'net-profit',
          title: i18n.t('pages.financial_report_page.k6'),
          value: formatCurrency(incomeStatement.net_profit),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          color: incomeStatement.net_profit >= 0 ? 'success' : 'error',
        },
      ];
    }
    if (activeTab === 'cash-flow' && cashFlowStatement) {
      return [
        {
          id: 'operating',
          title: i18n.t('pages.financial_report_page.k7'),
          value: formatCurrency(
            cashFlowStatement.operating_activities.reduce((sum, i) => sum + i.amount, 0)
          ),
          icon: <Activity sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
        {
          id: 'investing',
          title: i18n.t('pages.financial_report_page.k8'),
          value: formatCurrency(
            cashFlowStatement.investing_activities.reduce((sum, i) => sum + i.amount, 0)
          ),
          icon: <Building2 sx={{ width: 24, height: 24 }} />,
          color: 'warning',
        },
        {
          id: 'financing',
          title: i18n.t('pages.financial_report_page.k9'),
          value: formatCurrency(
            cashFlowStatement.financing_activities.reduce((sum, i) => sum + i.amount, 0)
          ),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          color: 'primary',
        },
        {
          id: 'net-cash-flow',
          title: i18n.t('pages.financial_report_page.k10'),
          value: formatCurrency(cashFlowStatement.net_cash_flow),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          color: cashFlowStatement.net_cash_flow >= 0 ? 'success' : 'error',
        },
      ];
    }
    return [];
  }, [activeTab, balanceSheet, incomeStatement, cashFlowStatement]);

  const tables = useMemo<DataTable[]>(() => {
    if (activeTab === 'balance-sheet' && balanceSheet) {
      const columns: TableColumn[] = [
        {
          id: 'code',
          label: i18n.t('erp.financial_report_page.k13'),
          field: 'code',
          width: 120,
        },
        {
          id: 'name',
          label: i18n.t('erp.financial_report_page.k14'),
          field: 'name',
          render: (_value, row) =>
            row._isSection ? <strong>{String(row.name)}</strong> : String(row.name),
        },
        {
          id: 'amount',
          label: i18n.t('pages.financial_report_page.k11'),
          field: 'amount',
          align: 'right',
          width: 180,
        },
        {
          id: 'percentage',
          label: i18n.t('pages.financial_report_page.k12'),
          field: 'percentage',
          align: 'right',
          width: 120,
        },
      ];
      const data: Record<string, unknown>[] = [
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k13'),
          amount: '',
          percentage: '',
        },
        ...balanceSheet.assets.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
          percentage: item.percentage.toFixed(2),
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k14'),
          amount: '',
          percentage: '',
        },
        ...balanceSheet.liabilities.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
          percentage: item.percentage.toFixed(2),
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k15'),
          amount: '',
          percentage: '',
        },
        ...balanceSheet.equity.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
          percentage: item.percentage.toFixed(2),
        })),
      ];
      return [{ id: 'balance-sheet-table', columns, data }];
    }

    if (activeTab === 'income-statement' && incomeStatement) {
      const columns: TableColumn[] = [
        {
          id: 'code',
          label: i18n.t('erp.financial_report_page.k15'),
          field: 'code',
          width: 120,
        },
        {
          id: 'name',
          label: i18n.t('erp.financial_report_page.k16'),
          field: 'name',
          render: (_value, row) =>
            row._isSection || row._isTotal ? <strong>{String(row.name)}</strong> : String(row.name),
        },
        {
          id: 'amount',
          label: i18n.t('pages.financial_report_page.k16'),
          field: 'amount',
          align: 'right',
          width: 180,
          render: (_value, row) =>
            row._isSection ? (
              ''
            ) : row._isTotal ? (
              <strong>{String(row.amount)}</strong>
            ) : (
              String(row.amount)
            ),
        },
        {
          id: 'percentage',
          label: i18n.t('pages.financial_report_page.k17'),
          field: 'percentage',
          align: 'right',
          width: 120,
        },
      ];
      const data: Record<string, unknown>[] = [
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k18'),
          amount: '',
          percentage: '',
        },
        ...incomeStatement.revenues.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
          percentage: item.percentage.toFixed(2),
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k19'),
          amount: '',
          percentage: '',
        },
        ...incomeStatement.expenses.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
          percentage: item.percentage.toFixed(2),
        })),
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k20'),
          amount: formatCurrency(incomeStatement.operating_profit),
          percentage: '',
        },
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k21'),
          amount: formatCurrency(incomeStatement.gross_profit),
          percentage: '',
        },
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k22'),
          amount: formatCurrency(incomeStatement.net_profit),
          percentage: '',
        },
      ];
      return [{ id: 'income-statement-table', columns, data }];
    }

    if (activeTab === 'cash-flow' && cashFlowStatement) {
      const columns: TableColumn[] = [
        {
          id: 'code',
          label: i18n.t('erp.financial_report_page.k17'),
          field: 'code',
          width: 120,
        },
        {
          id: 'name',
          label: i18n.t('erp.financial_report_page.k18'),
          field: 'name',
          render: (_value, row) =>
            row._isSection || row._isTotal ? <strong>{String(row.name)}</strong> : String(row.name),
        },
        {
          id: 'amount',
          label: i18n.t('pages.financial_report_page.k23'),
          field: 'amount',
          align: 'right',
          width: 180,
          render: (_value, row) =>
            row._isSection ? (
              ''
            ) : row._isTotal ? (
              <strong>{String(row.amount)}</strong>
            ) : (
              String(row.amount)
            ),
        },
      ];
      const data: Record<string, unknown>[] = [
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k24'),
          amount: '',
        },
        ...cashFlowStatement.operating_activities.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k25'),
          amount: '',
        },
        ...cashFlowStatement.investing_activities.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k26'),
          amount: '',
        },
        ...cashFlowStatement.financing_activities.map((item) => ({
          code: item.code,
          name: item.name,
          amount: formatCurrency(item.amount),
        })),
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k27'),
          amount: formatCurrency(cashFlowStatement.net_cash_flow),
        },
      ];
      return [{ id: 'cash-flow-table', columns, data }];
    }

    return [];
  }, [activeTab, balanceSheet, incomeStatement, cashFlowStatement]);

  const customToolbar = useMemo(
    () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{i18n.t('erp.financial_report_page.k23')}</InputLabel>
          <Select
            value={periodType}
            label={i18n.t('erp.financial_report_page.k24')}
            onChange={(e) => {
              setPeriodType(e.target.value);
              setPeriod(periodOptions[0]?.value || '');
            }}
          >
            <MenuItem value='year'>{i18n.t('erp.financial_report_page.k25')}</MenuItem>
            <MenuItem value='quarter'>{i18n.t('erp.financial_report_page.k26')}</MenuItem>
            <MenuItem value='month'>{i18n.t('erp.financial_report_page.k27')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 160 }}
        >
          <InputLabel>{i18n.t('erp.financial_report_page.k28')}</InputLabel>
          <Select
            value={period}
            label={i18n.t('erp.financial_report_page.k29')}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    ),
    [periodType, period, periodOptions]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('erp.financial_report_page.k19')}
      subtitle={i18n.t('erp.financial_report_page.k20')}
      tabs={tabs}
      tabValue={activeTab}
      onTabChange={setActiveTab}
      statCards={statCards}
      statColumns={4}
      tables={tables}
      loading={loading}
      onRefresh={handleRefresh}
      onExport={handleExport}
      customToolbar={customToolbar}
      showSearch={false}
      showTimeRange={false}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      {!error && activeTab === 'equity-change' && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <FileText sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography
            variant='body1'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.financial_report_page.k28')}
          </Typography>
        </Box>
      )}
    </StatsPageTemplate>
  );
};

export default FinancialReportPage;
