import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  Building2,
  Clock,
  FileText,
  Wallet,
  Activity,
  Download,
} from 'lucide-react';
import { financeReportApi } from '@/api/erp';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
} from '@mui/material';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const FinanceReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [period, setPeriod] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  const reportsQuery = useQuery({
    queryKey: [...QUERY_KEYS.FINANCE.FINANCIAL_REPORT, { period }],
    queryFn: async () => {
      const [overview, projects, trends, departments] = await Promise.all([
        financeReportApi.businessOverview(period ? { period } : undefined),
        financeReportApi.projectSummary(),
        financeReportApi.monthlyTrend(),
        financeReportApi.departmentSummary(),
      ]);

      return {
        businessOverview: overview.success && overview.data ? overview.data : null,
        projectSummaries: projects.success && projects.data ? projects.data : [],
        monthlyTrends: trends.success && trends.data ? trends.data : [],
        departmentSummaries: departments.success && departments.data ? departments.data : [],
      };
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const businessOverview = reportsQuery.data?.businessOverview ?? null;
  const projectSummaries = reportsQuery.data?.projectSummaries ?? [];
  const monthlyTrends = reportsQuery.data?.monthlyTrends ?? [];
  const departmentSummaries = reportsQuery.data?.departmentSummaries ?? [];
  const loading = reportsQuery.isLoading;
  const error = reportsQuery.error ? t('finance.finance_reports_page.fail') : null;

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const statCards = useMemo<StatCard[]>(() => {
    if (!businessOverview) return [];

    return [
      {
        id: 'total-assets',
        title: t('finance.finance_reports_page.text_fa1861'),
        value: formatCurrency(businessOverview.total_assets),
        icon: <DollarSign sx={{ width: 24, height: 24 }} />,
        gradient: [ct.primary.dark, ct.primary[800]] as [string, string],
      },
      {
        id: 'total-liabilities',
        title: t('finance.finance_reports_page.text_5701ad'),
        value: formatCurrency(businessOverview.total_liabilities),
        icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
        gradient: [ct.warning.main, ct.warning.dark] as [string, string],
      },
      {
        id: 'total-revenue',
        title: t('finance.finance_reports_page.text_d00a67'),
        value: formatCurrency(businessOverview.total_revenue),
        icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
        gradient: [ct.success.main, ct.success.dark] as [string, string],
      },
      {
        id: 'net-profit',
        title: t('finance.finance_reports_page.text_80170f'),
        value: formatCurrency(businessOverview.net_profit),
        icon: <Wallet sx={{ width: 24, height: 24 }} />,
        gradient:
          businessOverview.net_profit >= 0
            ? ([ct.success.main, ct.success.dark] as [string, string])
            : ([ct.error.main, ct.error[700]] as [string, string]),
      },
    ];
  }, [businessOverview]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (!monthlyTrends.length) return [];

    return [
      {
        id: 'monthly-trend',
        title: t('finance.finance_reports_page.text_573852'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: monthlyTrends.flatMap((m) => [
          { name: m.month, value: m.revenue, type: 'revenue' },
          { name: m.month, value: m.expenses, type: 'expenses' },
          { name: m.month, value: m.profit, type: 'profit' },
        ]),
        height: 280,
      },
    ];
  }, [monthlyTrends]);

  const tables = useMemo<DataTable[]>(() => {
    if (activeTab === 'overview') {
      return [];
    }

    if (activeTab === 'projects') {
      const columns: TableColumn[] = [
        {
          id: 'project_name',
          label: t('finance.finance_reports_page.name'),
          field: 'project_name',
        },
        {
          id: 'contract_amount',
          label: t('finance.finance_reports_page.amount'),
          field: 'contract_amount',
          align: 'right',
        },
        {
          id: 'received_amount',
          label: t('finance.finance_reports_page.text_2365c3'),
          field: 'received_amount',
          align: 'right',
        },
        {
          id: 'payable_amount',
          label: t('finance.finance_reports_page.amount_1'),
          field: 'payable_amount',
          align: 'right',
        },
        {
          id: 'paid_amount',
          label: t('finance.finance_reports_page.text_22956d'),
          field: 'paid_amount',
          align: 'right',
        },
        {
          id: 'profit',
          label: t('finance.finance_reports_page.text_53826b'),
          field: 'profit',
          align: 'right',
        },
        {
          id: 'margin',
          label: t('finance.finance_reports_page.text_2b63f6'),
          field: 'margin',
          align: 'center',
        },
        {
          id: 'status',
          label: t('finance.finance_reports_page.status'),
          field: 'status',
          align: 'center',
        },
      ];

      return [
        {
          id: 'project-table',
          title: t('finance.finance_reports_page.text_a34842'),
          columns,
          data: projectSummaries.map((p) => ({
            project_name: p.project_name,
            contract_amount: formatCurrency(p.contract_amount),
            received_amount: formatCurrency(p.received_amount),
            payable_amount: formatCurrency(p.payable_amount),
            paid_amount: formatCurrency(p.paid_amount),
            profit: formatCurrency(p.profit),
            margin: p.margin.toFixed(2),
            status: p.status,
          })),
          loading,
        },
      ];
    }

    if (activeTab === 'departments') {
      const columns: TableColumn[] = [
        {
          id: 'department_name',
          label: t('finance.finance_reports_page.name_1'),
          field: 'department_name',
        },
        {
          id: 'total_expenses',
          label: t('finance.finance_reports_page.text_136f63'),
          field: 'total_expenses',
          align: 'right',
        },
        {
          id: 'budget_amount',
          label: t('finance.finance_reports_page.amount_2'),
          field: 'budget_amount',
          align: 'right',
        },
        {
          id: 'expense_count',
          label: t('finance.finance_reports_page.text_cf03b2'),
          field: 'expense_count',
          align: 'center',
        },
        {
          id: 'budget_usage',
          label: t('finance.finance_reports_page.text_439d93'),
          field: 'budget_usage',
          align: 'center',
        },
      ];

      return [
        {
          id: 'department-table',
          title: t('finance.finance_reports_page.text_c9941b'),
          columns,
          data: departmentSummaries.map((d) => ({
            department_name: d.department_name,
            total_expenses: formatCurrency(d.total_expenses),
            budget_amount: formatCurrency(d.budget_amount),
            expense_count: d.expense_count,
            budget_usage: d.budget_usage.toFixed(2),
          })),
          loading,
        },
      ];
    }

    return [];
  }, [activeTab, projectSummaries, departmentSummaries, loading]);

  const tabs = [
    {
      label: t('finance.finance_reports_page.text_7637e9'),
      value: 'overview',
      icon: <PieChart sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_97191a'),
      value: 'projects',
      icon: <PieChart sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_578051'),
      value: 'departments',
      icon: <Building2 sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_4f4da0'),
      value: 'aging',
      icon: <Clock sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_54251d'),
      value: 'voucher',
      icon: <FileText sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_ec205a'),
      value: 'cashflow',
      icon: <Activity sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_146922'),
      value: 'expense',
      icon: <Wallet sx={{ width: 16, height: 16 }} />,
    },
    {
      label: t('finance.finance_reports_page.text_46756e'),
      value: 'profit',
      icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
    },
  ];

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Calendar
          size={16}
          style={{ color: theme.palette.text.disabled }}
        />
        <FormControl
          size='small'
          sx={{ minWidth: 144 }}
        >
          <InputLabel>{t('finance.finance_reports_page.k0')}</InputLabel>
          <Select
            value={period}
            label={t('finance.finance_reports_page.text_0d80a7')}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value=''>{t('finance.finance_reports_page.k1')}</MenuItem>
            <MenuItem value='2024-01'>2024年01月</MenuItem>
            <MenuItem value='2024-02'>2024年02月</MenuItem>
            <MenuItem value='2024-03'>2024年03月</MenuItem>
            <MenuItem value='2024-04'>2024年04月</MenuItem>
            <MenuItem value='2024-05'>2024年05月</MenuItem>
            <MenuItem value='2024-06'>2024年06月</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Button
        variant='outlined'
        size='small'
        startIcon={<Download size={16} />}
      >
        {t('finance.finance_asset_page.e5')}
      </Button>
    </Box>
  );

  return (
    <PageContainer maxWidth='xl'>
      <StatsPageTemplate
        title={t('finance.finance_reports_page.text_9bb20b')}
        subtitle={t('finance.finance_reports_page.text_fb0fa5')}
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, lg: 2 }}
        tables={tables}
        loading={loading}
        onRefresh={() => reportsQuery.refetch()}
        showExport={false}
        showRefresh={true}
        showTimeRange={false}
        showSearch={false}
        customToolbar={customToolbar}
        tabs={tabs}
        tabValue={activeTab}
        onTabChange={setActiveTab}
        statCardDirection='row'
      />

      {error && (
        <Box sx={{ p: 3 }}>
          <Alert severity='error'>{error}</Alert>
        </Box>
      )}
    </PageContainer>
  );
};

export default FinanceReportsPage;
