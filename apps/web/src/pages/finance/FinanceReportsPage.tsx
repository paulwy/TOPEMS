import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ChevronLeft,
  Calendar,
  Building2,
  Clock,
  FileText,
  Wallet,
  Activity,
  Download,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  financeReportApi,
  type BusinessOverview,
  type ProjectFinancialSummary,
  type MonthlyTrend,
  type DepartmentFinancialSummary,
  type AgingAnalysis,
  type CashFlowAnalysis,
  type ExpenseAnalysis,
  type ProfitAnalysis,
  type FinancialOverview,
} from '@/api/erp';
import { financeApi } from '@/api/finance';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
} from '@/types/finance';
import { useAppStore } from '../../store';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  LinearProgress,
  Paper,
  Alert,
} from '@mui/material';
import { Button } from '@mui/material';
import OrganizationFilter, {
  type OrganizationFilterValue,
} from '@/components/ui/OrganizationFilter';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import RechartsPieChart from '@/components/charts/PieChart';
import { formatCurrency, formatPercent } from '@/components/charts/CustomTooltip';
import { StatCardGroup } from '@/components/mui';
import { apiLogger } from '@/utils/logger';

const FinanceReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const exportToCSV = (data: any[], fileName: string) => {
    try {
      if (!data || data.length === 0) {
        addNotification({
          title: '提示',
          message: '没有数据可导出',
          type: 'warning',
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification({
        title: '导出成功',
        message: '数据已成功导出为CSV文件',
        type: 'success',
      });
    } catch (error: unknown) {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
        type: 'error',
      });
    }
  };

  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<string>('');
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});

  const [businessOverview, setBusinessOverview] = useState<BusinessOverview | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [cashFlowStatement, setCashFlowStatement] = useState<CashFlowStatement | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<ProjectFinancialSummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentFinancialSummary[]>([]);
  const [agingAnalysis, setAgingAnalysis] = useState<AgingAnalysis[]>([]);
  const [voucherStats, setVoucherStats] = useState<Record<string, any> | null>(null);
  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis | null>(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState<ExpenseAnalysis | null>(null);
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis | null>(null);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const [overview, projects, trends, departments, aging, voucher, cashFlowAnalysisData, expenseAnalysisData, profitAnalysisData, financialOverviewData] = await Promise.all([
        financeReportApi.businessOverview(period ? { period } : undefined),
        financeReportApi.projectSummary(),
        financeReportApi.monthlyTrend(),
        financeReportApi.departmentSummary(),
        financeReportApi.agingAnalysis(),
        financeReportApi.voucherStatistics(period ? { period } : undefined),
        financeReportApi.cashFlowAnalysis(period ? { period } : undefined),
        financeReportApi.expenseAnalysis(period ? { period } : undefined),
        financeReportApi.profitAnalysis(period ? { period } : undefined),
        financeReportApi.financialOverview(period ? { period } : undefined),
      ]);

      if (overview.success && overview.data) setBusinessOverview(overview.data);
      if (projects.success && projects.data) setProjectSummaries(projects.data);
      if (trends.success && trends.data) setMonthlyTrends(trends.data);
      if (departments.success && departments.data) setDepartmentSummaries(departments.data);
      if (aging.success && aging.data) setAgingAnalysis(aging.data);
      if (voucher.success && voucher.data) setVoucherStats(voucher.data);
      if (cashFlowAnalysisData.success && cashFlowAnalysisData.data)
        setCashFlowAnalysis(cashFlowAnalysisData.data);
      if (expenseAnalysisData.success && expenseAnalysisData.data)
        setExpenseAnalysis(expenseAnalysisData.data);
      if (profitAnalysisData.success && profitAnalysisData.data)
        setProfitAnalysis(profitAnalysisData.data);
      if (financialOverviewData.success && financialOverviewData.data)
        setFinancialOverview(financialOverviewData.data);

      if (period) {
        const companyId = organizationFilter.companyId || '';
        const reportParams: ReportQueryParams = {
          company_id: companyId,
          period,
        };

        const [balanceResponse, incomeResponse, cashFlowResponse] = await Promise.all([
          financeApi.report.getBalanceSheet(reportParams),
          financeApi.report.getIncomeStatement(reportParams),
          financeApi.report.getCashFlowStatement(reportParams),
        ]);

        if (balanceResponse.success && balanceResponse.data) setBalanceSheet(balanceResponse.data);
        if (incomeResponse.success && incomeResponse.data) setIncomeStatement(incomeResponse.data);
        if (cashFlowResponse.success && cashFlowResponse.data) setCashFlowStatement(cashFlowResponse.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载报表失败:', err);
      setError('加载报表数据失败，请稍后重试');
      addNotification({
        title: '错误',
        message: '加载报表数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyLocal = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercentLocal = (value: number) => `${value.toFixed(2)}%`;

  const KeyRatioCard: React.FC<{
    title: string;
    ratio: number;
    target?: number;
  }> = ({ title, ratio, target }) => (
    <Card sx={{ background: 'linear-gradient(135deg, #e0e7ff 0%, grey.100 100%)' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant='body2' color='text.secondary'>
          {title}
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 'bold', color: 'primary.light', mt: 0.5 }}>
          {formatPercentLocal(ratio)}
        </Typography>
        {target && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
            目标: {formatPercentLocal(target)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const ProjectCard: React.FC<{ project: ProjectFinancialSummary }> = ({ project }) => (
    <Card sx={{ '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {project.project_name}
          </Typography>
          <Chip
            label={project.status}
            size='small'
            color={project.status === '进行中' ? 'primary' : 'default'}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box>
            <Typography variant='caption' color='text.secondary'>
              合同金额
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold', color: 'primary.light' }}>
              {formatCurrencyLocal(project.contract_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' color='text.secondary'>
              已收款
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold', color: 'success.dark' }}>
              {formatCurrencyLocal(project.received_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' color='text.secondary'>
              应付金额
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold', color: '#ea580c' }}>
              {formatCurrencyLocal(project.payable_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant='caption' color='text.secondary'>
              已付款
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold', color: 'error.dark' }}>
              {formatCurrencyLocal(project.paid_amount)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant='body2' color='text.secondary'>
              项目利润
            </Typography>
            <Typography
              variant='body1'
              sx={{
                fontWeight: 'bold',
                color: project.profit >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {formatCurrencyLocal(project.profit)}
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant='body2' color='text.secondary'>
                利润率
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, color: 'primary.light' }}>
                {formatPercentLocal(project.margin)}
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={Math.min(project.margin, 100)}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor:
                    project.margin >= 20
                      ? 'success.main'
                      : project.margin >= 10
                        ? 'warning.main'
                        : 'error.main',
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const DepartmentCard: React.FC<{ dept: DepartmentFinancialSummary }> = ({ dept }) => (
    <Card sx={{ '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {dept.department_name}
          </Typography>
          <Chip
            label={dept.budget_usage >= 90 ? '预算紧张' : '正常'}
            size='small'
            color={dept.budget_usage >= 90 ? 'error' : 'primary'}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant='body2' color='text.secondary'>
              总费用
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold', color: 'primary.light' }}>
              {formatCurrencyLocal(dept.total_expenses)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant='body2' color='text.secondary'>
              预算金额
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
              {formatCurrencyLocal(dept.budget_amount)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant='body2' color='text.secondary'>
              费用笔数
            </Typography>
            <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
              {dept.expense_count}笔
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant='body2' color='text.secondary'>
                预算使用率
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  color: dept.budget_usage >= 90 ? 'error.main' : 'success.main',
                }}
              >
                {formatPercentLocal(dept.budget_usage)}
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={Math.min(dept.budget_usage, 100)}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor:
                    dept.budget_usage >= 90
                      ? 'error.main'
                      : dept.budget_usage >= 70
                        ? 'warning.main'
                        : 'success.main',
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const tabLabels = [
    { label: '经营概览', icon: PieChart },
    { label: '资产负债表', icon: DollarSign },
    { label: '利润表', icon: TrendingUp },
    { label: '现金流量表', icon: BarChart3 },
    { label: '项目财务', icon: PieChart },
    { label: '部门财务', icon: Building2 },
    { label: '账龄分析', icon: Clock },
    { label: '凭证统计', icon: FileText },
    { label: '现金流分析', icon: Activity },
    { label: '费用分析', icon: Wallet },
    { label: '利润分析', icon: TrendingUp },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate('/dashboard')}>
                <ChevronLeft size={20} />
              </IconButton>
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <BarChart3
                    size={28}
                    style={{ marginRight: 12, color: 'primary.light' }}
                  />
                  财务报表分析
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  企业经营状况与项目财务汇总分析
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={16} style={{ color: 'text.disabled' }} />
                <FormControl size='small' sx={{ minWidth: 144 }}>
                  <InputLabel>选择期间</InputLabel>
                  <Select
                    value={period}
                    label='选择期间'
                    onChange={(e) => setPeriod(e.target.value)}
                  >
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
            </Box>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 2 }}>
            <OrganizationFilter
              value={organizationFilter}
              onChange={setOrganizationFilter}
              showCompany={true}
              showDepartment={true}
              showEmployee={false}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <Card>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            {tabLabels.map((tab, index) => (
              <Tab
                key={index}
                icon={<tab.icon size={16} />}
                iconPosition='start'
                label={tab.label}
              />
            ))}
          </Tabs>
        </Card>

        {error && (
          <Box sx={{ mt: 3 }}>
            <Card>
              <CardContent>
                <Alert severity='error'>{error}</Alert>
              </CardContent>
            </Card>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          {activeTab === 0 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              businessOverview && (
                <>
                  <StatCardGroup
                    stats={[
                      {
                        title: '总资产',
                        value: formatCurrencyLocal(businessOverview.total_assets),
                        change: 5.2,
                        icon: <DollarSign size={20} />,
                        color: 'primary',
                      },
                      {
                        title: '总负债',
                        value: formatCurrencyLocal(businessOverview.total_liabilities),
                        change: -2.1,
                        icon: <TrendingDown size={20} />,
                        color: 'warning',
                      },
                      {
                        title: '总收入',
                        value: formatCurrencyLocal(businessOverview.total_revenue),
                        change: 12.5,
                        icon: <TrendingUp size={20} />,
                        color: 'success',
                      },
                      {
                        title: '净利润',
                        value: formatCurrencyLocal(businessOverview.net_profit),
                        change: 18.3,
                        icon: <TrendingUp size={20} />,
                        color: 'info',
                      },
                    ]}
                    columns={4}
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                      gap: 3,
                      mb: 3,
                    }}
                  >
                    <Card>
                      <CardHeader
                        title={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LineChartIcon
                                size={20}
                                style={{ marginRight: 8, color: 'primary.light' }}
                              />
                              <Typography variant='h6'>月度趋势分析</Typography>
                            </Box>
                            <Button
                              variant='outlined'
                              size='small'
                              startIcon={<Download size={16} />}
                              onClick={() => exportToCSV(monthlyTrends, 'monthly-trend')}
                            >
                              导出
                            </Button>
                          </Box>
                        }
                      />
                      <CardContent>
                        <LineChart
                          data={monthlyTrends}
                          xKey='month'
                          yKeys={[
                            { key: 'revenue', name: '收入', color: 'success.dark' },
                            { key: 'expenses', name: '费用', color: 'error.main' },
                            { key: 'profit', name: '利润', color: 'primary.main' },
                          ]}
                          height={280}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PieChart
                              size={20}
                              style={{ marginRight: 8, color: 'primary.light' }}
                            />
                            <Typography variant='h6'>关键财务指标</Typography>
                          </Box>
                        }
                      />
                      <CardContent
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        {businessOverview.key_ratios && (
                          <>
                            <KeyRatioCard
                              title='流动比率'
                              ratio={businessOverview.key_ratios.current_ratio}
                              target={2.0}
                            />
                            <KeyRatioCard
                              title='资产负债率'
                              ratio={businessOverview.key_ratios.debt_ratio}
                              target={40.0}
                            />
                            <KeyRatioCard
                              title='净资产收益率'
                              ratio={businessOverview.key_ratios.return_on_equity}
                              target={15.0}
                            />
                            <KeyRatioCard
                              title='利润率'
                              ratio={businessOverview.key_ratios.profit_margin}
                              target={20.0}
                            />
                            <KeyRatioCard
                              title='总资产收益率'
                              ratio={businessOverview.key_ratios.return_on_assets}
                              target={10.0}
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Box>

                  <Card>
                    <CardHeader
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DollarSign
                            size={20}
                            style={{ marginRight: 8, color: 'primary.light' }}
                          />
                          <Typography variant='h6'>财务摘要</Typography>
                        </Box>
                      }
                    />
                    <CardContent>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            md: 'repeat(6, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            所有者权益
                          </Typography>
                          <Typography
                            variant='h6'
                            sx={{
                              fontWeight: 'bold',
                              color: 'primary.light',
                              mt: 0.5,
                            }}
                          >
                            {formatCurrencyLocal(businessOverview.total_equity)}
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            总费用
                          </Typography>
                          <Typography
                            variant='h6'
                            sx={{
                              fontWeight: 'bold',
                              color: '#ea580c',
                              mt: 0.5,
                            }}
                          >
                            {formatCurrencyLocal(businessOverview.total_expenses)}
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            现金流量
                          </Typography>
                          <Typography
                            variant='h6'
                            sx={{
                              fontWeight: 'bold',
                              color: 'success.dark',
                              mt: 0.5,
                            }}
                          >
                            {formatCurrencyLocal(businessOverview.cash_flow)}
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            应收账款周转
                          </Typography>
                          <Typography
                            variant='h6'
                            sx={{
                              fontWeight: 'bold',
                              color: 'primary.dark',
                              mt: 0.5,
                            }}
                          >
                            {businessOverview.receivable_turnover.toFixed(2)}次
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            存货周转
                          </Typography>
                          <Typography
                            variant='h6'
                            sx={{
                              fontWeight: 'bold',
                              color: '#9333ea',
                              mt: 0.5,
                            }}
                          >
                            {businessOverview.inventory_turnover.toFixed(2)}次
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Typography variant='body2' color='text.secondary'>
                            报告期间
                          </Typography>
                          <Typography variant='h6' sx={{ fontWeight: 'bold', mt: 0.5 }}>
                            {businessOverview.period}
                          </Typography>
                        </Paper>
                      </Box>
                    </CardContent>
                  </Card>
                </>
              )
            ))}

          {activeTab === 1 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : balanceSheet ? (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DollarSign
                        size={20}
                        style={{ marginRight: 8, color: 'primary.light' }}
                      />
                      <Typography variant='h6'>资产负债表</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        资产
                      </Typography>
                      <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 1 }}>
                        流动资产
                      </Typography>
                      {balanceSheet.assets?.current?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography sx={{ fontWeight: 500 }}>流动资产合计</Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {formatCurrencyLocal(balanceSheet.assets?.current?.total || 0)}
                        </Typography>
                      </Box>
                      <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        非流动资产
                      </Typography>
                      {balanceSheet.assets?.non_current?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 2,
                          fontWeight: 700,
                          mt: 2,
                          borderTop: 2,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography>资产合计</Typography>
                        <Typography>{formatCurrencyLocal(balanceSheet.assets?.total || 0)}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        负债和所有者权益
                      </Typography>
                      <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 1 }}>
                        流动负债
                      </Typography>
                      {balanceSheet.liabilities?.current?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        非流动负债
                      </Typography>
                      {balanceSheet.liabilities?.non_current?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography sx={{ fontWeight: 500 }}>负债合计</Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {formatCurrencyLocal(balanceSheet.liabilities?.total || 0)}
                        </Typography>
                      </Box>
                      <Typography variant='subtitle1' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        所有者权益
                      </Typography>
                      {balanceSheet.equity?.paid_in?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      {balanceSheet.equity?.reserves?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      {balanceSheet.equity?.retained_earnings?.items?.map((item) => (
                        <Box
                          key={item.account_code}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.account_name}</Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 2,
                          fontWeight: 700,
                          mt: 2,
                          borderTop: 2,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography>负债和所有者权益合计</Typography>
                        <Typography>
                          {formatCurrencyLocal(balanceSheet.total_liabilities_equity || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <FileText size={48} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  暂无资产负债表数据，请选择期间后刷新
                </Typography>
              </Box>
            ))}

          {activeTab === 2 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : incomeStatement ? (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp
                        size={20}
                        style={{ marginRight: 8, color: 'success.dark' }}
                      />
                      <Typography variant='h6'>利润表</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 500 }}>
                      营业收入
                    </Typography>
                    {incomeStatement.revenue?.main_revenue?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.revenue?.other_revenue?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography sx={{ fontWeight: 500 }}>营业收入合计</Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {formatCurrencyLocal(incomeStatement.revenue?.total || 0)}
                      </Typography>
                    </Box>

                    <Typography variant='subtitle1' sx={{ fontWeight: 500, mt: 2 }}>
                      营业成本
                    </Typography>
                    {incomeStatement.cost_of_sales?.main_cost?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          -{formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.cost_of_sales?.other_cost?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          -{formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        mt: 2,
                        borderTop: 2,
                        borderColor: 'divider',
                        bgcolor: 'blue.50',
                        px: 2,
                        borderRadius: 1,
                      }}
                    >
                      <Typography>毛利润</Typography>
                      <Typography sx={{ color: incomeStatement.gross_profit >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCurrencyLocal(incomeStatement.gross_profit || 0)} ({(incomeStatement.gross_margin || 0).toFixed(2)}%)
                      </Typography>
                    </Box>

                    <Typography variant='subtitle1' sx={{ fontWeight: 500, mt: 2 }}>
                      期间费用
                    </Typography>
                    {incomeStatement.operating_expenses?.selling_expense?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.operating_expenses?.administrative_expense?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.operating_expenses?.rd_expense?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.operating_expenses?.financial_expense?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        borderTop: 2,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>期间费用合计</Typography>
                      <Typography sx={{ color: 'error.main' }}>
                        {formatCurrencyLocal(incomeStatement.operating_expenses?.total || 0)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        borderTop: 2,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>营业利润</Typography>
                      <Typography sx={{ color: incomeStatement.operating_profit >= 0 ? 'success.main' : 'error.main' }}>
                        {formatCurrencyLocal(incomeStatement.operating_profit || 0)} ({(incomeStatement.operating_margin || 0).toFixed(2)}%)
                      </Typography>
                    </Box>

                    <Typography variant='subtitle1' sx={{ fontWeight: 500, mt: 2 }}>
                      营业外收支
                    </Typography>
                    {incomeStatement.non_operating?.income?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'success.main' }}>
                          {formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                    {incomeStatement.non_operating?.expenses?.items?.map((item) => (
                      <Box
                        key={item.account_code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          pl: 2,
                        }}
                      >
                        <Typography variant='body2'>{item.account_name}</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500, color: 'error.main' }}>
                          -{formatCurrencyLocal(item.amount)}
                        </Typography>
                      </Box>
                    ))}

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        borderTop: 2,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>利润总额</Typography>
                      <Typography>{formatCurrencyLocal(incomeStatement.total_profit || 0)}</Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        borderTop: 2,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>所得税</Typography>
                      <Typography sx={{ color: 'error.main' }}>
                        -{formatCurrencyLocal(incomeStatement.income_tax || 0)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        borderTop: 2,
                        borderColor: 'divider',
                        bgcolor: 'green.50',
                        px: 2,
                        borderRadius: 1,
                      }}
                    >
                      <Typography>净利润</Typography>
                      <Typography
                        sx={{
                          color: incomeStatement.net_profit >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {formatCurrencyLocal(incomeStatement.net_profit || 0)} ({(incomeStatement.net_margin || 0).toFixed(2)}%)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <FileText size={48} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  暂无利润表数据，请选择期间后刷新
                </Typography>
              </Box>
            ))}

          {activeTab === 3 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : cashFlowStatement ? (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BarChart3
                        size={20}
                        style={{ marginRight: 8, color: 'primary.light' }}
                      />
                      <Typography variant='h6'>现金流量表</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        经营活动现金流量
                      </Typography>
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1 }}>
                        流入
                      </Typography>
                      {cashFlowStatement.operating?.inflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'success.main' }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography sx={{ fontWeight: 500 }}>经营活动流入小计</Typography>
                        <Typography sx={{ fontWeight: 500, color: 'success.main' }}>
                          {formatCurrencyLocal(cashFlowStatement.operating?.inflows?.total || 0)}
                        </Typography>
                      </Box>
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        流出
                      </Typography>
                      {cashFlowStatement.operating?.outflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'error.main' }}>
                            -{formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography sx={{ fontWeight: 500 }}>经营活动流出小计</Typography>
                        <Typography sx={{ fontWeight: 500, color: 'error.main' }}>
                          -{formatCurrencyLocal(cashFlowStatement.operating?.outflows?.total || 0)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          fontWeight: 700,
                          bgcolor: 'green.50',
                          px: 2,
                          borderRadius: 1,
                          mt: 1,
                        }}
                      >
                        <Typography>经营活动净流量</Typography>
                        <Typography sx={{ color: (cashFlowStatement.operating?.net_flow || 0) >= 0 ? 'success.main' : 'error.main' }}>
                          {formatCurrencyLocal(cashFlowStatement.operating?.net_flow || 0)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        投资活动现金流量
                      </Typography>
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1 }}>
                        流入
                      </Typography>
                      {cashFlowStatement.investing?.inflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'success.main' }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        流出
                      </Typography>
                      {cashFlowStatement.investing?.outflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'error.main' }}>
                            -{formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          fontWeight: 700,
                          bgcolor: 'blue.50',
                          px: 2,
                          borderRadius: 1,
                          mt: 1,
                        }}
                      >
                        <Typography>投资活动净流量</Typography>
                        <Typography sx={{ color: (cashFlowStatement.investing?.net_flow || 0) >= 0 ? 'success.main' : 'error.main' }}>
                          {formatCurrencyLocal(cashFlowStatement.investing?.net_flow || 0)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
                        筹资活动现金流量
                      </Typography>
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1 }}>
                        流入
                      </Typography>
                      {cashFlowStatement.financing?.inflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'success.main' }}>
                            {formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant='subtitle2' sx={{ fontWeight: 500, mb: 1, mt: 2 }}>
                        流出
                      </Typography>
                      {cashFlowStatement.financing?.outflows?.items?.map((item) => (
                        <Box
                          key={item.description}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: 1,
                            borderColor: 'divider',
                            pl: 2,
                          }}
                        >
                          <Typography variant='body2'>{item.description}</Typography>
                          <Typography variant='body2' sx={{ color: 'error.main' }}>
                            -{formatCurrencyLocal(item.amount)}
                          </Typography>
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          fontWeight: 700,
                          bgcolor: 'purple.50',
                          px: 2,
                          borderRadius: 1,
                          mt: 1,
                        }}
                      >
                        <Typography>筹资活动净流量</Typography>
                        <Typography sx={{ color: (cashFlowStatement.financing?.net_flow || 0) >= 0 ? 'success.main' : 'error.main' }}>
                          {formatCurrencyLocal(cashFlowStatement.financing?.net_flow || 0)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        fontWeight: 700,
                        mt: 2,
                        borderTop: 2,
                        borderColor: 'divider',
                        bgcolor: 'grey.100',
                        px: 2,
                        borderRadius: 1,
                      }}
                    >
                      <Typography>现金及现金等价物净增加额</Typography>
                      <Typography
                        sx={{
                          color: (cashFlowStatement.cash_equivalent_change || 0) >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {formatCurrencyLocal(cashFlowStatement.cash_equivalent_change || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, color: 'grey.600' }}>
                      <Typography variant='body2'>期初现金及现金等价物余额</Typography>
                      <Typography variant='body2'>{formatCurrencyLocal(cashFlowStatement.beginning_cash || 0)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, color: 'grey.600' }}>
                      <Typography variant='body2'>期末现金及现金等价物余额</Typography>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>{formatCurrencyLocal(cashFlowStatement.ending_cash || 0)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <FileText size={48} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  暂无现金流量表数据，请选择期间后刷新
                </Typography>
              </Box>
            ))}

          {activeTab === 4 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
                  项目财务汇总
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {projectSummaries.map((project) => (
                    <ProjectCard key={project.project_id} project={project} />
                  ))}
                </Box>
              </Box>
            ))}

          {activeTab === 5 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
                  部门财务汇总
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {departmentSummaries.map((dept) => (
                    <DepartmentCard key={dept.department_id} dept={dept} />
                  ))}
                </Box>
              </Box>
            ))}

          {activeTab === 6 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Clock
                        size={20}
                        style={{ marginRight: 8, color: 'primary.light' }}
                      />
                      <Typography variant='h6'>账龄分析</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {agingAnalysis.length > 0 ? (
                    <RechartsPieChart
                      data={agingAnalysis.map((item) => ({
                        name: item.category,
                        value: item.total,
                      }))}
                    />
                  ) : (
                    <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center' }}>
                      暂无账龄分析数据
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}

          {activeTab >= 7 &&
            (loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant='body1' color='text.secondary'>
                  该标签页内容正在开发中，详细实现请查看源代码
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
};

export default FinanceReportsPage;