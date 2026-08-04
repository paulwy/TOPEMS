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
import { PageContainer } from '@/components/common/PageContainer';
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { financeReportApi } from '@/api/erp';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';
import { LoadingSpinner } from '@topems/shared-components';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  FileText,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';

const ct = designTokens.colors;

const FinancialAnalysisPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [chartData, setChartData] = useState<any[]>([]);

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: ['erp', 'financial-reports'] });
  };

  const { data: balanceSheetData, isLoading: balanceSheetLoading } = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(period),
    queryFn: async () => {
      const response = await financeReportApi.balanceSheet({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 0,
  });

  useEffect(() => {
    if (balanceSheetData) {
      setChartData([
        { category: '总资产', value: balanceSheetData.total_assets || 0, color: ct.success.main },
        {
          category: '总负债',
          value: balanceSheetData.total_liabilities || 0,
          color: ct.error.main,
        },
        { category: '净资产', value: balanceSheetData.total_equity || 0, color: ct.primary.main },
      ]);
    }
  }, [balanceSheetData]);

  const { data: incomeStatementData, isLoading: incomeStatementLoading } =
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
    });

  useEffect(() => {
    if (incomeStatementData) {
      setChartData([
        {
          category: '营业收入',
          value: (incomeStatementData as any).total_revenue || 0,
          color: ct.success.main,
        },
        {
          category: '营业成本',
          value: (incomeStatementData as any).total_cost || 0,
          color: ct.error.main,
        },
        {
          category: '营业利润',
          value: incomeStatementData.operating_profit || 0,
          color: ct.primary.main,
        },
        {
          category: '净利润',
          value: incomeStatementData.net_profit || 0,
          color: ct.secondary.main,
        },
      ]);
    }
  }, [incomeStatementData]);

  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(period),
    queryFn: async () => {
      const response = await financeReportApi.cashFlowStatement({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 2,
  });

  useEffect(() => {
    if (cashFlowData) {
      setChartData([
        {
          category: '经营活动',
          value: (cashFlowData as any).operating_cash_flow || 0,
          color: ct.success.main,
        },
        {
          category: '投资活动',
          value: (cashFlowData as any).investing_cash_flow || 0,
          color: ct.warning.main,
        },
        {
          category: '筹资活动',
          value: (cashFlowData as any).financing_cash_flow || 0,
          color: ct.info.main,
        },
        { category: '净现金流', value: cashFlowData.net_cash_flow || 0, color: ct.primary.main },
      ]);
    }
  }, [cashFlowData]);

  const { data: agingAnalysisData, isLoading: agingAnalysisLoading } = useQuery<Record<
    string,
    number
  > | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.AGING_ANALYSIS, period],
    queryFn: async () => {
      const response = await financeReportApi.agingAnalysis();
      if (response.success && response.data) {
        return response.data.reduce((acc: Record<string, number>, item: any) => {
          acc[item.category] = item.amount;
          return acc;
        }, {});
      }
      return null;
    },
    enabled: activeTab === 3,
  });

  useEffect(() => {
    if (agingAnalysisData) {
      setChartData([
        { category: '0-30天', value: agingAnalysisData['0-30'] || 0, color: ct.success.main },
        { category: '31-60天', value: agingAnalysisData['31-60'] || 0, color: ct.warning.main },
        { category: '61-90天', value: agingAnalysisData['61-90'] || 0, color: ct.error.main },
        { category: '90天以上', value: agingAnalysisData['90+'] || 0, color: ct.error.dark },
      ]);
    }
  }, [agingAnalysisData]);

  const { data: budgetAnalysisData, isLoading: budgetAnalysisLoading } = useQuery<{
    budget_amount?: number;
    actual_amount?: number;
  } | null>({
    queryKey: [...QUERY_KEYS.ERP.FINANCIAL_REPORTS.EXPENSE_ANALYSIS, 'budget', period],
    queryFn: async () => {
      const response = await (financeReportApi as any).budgetAnalysis({ period });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: activeTab === 4,
  });

  useEffect(() => {
    if (budgetAnalysisData) {
      setChartData([
        {
          category: '预算金额',
          value: budgetAnalysisData.budget_amount || 0,
          color: ct.primary.main,
        },
        {
          category: '实际支出',
          value: budgetAnalysisData.actual_amount || 0,
          color: ct.success.main,
        },
        {
          category: '差异',
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
            >
              ¥{(item.value / 10000).toFixed(1)}万
            </Box>
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
                stroke='#fff'
                strokeWidth='2'
              />
            );
          })}
          <circle
            cx='100'
            cy='100'
            r='50'
            fill='#fff'
          />
          <text
            x='100'
            y='95'
            textAnchor='middle'
            fontSize='14'
            fontWeight='bold'
            fill={ct.text.primary}
          >
            ¥{(total / 10000).toFixed(1)}万
          </text>
          <text
            x='100'
            y='115'
            textAnchor='middle'
            fontSize='10'
            fill={ct.text.secondary}
          >
            总计
          </text>
        </svg>
      </Box>
    );
  };

  const renderDataGrid = () => {
    if (!currentData) return null;

    const data = currentData as Record<string, any>;
    const dataKeys = Object.keys(data).filter((k) => typeof data[k] === 'number');

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  borderBottom: `2px solid ${ct.grey[200]}`,
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: 600,
                }}
              >
                指标
              </th>
              <th
                style={{
                  borderBottom: `2px solid ${ct.grey[200]}`,
                  padding: '8px',
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                金额(元)
              </th>
            </tr>
          </thead>
          <tbody>
            {dataKeys.map((key, index) => (
              <tr
                key={key}
                style={{ backgroundColor: index % 2 === 0 ? '#fff' : ct.grey[50] }}
              >
                <td style={{ borderBottom: `1px solid ${ct.grey[100]}`, padding: '8px' }}>
                  {key.replace(/_/g, ' ')}
                </td>
                <td
                  style={{
                    borderBottom: `1px solid ${ct.grey[100]}`,
                    padding: '8px',
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
    addNotification({ type: 'success', title: '刷新成功', message: '报表数据已更新' });
  };

  const handleExport = async () => {
    try {
      const exportData = currentData;
      if (!exportData) {
        addNotification({ type: 'error', title: '导出失败', message: '没有可导出的数据' });
        return;
      }

      const csvContent = [
        ['指标', '金额(元)'],
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

      addNotification({ type: 'success', title: '导出成功', message: '报表已导出为 CSV 文件' });
    } catch (error) {
      apiLogger.error('导出失败:', error);
      addNotification({ type: 'error', title: '导出失败', message: '无法导出报表' });
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
            当前期间
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{period}</Box>
      </Box>
      {activeTab === 0 && balanceSheetData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>总资产</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{((balanceSheetData as any).total_assets / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>总负债</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              ¥{((balanceSheetData as any).total_liabilities / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>净资产</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>
              ¥{((balanceSheetData as any).total_equity / 10000).toFixed(1)}万
            </Box>
          </Box>
        </>
      )}
      {activeTab === 1 && incomeStatementData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>营业收入</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{((incomeStatementData as any).total_revenue / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>营业成本</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              ¥{((incomeStatementData as any).total_cost / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>净利润</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>
              ¥{((incomeStatementData as any).net_profit / 10000).toFixed(1)}万
            </Box>
          </Box>
        </>
      )}
      {activeTab === 2 && cashFlowData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>经营现金流</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{((cashFlowData as any).net_cash_flow / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>投资现金流</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              ¥{((cashFlowData as any).net_cash_flow / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>净现金流</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>
              ¥{((cashFlowData as any).net_cash_flow / 10000).toFixed(1)}万
            </Box>
          </Box>
        </>
      )}
      {activeTab === 3 && agingAnalysisData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>0-30天</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{((agingAnalysisData as any)['0-30'] / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>31-60天</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              ¥{((agingAnalysisData as any)['31-60'] / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>逾期总额</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              ¥
              {(((agingAnalysisData as any)['61-90'] || 0) +
                ((agingAnalysisData as any)['90+'] || 0)) /
                10000}
              万
            </Box>
          </Box>
        </>
      )}
      {activeTab === 4 && budgetAnalysisData && (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>预算金额</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{((budgetAnalysisData as any).budget_amount / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>实际支出</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'primary.dark' }}>
              ¥{((budgetAnalysisData as any).actual_amount / 10000).toFixed(1)}万
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>预算执行率</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              {(
                ((budgetAnalysisData as any).actual_amount /
                  (budgetAnalysisData as any).budget_amount) *
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

  const tabLabels = ['资产负债表', '利润表', '现金流量表', '账龄分析', '预算分析'];

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
          <InputLabel htmlFor='period'>期间</InputLabel>
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
          刷新数据
        </Button>
        <Button
          variant='contained'
          startIcon={<Download size={16} />}
          onClick={handleExport}
        >
          导出报表
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
          >
            {tabLabels[activeTab]} - 可视化图表
          </Box>
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
          >
            {tabLabels[activeTab]} - 明细数据
          </Box>
        </Box>
        {renderDataGrid()}
      </Box>
    </PageContainer>
  );
};

export default FinancialAnalysisPage;
