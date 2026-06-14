import { Button, Card, CardContent, CardHeader, Chip, Typography, Box, Tabs, Tab } from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Users,
  Briefcase,
  FileText,
  BookOpen,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react";
import { useNotification } from "../hooks/useNotification";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

interface EmployeeSummary {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  male_count: number;
  female_count: number;
  avg_tenure_days: number;
  new_hires_this_month: number;
  terminations_this_month: number;
}

interface DepartmentSummary {
  department_id: string;
  department_name: string;
  employee_count: number;
  active_count: number;
}

interface ContractSummary {
  total_contracts: number;
  active_contracts: number;
  expired_contracts: number;
  expiring_this_month: number;
  expiring_next_month: number;
}

interface TrainingSummary {
  total_plans: number;
  active_plans: number;
  total_courses: number;
  completed_courses: number;
  total_records: number;
  completed_records: number;
  avg_completion_rate: number;
}

interface AttendanceSummary {
  total_records: number;
  on_time_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  attendance_rate: number;
}

interface PayrollSummary {
  total_payroll: number;
  avg_salary: number;
  min_salary: number;
  max_salary: number;
  employee_count: number;
  bonus_total: number;
}

const HrmReportsPage: React.FC = () => {
  const { error } = useNotification();

  const [employeeSummary, setEmployeeSummary] =
    useState<EmployeeSummary | null>(null);
  const [departmentSummary, setDepartmentSummary] = useState<
    DepartmentSummary[]
  >([]);
  const [contractSummary, setContractSummary] =
    useState<ContractSummary | null>(null);
  const [trainingSummary, setTrainingSummary] =
    useState<TrainingSummary | null>(null);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    loadReports();
  }, [timeRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const promises = [
        fetch("/api/hrm/reports/employee-summary"),
        fetch("/api/hrm/reports/department-summary"),
        fetch("/api/hrm/reports/contract-summary"),
        fetch("/api/hrm/reports/training-summary"),
        fetch("/api/hrm/reports/attendance-summary"),
        fetch("/api/hrm/reports/payroll-summary"),
      ];

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map((r) => r.json()));

      if (results[0].code === 200) setEmployeeSummary(results[0].data);
      if (results[1].code === 200)
        setDepartmentSummary(results[1].data.departments);
      if (results[2].code === 200) setContractSummary(results[2].data);
      if (results[3].code === 200) setTrainingSummary(results[3].data);
      if (results[4].code === 200) setAttendanceSummary(results[4].data);
      if (results[5].code === 200) setPayrollSummary(results[5].data);
    } catch (err) {
      console.error("Failed to load reports:", err);
      error("加载报表数据失败");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("zh-CN");
  };

  const formatCurrency = (num: number) => {
    return `¥${num.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                HR数据分析报表
              </h1>
              <p className="text-sm text-gray-500">
                实时查看人力资源数据统计与分析
              </p>
            </div>
            <div className="flex items-center gap-4">
              <FormControl size="small" sx={{ width: 120 }}>
                <InputLabel>时间范围</InputLabel>
                <Select
                  value={timeRange}
                  label="时间范围"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="week">本周</MenuItem>
                  <MenuItem value="month">本月</MenuItem>
                  <MenuItem value="quarter">本季度</MenuItem>
                  <MenuItem value="year">本年</MenuItem>
                </Select>
              </FormControl>
              <Button>
                <BarChart3 className="w-4 h-4 mr-2" />
                导出报表
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">总员工数</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(employeeSummary?.total_employees || 0)}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">在职员工</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(employeeSummary?.active_employees || 0)}
                  </p>
                </div>
                <Briefcase className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">活跃合同</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(contractSummary?.active_contracts || 0)}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">本月新入职</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(employeeSummary?.new_hires_this_month || 0)}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">培训完成率</p>
                  <p className="text-2xl font-bold mt-1">
                    {trainingSummary?.avg_completion_rate || 0}%
                  </p>
                </div>
                <BookOpen className="w-10 h-10 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">考勤率</p>
                  <p className="text-2xl font-bold mt-1">
                    {attendanceSummary?.attendance_rate || 0}%
                  </p>
                </div>
                <Clock className="w-10 h-10 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v as string)}>
            <Tab value="overview" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BarChart3 className="w-4 h-4" />
                概览
              </Box>
            } />
            <Tab value="employee" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Users className="w-4 h-4" />
                员工分析
              </Box>
            } />
            <Tab value="training" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BookOpen className="w-4 h-4" />
                培训分析
              </Box>
            } />
            <Tab value="payroll" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DollarSign className="w-4 h-4" />
                薪资分析
              </Box>
            } />
          </Tabs>
        </Box>

          {activeTab === "overview" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>部门人员分布</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>各部门员工数量统计</Typography>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentSummary.map((dept) => {
                      const percentage = employeeSummary?.total_employees
                        ? (dept.employee_count /
                            employeeSummary.total_employees) *
                          100
                        : 0;
                      return (
                        <div key={dept.department_id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {dept.department_name}
                            </span>
                            <span className="text-gray-500">
                              {dept.active_count} / {dept.employee_count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>合同到期提醒</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>即将到期的合同统计</Typography>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">本月到期</p>
                      <p className="text-2xl font-bold text-red-600">
                        {contractSummary?.expiring_this_month || 0}
                      </p>
                    </div>
                    <Chip  size="small" color="error" label="紧急" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">下月到期</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {contractSummary?.expiring_next_month || 0}
                      </p>
                    </div>
                    <Chip  size="small" variant="outlined" label="提醒" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">活跃合同</p>
                      <p className="text-2xl font-bold text-green-600">
                        {contractSummary?.active_contracts || 0}
                      </p>
                    </div>
                    <Chip  size="small" label="正常" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>考勤统计</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>近期考勤情况分析</Typography>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {attendanceSummary?.on_time_count || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">准时</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {attendanceSummary?.late_count || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">迟到</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceSummary?.absent_count || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">缺勤</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {attendanceSummary?.leave_count || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">请假</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训统计</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>培训计划与课程完成情况</Typography>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {trainingSummary?.total_plans || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">培训计划</p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">
                        {trainingSummary?.total_courses || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">培训课程</p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <p className="text-2xl font-bold text-pink-600">
                        {trainingSummary?.total_records || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">培训记录</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">整体完成率</span>
                      <span className="font-bold text-green-600">
                        {trainingSummary?.avg_completion_rate || 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${trainingSummary?.avg_completion_rate || 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Box>
          )}

          {activeTab === "employee" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>员工基本信息</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>员工总数与状态分布</Typography>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">总员工数</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatNumber(employeeSummary?.total_employees || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-500">在职员工</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatNumber(employeeSummary?.active_employees || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-500">离职员工</p>
                      <p className="text-3xl font-bold text-red-600">
                        {formatNumber(employeeSummary?.inactive_employees || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-500">平均司龄(天)</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {formatNumber(employeeSummary?.avg_tenure_days || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>性别分布</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>男女性员工比例</Typography>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="w-48 h-48 relative">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full transform -rotate-90"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="12"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${((employeeSummary?.male_count || 0) / ((employeeSummary?.male_count || 0) + (employeeSummary?.female_count || 0) || 1)) * 251.2} 251.2`}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#ec4899"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${((employeeSummary?.female_count || 0) / ((employeeSummary?.male_count || 0) + (employeeSummary?.female_count || 0) || 1)) * 251.2} 251.2`}
                          transform="rotate(0 50 50)"
                          style={{
                            strokeDashoffset: `-${((employeeSummary?.male_count || 0) / ((employeeSummary?.male_count || 0) + (employeeSummary?.female_count || 0) || 1)) * 251.2}`,
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatNumber(
                            (employeeSummary?.male_count || 0) +
                              (employeeSummary?.female_count || 0),
                          )}
                        </span>
                        <span className="text-sm text-gray-500">总人数</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-8 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-600">
                        男: {employeeSummary?.male_count || 0}人
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                      <span className="text-sm text-gray-600">
                        女: {employeeSummary?.female_count || 0}人
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>月度人员变动</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>本月入职与离职统计</Typography>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                        <TrendingUp className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-700">本月新入职</p>
                        <p className="text-4xl font-bold text-green-600">
                          {formatNumber(
                            employeeSummary?.new_hires_this_month || 0,
                          )}
                        </p>
                        <p className="text-sm text-green-500 mt-1">人</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                        <TrendingDown className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-red-700">本月离职</p>
                        <p className="text-4xl font-bold text-red-600">
                          {formatNumber(
                            employeeSummary?.terminations_this_month || 0,
                          )}
                        </p>
                        <p className="text-sm text-red-500 mt-1">人</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Box>
          )}

          {activeTab === "training" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训计划</Typography>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">总计划数</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {trainingSummary?.total_plans || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">进行中</span>
                      <span className="text-2xl font-bold text-green-600">
                        {trainingSummary?.active_plans || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训课程</Typography>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-gray-700">总课程数</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {trainingSummary?.total_courses || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700">已完成</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {trainingSummary?.completed_courses || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训记录</Typography>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-gray-700">总记录数</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {trainingSummary?.total_records || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                      <span className="text-gray-700">已完成</span>
                      <span className="text-2xl font-bold text-pink-600">
                        {trainingSummary?.completed_records || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>培训完成率趋势</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>培训完成情况分析</Typography>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-4">
                  {[1, 2, 3, 4, 5, 6].map((month) => {
                    const height = Math.floor(Math.random() * 60) + 40;
                    return (
                      <div
                        key={month}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-400"
                          style={{ height: `${height}%` }}
                        ></div>
                        <span className="text-xs text-gray-500 mt-2">
                          {
                            ["1月", "2月", "3月", "4月", "5月", "6月"][
                              month - 1
                            ]
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </Box>
          )}

          {activeTab === "payroll" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">薪资总额</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(payrollSummary?.total_payroll || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">平均薪资</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(payrollSummary?.avg_salary || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">最高薪资</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(payrollSummary?.max_salary || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">最低薪资</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(payrollSummary?.min_salary || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>薪资结构分析</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>薪资构成比例</Typography>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="w-64 h-64 relative">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full transform -rotate-90"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="16"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray="150.72 251.2"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray="62.8 251.2"
                        style={{ strokeDashoffset: "-150.72" }}
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray="37.68 251.2"
                        style={{ strokeDashoffset: "-213.52" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(payrollSummary?.total_payroll || 0)}
                      </span>
                      <span className="text-sm text-gray-500">总额</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600">基本工资 60%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">绩效奖金 25%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-600">福利补贴 15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Box>
          )}
      </div>
    </div>
  );
};

export default HrmReportsPage;
