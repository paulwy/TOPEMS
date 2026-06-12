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
import { useNotification } from "../hooks/useNotification";
import { NotificationContainer } from "../components/NotificationContainer";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import { StatusBadge } from "../components/hrm/StatusBadge";
import {
  payrollApi,
  payrollItemApi,
  employeeApi,
  salaryAdjustmentApi,
  type PayrollRun,
  type PayrollItem,
  type Employee,
  type SalaryAdjustment,
} from "../api/hrm";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <DollarSign className="w-7 h-7 mr-3 text-emerald-600" />
                  薪酬管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理员工薪资、奖金、社保和个税计算
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="2026-05">2026年5月</option>
                <option value="2026-04">2026年4月</option>
                <option value="2026-03">2026年3月</option>
              </select>
              <button
                onClick={handleCreatePayroll}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                创建发放批次
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="发放人数"
            value={`${payrollStats.totalEmployees}人`}
            icon={<Users className="w-5 h-5" />}
            trend={null}
            color="blue"
          />
          <MetricCard
            title="基本工资合计"
            value={formatCurrency(payrollStats.totalBaseSalary)}
            icon={<DollarSign className="w-5 h-5" />}
            trend={null}
            color="green"
          />
          <MetricCard
            title="奖金合计"
            value={formatCurrency(payrollStats.totalBonus)}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={null}
            color="purple"
          />
          <MetricCard
            title="实发工资合计"
            value={formatCurrency(payrollStats.totalNetSalary)}
            icon={<CreditCard className="w-5 h-5" />}
            trend={null}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="平均工资"
            value={formatCurrency(payrollStats.avgSalary)}
            icon={<Receipt className="w-5 h-5" />}
            trend={null}
            color="teal"
          />
          <MetricCard
            title="待计算批次"
            value={payrollStats.pendingRuns}
            icon={<Clock className="w-5 h-5" />}
            trend={null}
            color="yellow"
          />
          <MetricCard
            title="已发放批次"
            value={payrollStats.paidRuns}
            icon={<CheckCircle className="w-5 h-5" />}
            trend={null}
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              薪资构成比例
            </h3>
            <StatsChart type="pie" data={salaryCompositionData} height={250} />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              工资发放状态
            </h3>
            <StatsChart type="pie" data={payrollStatusData} height={250} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "payroll"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>工资发放批次</span>
          </button>
          <button
            onClick={() => setActiveTab("adjustments")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "adjustments"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>调薪记录</span>
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "calculator"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span>个税计算器</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-5 h-5 mr-2" />
              导出
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "payroll" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      发放周期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      员工人数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      发放时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {run.pay_period}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.employee_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(Number(run.total_amount))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPayrollStatusBadge(run.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.paid_at || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => loadPayrollItems(run.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            查看明细
                          </button>
                          {run.status === "draft" && (
                            <button
                              onClick={() => handleCalculate(run.id)}
                              disabled={calculating}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              {calculating ? "计算中..." : "计算薪资"}
                            </button>
                          )}
                          {run.status === "calculated" && (
                            <button
                              onClick={() => handlePay(run.id)}
                              disabled={paying}
                              className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                            >
                              {paying ? "发放中..." : "执行发放"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payrollRuns.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        暂无工资发放批次数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 工资条明细 */}
            {payrollItems.length > 0 && (
              <div className="border-t border-gray-200 mt-6">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">工资条明细</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          员工
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          应发工资
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          扣款
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          个税
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          实发工资
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrollItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getEmployeeName(item.employee_id)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(Number(item.gross_amount))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(Number(item.deductions))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {formatCurrency(Number(item.taxes))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold text-blue-600">
                              {formatCurrency(Number(item.net_amount))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPayrollStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "adjustments" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      员工姓名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      调薪类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原工资
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      新工资
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      调整金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原因
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生效日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {adj.employee_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {adj.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getAdjustmentTypeName(adj.adjustment_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(adj.old_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(adj.new_salary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                        +{formatCurrency(adj.adjustment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {adj.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {adj.effective_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={adj.status}
                          category="employee"
                          showIcon
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "calculator" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              个税计算器
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  税前月收入 (元)
                </label>
                <input
                  type="number"
                  placeholder="请输入税前收入"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  社保公积金 (元)
                </label>
                <input
                  type="number"
                  placeholder="请输入社保公积金"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  专项附加扣除 (元)
                </label>
                <input
                  type="number"
                  placeholder="请输入专项附加扣除"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  计算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrmPayrollPage;
