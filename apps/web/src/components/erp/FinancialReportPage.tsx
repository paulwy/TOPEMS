import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Activity,
  Building2,
  FileText,
} from 'lucide-react';
import i18n from '@/i18n';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';
import { financeReportApi, toBackendPeriod } from '@/api/finance';
import { companyApi } from '@/api/hrm';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

const FinancialReportPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('balance-sheet');
  // 期间统一成后端账套口径 YYYY-MM，查询时经 toBackendPeriod 转 YYYYMM。
  // 原来默认 '2024' + 年/季/月三档硬编码选项：后端 get_balance_sheet 要求
  // period 命中账套期间，年度/季度值永远查不到数据，属假控件。
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // 报表读取端点（balance-sheet / income-statement / cash-flow）一律要求
  // company_id（单公司租户也不省略），不传直接 400。公司主体取 HRM 主数据。
  const [companyId, setCompanyId] = useState('');

  const companiesQuery = useQuery({
    queryKey: ['financial-report-companies'],
    queryFn: async () => {
      const res = await companyApi.list({ page: 1, pageSize: 50 });
      return res.data?.items ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  const companies = companiesQuery.data ?? [];
  useEffect(() => {
    if (!companyId && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const balanceSheetQuery = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(`${companyId}:${period}`),
    queryFn: async () => {
      const res = await financeReportApi.balanceSheet({
        period: toBackendPeriod(period),
        company_id: companyId,
      });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'balance-sheet' && Boolean(companyId),
    staleTime: 5 * 60 * 1000,
  });
  const incomeStatementQuery = useQuery<IncomeStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(`${companyId}:${period}`),
    queryFn: async () => {
      const res = await financeReportApi.incomeStatement({
        period: toBackendPeriod(period),
        company_id: companyId,
      });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'income-statement' && Boolean(companyId),
    staleTime: 5 * 60 * 1000,
  });
  const cashFlowQuery = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(`${companyId}:${period}`),
    queryFn: async () => {
      const res = await financeReportApi.cashFlowStatement({
        period: toBackendPeriod(period),
        company_id: companyId,
      });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'cash-flow' && Boolean(companyId),
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

  const formatCurrency = (amount?: number | null) =>
    `¥${(amount ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const handleExport = () => {
    addNotification({
      title: i18n.t('erp.financial_report_page.k7'),
      message: i18n.t('erp.financial_report_page.excel_8'),
      type: 'success',
    });
  };

  const periodOptions = useMemo(() => {
    // 真实可选期间：最近 12 个自然月（后端账套期间为 YYYYMM）
    const list: Array<{ value: string; label: string }> = [];
    const cursor = new Date();
    for (let i = 0; i < 12; i += 1) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const value = `${y}-${String(m).padStart(2, '0')}`;
      list.push({ value, label: `${y}-${String(m).padStart(2, '0')}` });
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return list;
  }, []);

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
          title: i18n.t('pages.financial_report_page.k13'),
          value: formatCurrency(balanceSheet.total_assets),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          color: 'primary',
        },
        {
          id: 'total-liabilities',
          title: i18n.t('pages.financial_report_page.k14'),
          value: formatCurrency(balanceSheet.total_liabilities),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          color: 'warning',
        },
        {
          id: 'total-equity',
          title: i18n.t('pages.financial_report_page.k15'),
          value: formatCurrency(balanceSheet.total_equity),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
      ];
    }
    if (activeTab === 'income-statement' && incomeStatement) {
      const revenues = incomeStatement.revenues ?? [];
      const expenses = incomeStatement.expenses ?? [];
      return [
        {
          id: 'revenue',
          title: i18n.t('pages.financial_report_page.k3'),
          value: formatCurrency(revenues.reduce((sum, r) => sum + (r.amount ?? 0), 0)),
          icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
        {
          id: 'cost',
          title: i18n.t('pages.financial_report_page.k4'),
          value: formatCurrency(expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          color: 'error',
        },
        {
          id: 'net-profit',
          title: i18n.t('pages.financial_report_page.k6'),
          value: formatCurrency(incomeStatement.net_income),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          color: (incomeStatement.net_income ?? 0) >= 0 ? 'success' : 'error',
        },
      ];
    }
    if (activeTab === 'cash-flow' && cashFlowStatement) {
      return [
        {
          id: 'total-inflow',
          title: i18n.t('erp.financial_report.label.total_inflow'),
          value: formatCurrency(cashFlowStatement.total_inflow),
          icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
          color: 'success',
        },
        {
          id: 'total-outflow',
          title: i18n.t('erp.financial_report.label.total_outflow'),
          value: formatCurrency(cashFlowStatement.total_outflow),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          color: 'warning',
        },
        {
          id: 'net-cash-flow',
          title: i18n.t('pages.financial_report_page.k10'),
          value: formatCurrency(cashFlowStatement.net_change),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          color: cashFlowStatement.net_change >= 0 ? 'success' : 'error',
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
          code: item.account_code,
          name: item.account_name,
          amount: formatCurrency(item.amount),
          percentage:
            incomeStatement.total_revenue > 0
              ? ((item.amount / incomeStatement.total_revenue) * 100).toFixed(2)
              : '0.00',
        })),
        {
          _isSection: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k19'),
          amount: '',
          percentage: '',
        },
        ...incomeStatement.expenses.map((item) => ({
          code: item.account_code,
          name: item.account_name,
          amount: formatCurrency(item.amount),
          percentage:
            incomeStatement.total_revenue > 0
              ? ((item.amount / incomeStatement.total_revenue) * 100).toFixed(2)
              : '0.00',
        })),
        {
          _isTotal: true,
          code: '',
          name: i18n.t('erp.financial_report.label.total_expense'),
          amount: formatCurrency(incomeStatement.total_expense),
          percentage: '',
        },
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k22'),
          amount: formatCurrency(incomeStatement.net_income),
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
        ...cashFlowStatement.items.map((item) => ({
          code: item.item_code,
          name: item.item_name,
          amount: formatCurrency(item.amount),
        })),
        {
          _isTotal: true,
          code: '',
          name: i18n.t('erp.financial_report.label.total_inflow'),
          amount: formatCurrency(cashFlowStatement.total_inflow),
        },
        {
          _isTotal: true,
          code: '',
          name: i18n.t('erp.financial_report.label.total_outflow'),
          amount: formatCurrency(cashFlowStatement.total_outflow),
        },
        {
          _isTotal: true,
          code: '',
          name: i18n.t('pages.financial_report_page.k27'),
          amount: formatCurrency(cashFlowStatement.net_change),
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
          sx={{ minWidth: 220 }}
        >
          <InputLabel>{i18n.t('erp.financial_report_page.company')}</InputLabel>
          <Select
            value={companyId}
            label={i18n.t('erp.financial_report_page.company')}
            onChange={(e) => setCompanyId(e.target.value)}
            disabled={companies.length === 0}
          >
            {companies.map((item) => (
              <MenuItem
                key={item.id}
                value={item.id}
              >
                {item.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 160 }}
        >
          <InputLabel>{i18n.t('erp.financial_report_page.k29')}</InputLabel>
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
    [companyId, companies, period, periodOptions]
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
