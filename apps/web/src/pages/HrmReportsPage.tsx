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
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ width: 48, height: 48, borderRadius: "50%", border: 4, borderColor: "divider", borderTopColor: "primary.main", animation: "spin 1s linear infinite" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <Box sx={{ bgcolor: "background.paper", boxShadow: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ maxWidth: 1536, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                HR数据分析报表
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                实时查看人力资源数据统计与分析
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
                <BarChart3 sx={{ width: 16, height: 16, mr: 1 }} />
                导出报表
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1536, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: 2, md: 3, lg: 6 }, gap: 2, mb: 3 }}>
          <Card sx={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#dbeafe" }}>总员工数</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {formatNumber(employeeSummary?.total_employees || 0)}
                  </Typography>
                </Box>
                <Users sx={{ width: 40, height: 40, color: "#bfdbfe" }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#dcfce7" }}>在职员工</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {formatNumber(employeeSummary?.active_employees || 0)}
                  </Typography>
                </Box>
                <Briefcase sx={{ width: 40, height: 40, color: "#bbf7d0" }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "linear-gradient(135deg, #a855f7, #9333ea)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#f3e8ff" }}>活跃合同</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {formatNumber(contractSummary?.active_contracts || 0)}
                  </Typography>
                </Box>
                <FileText sx={{ width: 40, height: 40, color: "#e9d5ff" }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#ffedd5" }}>本月新入职</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {formatNumber(employeeSummary?.new_hires_this_month || 0)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ width: 40, height: 40, color: "#fed7aa" }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#fee2e2" }}>培训完成率</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {trainingSummary?.avg_completion_rate || 0}%
                  </Typography>
                </Box>
                <BookOpen sx={{ width: 40, height: 40, color: "#fecaca" }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "#e0e7ff" }}>考勤率</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {attendanceSummary?.attendance_rate || 0}%
                  </Typography>
                </Box>
                <Clock sx={{ width: 40, height: 40, color: "#c7d2fe" }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v as string)}>
            <Tab value="overview" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BarChart3 sx={{ width: 16, height: 16 }} />
                概览
              </Box>
            } />
            <Tab value="employee" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Users sx={{ width: 16, height: 16 }} />
                员工分析
              </Box>
            } />
            <Tab value="training" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BookOpen sx={{ width: 16, height: 16 }} />
                培训分析
              </Box>
            } />
            <Tab value="payroll" label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DollarSign sx={{ width: 16, height: 16 }} />
                薪资分析
              </Box>
            } />
          </Tabs>
        </Box>

          {activeTab === "overview" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 3 }, gap: 3 }}>
                <Card sx={{ gridColumn: { lg: "span 2" } }}>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>部门人员分布</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>各部门员工数量统计</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {departmentSummary.map((dept) => {
                      const percentage = employeeSummary?.total_employees
                        ? (dept.employee_count /
                            employeeSummary.total_employees) *
                          100
                        : 0;
                      return (
                        <Box key={dept.department_id} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {dept.department_name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "grey.500" }}>
                              {dept.active_count} / {dept.employee_count}
                            </Typography>
                          </Box>
                          <Box sx={{ height: 8, bgcolor: "grey.200", borderRadius: 1, overflow: "hidden" }}>
                            <Box
                              sx={{ height: "100%", bgcolor: "blue.500", borderRadius: 1, transition: "all 0.5s", width: `${percentage}%` }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>合同到期提醒</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>即将到期的合同统计</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "red.50", borderRadius: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "grey.600" }}>本月到期</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: "red.600" }}>
                          {contractSummary?.expiring_this_month || 0}
                        </Typography>
                      </Box>
                      <Chip size="small" color="error" label="紧急" />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "yellow.50", borderRadius: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "grey.600" }}>下月到期</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: "yellow.700" }}>
                          {contractSummary?.expiring_next_month || 0}
                        </Typography>
                      </Box>
                      <Chip size="small" variant="outlined" label="提醒" />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "green.50", borderRadius: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "grey.600" }}>活跃合同</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: "green.600" }}>
                          {contractSummary?.active_contracts || 0}
                        </Typography>
                      </Box>
                      <Chip size="small" label="正常" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 2 }, gap: 3 }}>
              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>考勤统计</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>近期考勤情况分析</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: 4, gap: 2 }}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "green.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "green.600" }}>
                        {attendanceSummary?.on_time_count || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>准时</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "yellow.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "yellow.700" }}>
                        {attendanceSummary?.late_count || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>迟到</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "red.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "red.600" }}>
                        {attendanceSummary?.absent_count || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>缺勤</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "blue.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "blue.600" }}>
                        {attendanceSummary?.leave_count || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>请假</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训统计</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>培训计划与课程完成情况</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: 3, gap: 2 }}>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "purple.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "purple.600" }}>
                        {trainingSummary?.total_plans || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>培训计划</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "indigo.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "indigo.600" }}>
                        {trainingSummary?.total_courses || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>培训课程</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 2, bgcolor: "pink.50", borderRadius: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "pink.600" }}>
                        {trainingSummary?.total_records || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>培训记录</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" sx={{ color: "grey.600" }}>整体完成率</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "green.600" }}>
                        {trainingSummary?.avg_completion_rate || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 12, bgcolor: "grey.300", borderRadius: 1, overflow: "hidden" }}>
                      <Box
                        sx={{
                          height: "100%",
                          background: "linear-gradient(to right, #4ade80, #16a34a)",
                          borderRadius: 1,
                          transition: "all 0.5s",
                          width: `${trainingSummary?.avg_completion_rate || 0}%`,
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
          )}

          {activeTab === "employee" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 2 }, gap: 3 }}>
                <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>员工基本信息</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>员工总数与状态分布</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
                      <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>总员工数</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "grey.900" }}>
                          {formatNumber(employeeSummary?.total_employees || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: "green.50", borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>在职员工</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "green.600" }}>
                          {formatNumber(employeeSummary?.active_employees || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: "red.50", borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>离职员工</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "red.600" }}>
                          {formatNumber(employeeSummary?.inactive_employees || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: "blue.50", borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>平均司龄(天)</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "blue.600" }}>
                          {formatNumber(employeeSummary?.avg_tenure_days || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>性别分布</Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>男女性员工比例</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Box sx={{ width: 192, height: 192, position: "relative" }}>
                      <svg
                        viewBox="0 0 100 100"
                        sx={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
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
                      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                          {formatNumber(
                            (employeeSummary?.male_count || 0) +
                              (employeeSummary?.female_count || 0),
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>总人数</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 4, mt: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "blue.500" }} />
                      <Typography variant="body2" sx={{ color: "grey.700" }}>
                        男: {employeeSummary?.male_count || 0}人
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "pink.500" }} />
                      <Typography variant="body2" sx={{ color: "grey.700" }}>
                        女: {employeeSummary?.female_count || 0}人
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Card>
              <CardHeader sx={{ pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>月度人员变动</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>本月入职与离职统计</Typography>
              </CardHeader>
              <CardContent sx={{ pt: 2 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, md: 2 }, gap: 3 }}>
                  <Box sx={{ p: 3, background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", borderRadius: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "green.500", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <TrendingUp sx={{ width: 28, height: 28, color: "white" }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "green.700" }}>本月新入职</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: "green.600" }}>
                          {formatNumber(
                            employeeSummary?.new_hires_this_month || 0,
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "green.600", mt: 0.5 }}>人</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ p: 3, background: "linear-gradient(135deg, #fee2e2, #fecaca)", borderRadius: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "red.500", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <TrendingDown sx={{ width: 28, height: 28, color: "white" }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "red.700" }}>本月离职</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: "red.600" }}>
                          {formatNumber(
                            employeeSummary?.terminations_this_month || 0,
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "red.600", mt: 0.5 }}>人</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          )}

          {activeTab === "training" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 3 }, gap: 3 }}>
              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训计划</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "blue.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>总计划数</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "blue.600" }}>
                        {trainingSummary?.total_plans || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "green.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>进行中</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "green.600" }}>
                        {trainingSummary?.active_plans || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训课程</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "purple.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>总课程数</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "purple.600" }}>
                        {trainingSummary?.total_courses || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "indigo.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>已完成</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "indigo.600" }}>
                        {trainingSummary?.completed_courses || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>培训记录</Typography>
                </CardHeader>
                <CardContent sx={{ pt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "orange.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>总记录数</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "orange.600" }}>
                        {trainingSummary?.total_records || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "pink.50", borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: "grey.700" }}>已完成</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "pink.600" }}>
                        {trainingSummary?.completed_records || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Card>
              <CardHeader sx={{ pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>培训完成率趋势</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>培训完成情况分析</Typography>
              </CardHeader>
              <CardContent sx={{ pt: 2 }}>
                <Box sx={{ height: 256, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
                  {[1, 2, 3, 4, 5, 6].map((month) => {
                    const height = Math.floor(Math.random() * 60) + 40;
                    return (
                      <Box
                        key={month}
                        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            background: "linear-gradient(to top, #3b82f6, #60a5fa)",
                            borderTopLeftRadius: 8,
                            borderTopRightRadius: 8,
                            transition: "all 0.3s",
                            height: `${height}%`,
                            "&:hover": {
                              background: "linear-gradient(to top, #2563eb, #3b82f6)",
                            },
                          }}
                        />
                        <Typography variant="xs" sx={{ color: "grey.500", mt: 1 }}>
                          {
                            ["1月", "2月", "3月", "4月", "5月", "6月"][
                              month - 1
                            ]
                          }
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Box>
          )}

          {activeTab === "payroll" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 4 }, gap: 2 }}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>薪资总额</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900", mt: 0.5 }}>
                    {formatCurrency(payrollSummary?.total_payroll || 0)}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>平均薪资</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900", mt: 0.5 }}>
                    {formatCurrency(payrollSummary?.avg_salary || 0)}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>最高薪资</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "green.600", mt: 0.5 }}>
                    {formatCurrency(payrollSummary?.max_salary || 0)}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>最低薪资</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "blue.600", mt: 0.5 }}>
                    {formatCurrency(payrollSummary?.min_salary || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Card>
              <CardHeader sx={{ pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>薪资结构分析</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>薪资构成比例</Typography>
              </CardHeader>
              <CardContent sx={{ pt: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Box sx={{ width: 256, height: 256, position: "relative" }}>
                    <svg
                      viewBox="0 0 100 100"
                      sx={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
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
                    <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                        {formatCurrency(payrollSummary?.total_payroll || 0)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>总额</Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "blue.500" }} />
                    <Typography variant="body2" sx={{ color: "grey.700" }}>基本工资 60%</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "green.500" }} />
                    <Typography variant="body2" sx={{ color: "grey.700" }}>绩效奖金 25%</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "yellow.500" }} />
                    <Typography variant="body2" sx={{ color: "grey.700" }}>福利补贴 15%</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          )}
      </Box>
    </Box>
  );
};

export default HrmReportsPage;
