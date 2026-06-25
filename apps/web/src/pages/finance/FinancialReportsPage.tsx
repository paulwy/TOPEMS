import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Download, RefreshCw, FileText, Calendar, Building2, DollarSign, Wallet, Briefcase, PiggyBank } from 'lucide-react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { financeApi } from '@/api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement, ReportQueryParams } from '@/types/finance';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';

const REPORT_TYPE_CONFIG = {
  balance_sheet: { name: '资产负债表', icon: Building2, color: '#1976D2' },
  income_statement: { name: '利润表', icon: TrendingUp, color: '#00C897' },
  cash_flow: { name: '现金流量表', icon: DollarSign, color: '#8B5CF6' },
};

type ReportType = 'balance_sheet' | 'income_statement' | 'cash_flow';

type ReportData = BalanceSheet | IncomeStatement | CashFlowStatement | null;

export default function FinancialReportsPage() {
  const navigate = useNavigate();

  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState<ReportType>('balance_sheet');
  const [showDetail, setShowDetail] = useState(false);

  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheet | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatement | null>(null);
  const [cashFlowStatementData, setCashFlowStatementData] = useState<CashFlowStatement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentReport: ReportData =
    reportType === 'balance_sheet'
      ? balanceSheetData
      : reportType === 'income_statement'
        ? incomeStatementData
        : cashFlowStatementData;

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '-';
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  const statCards = useMemo<StatCard[]>(() => {
    if (!currentReport) return [];

    if (reportType === 'balance_sheet') {
      const data = currentReport as BalanceSheet;
      return [
        {
          id: 'total-assets',
          title: '总资产',
          value: formatCurrency(data?.assets?.total),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          gradient: ['#1976D2', '#1565C0'] as [string, string],
        },
        {
          id: 'total-liabilities',
          title: '总负债',
          value: formatCurrency(data?.liabilities?.total),
          icon: <Briefcase sx={{ width: 24, height: 24 }} />,
          gradient: ['#F59E0B', '#D97706'] as [string, string],
        },
        {
          id: 'total-equity',
          title: '所有者权益',
          value: formatCurrency(data?.equity?.total),
          icon: <PiggyBank sx={{ width: 24, height: 24 }} />,
          gradient: ['#00C897', '#00A878'] as [string, string],
        },
        {
          id: 'current-assets',
          title: '流动资产',
          value: formatCurrency(data?.assets?.current?.total),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          gradient: ['#6366F1', '#4F46E5'] as [string, string],
        },
      ];
    } else if (reportType === 'income_statement') {
      const data = currentReport as IncomeStatement;
      return [
        {
          id: 'revenue',
          title: '营业收入',
          value: formatCurrency(data?.revenue?.total),
          icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
          gradient: ['#00C897', '#00A878'] as [string, string],
        },
        {
          id: 'cost',
          title: '营业成本',
          value: formatCurrency(data?.cost_of_sales?.total),
          icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
          gradient: ['#EF4444', '#DC2626'] as [string, string],
        },
        {
          id: 'gross-profit',
          title: '毛利润',
          value: formatCurrency(data?.gross_profit),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          gradient: ['#1976D2', '#1565C0'] as [string, string],
        },
        {
          id: 'net-profit',
          title: '净利润',
          value: formatCurrency(data?.net_profit),
          icon: <PiggyBank sx={{ width: 24, height: 24 }} />,
          gradient: (data?.net_profit || 0) >= 0
            ? ['#00C897', '#00A878'] as [string, string]
            : ['#EF4444', '#DC2626'] as [string, string],
        },
      ];
    } else {
      const data = currentReport as CashFlowStatement;
      return [
        {
          id: 'operating-flow',
          title: '经营活动净流量',
          value: formatCurrency(data?.operating?.net_flow),
          icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
          gradient: (data?.operating?.net_flow || 0) >= 0
            ? ['#00C897', '#00A878'] as [string, string]
            : ['#EF4444', '#DC2626'] as [string, string],
        },
        {
          id: 'investing-flow',
          title: '投资活动净流量',
          value: formatCurrency(data?.investing?.net_flow),
          icon: <Briefcase sx={{ width: 24, height: 24 }} />,
          gradient: (data?.investing?.net_flow || 0) >= 0
            ? ['#00C897', '#00A878'] as [string, string]
            : ['#EF4444', '#DC2626'] as [string, string],
        },
        {
          id: 'financing-flow',
          title: '筹资活动净流量',
          value: formatCurrency(data?.financing?.net_flow),
          icon: <DollarSign sx={{ width: 24, height: 24 }} />,
          gradient: (data?.financing?.net_flow || 0) >= 0
            ? ['#00C897', '#00A878'] as [string, string]
            : ['#EF4444', '#DC2626'] as [string, string],
        },
        {
          id: 'cash-change',
          title: '现金净增加额',
          value: formatCurrency(data?.cash_equivalent_change),
          icon: <Wallet sx={{ width: 24, height: 24 }} />,
          gradient: (data?.cash_equivalent_change || 0) >= 0
            ? ['#00C897', '#00A878'] as [string, string]
            : ['#EF4444', '#DC2626'] as [string, string],
        },
      ];
    }
  }, [currentReport, reportType]);

  const tables = useMemo<DataTable[]>(() => {
    if (!currentReport) return [];

    if (reportType === 'balance_sheet') {
      const data = currentReport as BalanceSheet;
      const columns: TableColumn[] = [
        { id: 'item', label: '项目', field: 'item' },
        { id: 'amount', label: '金额', field: 'amount', align: 'right' },
      ];

      const tableData: any[] = [];
      if (data.assets?.current?.items) {
        tableData.push({ item: '流动资产', amount: formatCurrency(data.assets.current.total), isTotal: true });
        data.assets.current.items.forEach((item) => {
          tableData.push({ item: `  ${item.account_name}`, amount: formatCurrency(item.amount) });
        });
      }
      if (data.assets?.non_current?.items) {
        tableData.push({ item: '非流动资产', amount: formatCurrency(data.assets.non_current.total), isTotal: true });
        data.assets.non_current.items.forEach((item) => {
          tableData.push({ item: `  ${item.account_name}`, amount: formatCurrency(item.amount) });
        });
      }
      tableData.push({ item: '资产合计', amount: formatCurrency(data.assets?.total), isTotal: true, isGrandTotal: true });

      return [{
        id: 'balance-sheet-table',
        title: REPORT_TYPE_CONFIG[reportType].name,
        columns,
        data: tableData,
        loading,
      }];
    }

    if (reportType === 'income_statement') {
      const data = currentReport as IncomeStatement;
      const columns: TableColumn[] = [
        { id: 'item', label: '项目', field: 'item' },
        { id: 'amount', label: '金额', field: 'amount', align: 'right' },
      ];

      const tableData: any[] = [];
      if (data.revenue?.main_revenue?.items) {
        data.revenue.main_revenue.items.forEach((item) => {
          tableData.push({ item: `  ${item.account_name}`, amount: formatCurrency(item.amount) });
        });
      }
      tableData.push({ item: '营业收入合计', amount: formatCurrency(data.revenue?.total), isTotal: true });
      if (data.cost_of_sales?.main_cost?.items) {
        data.cost_of_sales.main_cost.items.forEach((item) => {
          tableData.push({ item: `  ${item.account_name}`, amount: formatCurrency(item.amount) });
        });
      }
      tableData.push({ item: '毛利润', amount: `${formatCurrency(data.gross_profit)} (${(data.gross_margin || 0).toFixed(2)}%)`, isTotal: true });
      tableData.push({ item: '净利润', amount: `${formatCurrency(data.net_profit)} (${(data.net_margin || 0).toFixed(2)}%)`, isTotal: true, isGrandTotal: true });

      return [{
        id: 'income-table',
        title: REPORT_TYPE_CONFIG[reportType].name,
        columns,
        data: tableData,
        loading,
      }];
    }

    return [];
  }, [currentReport, reportType, loading]);

  const loadReport = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    const params: ReportQueryParams = { company_id: companyId, period };

    try {
      switch (reportType) {
        case 'balance_sheet': {
          const response = await financeApi.report.getBalanceSheet(params);
          if (response.success && response.data) setBalanceSheetData(response.data);
          else setError(response.error?.message || '获取资产负债表失败');
          break;
        }
        case 'income_statement': {
          const response = await financeApi.report.getIncomeStatement(params);
          if (response.success && response.data) setIncomeStatementData(response.data);
          else setError(response.error?.message || '获取利润表失败');
          break;
        }
        case 'cash_flow': {
          const response = await financeApi.report.getCashFlowStatement(params);
          if (response.success && response.data) setCashFlowStatementData(response.data);
          else setError(response.error?.message || '获取现金流量表失败');
          break;
        }
      }
    } catch (err: unknown) {
      apiLogger.error('Load report failed:', err);
      setError('加载报表数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!companyId) return;

    const params: ReportQueryParams = { company_id: companyId, period };

    try {
      let blob: Blob;

      switch (reportType) {
        case 'balance_sheet':
          blob = await financeApi.report.exportBalanceSheet(params);
          break;
        case 'income_statement':
          blob = await financeApi.report.exportIncomeStatement(params);
          break;
        case 'cash_flow':
          blob = await financeApi.report.exportCashFlowStatement(params);
          break;
        default:
          return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${period}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      apiLogger.error('Export report failed:', err);
      setError('导出报表失败，请稍后重试');
    }
  };

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <TextField
        placeholder='输入公司ID'
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        size='small'
        sx={{ minWidth: 180 }}
        label='公司ID'
      />
      <TextField
        type='month'
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        size='small'
        label='会计期间'
        sx={{ minWidth: 160 }}
      />
      <Button variant='contained' onClick={loadReport} disabled={!companyId || loading}>
        {loading ? '加载中...' : '生成报表'}
      </Button>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {(['balance_sheet', 'income_statement', 'cash_flow'] as ReportType[]).map((type) => (
          <Button
            key={type}
            variant={reportType === type ? 'contained' : 'outlined'}
            onClick={() => setReportType(type)}
            size='small'
          >
            {REPORT_TYPE_CONFIG[type].name}
          </Button>
        ))}
      </Box>
    </Box>
  );

  return (
    <>
      <StatsPageTemplate
        title='财务报表'
        subtitle='查看和生成资产负债表、利润表、现金流量表'
        statCards={statCards}
        statColumns={4}
        charts={[]}
        tables={tables}
        loading={loading}
        onRefresh={loadReport}
        showExport={true}
        showRefresh={true}
        showTimeRange={false}
        showSearch={false}
        customToolbar={customToolbar}
        statCardDirection='row'
      />

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }} onClick={() => navigate('/finance/reports/comparison')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'blue.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 sx={{ width: 24, height: 24 }} />
              </Box>
              <Box>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>报表对比</Typography>
                <Typography variant='body2' color='text.secondary'>多期间、多公司对比分析</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }} onClick={() => navigate('/finance/reports/trend')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'green.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp sx={{ width: 24, height: 24 }} />
              </Box>
              <Box>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>趋势分析</Typography>
                <Typography variant='body2' color='text.secondary'>报表项目趋势变化</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }} onClick={() => navigate('/finance/reports/consolidated')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'purple.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 sx={{ width: 24, height: 24 }} />
              </Box>
              <Box>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>合并报表</Typography>
                <Typography variant='body2' color='text.secondary'>多公司报表合并</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}