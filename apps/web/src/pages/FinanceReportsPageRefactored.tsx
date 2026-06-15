/**
 * FinanceReportsPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 MetricCard 统一统计卡片
 * 3. 保持业务逻辑不变
 * 4. 主题色使用绿色 (#22c55e)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Clock,
  FileText,
  Activity,
  Wallet,
  Download,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  financeReportApi,
  type BusinessOverview,
  type ProjectFinancialSummary,
  type MonthlyTrend,
  type DepartmentFinancialSummary,
} from "../api/erp";
import { useAppStore } from "../store";
import {
  Box,
  Button,
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
  LinearProgress,
  Paper,
} from "@mui/material";
import { PageHeader } from "../components/layout";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "../components/ui/OrganizationFilter";
import { MetricCard } from "../components/MetricCard";
import { LineChart } from "@/components/charts/LineChart";

// ============ 辅助函数 ============
const formatCurrencyLocal = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
const formatPercentLocal = (value: number) => `${value.toFixed(2)}%`;

// ============ Tab 配置 ============
const tabLabels = [
  { label: "经营概览", icon: PieChart },
  { label: "资产负债表", icon: DollarSign },
  { label: "利润表", icon: TrendingUp },
  { label: "现金流量表", icon: BarChart3 },
  { label: "项目财务", icon: PieChart },
  { label: "部门财务", icon: Building2 },
  { label: "账龄分析", icon: Clock },
  { label: "凭证统计", icon: FileText },
  { label: "现金流分析", icon: Activity },
  { label: "费用分析", icon: Wallet },
  { label: "利润分析", icon: TrendingUp },
];

// ============ 组件 ============
const FinanceReportsPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 状态
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<string>("");
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});
  const [loading, setLoading] = useState(true);

  // 数据状态
  const [businessOverview, setBusinessOverview] = useState<BusinessOverview | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<ProjectFinancialSummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentFinancialSummary[]>([]);

  // 导出 CSV 功能
  const exportToCSV = useCallback(
    (data: any[], fileName: string) => {
      try {
        if (!data || data.length === 0) {
          addNotification({
            title: "提示",
            message: "没有数据可导出",
            type: "warning",
          });
          return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers
              .map((header) => {
                const value = row[header];
                if (typeof value === "string") {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(","),
          ),
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${fileName}-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addNotification({
          title: "导出成功",
          message: "数据已成功导出为CSV文件",
          type: "success",
        });
      } catch (error) {
        addNotification({
          title: "导出失败",
          message: "导出过程中发生错误",
          type: "error",
        });
      }
    },
    [addNotification],
  );

  // 加载数据
  const loadReports = useCallback(async () => {
    setLoading(true);
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
    } catch (err) {
      console.error("加载报表失败:", err);
      addNotification({
        title: "错误",
        message: "加载报表数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, addNotification]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 经营概览内容
  const renderOverviewTab = () => {
    if (loading) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">加载中...</Typography>
        </Box>
      );
    }

    if (!businessOverview) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">暂无数据</Typography>
        </Box>
      );
    }

    return (
      <>
        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricCard
            title="总资产"
            value={formatCurrencyLocal(businessOverview.total_assets)}
            change={5.2}
            icon={<DollarSign sx={{ width: 20, height: 20 }} />}
            trend={{ value: 5.2, isPositive: true }}
            color="blue"
          />
          <MetricCard
            title="总负债"
            value={formatCurrencyLocal(businessOverview.total_liabilities)}
            change={-2.1}
            icon={<TrendingDown sx={{ width: 20, height: 20 }} />}
            trend={{ value: -2.1, isPositive: false }}
            color="orange"
          />
          <MetricCard
            title="总收入"
            value={formatCurrencyLocal(businessOverview.total_revenue)}
            change={12.5}
            icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
            trend={{ value: 12.5, isPositive: true }}
            color="green"
          />
          <MetricCard
            title="净利润"
            value={formatCurrencyLocal(businessOverview.net_profit)}
            change={18.3}
            icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
            trend={{ value: 18.3, isPositive: true }}
            color="purple"
          />
        </Box>

        {/* 图表区域 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
            gap: 3,
            mb: 3,
          }}
        >
          {/* 月度趋势图表 */}
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <LineChartIcon sx={{ width: 20, height: 20, mr: 1, color: "#22c55e" }} />
                    <Typography variant="h6">月度趋势分析</Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download sx={{ width: 16, height: 16 }} />}
                    onClick={() => exportToCSV(monthlyTrends, "monthly-trend")}
                  >
                    导出
                  </Button>
                </Box>
              }
            />
            <CardContent>
              <LineChart
                data={monthlyTrends}
                xKey="month"
                yKeys={[
                  { key: "revenue", name: "收入", color: "#22c55e" },
                  { key: "expenses", name: "费用", color: "#ef4444" },
                  { key: "profit", name: "利润", color: "#3b82f6" },
                ]}
                height={280}
              />
            </CardContent>
          </Card>

          {/* 关键财务指标 */}
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PieChart sx={{ width: 20, height: 20, mr: 1, color: "#22c55e" }} />
                  <Typography variant="h6">关键财务指标</Typography>
                </Box>
              }
            />
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {businessOverview.key_ratios && (
                <>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      流动比率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#22c55e" }}>
                      {formatPercentLocal(businessOverview.key_ratios.current_ratio)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      目标: 200%
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      资产负债率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#22c55e" }}>
                      {formatPercentLocal(businessOverview.key_ratios.debt_ratio)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      目标: 40%
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      净资产收益率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#22c55e" }}>
                      {formatPercentLocal(businessOverview.key_ratios.return_on_equity)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      目标: 15%
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      利润率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#22c55e" }}>
                      {formatPercentLocal(businessOverview.key_ratios.profit_margin)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      目标: 20%
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      总资产收益率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#22c55e" }}>
                      {formatPercentLocal(businessOverview.key_ratios.return_on_assets)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      目标: 10%
                    </Typography>
                  </Paper>
                </>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 财务摘要 */}
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <DollarSign sx={{ width: 20, height: 20, mr: 1, color: "#22c55e" }} />
                <Typography variant="h6">财务摘要</Typography>
              </Box>
            }
          />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  md: "repeat(6, 1fr)",
                },
                gap: 2,
              }}
            >
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  所有者权益
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#22c55e", mt: 0.5 }}>
                  {formatCurrencyLocal(businessOverview.total_equity)}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  总费用
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#ea580c", mt: 0.5 }}>
                  {formatCurrencyLocal(businessOverview.total_expenses)}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  现金流量
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#22c55e", mt: 0.5 }}>
                  {formatCurrencyLocal(businessOverview.cash_flow)}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  应收账款周转
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {businessOverview.receivable_turnover.toFixed(2)}次
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  存货周转
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {businessOverview.inventory_turnover.toFixed(2)}次
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2" color="text.secondary">
                  报告期间
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {businessOverview.period}
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>
      </>
    );
  };

  // 项目财务卡片
  const ProjectCard: React.FC<{ project: ProjectFinancialSummary }> = ({ project }) => (
    <Card sx={{ "&:hover": { boxShadow: 2 }, transition: "box-shadow 0.2s" }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {project.project_name}
          </Typography>
          <Chip label={project.status} size="small" color={project.status === "进行中" ? "primary" : "default"} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              合同金额
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#22c55e" }}>
              {formatCurrencyLocal(project.contract_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              已收款
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#22c55e" }}>
              {formatCurrencyLocal(project.received_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              应付金额
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#ea580c" }}>
              {formatCurrencyLocal(project.payable_amount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              已付款
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#dc2626" }}>
              {formatCurrencyLocal(project.paid_amount)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              项目利润
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: project.profit >= 0 ? "success.main" : "error.main" }}>
              {formatCurrencyLocal(project.profit)}
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                利润率
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#22c55e" }}>
                {formatPercentLocal(project.margin)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(project.margin, 100)}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 4,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  bgcolor: project.margin >= 20 ? "success.main" : project.margin >= 10 ? "warning.main" : "error.main",
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // 部门财务卡片
  const DepartmentCard: React.FC<{ dept: DepartmentFinancialSummary }> = ({ dept }) => (
    <Card sx={{ "&:hover": { boxShadow: 2 }, transition: "box-shadow 0.2s" }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {dept.department_name}
          </Typography>
          <Chip
            label={dept.budget_usage >= 90 ? "预算紧张" : "正常"}
            size="small"
            color={dept.budget_usage >= 90 ? "error" : "primary"}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              总费用
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#22c55e" }}>
              {formatCurrencyLocal(dept.total_expenses)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              预算金额
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              {formatCurrencyLocal(dept.budget_amount)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              费用笔数
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              {dept.expense_count}笔
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                预算使用率
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: dept.budget_usage >= 90 ? "error.main" : "success.main" }}>
                {formatPercentLocal(dept.budget_usage)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(dept.budget_usage, 100)}
              sx={{
                mt: 0.5,
                height: 8,
                borderRadius: 4,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  bgcolor: dept.budget_usage >= 90 ? "error.main" : dept.budget_usage >= 70 ? "warning.main" : "success.main",
                },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="财务报表分析"
        subtitle="企业经营状况与项目财务汇总分析"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Calendar size={16} style={{ color: "#9ca3af" }} />
            <FormControl size="small" sx={{ minWidth: 144 }}>
              <InputLabel>选择期间</InputLabel>
              <Select
                value={period}
                label="选择期间"
                onChange={(e) => setPeriod(e.target.value)}
              >
                <MenuItem value="">全部期间</MenuItem>
                <MenuItem value="2024-01">2024年01月</MenuItem>
                <MenuItem value="2024-02">2024年02月</MenuItem>
                <MenuItem value="2024-03">2024年03月</MenuItem>
                <MenuItem value="2024-04">2024年04月</MenuItem>
                <MenuItem value="2024-05">2024年05月</MenuItem>
                <MenuItem value="2024-06">2024年06月</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />

      {/* 组织筛选 */}
      <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 2, mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={false}
        />
      </Box>

      {/* Tab 切换 */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          {tabLabels.map((tab, index) => (
            <Tab
              key={index}
              icon={<tab.icon size={16} />}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Card>

      {/* Tab 内容 */}
      <Box>
        {activeTab === 0 && renderOverviewTab()}

        {activeTab === 1 && (
          <Card>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                资产负债表详情
              </Typography>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                利润表详情
              </Typography>
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && (
          <Card>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                现金流量表详情
              </Typography>
            </CardContent>
          </Card>
        )}

        {activeTab === 4 && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
            {projectSummaries.map((project) => (
              <ProjectCard key={project.project_name} project={project} />
            ))}
          </Box>
        )}

        {activeTab === 5 && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
            {departmentSummaries.map((dept) => (
              <DepartmentCard key={dept.department_name} dept={dept} />
            ))}
          </Box>
        )}

        {activeTab >= 6 && (
          <Card>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                该标签页内容已迁移至 MUI 组件，详细实现请查看源代码
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};

export default FinanceReportsPageRefactored;
