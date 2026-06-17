import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  FileText,
  TrendingUp,
  Calculator,
  Search,
  Plus,
  ChevronLeft,
  Download,
  Loader2,
  Users,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  InputBase,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/notification/NotificationContainer";
import { MetricCard } from "@/components/bi/MetricCard";
import { StatsChart } from "@/components/bi/StatsChart";
import { StatusBadge } from "@/components/hrm/StatusBadge";
import {
  payrollApi,
  payrollItemApi,
  employeeApi,
  salaryAdjustmentApi,
  type PayrollRun,
  type PayrollItem,
  type Employee,
  type SalaryAdjustment,
} from "@/api/hrm";

interface PayrollSummary {
  total_employees: number;
  total_base_salary: number;
  total_bonus: number;
  total_deductions: number;
  total_net_salary: number;
  period: string;
}

const HrmPayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<
    "payroll" | "adjustments" | "calculator"
  >("payroll");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("2026-05");
  const [loading, setLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [paying, setPaying] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payrollRes, employeeRes, adjustmentRes] = await Promise.all([
        payrollApi.list(),
        employeeApi.list(),
        salaryAdjustmentApi.list(),
      ]);

      let empList: Employee[] = [];

      if (payrollRes.success && payrollRes.data) {
        setPayrollRuns(payrollRes.data.items);
      }

      if (employeeRes.success && employeeRes.data) {
        empList = employeeRes.data.items;
        setEmployees(empList);
      }

      if (adjustmentRes.success && adjustmentRes.data) {
        setAdjustments(adjustmentRes.data.items);
      }
    } catch (err) {
      error("加载数据失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 加载工资条明细
  const loadPayrollItems = async (runId: string) => {
    try {
      setLoading(true);
      const res = await payrollItemApi.list({ payroll_run_id: runId });
      if (res.success && res.data) {
        setPayrollItems(res.data.items);
      }
    } catch (err) {
      error("加载工资条明细失败");
    } finally {
      setLoading(false);
    }
  };

  // 创建工资发放批次
  const handleCreatePayroll = async () => {
    try {
      setLoading(true);
      const res = await payrollApi.create({ pay_period: selectedPeriod });
      if (res.success && res.data) {
        success("工资发放批次创建成功");
        await loadData();
      }
    } catch (err) {
      error("创建工资发放批次失败");
    } finally {
      setLoading(false);
    }
  };

  // 计算薪资
  const handleCalculate = async (runId: string) => {
    try {
      setCalculating(true);
      const res = await payrollApi.calculate(runId);
      if (res.success) {
        success("薪资计算完成");
        await loadData();
      }
    } catch (err) {
      error("薪资计算失败");
    } finally {
      setCalculating(false);
    }
  };

  // 执行发放
  const handlePay = async (runId: string) => {
    try {
      setPaying(true);
      const res = await payrollApi.pay(runId);
      if (res.success) {
        success("薪资发放完成");
        await loadData();
      }
    } catch (err) {
      error("薪资发放失败");
    } finally {
      setPaying(false);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : "未知员工";
  };

  const getPayrollStatusBadge = (status: string) => (
    <StatusBadge status={status} category="payroll" showIcon />
  );

  const getAdjustmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      promotion: "晋升调薪",
      demotion: "降职调薪",
      bonus: "奖金发放",
      deduction: "扣款",
    };
    return types[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  // 计算汇总
  const totalAmount = payrollRuns.reduce(
    (sum, run) => sum + Number(run.total_amount),
    0,
  );
  const totalEmployees = payrollRuns.reduce(
    (sum, run) => sum + run.employee_count,
    0,
  );

  // 薪资统计数据
  const payrollStats = useMemo(
    () => ({
      totalEmployees,
      totalBaseSalary: totalAmount * 0.6,
      totalBonus: totalAmount * 0.2,
      totalDeductions: totalAmount * 0.1,
      totalNetSalary: totalAmount * 0.9,
      avgSalary: totalEmployees > 0 ? (totalAmount * 0.9) / totalEmployees : 0,
      pendingRuns: payrollRuns.filter((r) => r.status === "draft").length,
      paidRuns: payrollRuns.filter((r) => r.status === "paid").length,
    }),
    [payrollRuns, totalAmount, totalEmployees],
  );

  // 薪资构成数据
  const salaryCompositionData = useMemo(
    () => [
      { name: "基本工资", value: 60, color: "#3b82f6" },
      { name: "奖金", value: 15, color: "#22c55e" },
      { name: "补贴", value: 10, color: "#f59e0b" },
      { name: "社保公积金（个人）", value: 8, color: "#ef4444" },
      { name: "个人所得税", value: 7, color: "#8b5cf6" },
    ],
    [],
  );

  // 工资发放状态分布
  const payrollStatusData = useMemo(
    () => [
      {
        name: "待计算",
        value: payrollRuns.filter((r) => r.status === "draft").length,
        color: "#eab308",
      },
      {
        name: "已计算",
        value: payrollRuns.filter((r) => r.status === "calculated").length,
        color: "#3b82f6",
      },
      {
        name: "已发放",
        value: payrollRuns.filter((r) => r.status === "paid").length,
        color: "#22c55e",
      },
    ],
    [payrollRuns],
  );

  const summary: PayrollSummary = {
    total_employees: totalEmployees,
    total_base_salary: totalAmount * 0.6,
    total_bonus: totalAmount * 0.2,
    total_deductions: totalAmount * 0.1,
    total_net_salary: totalAmount * 0.9,
    period: selectedPeriod,
  };

  if (loading && payrollRuns.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          sx={{
            width: 32,
            height: 32,
            animation: "spin 1s linear infinite",
            color: "primary.main",
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "grey.200",
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            maxWidth: 1536,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                onClick={() => navigate("/dashboard")}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                <ChevronLeft
                  sx={{ width: 20, height: 20, color: "grey.600" }}
                />
              </Button>
              <Box>
                {/* 面包屑导航 */}
                <Box sx={{ mb: 1 }}>
                  <Typography
                    component="a"
                    href="/hrm"
                    sx={{
                      color: "text.secondary",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      "&:hover": {
                        color: "primary.main",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    人力资源
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ mx: 1, color: "text.disabled" }}
                  >
                    /
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ color: "text.primary", fontSize: "0.875rem" }}
                  >
                    薪酬管理
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "grey.900",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <DollarSign
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: "success.main",
                    }}
                  />
                  薪酬管理
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "grey.500" }}>
                  管理员工薪资、奖金、社保和个税计算
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                sx={{
                  px: 2,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "& .MuiSelect-select": { py: 1 },
                }}
              >
                <MenuItem value="2026-05">2026年5月</MenuItem>
                <MenuItem value="2026-04">2026年4月</MenuItem>
                <MenuItem value="2026-03">2026年3月</MenuItem>
              </Select>
              <Button
                onClick={handleCreatePayroll}
                disabled={loading}
                variant="contained"
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                创建发放批次
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{ maxWidth: 1536, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 2, lg: 4 },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricCard
            title="发放人数"
            value={`${payrollStats.totalEmployees}人`}
            icon={<Users sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="blue"
          />
          <MetricCard
            title="基本工资合计"
            value={formatCurrency(payrollStats.totalBaseSalary)}
            icon={<DollarSign sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="green"
          />
          <MetricCard
            title="奖金合计"
            value={formatCurrency(payrollStats.totalBonus)}
            icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="purple"
          />
          <MetricCard
            title="实发工资合计"
            value={formatCurrency(payrollStats.totalNetSalary)}
            icon={<CreditCard sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="blue"
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 3 },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricCard
            title="平均工资"
            value={formatCurrency(payrollStats.avgSalary)}
            icon={<Receipt sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="teal"
          />
          <MetricCard
            title="待计算批次"
            value={payrollStats.pendingRuns}
            icon={<Clock sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="yellow"
          />
          <MetricCard
            title="已发放批次"
            value={payrollStats.paidRuns}
            icon={<CheckCircle sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="green"
          />
        </Box>

        {/* Charts */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: 2 },
            gap: 3,
            mb: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "grey.900" }}>
              薪资构成比例
            </Typography>
            <StatsChart type="pie" data={salaryCompositionData} height={250} />
          </Box>

          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "grey.900" }}>
              工资发放状态
            </Typography>
            <StatsChart type="pie" data={payrollStatusData} height={250} />
          </Box>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            borderBottom: 1,
            borderColor: "grey.200",
          }}
        >
          <Button
            onClick={() => setActiveTab("payroll")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "payroll" ? "primary.main" : "grey.500",
              borderBottom: 2,
              borderColor:
                activeTab === "payroll" ? "primary.main" : "transparent",
              "&:hover": { color: "grey.700" },
            }}
          >
            <FileText sx={{ width: 20, height: 20 }} />
            <span>工资发放批次</span>
          </Button>
          <Button
            onClick={() => setActiveTab("adjustments")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "adjustments" ? "primary.main" : "grey.500",
              borderBottom: 2,
              borderColor:
                activeTab === "adjustments" ? "primary.main" : "transparent",
              "&:hover": { color: "grey.700" },
            }}
          >
            <TrendingUp sx={{ width: 20, height: 20 }} />
            <span>调薪记录</span>
          </Button>
          <Button
            onClick={() => setActiveTab("calculator")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "calculator" ? "primary.main" : "grey.500",
              borderBottom: 2,
              borderColor:
                activeTab === "calculator" ? "primary.main" : "transparent",
              "&:hover": { color: "grey.700" },
            }}
          >
            <Calculator sx={{ width: 20, height: 20 }} />
            <span>个税计算器</span>
          </Button>
        </Box>

        {/* Search Bar */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                sx={{
                  position: "absolute",
                  left: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "grey.400",
                }}
              />
              <InputBase
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: "100%",
                  pl: 5,
                  pr: 2,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "& .MuiInputBase-input": { py: 1 },
                }}
              />
            </Box>
            <Button
              sx={{
                display: "flex",
                alignItems: "center",
                px: 2,
                py: 1,
                bgcolor: "grey.200",
                color: "grey.700",
                borderRadius: 2,
                "&:hover": { bgcolor: "grey.300" },
              }}
            >
              <Download sx={{ width: 20, height: 20, mr: 1 }} />
              导出
            </Button>
          </Box>
        </Box>

        {/* Content */}
        {activeTab === "payroll" && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              overflow: "hidden",
            }}
          >
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 1200 }}>
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    "& th": {
                      bgcolor: "grey.50",
                      px: 3,
                      py: 1.5,
                      textAlign: "left",
                      "& .MuiTypography-root": {
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: "grey.500",
                        textTransform: "uppercase",
                      },
                    },
                  }}
                >
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th">发放周期</Box>
                      <Box component="th">员工人数</Box>
                      <Box component="th">总金额</Box>
                      <Box component="th">状态</Box>
                      <Box component="th">发放时间</Box>
                      <Box component="th">操作</Box>
                    </Box>
                  </Box>
                  <Box
                    component="tbody"
                    sx={{
                      bgcolor: "background.paper",
                      "& tr": { borderTop: 1, borderColor: "grey.200" },
                      "& tr:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    {payrollRuns.map((run) => (
                      <Box component="tr" key={run.id}>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: "grey.900" }}
                          >
                            {run.pay_period}
                          </Typography>
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.900",
                          }}
                        >
                          {run.employee_count}
                        </Box>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color: "primary.main" }}
                          >
                            {formatCurrency(Number(run.total_amount))}
                          </Typography>
                        </Box>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          {getPayrollStatusBadge(run.status)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.500",
                          }}
                        >
                          {run.paid_at || "-"}
                        </Box>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              onClick={() => loadPayrollItems(run.id)}
                              sx={{
                                color: "primary.main",
                                "&:hover": { color: "primary.dark" },
                              }}
                            >
                              查看明细
                            </Button>
                            {run.status === "draft" && (
                              <Button
                                onClick={() => handleCalculate(run.id)}
                                disabled={calculating}
                                sx={{
                                  color: "success.main",
                                  "&:hover": { color: "success.dark" },
                                  "&.Mui-disabled": { color: "grey.400" },
                                }}
                              >
                                {calculating ? "计算中..." : "计算薪资"}
                              </Button>
                            )}
                            {run.status === "calculated" && (
                              <Button
                                onClick={() => handlePay(run.id)}
                                disabled={paying}
                                sx={{
                                  color: "success.main",
                                  "&:hover": { color: "success.dark" },
                                  "&.Mui-disabled": { color: "grey.400" },
                                }}
                              >
                                {paying ? "发放中..." : "执行发放"}
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                    {payrollRuns.length === 0 && (
                      <Box component="tr">
                        <Box
                          component="td"
                          colSpan={6}
                          sx={{
                            px: 3,
                            py: 8,
                            textAlign: "center",
                            color: "grey.500",
                          }}
                        >
                          暂无工资发放批次数据
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 工资条明细 */}
            {payrollItems.length > 0 && (
              <Box sx={{ borderTop: 1, borderColor: "grey.200", mt: 3 }}>
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: 1,
                    borderColor: "grey.200",
                    bgcolor: "grey.50",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: "grey.900" }}
                  >
                    工资条明细
                  </Typography>
                </Box>
                <Box sx={{ overflowX: "auto" }}>
                  <Box sx={{ minWidth: 1200 }}>
                    <Box
                      component="table"
                      sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        "& th": {
                          bgcolor: "grey.50",
                          px: 3,
                          py: 1.5,
                          textAlign: "left",
                          "& .MuiTypography-root": {
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "grey.500",
                            textTransform: "uppercase",
                          },
                        },
                      }}
                    >
                      <Box component="thead">
                        <Box component="tr">
                          <Box component="th">员工</Box>
                          <Box component="th">应发工资</Box>
                          <Box component="th">扣款</Box>
                          <Box component="th">个税</Box>
                          <Box component="th">实发工资</Box>
                          <Box component="th">状态</Box>
                        </Box>
                      </Box>
                      <Box
                        component="tbody"
                        sx={{
                          bgcolor: "background.paper",
                          "& tr": { borderTop: 1, borderColor: "grey.200" },
                          "& tr:hover": { bgcolor: "grey.50" },
                        }}
                      >
                        {payrollItems.map((item) => (
                          <Box component="tr" key={item.id}>
                            <Box
                              component="td"
                              sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500, color: "grey.900" }}
                              >
                                {getEmployeeName(item.employee_id)}
                              </Typography>
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                px: 3,
                                py: 2,
                                whiteSpace: "nowrap",
                                color: "grey.900",
                              }}
                            >
                              {formatCurrency(Number(item.gross_amount))}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                px: 3,
                                py: 2,
                                whiteSpace: "nowrap",
                                color: "grey.900",
                              }}
                            >
                              {formatCurrency(Number(item.deductions))}
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                px: 3,
                                py: 2,
                                whiteSpace: "nowrap",
                                color: "error.main",
                              }}
                            >
                              {formatCurrency(Number(item.taxes))}
                            </Box>
                            <Box
                              component="td"
                              sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                            >
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 700, color: "primary.main" }}
                              >
                                {formatCurrency(Number(item.net_amount))}
                              </Typography>
                            </Box>
                            <Box
                              component="td"
                              sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                            >
                              {getPayrollStatusBadge(item.status)}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {activeTab === "adjustments" && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              overflow: "hidden",
            }}
          >
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 1200 }}>
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    "& th": {
                      bgcolor: "grey.50",
                      px: 3,
                      py: 1.5,
                      textAlign: "left",
                      "& .MuiTypography-root": {
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: "grey.500",
                        textTransform: "uppercase",
                      },
                    },
                  }}
                >
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th">员工姓名</Box>
                      <Box component="th">调薪类型</Box>
                      <Box component="th">原工资</Box>
                      <Box component="th">新工资</Box>
                      <Box component="th">调整金额</Box>
                      <Box component="th">原因</Box>
                      <Box component="th">生效日期</Box>
                      <Box component="th">状态</Box>
                    </Box>
                  </Box>
                  <Box
                    component="tbody"
                    sx={{
                      bgcolor: "background.paper",
                      "& tr": { borderTop: 1, borderColor: "grey.200" },
                      "& tr:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    {adjustments.map((adj) => (
                      <Box component="tr" key={adj.id}>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: "grey.900" }}
                          >
                            {adj.employee_name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "grey.500" }}
                          >
                            {adj.department}
                          </Typography>
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.900",
                          }}
                        >
                          {getAdjustmentTypeName(adj.adjustment_type)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.500",
                          }}
                        >
                          {formatCurrency(adj.old_salary)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.900",
                          }}
                        >
                          {formatCurrency(adj.new_salary)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            fontWeight: 500,
                            color: "success.main",
                          }}
                        >
                          +{formatCurrency(adj.adjustment_amount)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.500",
                            maxWidth: 256,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {adj.reason}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            px: 3,
                            py: 2,
                            whiteSpace: "nowrap",
                            color: "grey.900",
                          }}
                        >
                          {adj.effective_date}
                        </Box>
                        <Box
                          component="td"
                          sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}
                        >
                          <StatusBadge
                            status={adj.status}
                            category="employee"
                            showIcon
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === "calculator" && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, color: "grey.900" }}>
              个税计算器
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, md: 2 },
                gap: 3,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 500, color: "grey.700" }}
                >
                  税前月收入 (元)
                </Typography>
                <InputBase
                  type="number"
                  placeholder="请输入税前收入"
                  sx={{
                    width: "100%",
                    px: 2,
                    py: 1,
                    border: 1,
                    borderColor: "grey.300",
                    borderRadius: 2,
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 500, color: "grey.700" }}
                >
                  社保公积金 (元)
                </Typography>
                <InputBase
                  type="number"
                  placeholder="请输入社保公积金"
                  sx={{
                    width: "100%",
                    px: 2,
                    py: 1,
                    border: 1,
                    borderColor: "grey.300",
                    borderRadius: 2,
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 500, color: "grey.700" }}
                >
                  专项附加扣除 (元)
                </Typography>
                <InputBase
                  type="number"
                  placeholder="请输入专项附加扣除"
                  sx={{
                    width: "100%",
                    px: 2,
                    py: 1,
                    border: 1,
                    borderColor: "grey.300",
                    borderRadius: 2,
                  }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                <Button
                  variant="contained"
                  sx={{
                    width: "100%",
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  计算
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HrmPayrollPage;
