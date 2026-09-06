import React, { useMemo, useState } from 'react';
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
import { financeReportApi } from '@/api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { BarChart3, TrendingUp, PieChart, FileText } from 'lucide-react';

const ct = designTokens.colors;

type TabValue =
  'balanceSheet' | 'incomeStatement' | 'cashFlow' | 'agingAnalysis' | 'budgetAnalysis';

const FinancialAnalysisPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabValue>('balanceSheet');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const invalidateData = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  };

  const { data: balanceSheetData, isPending: balanceSheetLoading } = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(period),
    queryFn: async () => {
      const response = await financeReportApi.balanceSheet({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 'balanceSheet',
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: incomeStatementData, isPending: incomeStatementLoading } =
    useQuery<IncomeStatement | null>({
      queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(period),
      queryFn: async () => {
        const response = await financeReportApi.incomeStatement({ period });
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      },
      enabled: activeTab === 'incomeStatement',
      staleTime: CACHE_DURATIONS.MEDIUM,
    });

  const { data: cashFlowData, isPending: cashFlowLoading } = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(period),
    queryFn: async () => {
      const response = await financeReportApi.cashFlowStatement({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 'cashFlow',
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: agingAnalysisData, isPending: agingAnalysisLoading } = useQuery<Record<
    string,
    number
  > | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.AGING_ANALYSIS, period],
    queryFn: async (): Promise<Record<string, number> | null> => {
      const response = await financeReportApi.agingAnalysis();
      if (response.success && response.data) {
        const result: Record<string, number> = {};
        for (const item of response.data as unknown as Array<{
          category: string;
          amount: number;
        }>) {
          result[item.category] = item.amount;
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
      const response = await (
        financeReportApi as unknown as {
          budgetAnalysis: (params: { period: string }) => Promise<{
            success: boolean;
            data: { budget_amount: number; actual_amount: number } | null;
            message?: string;
          }>;
        }
      ).budgetAnalysis({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
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
            value: i18n.t('erp:financial_analysis_page.v0_17', {
              v0: (balanceSheetData.total_assets / 10000).toFixed(1),
            }),
            color: 'success',
          },
          {
            id: 'total-liabilities',
            title: i18n.t('erp.financial_analysis_page.k25'),
            value: i18n.t('erp:financial_analysis_page.v0_16', {
              v0: (balanceSheetData.total_liabilities / 10000).toFixed(1),
            }),
            color: 'error',
          },
          {
            id: 'total-equity',
            title: i18n.t('erp.financial_analysis_page.k26'),
            value: i18n.t('erp:financial_analysis_page.v0_15', {
              v0: (balanceSheetData.total_equity / 10000).toFixed(1),
            }),
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
            value: i18n.t('erp:financial_analysis_page.v0_14', {
              v0: (incomeStatementData.total_revenue / 10000).toFixed(1),
            }),
            color: 'success',
          },
          {
            id: 'total-cost',
            title: i18n.t('erp.financial_analysis_page.k28'),
            value: i18n.t('erp:financial_analysis_page.v0_13', {
              v0: (incomeStatementData.total_cost / 10000).toFixed(1),
            }),
            color: 'error',
          },
          {
            id: 'net-profit',
            title: i18n.t('erp.financial_analysis_page.k29'),
            value: i18n.t('erp:financial_analysis_page.v0_12', {
              v0: (incomeStatementData.net_profit / 10000).toFixed(1),
            }),
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
            value: i18n.t('erp:financial_analysis_page.v0_11', {
              v0: (cashFlowData.net_cash_flow / 10000).toFixed(1),
            }),
            color: 'success',
          },
          {
            id: 'operating-cash-flow',
            title: i18n.t('erp.financial_analysis_page.k31'),
            value: i18n.t('erp:financial_analysis_page.v0_10', {
              v0: (cashFlowData.net_cash_flow / 10000).toFixed(1),
            }),
            color: 'warning',
          },
          {
            id: 'financing-cash-flow',
            title: i18n.t('erp.financial_analysis_page.k32'),
            value: i18n.t('erp:financial_analysis_page.v0_9', {
              v0: (cashFlowData.net_cash_flow / 10000).toFixed(1),
            }),
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
            value: i18n.t('erp:financial_analysis_page.v0_7', {
              v0: (agingAnalysisData['0-30'] / 10000).toFixed(1),
            }),
            color: 'success',
          },
          {
            id: 'aging-31-60',
            title: i18n.t('erp.financial_analysis_page.3160_6'),
            value: i18n.t('erp:financial_analysis_page.v0_5', {
              v0: (agingAnalysisData['31-60'] / 10000).toFixed(1),
            }),
            color: 'warning',
          },
          {
            id: 'aging-overdue',
            title: i18n.t('erp.financial_analysis_page.k33'),
            value: i18n.t('erp:financial_analysis_page.v0_4', {
              v0: ((agingAnalysisData['61-90'] || 0) + (agingAnalysisData['90+'] || 0)) / 10000,
            }),
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
            value: i18n.t('erp:financial_analysis_page.v0_3', {
              v0: (budgetAnalysisData.budget_amount / 10000).toFixed(1),
            }),
            color: 'success',
          },
          {
            id: 'actual-amount',
            title: i18n.t('erp.financial_analysis_page.k35'),
            value: i18n.t('erp:financial_analysis_page.v0_2', {
              v0: (budgetAnalysisData.actual_amount / 10000).toFixed(1),
            }),
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
            type: 'pie',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('erp.financial_analysis_page.k0'),
                value: balanceSheetData.total_assets || 0,
                color: ct.success.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k1'),
                value: balanceSheetData.total_liabilities || 0,
                color: ct.error.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k2'),
                value: balanceSheetData.total_equity || 0,
                color: ct.primary.main,
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
                color: ct.success.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k4'),
                value: incomeStatementData.total_cost || 0,
                color: ct.error.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k5'),
                value: incomeStatementData.operating_profit || 0,
                color: ct.primary.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k6'),
                value: incomeStatementData.net_profit || 0,
                color: ct.secondary.main,
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
                name: i18n.t('erp.financial_analysis_page.k7'),
                value: cashFlowData.operating_cash_flow || 0,
                color: ct.success.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k8'),
                value: cashFlowData.investing_cash_flow || 0,
                color: ct.warning.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k9'),
                value: cashFlowData.financing_cash_flow || 0,
                color: ct.info.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k10'),
                value: cashFlowData.net_cash_flow || 0,
                color: ct.primary.main,
              },
            ],
          },
        ];
      }
      case 'agingAnalysis': {
        if (!agingAnalysisData) return [];
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
                value: agingAnalysisData['0-30'] || 0,
                color: ct.success.main,
              },
              {
                name: i18n.t('pages.financial_analysis_page.3160_1'),
                value: agingAnalysisData['31-60'] || 0,
                color: ct.warning.main,
              },
              {
                name: i18n.t('pages.financial_analysis_page.6190_2'),
                value: agingAnalysisData['61-90'] || 0,
                color: ct.error.main,
              },
              {
                name: i18n.t('pages.financial_analysis_page.90_3'),
                value: agingAnalysisData['90+'] || 0,
                color: ct.error.dark,
              },
            ],
          },
        ];
      }
      case 'budgetAnalysis': {
        if (!budgetAnalysisData) return [];
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
                value: budgetAnalysisData.budget_amount || 0,
                color: ct.primary.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k12'),
                value: budgetAnalysisData.actual_amount || 0,
                color: ct.success.main,
              },
              {
                name: i18n.t('erp.financial_analysis_page.k13'),
                value:
                  (budgetAnalysisData.budget_amount || 0) - (budgetAnalysisData.actual_amount || 0),
                color: ct.warning.main,
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
                amount: incomeStatementData.total_cost || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k5'),
                amount: incomeStatementData.operating_profit || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k6'),
                amount: incomeStatementData.net_profit || 0,
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
                metric: i18n.t('erp.financial_analysis_page.k7'),
                amount: cashFlowData.operating_cash_flow || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k8'),
                amount: cashFlowData.investing_cash_flow || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k9'),
                amount: cashFlowData.financing_cash_flow || 0,
              },
              {
                metric: i18n.t('erp.financial_analysis_page.k10'),
                amount: cashFlowData.net_cash_flow || 0,
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
                  (budgetAnalysisData.budget_amount || 0) - (budgetAnalysisData.actual_amount || 0),
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
      title={i18n.t('shared.config.k24')}
      tabs={tabItems}
      tabValue={activeTab}
      onTabChange={(value) => setActiveTab(value as TabValue)}
      statCards={statCards}
      statColumns={4}
      charts={charts}
      tables={tables}
      loading={loading}
      timeRangeOptions={timeRangeOptions}
      timeRange={period}
      onTimeRangeChange={setPeriod}
      onRefresh={handleRefresh}
      onExport={handleExport}
      showSearch={false}
      chartSectionTitle={i18n.t('erp:financial_analysis_page.v0_1', { v0: activeTabLabel })}
      tableSectionTitle={i18n.t('erp:financial_analysis_page.v0_0', { v0: activeTabLabel })}
    />
  );
};

export default FinancialAnalysisPage;
