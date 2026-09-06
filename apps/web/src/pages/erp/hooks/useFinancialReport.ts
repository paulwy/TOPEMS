import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { financeReportApi } from '@/api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface PeriodOption {
  value: string;
  label: string;
}
export interface TabConfig {
  label: string;
  value: string;
}
export function useFinancialReport() {
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
      ? i18n.t('erp.financial_report.message.load_report_failed_retry')
      : null;
  useEffect(() => {
    if (balanceSheetQuery.isError) {
      apiLogger.error('Failed to load balance sheet:', balanceSheetQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report.message.error'),
        message: i18n.t('erp.financial_report.message.load_report_failed'),
        type: 'error',
      });
    }
  }, [balanceSheetQuery.isError, balanceSheetQuery.error, addNotification]);
  useEffect(() => {
    if (incomeStatementQuery.isError) {
      apiLogger.error('Failed to load income statement:', incomeStatementQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report.message.error'),
        message: i18n.t('erp.financial_report.message.load_report_failed'),
        type: 'error',
      });
    }
  }, [incomeStatementQuery.isError, incomeStatementQuery.error, addNotification]);
  useEffect(() => {
    if (cashFlowQuery.isError) {
      apiLogger.error('Failed to load cash flow statement:', cashFlowQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report.message.error'),
        message: i18n.t('erp.financial_report.message.load_report_failed'),
        type: 'error',
      });
    }
  }, [cashFlowQuery.isError, cashFlowQuery.error, addNotification]);
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);
  const formatCurrency = useCallback((amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  }, []);
  const handleExport = useCallback(() => {
    addNotification({
      title: i18n.t('erp.financial_report.message.export_success'),
      message: i18n.t('erp.financial_report.message.exported_excel'),
      type: 'success',
    });
  }, [addNotification]);
  const periodOptions = useMemo<PeriodOption[]>(() => {
    if (periodType === 'year') {
      return [
        { value: '2024', label: i18n.t('erp.financial_report.period.year_2024') },
        { value: '2023', label: i18n.t('erp.financial_report.period.year_2023') },
        { value: '2022', label: i18n.t('erp.financial_report.period.year_2022') },
        { value: '2021', label: i18n.t('erp.financial_report.period.year_2021') },
      ];
    } else if (periodType === 'quarter') {
      return [
        { value: '2024-Q1', label: i18n.t('erp.financial_report.period.quarter_2024_q1') },
        { value: '2024-Q2', label: i18n.t('erp.financial_report.period.quarter_2024_q2') },
        { value: '2024-Q3', label: i18n.t('erp.financial_report.period.quarter_2024_q3') },
        { value: '2024-Q4', label: i18n.t('erp.financial_report.period.quarter_2024_q4') },
      ];
    } else {
      return [
        { value: '2024-01', label: i18n.t('erp.financial_report.period.month_2024_01') },
        { value: '2024-02', label: i18n.t('erp.financial_report.period.month_2024_02') },
        { value: '2024-03', label: i18n.t('erp.financial_report.period.month_2024_03') },
        { value: '2024-04', label: i18n.t('erp.financial_report.period.month_2024_04') },
        { value: '2024-05', label: i18n.t('erp.financial_report.period.month_2024_05') },
        { value: '2024-06', label: i18n.t('erp.financial_report.period.month_2024_06') },
      ];
    }
  }, [periodType]);
  const tabs: TabConfig[] = useMemo(
    () => [
      {
        label: i18n.t('erp.financial_report.label.balance_sheet'),
        value: 'balance-sheet',
      },
      {
        label: i18n.t('erp.financial_report.label.income_statement'),
        value: 'income-statement',
      },
      {
        label: i18n.t('erp.financial_report.label.cash_flow_statement'),
        value: 'cash-flow',
      },
      {
        label: i18n.t('erp.financial_report.label.equity_change_statement'),
        value: 'equity-change',
      },
    ],
    []
  );
  const handlePeriodTypeChange = useCallback((newPeriodType: string) => {
    setPeriodType(newPeriodType);
    const newOptions =
      newPeriodType === 'year'
        ? ['2024', '2023', '2022', '2021']
        : newPeriodType === 'quarter'
          ? ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4']
          : ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
    setPeriod(newOptions[0] || '');
  }, []);
  return {
    activeTab,
    setActiveTab,
    periodType,
    setPeriodType: handlePeriodTypeChange,
    period,
    setPeriod,
    balanceSheet,
    incomeStatement,
    cashFlowStatement,
    loading,
    error,
    periodOptions,
    tabs,
    formatCurrency,
    handleRefresh,
    handleExport,
  };
}
