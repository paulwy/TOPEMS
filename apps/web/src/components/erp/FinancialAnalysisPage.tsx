import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TabItem,
  TimeRangeOption,
} from '@/components/templates/StatsPageTemplate';
import { useNotificationStore } from '@/store';
import { financeReportApi, toBackendPeriod, budgetApi } from '@/api/finance';
import { companyApi } from '@/api/hrm';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { formatCompactMoney } from '@/utils/format';
import { BarChart3, TrendingUp, PieChart, FileText } from 'lucide-react';
import { Box, FormControl, InputLabel, MenuItem, Select, useTheme } from '@mui/material';

type TabValue =
  'balanceSheet' | 'incomeStatement' | 'cashFlow' | 'agingAnalysis' | 'budgetAnalysis';

const FinancialAnalysisPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabValue>('balanceSheet');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  // 报表读取端点一律要求 company_id（单公司租户也不省略），不传直接 400。
  const [companyId, setCompanyId] = useState('');
  const companiesQuery = useQuery({
    queryKey: ['financial-analysis-companies'],
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

  const invalidateData = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  };

  const { data: balanceSheetData, isPending: balanceSheetLoading } = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(`${companyId}:${period}`),
    queryFn: async () => {
      const response = await financeReportApi.balanceSheet({
        period: toBackendPeriod(period),
        company_id: companyId,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 'balanceSheet' && Boolean(companyId),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: incomeStatementData, isPending: incomeStatementLoading } =
    useQuery<IncomeStatement | null>({
      queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(`${companyId}:${period}`),
      queryFn: async () => {
        const response = await financeReportApi.incomeStatement({
          period: toBackendPeriod(period),
          company_id: companyId,
        });
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      },
      enabled: activeTab === 'incomeStatement' && Boolean(companyId),
      staleTime: CACHE_DURATIONS.MEDIUM,
    });

  const { data: cashFlowData, isPending: cashFlowLoading } = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(`${companyId}:${period}`),
    queryFn: async () => {
      const response = await financeReportApi.cashFlowStatement({
        period: toBackendPeriod(period),
        company_id: companyId,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 'cashFlow' && Boolean(companyId),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: agingAnalysisData, isPending: agingAnalysisLoading } = useQuery<Record<
    string,
    number
  > | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.AGING_ANALYSIS, period],
    queryFn: async (): Promise<Record<string, number> | null> => {
      const response = await financeReportApi.agingAnalysis();
      // 后端 /reports/aging-analysis 实际返回 { aging: [{ bucket: "0-30天", amount: "100.0000" }] }，
      // 旧实现按数组遍历 { category, amount }，容器与字段名都对不上，页签抛错后只剩空白。
      const payload = response.data as unknown as {
        aging?: Array<{ bucket: string; amount: string | number }>;
      } | null;
      if (response.success && payload?.aging) {
        const result: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        for (const item of payload.aging) {
          const amount = Number(item.amount) || 0;
          const start = Number((item.bucket.match(/^\d+/) || ['0'])[0]);
          const key = start >= 90 ? '90+' : start >= 61 ? '61-90' : start >= 31 ? '31-60' : '0-30';
          result[key] += amount;
        }
        return result;
      }
      return null;
    },
    enabled: activeTab === 'agingAnalysis',
  });

  const { data: budgetAnalysisData, isPending: budgetAnalysisLoading } = useQuery<{
    budget_amount: number;
    actual_amount: number;
  } | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.EXPENSE_ANALYSIS, 'budget', period],
    queryFn: async () => {
      // financeReportApi 上并没有 budgetAnalysis 方法，旧代码靠 as unknown 强转出一个不存在的
      // 函数，运行时 TypeError → 预算页签永远空白。改为读真实预算台账 /budgets 汇总。
      const response = await budgetApi.list({ page: 1, page_size: 100 });
      const items = response.data?.items ?? [];
      if (!response.success || items.length === 0) return null;
      const budget_amount = items.reduce((acc, it) => acc + Number(it.total_budget ?? 0), 0);
      const actual_amount = items.reduce((acc, it) => acc + Number(it.used_amount ?? 0), 0);
      return { budget_amount, actual_amount };
    },
    enabled: activeTab === 'budgetAnalysis',
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'balanceSheet':
        return balanceSheetLoading;
      case 'incomeStatement':
        return incomeStatementLoading;
      case 'cashFlow':
        return cashFlowLoading;
      case 'agingAnalysis':
        return agingAnalysisLoading;
      case 'budgetAnalysis':
        return budgetAnalysisLoading;
      default:
        return false;
    }
  }, [
    activeTab,
    balanceSheetLoading,
    incomeStatementLoading,
    cashFlowLoading,
    agingAnalysisLoading,
    budgetAnalysisLoading,
  ]);

  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'balanceSheet':
        return balanceSheetData;
      case 'incomeStatement':
        return incomeStatementData;
      case 'cashFlow':
        return cashFlowData;
      case 'agingAnalysis':
        return agingAnalysisData;
      case 'budgetAnalysis':
        return budgetAnalysisData;
      default:
        return null;
    }
  }, [
    activeTab,
    balanceSheetData,
    incomeStatementData,
    cashFlowData,
    agingAnalysisData,
    budgetAnalysisData,
  ]);

  const handleRefresh = () => {
    invalidateData();
    addNotification({
      type: 'success',
      title: i18n.t('erp.financial_analysis_page.k15'),
      message: i18n.t('erp.financial_analysis_page.k14'),
    });
  };

  const handleExport = async () => {
    try {
      const exportData = currentData;
      if (!exportData) {
        addNotification({
          type: 'error',
          title: i18n.t('erp.financial_analysis_page.k17'),
          message: i18n.t('erp.financial_analysis_page.k16'),
        });
        return;
      }
      const csvContent = [
        [i18n.t('erp.financial_analysis_page.k19'), i18n.t('erp.financial_analysis_page.k18')],
        ...Object.entries(exportData).map(([key, value]) => [
          key.replace(/_/g, ' '),
          typeof value === 'number' ? `¥${Number(value).toLocaleString()}` : value,
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `financial_report_${period}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addNotification({
        type: 'success',
        title: i18n.t('erp.financial_analysis_page.k21'),
        message: i18n.t('erp.financial_analysis_page.csv_20'),
      });
    } catch (error) {
      apiLogger.error(i18n.t('pages.financial_analysis_page.k4'), error);
      addNotification({
        type: 'error',
        title: i18n.t('erp.financial_analysis_page.k23'),
        message: i18n.t('erp.financial_analysis_page.k22'),
      });
    }
  };

  const timeRangeOptions: TimeRangeOption[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const value = date.toISOString().slice(0, 7);
        return { label: value, value };
      }),
    []
  );

  const tabItems: TabItem[] = useMemo(
    () => [
      {
        value: 'balanceSheet',
        label: i18n.t('erp.financial_analysis_page.k41'),
        icon: <TrendingUp size={16} />,
      },
      {
        value: 'incomeStatement',
        label: i18n.t('erp.financial_analysis_page.k40'),
        icon: <BarChart3 size={16} />,
      },
      {
        value: 'cashFlow',
        label: i18n.t('erp.financial_analysis_page.k39'),
        icon: <PieChart size={16} />,
      },
      {
        value: 'agingAnalysis',
        label: i18n.t('erp.financial_analysis_page.k38'),
        icon: <FileText size={16} />,
      },
      {
        value: 'budgetAnalysis',
        label: i18n.t('erp.financial_analysis_page.k37'),
        icon: <FileText size={16} />,
      },
    ],
    []
  );

  const activeTabLabel = useMemo(
    () => tabItems.find((tab) => tab.value === activeTab)?.label ?? '',
    [activeTab, tabItems]
  );

  const tableColumns: DataTable['columns'] = useMemo(
    () => [
      {
        id: 'metric',
        label: i18n.t('pages.financial_analysis_page.k1'),
        field: 'metric',
        align: 'left',
      },
      {
        id: 'amount',
        label: i18n.t('pages.financial_analysis_page.k2'),
        field: 'amount',
        align: 'right',
        render: (value) => `¥${Number(value).toLocaleString()}`,
      },
    ],
    []
  );

  const statCards = useMemo<StatCard[]>(() => {
    const periodCard: StatCard = {
      id: 'period',
      title: i18n.t('pages.financial_analysis_page.k3'),
      value: period,
      icon: <BarChart3 size={18} />,
      color: 'secondary',
    };

    switch (activeTab) {
      case 'balanceSheet': {
        if (!balanceSheetData) return [periodCard];
        return [
          periodCard,
          {
            id: 'total-assets',
            title: i18n.t('erp.financial_analysis_page.k24'),
            value: formatCompactMoney(balanceSheetData.total_assets),
            color: 'success',
          },
          {
            id: 'total-liabilities',
            title: i18n.t('erp.financial_analysis_page.k25'),
            value: formatCompactMoney(balanceSheetData.total_liabilities),
            color: 'error',
          },
          {
            id: 'total-equity',
            title: i18n.t('erp.financial_analysis_page.k26'),
            value: formatCompactMoney(balanceSheetData.total_equity),
            color: 'primary',
          },
        ];
      }
      case 'incomeStatement': {
        if (!incomeStatementData) return [periodCard];
        return [
          periodCard,
          {
            id: 'total-revenue',
            title: i18n.t('erp.financial_analysis_page.k27'),
            value: formatCompactMoney(incomeStatementData.total_revenue),
            color: 'success',
          },
          {
            id: 'total-cost',
            title: i18n.t('erp.financial_analysis_page.k28'),
            value: formatCompactMoney(incomeStatementData.total_expense),
            color: 'error',
          },
          {
            id: 'net-profit',
            title: i18n.t('erp.financial_analysis_page.k29'),
            value: formatCompactMoney(incomeStatementData.net_income),
            color: 'primary',
          },
        ];
      }
      case 'cashFlow': {
        if (!cashFlowData) return [periodCard];
        return [
          periodCard,
          {
            id: 'net-cash-flow',
            title: i18n.t('erp.financial_analysis_page.k30'),
            value: formatCompactMoney(cashFlowData.net_change),
            color: 'success',
          },
          {
            id: 'operating-cash-flow',
            title: i18n.t('erp.financial_report.label.total_inflow'),
            value: formatCompactMoney(cashFlowData.total_inflow),
            color: 'warning',
          },
          {
            id: 'financing-cash-flow',
            title: i18n.t('erp.financial_report.label.total_outflow'),
            value: formatCompactMoney(cashFlowData.total_outflow),
            color: 'info',
          },
        ];
      }
      case 'agingAnalysis': {
        if (!agingAnalysisData) return [periodCard];
        return [
          periodCard,
          {
            id: 'aging-0-30',
            title: i18n.t('erp.financial_analysis_page.030_8'),
            value: formatCompactMoney(agingAnalysisData['0-30']),
            color: 'success',
          },
          {
            id: 'aging-31-60',
            title: i18n.t('erp.financial_analysis_page.3160_6'),
            value: formatCompactMoney(agingAnalysisData['31-60']),
            color: 'warning',
          },
          {
            id: 'aging-overdue',
            title: i18n.t('erp.financial_analysis_page.k33'),
            value: formatCompactMoney(
              (agingAnalysisData['61-90'] || 0) + (agingAnalysisData['90+'] || 0)
            ),
            color: 'error',
          },
        ];
      }
      case 'budgetAnalysis': {
        if (!budgetAnalysisData) return [periodCard];
        return [
          periodCard,
          {
            id: 'budget-amount',
            title: i18n.t('erp.financial_analysis_page.k34'),
            value: formatCompactMoney(budgetAnalysisData.budget_amount),
            color: 'success',
          },
          {
            id: 'actual-amount',
            title: i18n.t('erp.financial_analysis_page.k35'),
            value: formatCompactMoney(budgetAnalysisData.actual_amount),
            color: 'primary',
          },
          {
            id: 'budget-execution-rate',
            title: i18n.t('erp.financial_analysis_page.k36'),
            value: `${((budgetAnalysisData.actual_amount / budgetAnalysisData.budget_amount) * 100).toFixed(1)}%`,
            color: 'warning',
          },
        ];
      }
      default:
        return [periodCard];
    }
  }, [
    activeTab,
    period,
    balanceSheetData,
    incomeStatementData,
    cashFlowData,
    agingAnalysisData,
    budgetAnalysisData,
  ]);

  const charts = useMemo<ChartConfig[]>(() => {
    const chartTitle = i18n.t('erp:financial_analysis_page.v0_1', { v0: activeTabLabel });
    switch (activeTab) {
      case 'balanceSheet': {
        if (!balanceSheetData) return [];
        return [
          {
            id: 'balance-sheet-chart',
            title: chartTitle,
            // 资产 = 负债 + 权益，三者放同一饼图会把合计重复计入（占比失真、标签被裁）。
            // 改成柱状对比，只表达量级。
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('erp.financial_analysis_page.k0'),
                value: balanceSheetData.total_assets || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('erp.financial_analysis_page.k1'),
                value: balanceSheetData.total_liabilities || 0,
                color: theme.palette.error.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k2'),
                value: balanceSheetData.total_equity || 0,
                color: theme.palette.primary.main,
              },
            ],
          },
        ];
      }
      case 'incomeStatement': {
        if (!incomeStatementData) return [];
        return [
          {
            id: 'income-statement-chart',
            title: chartTitle,
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('erp.financial_analysis_page.k3'),
                value: incomeStatementData.total_revenue || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('erp.financial_analysis_page.k4'),
                value: incomeStatementData.total_expense || 0,
                color: theme.palette.error.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k6'),
                value: incomeStatementData.net_income || 0,
                color: theme.palette.secondary.main,
              },
            ],
          },
        ];
      }
      case 'cashFlow': {
        if (!cashFlowData) return [];
        return [
          {
            id: 'cash-flow-chart',
            title: chartTitle,
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('erp.financial_report.label.total_inflow'),
                value: cashFlowData.total_inflow || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('erp.financial_report.label.total_outflow'),
                value: cashFlowData.total_outflow || 0,
                color: theme.palette.warning[700],
              },
              {
                name: i18n.t('erp.financial_analysis_page.k10'),
                value: cashFlowData.net_change || 0,
                color: theme.palette.primary.main,
              },
            ],
          },
        ];
      }
      case 'agingAnalysis': {
        // 无数据也返回图表骨架：全 0 时模板渲染「暂无数据」，而不是整块空白
        const aging = agingAnalysisData;
        return [
          {
            id: 'aging-analysis-chart',
            title: chartTitle,
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('pages.financial_analysis_page.030_0'),
                value: aging?.['0-30'] || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('pages.financial_analysis_page.3160_1'),
                value: aging?.['31-60'] || 0,
                color: theme.palette.warning[700],
              },
              {
                name: i18n.t('pages.financial_analysis_page.6190_2'),
                value: aging?.['61-90'] || 0,
                color: theme.palette.error.main,
              },
              {
                name: i18n.t('pages.financial_analysis_page.90_3'),
                value: aging?.['90+'] || 0,
                color: theme.palette.error.dark,
              },
            ],
          },
        ];
      }
      case 'budgetAnalysis': {
        const budget = budgetAnalysisData;
        return [
          {
            id: 'budget-analysis-chart',
            title: chartTitle,
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('erp.financial_analysis_page.k11'),
                value: budget?.budget_amount || 0,
                color: theme.palette.primary.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k12'),
                value: budget?.actual_amount || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('erp.financial_analysis_page.k13'),
                value:
                  (budget?.budget_amount || 0) - (budget?.actual_amount || 0),
                color: theme.palette.warning[700],
              },
            ],
          },
        ];
      }
      default:
        return [];
    }
  }, [
    activeTab,
    activeTabLabel,
    balanceSheetData,
    incomeStatementData,
    cashFlowData,
    agingAnalysisData,
    budgetAnalysisData,
  ]);

  const tables = useMemo<DataTable[]>(() => {
    const tableTitle = i18n.t('erp:financial_analysis_page.v0_0', { v0: activeTabLabel });
    switch (activeTab) {
      case 'balanceSheet': {
        if (!balanceSheetData) return [];
        return [
          {
            id: 'balance-sheet-table',
            title: tableTitle,
            columns: tableColumns,
            data: [
              {
                metric: i18n.t('erp.financial_analysis_page.k0'),
                amount: balanceSheetData.total_assets || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k1'),
                amount: balanceSheetData.total_liabilities || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k2'),
                amount: balanceSheetData.total_equity || 0,
              },
            ],
          },
        ];
      }
      case 'incomeStatement': {
        if (!incomeStatementData) return [];
        return [
          {
            id: 'income-statement-table',
            title: tableTitle,
            columns: tableColumns,
            data: [
              {
                metric: i18n.t('erp.financial_analysis_page.k3'),
                amount: incomeStatementData.total_revenue || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k4'),
                amount: incomeStatementData.total_expense || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k6'),
                amount: incomeStatementData.net_income || 0,
              },
            ],
          },
        ];
      }
      case 'cashFlow': {
        if (!cashFlowData) return [];
        return [
          {
            id: 'cash-flow-table',
            title: tableTitle,
            columns: tableColumns,
            data: [
              {
                metric: i18n.t('erp.financial_report.label.total_inflow'),
                amount: cashFlowData.total_inflow || 0,
              },
              {
                metric: i18n.t('erp.financial_report.label.total_outflow'),
                amount: cashFlowData.total_outflow || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k10'),
                amount: cashFlowData.net_change || 0,
              },
            ],
          },
        ];
      }
      case 'agingAnalysis': {
        if (!agingAnalysisData) return [];
        return [
          {
            id: 'aging-analysis-table',
            title: tableTitle,
            columns: tableColumns,
            data: [
              {
                metric: i18n.t('pages.financial_analysis_page.030_0'),
                amount: agingAnalysisData['0-30'] || 0,
              },
              {
                metric: i18n.t('pages.financial_analysis_page.3160_1'),
                amount: agingAnalysisData['31-60'] || 0,
              },
              {
                metric: i18n.t('pages.financial_analysis_page.6190_2'),
                amount: agingAnalysisData['61-90'] || 0,
              },
              {
                metric: i18n.t('pages.financial_analysis_page.90_3'),
                amount: agingAnalysisData['90+'] || 0,
              },
            ],
          },
        ];
      }
      case 'budgetAnalysis': {
        if (!budgetAnalysisData) return [];
        return [
          {
            id: 'budget-analysis-table',
            title: tableTitle,
            columns: tableColumns,
            data: [
              {
                metric: i18n.t('erp.financial_analysis_page.k11'),
                amount: budgetAnalysisData.budget_amount || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k12'),
                amount: budgetAnalysisData.actual_amount || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k13'),
                amount:
                  (budgetAnalysisData.budget_amount || 0) -
                  (budgetAnalysisData.actual_amount || 0),
              },
            ],
          },
        ];
      }
      default:
        return [];
    }
  }, [
    activeTab,
    activeTabLabel,
    tableColumns,
    balanceSheetData,
    incomeStatementData,
    cashFlowData,
    agingAnalysisData,
    budgetAnalysisData,
  ]);

  return (
    <StatsPageTemplate
      title={i18n.t('erp.financial_report_page.k19')}
      tabs={tabItems}
      tabValue={activeTab}
      onTabChange={(value) => setActiveTab(value as TabValue)}
      statCards={statCards}
      statColumns={4}
      charts={charts}
      tables={tables}
      loading={loading}
      timeRangeOptions={timeRangeOptions}
      customToolbar={
        <FormControl
          size='small'
          sx={{ minWidth: 240 }}
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
      }
      timeRange={period}
      onTimeRangeChange={setPeriod}
      onRefresh={handleRefresh}
      onExport={handleExport}
      showSearch={false}
    />
  );
};

export default FinancialAnalysisPage;
