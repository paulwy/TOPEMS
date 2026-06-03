import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  ChevronLeft, Calendar, ArrowUpRight, ArrowDownRight, Building2,
  Clock, FileText, Users, CreditCard, Wallet, Activity, Target,
  TrendingFlat, RefreshCw, Layers, PiggyBank, TrendingUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  financeReportApi, 
  type BusinessOverview, 
  type BalanceSheet, 
  type IncomeStatement, 
  type CashFlowStatement, 
  type ProjectFinancialSummary, 
  type MonthlyTrend, 
  type KeyRatios,
  type DepartmentFinancialSummary,
  type AgingAnalysis,
  type CashFlowAnalysis,
  type ExpenseAnalysis,
  type ProfitAnalysis,
  type FinancialOverview
} from '../api/erp';
import { useAppStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const FinanceReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [period, setPeriod] = useState<string>('');
  
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

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [overview, balance, income, cashFlow, projects, trends, departments, aging, voucher, cashFlowAnalysisData, expenseAnalysisData, profitAnalysisData, financialOverviewData] = await Promise.all([
        financeReportApi.businessOverview(period ? { period } : undefined),
        financeReportApi.balanceSheet(period ? { period } : undefined),
        financeReportApi.incomeStatement(period ? { period } : undefined),
        financeReportApi.cashFlowStatement(period ? { period } : undefined),
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
      if (balance.success && balance.data) setBalanceSheet(balance.data);
      if (income.success && income.data) setIncomeStatement(income.data);
      if (cashFlow.success && cashFlow.data) setCashFlowStatement(cashFlow.data);
      if (projects.success && projects.data) setProjectSummaries(projects.data);
      if (trends.success && trends.data) setMonthlyTrends(trends.data);
      if (departments.success && departments.data) setDepartmentSummaries(departments.data);
      if (aging.success && aging.data) setAgingAnalysis(aging.data);
      if (voucher.success && voucher.data) setVoucherStats(voucher.data);
      if (cashFlowAnalysisData.success && cashFlowAnalysisData.data) setCashFlowAnalysis(cashFlowAnalysisData.data);
      if (expenseAnalysisData.success && expenseAnalysisData.data) setExpenseAnalysis(expenseAnalysisData.data);
      if (profitAnalysisData.success && profitAnalysisData.data) setProfitAnalysis(profitAnalysisData.data);
      if (financialOverviewData.success && financialOverviewData.data) setFinancialOverview(financialOverviewData.data);
    } catch (err) {
      console.error('加载报表失败:', err);
      addNotification({ title: '错误', message: '加载报表数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const StatCard: React.FC<{ title: string; value: string; change?: number; icon: React.ReactNode; color: string }> = ({ title, value, change, icon, color }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}${color.includes('green') ? '/10' : color.includes('red') ? '/10' : '/20'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const KeyRatioCard: React.FC<{ title: string; ratio: number; target?: number }> = ({ title, ratio, target }) => (
    <Card className="bg-gradient-to-br from-indigo-50 to-slate-50">
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">{formatPercent(ratio)}</p>
        {target && (
          <p className="text-xs text-slate-400 mt-1">目标: {formatPercent(target)}</p>
        )}
      </CardContent>
    </Card>
  );

  const ProjectCard: React.FC<{ project: ProjectFinancialSummary }> = ({ project }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{project.project_name}</h3>
          <Badge variant={project.status === '进行中' ? 'secondary' : 'default'}>
            {project.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">合同金额</p>
            <p className="font-bold text-indigo-600">{formatCurrency(project.contract_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">已收款</p>
            <p className="font-bold text-green-600">{formatCurrency(project.received_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">应付金额</p>
            <p className="font-bold text-orange-600">{formatCurrency(project.payable_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">已付款</p>
            <p className="font-bold text-red-600">{formatCurrency(project.paid_amount)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">项目利润</span>
            <span className={`font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(project.profit)}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">利润率</span>
              <span className="font-semibold text-indigo-600">{formatPercent(project.margin)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full ${project.margin >= 20 ? 'bg-green-500' : project.margin >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(project.margin, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DepartmentCard: React.FC<{ dept: DepartmentFinancialSummary }> = ({ dept }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{dept.department_name}</h3>
          <Badge variant={dept.budget_usage >= 90 ? 'default' : 'secondary'}>
            {dept.budget_usage >= 90 ? '预算紧张' : '正常'}
          </Badge>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">总费用</span>
            <span className="font-bold text-indigo-600">{formatCurrency(dept.total_expenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">预算金额</span>
            <span className="font-bold text-slate-700">{formatCurrency(dept.budget_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">费用笔数</span>
            <span className="font-bold text-slate-700">{dept.expense_count}笔</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">预算使用率</span>
              <span className={`font-semibold ${dept.budget_usage >= 90 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercent(dept.budget_usage)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full ${dept.budget_usage >= 90 ? 'bg-red-500' : dept.budget_usage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(dept.budget_usage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <BarChart3 className="w-7 h-7 mr-3 text-indigo-600" />
                  财务报表分析
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  企业经营状况与项目财务汇总分析
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="选择期间" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部期间</SelectItem>
                    <SelectItem value="2024-01">2024年01月</SelectItem>
                    <SelectItem value="2024-02">2024年02月</SelectItem>
                    <SelectItem value="2024-03">2024年03月</SelectItem>
                    <SelectItem value="2024-04">2024年04月</SelectItem>
                    <SelectItem value="2024-05">2024年05月</SelectItem>
                    <SelectItem value="2024-06">2024年06月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span>经营概览</span>
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>资产负债表</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>利润表</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>现金流量表</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span>项目财务</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>部门财务</span>
            </TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>账龄分析</span>
            </TabsTrigger>
            <TabsTrigger value="voucher" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>凭证统计</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow-analysis" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>现金流分析</span>
            </TabsTrigger>
            <TabsTrigger value="expense" className="flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>费用分析</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center space-x-2">
              <TrendingUpDown className="w-4 h-4" />
              <span>利润分析</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : businessOverview && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="总资产"
                    value={formatCurrency(businessOverview.total_assets)}
                    change={5.2}
                    icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
                    color="text-indigo-600"
                  />
                  <StatCard
                    title="总负债"
                    value={formatCurrency(businessOverview.total_liabilities)}
                    change={-2.1}
                    icon={<TrendingDown className="w-5 h-5 text-orange-600" />}
                    color="text-orange-600"
                  />
                  <StatCard
                    title="总收入"
                    value={formatCurrency(businessOverview.total_revenue)}
                    change={12.5}
                    icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                    color="text-green-600"
                  />
                  <StatCard
                    title="净利润"
                    value={formatCurrency(businessOverview.net_profit)}
                    change={18.3}
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    color="text-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                        月度趋势分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {monthlyTrends.map((trend) => (
                          <div key={trend.month} className="flex items-center space-x-4">
                            <div className="w-20 text-sm font-medium text-slate-600">{trend.month}</div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center">
                                <span className="w-16 text-xs text-slate-500">收入</span>
                                <div className="flex-1 mx-2 bg-green-100 rounded-full h-3">
                                  <div 
                                    className="h-3 bg-green-500 rounded-full"
                                    style={{ width: `${Math.min((trend.revenue / 5000000) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="w-24 text-xs text-right">{formatCurrency(trend.revenue)}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-16 text-xs text-slate-500">利润</span>
                                <div className="flex-1 mx-2 bg-blue-100 rounded-full h-3">
                                  <div 
                                    className="h-3 bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min((trend.profit / 1500000) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="w-24 text-xs text-right">{formatCurrency(trend.profit)}</span>
                              </div>
                            </div>
                            <div className="w-20 text-right">
                              <span className="text-sm font-semibold text-indigo-600">{formatPercent(trend.profit_margin)}</span>
                              <p className="text-xs text-slate-400">利润率</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
                        关键财务指标
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {businessOverview.key_ratios && (
                        <>
                          <KeyRatioCard title="流动比率" ratio={businessOverview.key_ratios.current_ratio} target={2.0} />
                          <KeyRatioCard title="资产负债率" ratio={businessOverview.key_ratios.debt_ratio} target={40.0} />
                          <KeyRatioCard title="净资产收益率" ratio={businessOverview.key_ratios.return_on_equity} target={15.0} />
                          <KeyRatioCard title="利润率" ratio={businessOverview.key_ratios.profit_margin} target={20.0} />
                          <KeyRatioCard title="总资产收益率" ratio={businessOverview.key_ratios.return_on_assets} target={10.0} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
                      财务摘要
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">所有者权益</p>
                        <p className="text-xl font-bold text-indigo-600">{formatCurrency(businessOverview.total_equity)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">总费用</p>
                        <p className="text-xl font-bold text-orange-600">{formatCurrency(businessOverview.total_expenses)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">现金流量</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(businessOverview.cash_flow)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">应收账款周转</p>
                        <p className="text-xl font-bold text-blue-600">{businessOverview.receivable_turnover.toFixed(2)}次</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">存货周转</p>
                        <p className="text-xl font-bold text-purple-600">{businessOverview.inventory_turnover.toFixed(2)}次</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500">报告期间</p>
                        <p className="text-xl font-bold text-slate-900">{businessOverview.period}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="balance" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : balanceSheet && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
                      资产负债表
                      <span className="ml-2 text-sm font-normal text-slate-500">{balanceSheet.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                          资产
                        </h3>
                        <div className="space-y-2">
                          {balanceSheet.assets.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-slate-500 ml-2">{item.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">资产总计</span>
                            <span className="font-bold text-xl text-blue-600">{formatCurrency(balanceSheet.total_assets)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                          负债
                        </h3>
                        <div className="space-y-2">
                          {balanceSheet.liabilities.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-slate-500 ml-2">{item.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">负债总计</span>
                            <span className="font-bold text-xl text-orange-600">{formatCurrency(balanceSheet.total_liabilities)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          所有者权益
                        </h3>
                        <div className="space-y-2">
                          {balanceSheet.equity.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-slate-500 ml-2">{item.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">权益总计</span>
                            <span className="font-bold text-xl text-green-600">{formatCurrency(balanceSheet.total_equity)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-center space-x-12">
                        <div className="text-center">
                          <p className="text-sm text-slate-500">资产总计</p>
                          <p className="text-2xl font-bold text-blue-600">{formatCurrency(balanceSheet.total_assets)}</p>
                        </div>
                        <div className="text-2xl text-slate-300">=</div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">负债 + 权益</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(balanceSheet.total_liabilities)} + {formatCurrency(balanceSheet.total_equity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : incomeStatement && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                      利润表
                      <span className="ml-2 text-sm font-normal text-slate-500">{incomeStatement.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          收入
                        </h3>
                        <div className="space-y-2">
                          {incomeStatement.revenues.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-slate-500 ml-2">{item.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-green-600">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">营业收入</span>
                            <span className="font-bold text-xl text-green-600">
                              {formatCurrency(incomeStatement.revenues.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                          费用
                        </h3>
                        <div className="space-y-2">
                          {incomeStatement.expenses.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-slate-500 ml-2">{item.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-red-600">{formatCurrency(item.amount)}</span>
                                <span className="text-xs text-slate-500 ml-2">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">总费用</span>
                            <span className="font-bold text-xl text-red-600">
                              {formatCurrency(incomeStatement.expenses.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                          <p className="text-sm text-slate-500">毛利润</p>
                          <p className="text-xl font-bold text-blue-600">{formatCurrency(incomeStatement.gross_profit)}</p>
                          <p className="text-xs text-slate-400 mt-1">毛利率 {formatPercent((incomeStatement.gross_profit / incomeStatement.revenues.reduce((sum, item) => sum + item.amount, 0)) * 100)}</p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg text-center">
                          <p className="text-sm text-slate-500">营业利润</p>
                          <p className="text-xl font-bold text-indigo-600">{formatCurrency(incomeStatement.operating_profit)}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg text-center">
                          <p className="text-sm text-slate-500">净利润</p>
                          <p className="text-xl font-bold text-emerald-600">{formatCurrency(incomeStatement.net_profit)}</p>
                          <p className="text-xs text-slate-400 mt-1">净利率 {formatPercent((incomeStatement.net_profit / incomeStatement.revenues.reduce((sum, item) => sum + item.amount, 0)) * 100)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : cashFlowStatement && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                      现金流量表
                      <span className="ml-2 text-sm font-normal text-slate-500">{cashFlowStatement.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          经营活动
                        </h3>
                        <div className="space-y-2">
                          {cashFlowStatement.operating_activities.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <span className="font-medium">{item.name}</span>
                              <span className={`font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">经营活动净额</span>
                            <span className="font-bold text-xl text-green-600">
                              {formatCurrency(cashFlowStatement.operating_activities.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                          投资活动
                        </h3>
                        <div className="space-y-2">
                          {cashFlowStatement.investing_activities.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <span className="font-medium">{item.name}</span>
                              <span className={`font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">投资活动净额</span>
                            <span className="font-bold text-xl text-blue-600">
                              {formatCurrency(cashFlowStatement.investing_activities.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                          筹资活动
                        </h3>
                        <div className="space-y-2">
                          {cashFlowStatement.financing_activities.map((item) => (
                            <div key={item.code} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                              <span className="font-medium">{item.name}</span>
                              <span className={`font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">筹资活动净额</span>
                            <span className="font-bold text-xl text-purple-600">
                              {formatCurrency(cashFlowStatement.financing_activities.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-center">
                        <div className="text-center p-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                          <p className="text-sm opacity-80">现金及现金等价物净增加额</p>
                          <p className="text-3xl font-bold mt-2">
                            {cashFlowStatement.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(cashFlowStatement.net_cash_flow)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
                      项目财务汇总
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">项目总数</p>
                        <p className="text-2xl font-bold text-indigo-600">{projectSummaries.length}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">合同总金额</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(projectSummaries.reduce((sum, p) => sum + p.contract_amount, 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">已收款总额</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(projectSummaries.reduce((sum, p) => sum + p.received_amount, 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">总利润</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(projectSummaries.reduce((sum, p) => sum + p.profit, 0))}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectSummaries.map((project) => (
                        <ProjectCard key={project.project_id} project={project} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                      项目利润分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projectSummaries.map((project) => (
                        <div key={project.project_id} className="flex items-center space-x-4">
                          <div className="w-40">
                            <p className="font-medium text-slate-900">{project.project_name}</p>
                            <p className="text-xs text-slate-500">{project.status}</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${project.margin >= 20 ? 'bg-green-500' : project.margin >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(project.margin, 100)}%` }}
                                />
                              </div>
                              <span className="ml-4 font-semibold text-indigo-600">{formatPercent(project.margin)}</span>
                            </div>
                          </div>
                          <div className="w-32 text-right">
                            <p className={`font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(project.profit)}
                            </p>
                            <p className="text-xs text-slate-500">利润</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                      部门财务汇总
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">部门总数</p>
                        <p className="text-2xl font-bold text-indigo-600">{departmentSummaries.length}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">总费用支出</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(departmentSummaries.reduce((sum, d) => sum + d.total_expenses, 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">总预算金额</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(departmentSummaries.reduce((sum, d) => sum + d.budget_amount, 0))}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">费用笔数</p>
                        <p className="text-2xl font-bold text-green-600">
                          {departmentSummaries.reduce((sum, d) => sum + d.expense_count, 0)}笔
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {departmentSummaries.map((dept) => (
                        <DepartmentCard key={dept.department_id || dept.department_name} dept={dept} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="aging" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                      账龄分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {agingAnalysis.map((analysis) => (
                        <div key={analysis.category} className="bg-slate-50 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                              {analysis.category === '应收账款' ? (
                                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                              ) : (
                                <Users className="w-5 h-5 mr-2 text-green-600" />
                              )}
                              {analysis.category}
                            </h3>
                            <Badge variant="secondary" className="text-lg">
                              {formatCurrency(analysis.total)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <span className="w-24 text-sm text-slate-500">0-30天</span>
                              <div className="flex-1 mx-4 bg-green-100 rounded-full h-4">
                                <div 
                                  className="h-4 bg-green-500 rounded-full"
                                  style={{ width: `${analysis.total > 0 ? (analysis.days_0_30 / analysis.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(analysis.days_0_30)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-24 text-sm text-slate-500">31-60天</span>
                              <div className="flex-1 mx-4 bg-blue-100 rounded-full h-4">
                                <div 
                                  className="h-4 bg-blue-500 rounded-full"
                                  style={{ width: `${analysis.total > 0 ? (analysis.days_31_60 / analysis.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(analysis.days_31_60)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-24 text-sm text-slate-500">61-90天</span>
                              <div className="flex-1 mx-4 bg-yellow-100 rounded-full h-4">
                                <div 
                                  className="h-4 bg-yellow-500 rounded-full"
                                  style={{ width: `${analysis.total > 0 ? (analysis.days_61_90 / analysis.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(analysis.days_61_90)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-24 text-sm text-slate-500">91-180天</span>
                              <div className="flex-1 mx-4 bg-orange-100 rounded-full h-4">
                                <div 
                                  className="h-4 bg-orange-500 rounded-full"
                                  style={{ width: `${analysis.total > 0 ? (analysis.days_91_180 / analysis.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(analysis.days_91_180)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-24 text-sm text-slate-500">180天以上</span>
                              <div className="flex-1 mx-4 bg-red-100 rounded-full h-4">
                                <div 
                                  className="h-4 bg-red-500 rounded-full"
                                  style={{ width: `${analysis.total > 0 ? (analysis.days_181 / analysis.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(analysis.days_181)}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-500">逾期比例</span>
                              <span className={`font-bold ${(analysis.days_91_180 + analysis.days_181) / analysis.total > 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatPercent(((analysis.days_91_180 + analysis.days_181) / analysis.total) * 100)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="voucher" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : voucherStats && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                      凭证统计
                      <span className="ml-2 text-sm font-normal text-slate-500">{voucherStats.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">凭证总数</p>
                        <p className="text-2xl font-bold text-indigo-600">{voucherStats.total_count}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">已审核凭证</p>
                        <p className="text-2xl font-bold text-green-600">{voucherStats.approved_count}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">草稿凭证</p>
                        <p className="text-2xl font-bold text-yellow-600">{voucherStats.draft_count}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">导入凭证</p>
                        <p className="text-2xl font-bold text-purple-600">{voucherStats.imported_count}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-80">凭证总金额</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(voucherStats.total_amount)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-80">平均每张凭证</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(voucherStats.avg_amount)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-80">审核率</p>
                        <p className="text-3xl font-bold mt-2">{voucherStats.approval_rate}%</p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">状态分布</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center">
                            <div className="w-32 bg-green-100 rounded-full h-4 relative">
                              <div 
                                className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
                                style={{ width: `${voucherStats.total_count > 0 ? (voucherStats.approved_count / voucherStats.total_count) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="ml-4 text-sm">已审核 {voucherStats.approved_count} ({((voucherStats.approved_count / voucherStats.total_count) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-32 bg-yellow-100 rounded-full h-4 relative">
                              <div 
                                className="absolute left-0 top-0 h-full bg-yellow-500 rounded-full"
                                style={{ width: `${voucherStats.total_count > 0 ? (voucherStats.draft_count / voucherStats.total_count) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="ml-4 text-sm">草稿 {voucherStats.draft_count} ({((voucherStats.draft_count / voucherStats.total_count) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-32 bg-purple-100 rounded-full h-4 relative">
                              <div 
                                className="absolute left-0 top-0 h-full bg-purple-500 rounded-full"
                                style={{ width: `${voucherStats.total_count > 0 ? (voucherStats.imported_count / voucherStats.total_count) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="ml-4 text-sm">导入 {voucherStats.imported_count} ({((voucherStats.imported_count / voucherStats.total_count) * 100).toFixed(1)}%)</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">制单人员</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-lg font-bold text-indigo-600">{voucherStats.maker_count} 人</p>
                          <p className="text-sm text-slate-500 mt-1">平均每人处理 {(voucherStats.total_count / voucherStats.maker_count).toFixed(1)} 张凭证</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="cashflow-analysis" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : cashFlowAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                      现金流量分析
                      <span className="ml-2 text-sm font-normal text-slate-500">{cashFlowAnalysis.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">经营活动现金流</p>
                        <p className={`text-2xl font-bold mt-1 ${cashFlowAnalysis.operating_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashFlowAnalysis.operating_cash_flow >= 0 ? '+' : ''}{formatCurrency(cashFlowAnalysis.operating_cash_flow)}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">投资活动现金流</p>
                        <p className={`text-2xl font-bold mt-1 ${cashFlowAnalysis.investing_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashFlowAnalysis.investing_cash_flow >= 0 ? '+' : ''}{formatCurrency(cashFlowAnalysis.investing_cash_flow)}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">筹资活动现金流</p>
                        <p className={`text-2xl font-bold mt-1 ${cashFlowAnalysis.financing_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashFlowAnalysis.financing_cash_flow >= 0 ? '+' : ''}{formatCurrency(cashFlowAnalysis.financing_cash_flow)}
                        </p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">净现金流量</p>
                        <p className={`text-2xl font-bold mt-1 ${cashFlowAnalysis.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashFlowAnalysis.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(cashFlowAnalysis.net_cash_flow)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">现金流比率分析</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                              <p className="text-sm text-slate-500">现金流动比率</p>
                              <p className="text-xl font-bold text-indigo-600">{cashFlowAnalysis.cash_flow_ratio.toFixed(2)}x</p>
                            </div>
                            <Badge variant={cashFlowAnalysis.cash_flow_ratio >= 1 ? 'default' : 'outline'}>
                              {cashFlowAnalysis.cash_flow_ratio >= 1 ? '健康' : '偏低'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                              <p className="text-sm text-slate-500">经营现金流与收入比</p>
                              <p className="text-xl font-bold text-green-600">{formatPercent(cashFlowAnalysis.operating_cash_flow_to_revenue)}</p>
                            </div>
                            <Badge variant={cashFlowAnalysis.operating_cash_flow_to_revenue >= 20 ? 'default' : 'outline'}>
                              {cashFlowAnalysis.operating_cash_flow_to_revenue >= 20 ? '良好' : '需关注'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">现金流构成</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">经营活动</span>
                                <span className="font-medium">{formatPercent((cashFlowAnalysis.operating_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100)}</span>
                              </div>
                              <Progress value={(cashFlowAnalysis.operating_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100} className="h-3" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">投资活动</span>
                                <span className="font-medium">{formatPercent((cashFlowAnalysis.investing_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100)}</span>
                              </div>
                              <Progress value={Math.abs((cashFlowAnalysis.investing_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100} className="h-3 bg-blue-200" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">筹资活动</span>
                                <span className="font-medium">{formatPercent((cashFlowAnalysis.financing_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100)}</span>
                              </div>
                              <Progress value={Math.abs((cashFlowAnalysis.financing_cash_flow / Math.abs(cashFlowAnalysis.net_cash_flow || 1)) * 100} className="h-3 bg-purple-200" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="expense" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : expenseAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="w-5 h-5 mr-2 text-indigo-600" />
                      费用分析
                      <span className="ml-2 text-sm font-normal text-slate-500">{expenseAnalysis.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white text-center">
                        <p className="text-sm opacity-80">总费用</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(expenseAnalysis.total_expenses)}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white text-center">
                        <p className="text-sm opacity-80">部门数量</p>
                        <p className="text-3xl font-bold mt-2">{expenseAnalysis.department_expenses.length}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white text-center">
                        <p className="text-sm opacity-80">费用类别</p>
                        <p className="text-3xl font-bold mt-2">{expenseAnalysis.category_expenses.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">部门费用分布</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {expenseAnalysis.department_expenses.map((dept) => (
                            <div key={dept.department_id || dept.department_name} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{dept.department_name}</span>
                                  <span className="text-sm text-slate-500">{formatPercent(dept.percentage)}</span>
                                </div>
                                <Progress value={dept.percentage} className="h-2 mt-1" />
                              </div>
                              <span className="ml-4 font-bold text-indigo-600">{formatCurrency(dept.amount)}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">费用类别分布</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {expenseAnalysis.category_expenses.map((cat) => (
                            <div key={cat.category} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{cat.category}</span>
                                  <span className="text-sm text-slate-500">{formatPercent(cat.percentage)}</span>
                                </div>
                                <Progress value={cat.percentage} className="h-2 mt-1" />
                              </div>
                              <span className="ml-4 font-bold text-orange-600">{formatCurrency(cat.amount)}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">月度费用趋势</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {expenseAnalysis.monthly_trend.map((trend) => (
                            <div key={trend.month} className="flex items-center space-x-4">
                              <div className="w-20 text-sm font-medium">{trend.month}</div>
                              <div className="flex-1 h-8 bg-slate-200 rounded-full overflow-hidden relative">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600"
                                  style={{ width: `${Math.min((trend.amount / 1500000) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="w-32 text-right font-medium">{formatCurrency(trend.amount)}</span>
                              <span className={`w-20 text-right text-sm ${trend.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.growth_rate >= 0 ? '+' : ''}{trend.growth_rate.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="profit" className="space-y-6">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : profitAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUpDown className="w-5 h-5 mr-2 text-indigo-600" />
                      利润分析
                      <span className="ml-2 text-sm font-normal text-slate-500">{profitAnalysis.period}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-slate-500">毛利润</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(profitAnalysis.gross_profit)}</p>
                        <p className="text-xs text-green-600 mt-1">毛利率 {formatPercent(profitAnalysis.gross_margin)}</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-slate-500">营业利润</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(profitAnalysis.operating_profit)}</p>
                        <p className="text-xs text-green-600 mt-1">营业利润率 {formatPercent(profitAnalysis.operating_margin)}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-slate-500">净利润</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(profitAnalysis.net_profit)}</p>
                        <p className="text-xs text-green-600 mt-1">净利率 {formatPercent(profitAnalysis.net_margin)}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-slate-500">利润率对比</p>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                            <span className="text-sm">毛利 {formatPercent(profitAnalysis.gross_margin)}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2" />
                            <span className="text-sm">营业 {formatPercent(profitAnalysis.operating_margin)}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                            <span className="text-sm">净利 {formatPercent(profitAnalysis.net_margin)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">月度利润趋势</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {profitAnalysis.profit_trend.map((trend) => (
                            <div key={trend.month} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">{trend.month}</span>
                                <div className="flex items-center space-x-6">
                                  <span className="text-sm text-blue-600">{formatCurrency(trend.gross_profit)}</span>
                                  <span className="text-sm text-indigo-600">{formatCurrency(trend.operating_profit)}</span>
                                  <span className="text-sm text-green-600">{formatCurrency(trend.net_profit)}</span>
                                </div>
                              </div>
                              <div className="h-6 bg-slate-100 rounded-full relative overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-blue-400"
                                  style={{ width: `${Math.min((trend.gross_profit / 2500000) * 100, 100)}%` }}
                                />
                                <div 
                                  className="absolute left-0 top-0 h-full bg-indigo-400"
                                  style={{ width: `${Math.min((trend.operating_profit / 2500000) * 100, 100)}%` }}
                                />
                                <div 
                                  className="absolute left-0 top-0 h-full bg-green-400"
                                  style={{ width: `${Math.min((trend.net_profit / 2500000) * 100, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-end space-x-8 text-xs text-slate-500">
                                <span>毛利润</span>
                                <span>营业利润</span>
                                <span>净利润</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">毛利率</p>
                              <p className="text-3xl font-bold text-blue-600 mt-2">{formatPercent(profitAnalysis.gross_margin)}</p>
                            </div>
                            <div className="p-4 bg-blue-100 rounded-full">
                              <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">行业平均</span>
                              <span className="font-medium">35%</span>
                            </div>
                            <Progress value={profitAnalysis.gross_margin} className="h-2 mt-2" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">营业利润率</p>
                              <p className="text-3xl font-bold text-indigo-600 mt-2">{formatPercent(profitAnalysis.operating_margin)}</p>
                            </div>
                            <div className="p-4 bg-indigo-100 rounded-full">
                              <TrendingUp className="w-6 h-6 text-indigo-600" />
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">行业平均</span>
                              <span className="font-medium">15%</span>
                            </div>
                            <Progress value={profitAnalysis.operating_margin} className="h-2 mt-2" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">净利率</p>
                              <p className="text-3xl font-bold text-green-600 mt-2">{formatPercent(profitAnalysis.net_margin)}</p>
                            </div>
                            <div className="p-4 bg-green-100 rounded-full">
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">行业平均</span>
                              <span className="font-medium">8%</span>
                            </div>
                            <Progress value={profitAnalysis.net_margin} className="h-2 mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinanceReportsPage;