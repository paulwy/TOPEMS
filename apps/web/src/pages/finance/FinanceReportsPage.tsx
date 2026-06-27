import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Calendar, Building2, Clock, FileText, Wallet, Activity, Download, RefreshCw } from 'lucide-react';
import { financeReportApi, type BusinessOverview, type MonthlyTrend, type ProjectFinancialSummary, type DepartmentFinancialSummary } from '@/api/erp';
import { useAppStore } from '@/store';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, Chip, Alert } from '@mui/material';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';

const FinanceReportsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [period, setPeriod] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  const [businessOverview, setBusinessOverview] = useState<BusinessOverview | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<ProjectFinancialSummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentFinancialSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overview, projects, trends, departments] = await Promise.all([
        financeReportApi.businessOverview(period ? { period } : undefined),
        financeReportApi.projectSummary(),
        financeReportApi.monthlyTrend(),
        financeReportApi.departmentSummary(),
      ]);

      if (overview.success && overview.data) setBusinessOverview(overview.data);
      if (projects.success && projects.data) setProjectSummaries(projects.data);
      if (trends.success && trends.data) setMonthlyTrends(trends.data);
      if (departments.success && departments.data) setDepartmentSummaries(departments.data);
    } catch (err: unknown) {
      apiLogger.error('加载报表失败:', err);
      setError('加载报表数据失败，请稍后重试');
      addNotification({ title: '错误', message: '加载报表数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const statCards = useMemo<StatCard[]>(() => {
    if (!businessOverview) return [];

    return [
      {
        id: 'total-assets',
        title: '总资产',
        value: formatCurrency(businessOverview.total_assets),
        icon: <DollarSign sx={{ width: 24, height: 24 }} />,
        gradient: ['#1976D2', '#1565C0'] as [string, string],
      },
      {
        id: 'total-liabilities',
        title: '总负债',
        value: formatCurrency(businessOverview.total_liabilities),
        icon: <TrendingDown sx={{ width: 24, height: 24 }} />,
        gradient: ['#F59E0B', '#D97706'] as [string, string],
      },
      {
        id: 'total-revenue',
        title: '总收入',
        value: formatCurrency(businessOverview.total_revenue),
        icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
        gradient: ['#00C897', '#00A878'] as [string, string],
      },
      {
        id: 'net-profit',
        title: '净利润',
        value: formatCurrency(businessOverview.net_profit),
        icon: <Wallet sx={{ width: 24, height: 24 }} />,
        gradient: businessOverview.net_profit >= 0
          ? ['#00C897', '#00A878'] as [string, string]
          : ['#EF4444', '#DC2626'] as [string, string],
      },
    ];
  }, [businessOverview]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (!monthlyTrends.length) return [];

    return [
      {
        id: 'monthly-trend',
        title: '月度趋势分析',
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
        { id: 'project_name', label: '项目名称', field: 'project_name' },
        { id: 'contract_amount', label: '合同金额', field: 'contract_amount', align: 'right' },
        { id: 'received_amount', label: '已收款', field: 'received_amount', align: 'right' },
        { id: 'payable_amount', label: '应付金额', field: 'payable_amount', align: 'right' },
        { id: 'paid_amount', label: '已付款', field: 'paid_amount', align: 'right' },
        { id: 'profit', label: '项目利润', field: 'profit', align: 'right' },
        { id: 'margin', label: '利润率(%)', field: 'margin', align: 'center' },
        { id: 'status', label: '状态', field: 'status', align: 'center' },
      ];

      return [{
        id: 'project-table',
        title: '项目财务汇总',
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
      }];
    }

    if (activeTab === 'departments') {
      const columns: TableColumn[] = [
        { id: 'department_name', label: '部门名称', field: 'department_name' },
        { id: 'total_expenses', label: '总费用', field: 'total_expenses', align: 'right' },
        { id: 'budget_amount', label: '预算金额', field: 'budget_amount', align: 'right' },
        { id: 'expense_count', label: '费用笔数', field: 'expense_count', align: 'center' },
        { id: 'budget_usage', label: '预算使用率(%)', field: 'budget_usage', align: 'center' },
      ];

      return [{
        id: 'department-table',
        title: '部门财务汇总',
        columns,
        data: departmentSummaries.map((d) => ({
          department_name: d.department_name,
          total_expenses: formatCurrency(d.total_expenses),
          budget_amount: formatCurrency(d.budget_amount),
          expense_count: d.expense_count,
          budget_usage: d.budget_usage.toFixed(2),
        })),
        loading,
      }];
    }

    return [];
  }, [activeTab, projectSummaries, departmentSummaries, loading]);

  const tabs = [
    { label: '经营概览', value: 'overview', icon: <PieChart sx={{ width: 16, height: 16 }} /> },
    { label: '项目财务', value: 'projects', icon: <PieChart sx={{ width: 16, height: 16 }} /> },
    { label: '部门财务', value: 'departments', icon: <Building2 sx={{ width: 16, height: 16 }} /> },
    { label: '账龄分析', value: 'aging', icon: <Clock sx={{ width: 16, height: 16 }} /> },
    { label: '凭证统计', value: 'voucher', icon: <FileText sx={{ width: 16, height: 16 }} /> },
    { label: '现金流分析', value: 'cashflow', icon: <Activity sx={{ width: 16, height: 16 }} /> },
    { label: '费用分析', value: 'expense', icon: <Wallet sx={{ width: 16, height: 16 }} /> },
    { label: '利润分析', value: 'profit', icon: <TrendingUp sx={{ width: 16, height: 16 }} /> },
  ];

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Calendar size={16} style={{ color: 'text.disabled' }} />
        <FormControl size='small' sx={{ minWidth: 144 }}>
          <InputLabel>选择期间</InputLabel>
          <Select value={period} label='选择期间' onChange={(e) => setPeriod(e.target.value)}>
            <MenuItem value=''>全部期间</MenuItem>
            <MenuItem value='2024-01'>2024年01月</MenuItem>
            <MenuItem value='2024-02'>2024年02月</MenuItem>
            <MenuItem value='2024-03'>2024年03月</MenuItem>
            <MenuItem value='2024-04'>2024年04月</MenuItem>
            <MenuItem value='2024-05'>2024年05月</MenuItem>
            <MenuItem value='2024-06'>2024年06月</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Button variant='outlined' size='small' startIcon={<Download size={16} />}>导出</Button>
    </Box>
  );

  return (
    <PageContainer maxWidth='xl'>
      <StatsPageTemplate
        title='财务报表分析'
        subtitle='企业经营状况与项目财务汇总分析'
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, lg: 2 }}
        tables={tables}
        loading={loading}
        onRefresh={loadReports}
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