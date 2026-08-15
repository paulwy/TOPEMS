import {
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { financeReportApi } from '@/api/erp';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { LoadingSpinner } from '@topems/shared-components';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { BarChart3, TrendingUp, PieChart, FileText, Download, RefreshCw } from 'lucide-react';
const ct= designTokens.colors;
interface ChartDataItem {
  category: string;
  value: number;
  color: string;
}
const FinancialAnalysisPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE ,
  exact: false,
  refetchType: 'active',
});
  };
  const { data: balanceSheetData, isPending: balanceSheetLoading} = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(period),
    queryFn: async () => {
      const response = await financeReportApi.balanceSheet({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 0,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  useEffect(() => {
    if (balanceSheetData) {
      setChartData([
        { category: i18n.t('erp.financial_analysis_page.k0'), value: balanceSheetData.total_assets || 0, color: ct.success.main },
        {
          category: i18n.t('erp.financial_analysis_page.k1'),
          value: balanceSheetData.total_liabilities || 0,
          color: ct.error.main,
        },
        { category: i18n.t('erp.financial_analysis_page.k2'), value: balanceSheetData.total_equity || 0, color: ct.primary.main },
      ]);
    }
  }, [balanceSheetData]);
  const { data: incomeStatementData, isPending: incomeStatementLoading} =
    useQuery<IncomeStatement | null>({
      queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(period),
      queryFn: async () => {
        const response = await financeReportApi.incomeStatement({ period });
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      },
      enabled: activeTab === 1,
    
        staleTime: CACHE_DURATIONS.MEDIUM,});
  useEffect(() => {
    if (incomeStatementData) {
      setChartData([
        {
          category: i18n.t('erp.financial_analysis_page.k3'),
          value: incomeStatementData.total_revenue || 0,
          color: ct.success.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k4'),
          value: incomeStatementData.total_cost || 0,
          color: ct.error.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k5'),
          value: incomeStatementData.operating_profit || 0,
          color: ct.primary.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k6'),
          value: incomeStatementData.net_profit || 0,
          color: ct.secondary.main,
        },
      ]);
    }
  }, [incomeStatementData]);
  const { data: cashFlowData, isPending: cashFlowLoading} = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(period),
    queryFn: async () => {
      const response = await financeReportApi.cashFlowStatement({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 2,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  useEffect(() => {
    if (cashFlowData) {
      setChartData([
        {
          category: i18n.t('erp.financial_analysis_page.k7'),
          value: cashFlowData.operating_cash_flow || 0,
          color: ct.success.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k8'),
          value: cashFlowData.investing_cash_flow || 0,
          color: ct.warning.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k9'),
          value: cashFlowData.financing_cash_flow || 0,
          color: ct.info.main,
        },
        { category: i18n.t('erp.financial_analysis_page.k10'), value: cashFlowData.net_cash_flow || 0, color: ct.primary.main },
      ]);
    }
  }, [cashFlowData]);
  const { data: agingAnalysisData, isPending: agingAnalysisLoading} = useQuery<Record<
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
    enabled: activeTab === 3,
  });
  useEffect(() => {
    if (agingAnalysisData) {
      setChartData([
        { category: i18n.t('pages.financial_analysis_page.030_0'), value: agingAnalysisData['0-30'] || 0, color: ct.success.main },
        { category: i18n.t('pages.financial_analysis_page.3160_1'), value: agingAnalysisData['31-60'] || 0, color: ct.warning.main },
        { category: i18n.t('pages.financial_analysis_page.6190_2'), value: agingAnalysisData['61-90'] || 0, color: ct.error.main },
        { category: i18n.t('pages.financial_analysis_page.90_3'), value: agingAnalysisData['90+'] || 0, color: ct.error.dark },
      ]);
    }
  }, [agingAnalysisData]);
  const { data: budgetAnalysisData, isPending: budgetAnalysisLoading} = useQuery<{
    budget_amount: number;
    actual_amount: number;
  } | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.EXPENSE_ANALYSIS, 'budget', period],
    queryFn: async () => {
      const response = await (financeReportApi as unknown as { budgetAnalysis: (params: { period: string }) => Promise<{ success: boolean; data: { budget_amount: number; actual_amount: number; } | null; message?: string; }> }).budgetAnalysis({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 4,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  useEffect(() => {
    if (budgetAnalysisData) {
      setChartData([
        {
          category: i18n.t('erp.financial_analysis_page.k11'),
          value: budgetAnalysisData.budget_amount || 0,
          color: ct.primary.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k12'),
          value: budgetAnalysisData.actual_amount || 0,
          color: ct.success.main,
        },
        {
          category: i18n.t('erp.financial_analysis_page.k13'),
          value: (budgetAnalysisData.budget_amount || 0) - (budgetAnalysisData.actual_amount || 0),
          color: ct.warning.main,
        },
      ]);
    }
  }, [budgetAnalysisData]);
  const loading = [
    balanceSheetLoading,
    incomeStatementLoading,
    cashFlowLoading,
    agingAnalysisLoading,
    budgetAnalysisLoading,
  ][activeTab];
  const getCurrentData = () => {
    const dataMap = [
      balanceSheetData,
      incomeStatementData,
      cashFlowData,
      agingAnalysisData,
      budgetAnalysisData,
    ];
    return dataMap[activeTab];
  };
  const currentData = getCurrentData();
  const maxValue = Math.max(...chartData.map((d) => Math.abs(d.value)), 1);
  const renderBarChart = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 200,
        gap: 2,
      }}
    >
      {chartData.map((item, index) => (
        <Box
          key={index}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
        >
          <Box
            component='span'
            sx={{ fontSize: 12, mb: 1, textAlign: 'center' }}
          >
            {item.category}
          </Box>
          <Box
            sx={{
              width: '100%',
              backgroundColor: item.color,
              borderRadius: 1,
              transition: 'height 0.3s ease',
              height: `${(Math.abs(item.value) / maxValue) * 100}%`,
              minHeight: 10,
              position: 'relative',
              display: 'flex',
              alignItems: item.value < 0 ? 'flex-end' : 'flex-start',
              justifyContent: 'center',
              py: 1,
            }}
          >
            <Box
              component='span'
              sx={{ fontSize: 10, color: 'common.white', fontWeight: 500 }}
            >{i18n.t('erp:financial_analysis_page.v0_19', { v0: ((item.value / 10000).toFixed(1)) })}</Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
  const renderPieChart = () => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    let cumulativeAngle = 0;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <svg
          width='200'
          height='200'
        >
          {chartData.map((item, index) => {
            const angle = (item.value / total) * 360;
            const startAngle = cumulativeAngle;
            cumulativeAngle += angle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (cumulativeAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 80 * Math.cos(startRad);
            const y1 = 100 + 80 * Math.sin(startRad);
            const x2 = 100 + 80 * Math.cos(endRad);
            const y2 = 100 + 80 * Math.sin(endRad);
            const largeArcFlag = angle > 180 ? 1 : 0;
            return (
              <path
                key={index}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={item.color}
                stroke={designTokens.colors.background.paper}
                strokeWidth='2'
              />
            );
          })}
          <circle
            cx='100'
            cy='100'
            r='50'
            fill={designTokens.colors.background.paper}
          />
          <text
            x='100'
            y='95'
            textAnchor='middle'
            fontSize='14'
            fontWeight='bold'
            fill={ct.text.primary}
          >{i18n.t('erp:financial_analysis_page.v0_18', { v0: ((total / 10000).toFixed(1)) })}</text>
          <text
            x='100'
            y='115'
            textAnchor='middle'
            fontSize='10'
            fill={ct.text.secondary}
          >
            {i18n.t('pages.financial_analysis_page.k0')}
          </text>
        </svg>
      </Box>
    );
  };
  const renderDataGrid = () => {
    if (!currentData) return null;
    const data = currentData as Record<string, unknown>;
    const dataKeys = Object.keys(data).filter((k) => typeof data[k] === 'number');
    return (
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  borderBottom: `2px solid ${ct.grey[200]}`,
                  padding: 2,
                  textAlign: 'left',
                  fontWeight: 600,
                }}
              >
                {i18n.t('pages.financial_analysis_page.k1')}
              </th>
              <th
                style={{
                  borderBottom: `2px solid ${ct.grey[200]}`,
                  padding: 2,
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                {i18n.t('pages.financial_analysis_page.k2')}
              </th>
            </tr>
          </thead>
          <tbody>
            {dataKeys.map((key, index) => (
              <tr
                key={key}
                style={{ backgroundColor: index % 2 === 0 ? designTokens.colors.background.paper : ct.grey[50] }}
              >
                <td style={{ borderBottom: `1px solid ${ct.grey[100]}`, padding: 2 }}>
                  {key.replace(/_/g, ' ')}
                </td>
                <td
                  style={{
                    borderBottom: `1px solid ${ct.grey[100]}`,
                    padding: 2,
                    textAlign: 'right',
                  }}
                >
                  ¥{Number(data[key]).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  };
  const handleRefresh = () => {
    invalidateData();
    addNotification({ type: 'success', title: i18n.t('erp.financial_analysis_page.k15'), message: i18n.t('erp.financial_analysis_page.k14') });
  };
  const handleExport = async () => {
    try {
      const exportData = currentData;
      if (!exportData) {
        addNotification({ type: 'error', title: i18n.t('erp.financial_analysis_page.k17'), message: i18n.t('erp.financial_analysis_page.k16') });
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
      addNotification({ type: 'success', title: i18n.t('erp.financial_analysis_page.k21'), message: i18n.t('erp.financial_analysis_page.csv_20') });
    } catch (error) {
      apiLogger.error(i18n.t('pages.financial_analysis_page.k4'), error);
      addNotification({ type: 'error', title: i18n.t('erp.financial_analysis_page.k23'), message: i18n.t('erp.financial_analysis_page.k22') });
    }
  };
  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <BarChart3
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            {i18n.t('pages.financial_analysis_page.k3')}
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{period}</Box>
      </Box>
      {activeTab === 0 && balanceSheetData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k24')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{i18n.t('erp:financial_analysis_page.v0_17', { v0: ((balanceSheetData.total_assets / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k25')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>{i18n.t('erp:financial_analysis_page.v0_16', { v0: ((balanceSheetData.total_liabilities / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k26')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>{i18n.t('erp:financial_analysis_page.v0_15', { v0: ((balanceSheetData.total_equity / 10000).toFixed(1)) })}</Box>
          </Box>
        </>
      )}
      {activeTab === 1 && incomeStatementData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k27')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{i18n.t('erp:financial_analysis_page.v0_14', { v0: ((incomeStatementData.total_revenue / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k28')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>{i18n.t('erp:financial_analysis_page.v0_13', { v0: ((incomeStatementData.total_cost / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k29')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>{i18n.t('erp:financial_analysis_page.v0_12', { v0: ((incomeStatementData.net_profit / 10000).toFixed(1)) })}</Box>
          </Box>
        </>
      )}
      {activeTab === 2 && cashFlowData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k30')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{i18n.t('erp:financial_analysis_page.v0_11', { v0: ((cashFlowData.net_cash_flow / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k31')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>{i18n.t('erp:financial_analysis_page.v0_10', { v0: ((cashFlowData.net_cash_flow / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k32')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>{i18n.t('erp:financial_analysis_page.v0_9', { v0: ((cashFlowData.net_cash_flow / 10000).toFixed(1)) })}</Box>
          </Box>
        </>
      )}
      {activeTab === 3 && agingAnalysisData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp:financial_analysis_page.030_8')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{i18n.t('erp:financial_analysis_page.v0_7', { v0: ((agingAnalysisData['0-30'] / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp:financial_analysis_page.3160_6')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>{i18n.t('erp:financial_analysis_page.v0_5', { v0: ((agingAnalysisData['31-60'] / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k33')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>{i18n.t('erp:financial_analysis_page.v0_4', { v0: (((agingAnalysisData['61-90'] || 0) + (agingAnalysisData['90+'] || 0)) / 10000) })}</Box>
          </Box>
        </>
      )}
      {activeTab === 4 && budgetAnalysisData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k34')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>{i18n.t('erp:financial_analysis_page.v0_3', { v0: ((budgetAnalysisData.budget_amount / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k35')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>{i18n.t('erp:financial_analysis_page.v0_2', { v0: ((budgetAnalysisData.actual_amount / 10000).toFixed(1)) })}</Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>{i18n.t('erp.financial_analysis_page.k36')}</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              {(
                (budgetAnalysisData.actual_amount / budgetAnalysisData.budget_amount) *
                100
              ).toFixed(1)}
              %
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
  const tabIcons = [
    <TrendingUp size={16} />,
    <BarChart3 size={16} />,
    <PieChart size={16} />,
    <FileText size={16} />,
    <FileText size={16} />,
  ];
  const tabLabels = [i18n.t('erp.financial_analysis_page.k41'), i18n.t('erp.financial_analysis_page.k40'), i18n.t('erp.financial_analysis_page.k39'), i18n.t('erp.financial_analysis_page.k38'), i18n.t('erp.financial_analysis_page.k37')];
  if (loading) return <LoadingSpinner />;
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FormControl size='small'>
          <InputLabel htmlFor='period'>{i18n.t('erp.financial_analysis_page.k42')}</InputLabel>
          <Select
            id='period'
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              return date.toISOString().slice(0, 7);
            }).map((p) => (
              <MenuItem
                key={p}
                value={p}
              >
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant='outlined'
          startIcon={<RefreshCw size={16} />}
          onClick={handleRefresh}
        >
          {i18n.t('pages.financial_analysis_page.k4')}
        </Button>
        <Button
          variant='contained'
          startIcon={<Download size={16} />}
          onClick={handleExport}
        >
          {i18n.t('pages.financial_analysis_page.k5')}
        </Button>
      </Box>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        {tabLabels.map((label, index) => (
          <Tab
            key={index}
            label={label}
            icon={tabIcons[index]}
          />
        ))}
      </Tabs>
      <Box sx={{ mb: 3 }}>{statsContent}</Box>
      <Box sx={{ bgcolor: 'common.white', borderRadius: 3, p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {activeTab === 0 ? <TrendingUp size={20} /> : <BarChart3 size={20} />}
          <Box
            component='h3'
            sx={{ fontWeight: 600 }}
          >{i18n.t('erp:financial_analysis_page.v0_1', { v0: (tabLabels[activeTab]) })}</Box>
        </Box>
        {activeTab === 0 ? renderPieChart() : renderBarChart()}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 3 }}>
          {chartData.map((item, index) => (
            <Box
              key={index}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Chip
                size='small'
                sx={{ backgroundColor: item.color, color: 'common.white', fontWeight: 500 }}
                label={item.category}
              />
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ bgcolor: 'common.white', borderRadius: 3, p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <FileText size={20} />
          <Box
            component='h3'
            sx={{ fontWeight: 600 }}
          >{i18n.t('erp:financial_analysis_page.v0_0', { v0: (tabLabels[activeTab]) })}</Box>
        </Box>
        {renderDataGrid()}
      </Box>
    </PageContainer>
  );
};
export default FinancialAnalysisPage;