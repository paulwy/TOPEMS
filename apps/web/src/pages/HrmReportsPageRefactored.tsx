/**
 * HrmReportsPage 重构后
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用统计卡片展示关键指标
 * 3. 保持业务逻辑不变
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
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
} from "lucide-react";
import { useNotification } from "../hooks/useNotification";
import { PageHeader } from "../components/layout";
import { StatCardGroup } from "../components/mui";

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
  const navigate = useNavigate();
  const { error } = useNotification();

  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary[]>([]);
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null);
  const [trainingSummary, setTrainingSummary] = useState<TrainingSummary | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
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

  // 概览标签页统计卡片
  const overviewStats = useMemo(
    () => [
      {
        id: "total",
        title: "总员工数",
        value: formatNumber(employeeSummary?.total_employees || 0),
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "在职员工",
        value: formatNumber(employeeSummary?.active_employees || 0),
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "contracts",
        title: "活跃合同",
        value: formatNumber(contractSummary?.active_contracts || 0),
        icon: <FileText style={{ width: 24, height: 24 }} />,
        color: "secondary" as const,
      },
      {
        id: "newHires",
        title: "本月新入职",
        value: formatNumber(employeeSummary?.new_hires_this_month || 0),
        icon: <TrendingUp style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "training",
        title: "培训完成率",
        value: `${trainingSummary?.avg_completion_rate || 0}%`,
        icon: <BookOpen style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "attendance",
        title: "考勤率",
        value: `${attendanceSummary?.attendance_rate || 0}%`,
        icon: <Clock style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
    ],
    [employeeSummary, contractSummary, trainingSummary, attendanceSummary],
  );

  if (loading) {
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
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: 4,
            borderColor: "divider",
            borderTopColor: "#3b82f6",
            animation: "spin 1s linear infinite",
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <PageHeader
        title="HR数据分析报表"
        subtitle="实时查看人力资源数据统计与分析"
        showBack
        onBack={() => navigate(-1)}
        actions={
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
            <Button sx={{ bgcolor: "#3b82f6" }}>
              <BarChart3 sx={{ width: 16, height: 16, mr: 1 }} />
              导出报表
            </Button>
          </Box>
        }
      />

      <Box sx={{ maxWidth: 1536, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        {/* 概览统计卡片 */}
        <Paper sx={{ mb: 3, borderRadius: 2, p: 2 }}>
          <StatCardGroup stats={overviewStats} columns={6} />
        </Paper>

        {/* 标签页 */}
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as string)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              value="overview"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BarChart3 sx={{ width: 16, height: 16 }} />
                  概览
                </Box>
              }
            />
            <Tab
              value="employee"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Users sx={{ width: 16, height: 16 }} />
                  员工分析
                </Box>
              }
            />
            <Tab
              value="training"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BookOpen sx={{ width: 16, height: 16 }} />
                  培训分析
                </Box>
              }
            />
            <Tab
              value="payroll"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DollarSign sx={{ width: 16, height: 16 }} />
                  薪资分析
                </Box>
              }
            />
          </Tabs>
        </Paper>

        {activeTab === "overview" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* 部门人员分布 */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                部门人员分布
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                各部门员工数量统计
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {departmentSummary.map((dept) => {
                  const percentage = employeeSummary?.total_employees
                    ? (dept.employee_count / employeeSummary.total_employees) * 100
                    : 0;
                  return (
                    <Box key={dept.department_id}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {dept.department_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dept.active_count} / {dept.employee_count}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, bgcolor: "grey.200", borderRadius: 1, overflow: "hidden" }}>
                        <Box
                          sx={{
                            height: "100%",
                            bgcolor: "#3b82f6",
                            borderRadius: 1,
                            transition: "all 0.5s",
                            width: `${percentage}%`,
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* 合同到期提醒 */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                合同到期提醒
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 2, bgcolor: "red.50", borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">本月到期</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "red.600" }}>
                      {contractSummary?.expiring_this_month || 0}
                    </Typography>
                  </Box>
                  <Chip size="small" color="error" label="紧急" />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 2, bgcolor: "yellow.50", borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">下月到期</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "yellow.700" }}>
                      {contractSummary?.expiring_next_month || 0}
                    </Typography>
                  </Box>
                  <Chip size="small" variant="outlined" label="提醒" />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 2, bgcolor: "green.50", borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">活跃合同</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "green.600" }}>
                      {contractSummary?.active_contracts || 0}
                    </Typography>
                  </Box>
                  <Chip size="small" label="正常" />
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {activeTab === "employee" && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              员工分析
            </Typography>
            <Typography variant="body2" color="text.secondary">
              员工数据统计分析 - 功能开发中
            </Typography>
          </Paper>
        )}

        {activeTab === "training" && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              培训分析
            </Typography>
            <Typography variant="body2" color="text.secondary">
              培训数据统计分析 - 功能开发中
            </Typography>
          </Paper>
        )}

        {activeTab === "payroll" && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              薪资分析
            </Typography>
            <Typography variant="body2" color="text.secondary">
              薪资数据统计分析 - 功能开发中
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default HrmReportsPage;