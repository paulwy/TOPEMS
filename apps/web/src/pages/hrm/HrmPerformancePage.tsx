import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  TrendingUp,
  Award,
  Target,
  Search,
  Plus,
  BarChart3,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/notification/NotificationContainer";
import { StatusBadge } from "@/components/hrm/StatusBadge";
import { PageHeader } from "@/components/templates";
import { StatCardGroup } from "@/components/mui";
import {
  performanceReviewApi,
  performanceGoalApi,
  employeeApi,
  departmentApi,
  type Employee,
} from "@/api/hrm";

interface PerformanceReview {
  id: string;
  employee_name: string;
  employee_no: string;
  department: string;
  position: string;
  review_period: string;
  review_type: "quarterly" | "annual" | "probation";
  status: "pending" | "self_review" | "manager_review" | "completed";
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  self_review_date?: string;
  manager_review_date?: string;
  created_at: string;
}

interface PerformanceGoal {
  id: string;
  employee_name: string;
  goal_title: string;
  goal_description: string;
  weight: number;
  target_value: string;
  current_value?: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  due_date: string;
}

interface EmployeeScore {
  id: string;
  employee_name: string;
  department: string;
  position: string;
  kpi_score: number;
  capability_score: number;
  attitude_score: number;
  final_score: number;
  rank: number;
  review_period: string;
}

const HrmPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<"reviews" | "goals" | "rankings">(
    "reviews",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [rankings, setRankings] = useState<EmployeeScore[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});

  // 绩效统计数据
  const performanceStats = useMemo(() => {
    const totalReviews = reviews.length;
    const completedReviews = reviews.filter(
      (r) => r.status === "completed",
    ).length;
    const pendingReviews = reviews.filter(
      (r) => r.status !== "completed",
    ).length;
    const avgScore =
      reviews.length > 0
        ? reviews
            .filter((r) => r.final_score !== undefined)
            .reduce((sum, r) => sum + (r.final_score || 0), 0) /
          reviews.filter((r) => r.final_score !== undefined).length
        : 0;

    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const inProgressGoals = goals.filter(
      (g) => g.status === "in_progress",
    ).length;
    const avgGoalProgress =
      goals.length > 0
        ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
        : 0;

    return {
      totalReviews,
      completedReviews,
      pendingReviews,
      avgScore: Math.round(avgScore * 10) / 10,
      totalGoals,
      completedGoals,
      inProgressGoals,
      avgGoalProgress: Math.round(avgGoalProgress),
      totalEmployees: Object.keys(employees).length,
    };
  }, [reviews, goals, employees]);

  // 绩效评估状态分布
  const reviewStatusData = useMemo(
    () => [
      {
        name: "已完成",
        value: reviews.filter((r) => r.status === "completed").length,
        color: "#22c55e",
      },
      {
        name: "待开始",
        value: reviews.filter((r) => r.status === "pending").length,
        color: "#94a3b8",
      },
      {
        name: "自评中",
        value: reviews.filter((r) => r.status === "self_review").length,
        color: "#3b82f6",
      },
      {
        name: "待上级评价",
        value: reviews.filter((r) => r.status === "manager_review").length,
        color: "#eab308",
      },
    ],
    [reviews],
  );

  // 目标状态分布
  const goalStatusData = useMemo(
    () => [
      {
        name: "已完成",
        value: goals.filter((g) => g.status === "completed").length,
        color: "#22c55e",
      },
      {
        name: "进行中",
        value: goals.filter((g) => g.status === "in_progress").length,
        color: "#3b82f6",
      },
      {
        name: "未开始",
        value: goals.filter((g) => g.status === "not_started").length,
        color: "#94a3b8",
      },
      {
        name: "已取消",
        value: goals.filter((g) => g.status === "cancelled").length,
        color: "#ef4444",
      },
    ],
    [goals],
  );

  // 部门绩效得分数据
  const departmentScoreData = useMemo(
    () => [
      { name: "研发部", value: 85, color: "#3b82f6" },
      { name: "产品部", value: 88, color: "#22c55e" },
      { name: "销售部", value: 82, color: "#f59e0b" },
      { name: "财务部", value: 90, color: "#ef4444" },
      { name: "人事部", value: 86, color: "#8b5cf6" },
    ],
    [],
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [reviewsRes, goalsRes, employeesRes, departmentsRes] =
        await Promise.all([
          performanceReviewApi.list({ page_size: 100 }),
          performanceGoalApi.list({ page_size: 100 }),
          employeeApi.list({ page_size: 100 }),
          departmentApi.list({ page_size: 100 }),
        ]);

      // 创建员工映射，方便查找
      const employeeMap: Record<string, Employee> = {};
      employeesRes.data?.items?.forEach((emp) => {
        employeeMap[emp.id] = emp;
      });
      setEmployees(employeeMap);

      // 创建部门映射
      const departmentMap: Record<string, any> = {};
      (departmentsRes.data?.items || []).forEach((dept) => {
        departmentMap[dept.id] = dept;
      });

      // 转换绩效评估数据
      const transformedReviews: PerformanceReview[] = (
        reviewsRes.data?.items || []
      ).map((review) => {
        const employee = employeeMap[review.employee_id];
        return {
          id: review.id,
          employee_name: employee?.name || "未知员工",
          employee_no: employee?.employee_no || "",
          department: "",
          position: employee?.position || "",
          review_period: review.review_period,
          review_type: "quarterly",
          status: mapReviewStatus(review.status),
          self_score: review.self_rating,
          manager_score: review.manager_rating,
          final_score: review.final_rating,
          created_at: review.created_at,
        };
      });
      setReviews(transformedReviews);

      // 转换绩效目标数据
      const transformedGoals: PerformanceGoal[] = (
        goalsRes.data?.items || []
      ).map((goal) => {
        const employee = employeeMap[goal.employee_id];
        return {
          id: goal.id,
          employee_name: employee?.name || "未知员工",
          goal_title: goal.title,
          goal_description: goal.description || "",
          weight: goal.weight,
          target_value: goal.target || "",
          current_value: goal.achieved?.toString(),
          progress: Math.min(goal.achieved || 0, 100),
          status: mapGoalStatus(goal.status),
          due_date: goal.due_date || "",
        };
      });
      setGoals(transformedGoals);

      // 基于实际绩效评分数据生成排名
      const rankings: EmployeeScore[] = transformedReviews
        .filter((r) => r.final_score !== undefined)
        .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
        .map((review, index) => ({
          id: review.id,
          employee_name: review.employee_name,
          department: review.department,
          position: review.position,
          kpi_score: review.self_score || 0,
          capability_score: Math.max(0, (review.manager_score || 0) - 5),
          attitude_score: Math.min(100, (review.manager_score || 0) + 2),
          final_score: review.final_score || 0,
          rank: index + 1,
          review_period: review.review_period,
        }));
      setRankings(rankings);
    } catch (err) {
      error("加载数据失败");
      console.error("Failed to load performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const mapReviewStatus = (status: string): PerformanceReview["status"] => {
    const statusMap: Record<string, PerformanceReview["status"]> = {
      pending: "pending",
      self_review: "self_review",
      manager_review: "manager_review",
      completed: "completed",
    };
    return statusMap[status] || "pending";
  };

  const mapGoalStatus = (status: string): PerformanceGoal["status"] => {
    const statusMap: Record<string, PerformanceGoal["status"]> = {
      not_started: "not_started",
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "cancelled",
    };
    return statusMap[status] || "not_started";
  };

  const getPerformanceStatusBadge = (status: string) => (
    <StatusBadge status={status} category="performance" showIcon />
  );

  const filteredReviews = reviews.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      <Box
        sx={{
          maxWidth: 1536,
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        <PageHeader
          title="绩效管理"
          subtitle="管理员工绩效评估、目标设定和绩效考核"
          breadcrumbs={[
            { label: "人力资源", href: "/hrm" },
            { label: "绩效管理" },
          ]}
          backButton={{ onClick: () => navigate("/dashboard") }}
        />

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
          <Box
            component="button"
            onClick={() => setActiveTab("reviews")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "reviews" ? "blue.600" : "grey.500",
              borderBottom: activeTab === "reviews" ? "2px solid" : "none",
              borderColor: "blue.600",
              "&:hover": { color: "grey.700" },
              transition: "color 0.2s",
            }}
          >
            <Award size={20} />
            <span>绩效评估</span>
          </Box>
          <Box
            component="button"
            onClick={() => setActiveTab("goals")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "goals" ? "blue.600" : "grey.500",
              borderBottom: activeTab === "goals" ? "2px solid" : "none",
              borderColor: "blue.600",
              "&:hover": { color: "grey.700" },
              transition: "color 0.2s",
            }}
          >
            <Target size={20} />
            <span>目标管理</span>
          </Box>
          <Box
            component="button"
            onClick={() => setActiveTab("rankings")}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: activeTab === "rankings" ? "blue.600" : "grey.500",
              borderBottom: activeTab === "rankings" ? "2px solid" : "none",
              borderColor: "blue.600",
              "&:hover": { color: "grey.700" },
              transition: "color 0.2s",
            }}
          >
            <BarChart3 size={20} />
            <span>绩效排名</span>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1, position: "relative" }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 1.5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                }}
              >
                <Search size={20} color="#9ca3af" />
              </Box>
              <Box
                component="input"
                type="text"
                placeholder="搜索员工/部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: "100%",
                  pl: 5,
                  pr: 2,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 1,
                  "&:focus": {
                    outline: "none",
                    borderColor: "blue.500",
                    boxShadow: 2,
                  },
                }}
              />
            </Box>
            <Box
              component="button"
              onClick={loadData}
              sx={{
                display: "flex",
                alignItems: "center",
                px: 2,
                py: 1,
                bgcolor: "blue.600",
                color: "white",
                borderRadius: 1,
                "&:hover": { bgcolor: "blue.700" },
                transition: "background-color 0.2s",
              }}
            >
              <Plus size={20} style={{ marginRight: 4 }} />
              刷新数据
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 10,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "3px solid",
                borderColor: "blue.600",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
          </Box>
        ) : (
          <Box>
            {/* Content */}
            {activeTab === "reviews" && (
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  boxShadow: 1,
                  overflow: "hidden",
                }}
              >
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{ minWidth: "100%", borderCollapse: "collapse" }}
                  >
                    <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                      <Box component="tr">
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          员工姓名
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          部门/岗位
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          考核周期
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          自评分
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          上级评分
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          最终得分
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          状态
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 1.5,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          操作
                        </Box>
                      </Box>
                    </Box>
                    <Box component="tbody" sx={{ bgcolor: "background.paper" }}>
                      {filteredReviews.map((review) => (
                        <Box
                          component="tr"
                          key={review.id}
                          sx={{ "&:hover": { bgcolor: "grey.50" } }}
                        >
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, color: "grey.900" }}
                            >
                              {review.employee_name}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.500" }}
                            >
                              {review.employee_no}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.900" }}
                            >
                              {review.department}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.500" }}
                            >
                              {review.position}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.900" }}
                            >
                              {review.review_period}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.900" }}
                            >
                              {review.self_score !== undefined ? (
                                <Typography
                                  component="span"
                                  sx={{
                                    color:
                                      review.self_score >= 90
                                        ? "green.600"
                                        : review.self_score >= 80
                                          ? "blue.600"
                                          : review.self_score >= 70
                                            ? "yellow.600"
                                            : "red.600",
                                  }}
                                >
                                  {review.self_score}
                                </Typography>
                              ) : (
                                <Typography
                                  component="span"
                                  sx={{ color: "grey.400" }}
                                >
                                  -
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.900" }}
                            >
                              {review.manager_score !== undefined ? (
                                <Typography
                                  component="span"
                                  sx={{
                                    color:
                                      review.manager_score >= 90
                                        ? "green.600"
                                        : review.manager_score >= 80
                                          ? "blue.600"
                                          : review.manager_score >= 70
                                            ? "yellow.600"
                                            : "red.600",
                                  }}
                                >
                                  {review.manager_score}
                                </Typography>
                              ) : (
                                <Typography
                                  component="span"
                                  sx={{ color: "grey.400" }}
                                >
                                  -
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            {review.final_score !== undefined ? (
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 700 }}
                                className={getScoreColor(review.final_score)}
                              >
                                {review.final_score}
                              </Typography>
                            ) : (
                              <Typography
                                component="span"
                                sx={{ color: "grey.400" }}
                              >
                                -
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            {getPerformanceStatusBadge(review.status)}
                          </Box>
                          <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Box
                                component="button"
                                sx={{
                                  color: "blue.600",
                                  "&:hover": { color: "blue.800" },
                                }}
                              >
                                查看
                              </Box>
                              {review.status !== "completed" && (
                                <Box
                                  component="button"
                                  sx={{
                                    color: "blue.600",
                                    "&:hover": { color: "blue.800" },
                                  }}
                                >
                                  编辑
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === "goals" && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    md: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                  },
                  gap: 3,
                }}
              >
                {goals.map((goal) => (
                  <Box
                    key={goal.id}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      boxShadow: 1,
                      p: 3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, color: "grey.900" }}
                        >
                          {goal.goal_title}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "grey.500", mt: 0.5 }}
                        >
                          {goal.employee_name}
                        </Typography>
                      </Box>
                      {getPerformanceStatusBadge(goal.status)}
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ color: "grey.600", mb: 2 }}
                    >
                      {goal.goal_description}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "grey.600" }}>
                          目标进度
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: "blue.600" }}
                        >
                          {goal.progress}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          bgcolor: "grey.200",
                          borderRadius: 1,
                          height: 8,
                        }}
                      >
                        <Box
                          sx={{
                            width: `${goal.progress}%`,
                            bgcolor: "blue.600",
                            height: "100%",
                            borderRadius: 1,
                            transition: "width 0.3s",
                          }}
                        />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                        fontSize: "0.875rem",
                      }}
                    >
                      <Box>
                        <Typography component="span" sx={{ color: "grey.500" }}>
                          权重：
                        </Typography>
                        <Typography component="span" sx={{ fontWeight: 500 }}>
                          {goal.weight}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography component="span" sx={{ color: "grey.500" }}>
                          截止日期：
                        </Typography>
                        <Typography component="span" sx={{ fontWeight: 500 }}>
                          {goal.due_date}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: 1,
                        borderColor: "grey.200",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.875rem",
                        }}
                      >
                        <Typography sx={{ color: "grey.600" }}>
                          目标值：{goal.target_value}
                        </Typography>
                      </Box>
                      {goal.current_value && (
                        <Typography
                          sx={{
                            mt: 0.5,
                            fontSize: "0.875rem",
                            color: "grey.600",
                          }}
                        >
                          当前值：{goal.current_value}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Statistics Dashboard */}
            {activeTab === "rankings" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* 统计卡片 */}
                <StatCardGroup
                  stats={[
                    {
                      title: "绩效评估总数",
                      value: performanceStats.totalReviews,
                      icon: <Award size={20} />,
                      color: "primary",
                    },
                    {
                      title: "已完成评估",
                      value: performanceStats.completedReviews,
                      icon: <CheckCircle size={20} />,
                      color: "success",
                    },
                    {
                      title: "待完成评估",
                      value: performanceStats.pendingReviews,
                      icon: <Clock size={20} />,
                      color: "warning",
                    },
                    {
                      title: "平均绩效得分",
                      value: performanceStats.avgScore,
                      icon: <TrendingUp size={20} />,
                      color: "info",
                    },
                  ]}
                  columns={4}
                />

                <StatCardGroup
                  stats={[
                    {
                      title: "绩效目标总数",
                      value: performanceStats.totalGoals,
                      icon: <Target size={20} />,
                      color: "primary",
                    },
                    {
                      title: "进行中目标",
                      value: performanceStats.inProgressGoals,
                      icon: <Clock size={20} />,
                      color: "warning",
                    },
                    {
                      title: "平均目标进度",
                      value: `${performanceStats.avgGoalProgress}%`,
                      icon: <BarChart3 size={20} />,
                      color: "info",
                    },
                  ]}
                  columns={3}
                />

                {/* 状态分布表格 */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(1, 1fr)",
                      lg: "repeat(2, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      boxShadow: 1,
                      p: 3,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}
                    >
                      绩效评估状态分布
                    </Typography>
                    <Box
                      component="table"
                      sx={{ minWidth: "100%", borderCollapse: "collapse" }}
                    >
                      <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                        <Box component="tr">
                          <Box
                            component="th"
                            sx={{
                              px: 2,
                              py: 1,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                            }}
                          >
                            状态
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 2,
                              py: 1,
                              textAlign: "right",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                            }}
                          >
                            数量
                          </Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {reviewStatusData.map((item) => (
                          <Box
                            component="tr"
                            key={item.name}
                            sx={{ "&:hover": { bgcolor: "grey.50" } }}
                          >
                            <Box
                              sx={{
                                px: 2,
                                py: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  bgcolor: item.color,
                                }}
                              />
                              <Typography variant="body2">
                                {item.name}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                              >
                                {item.value}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      boxShadow: 1,
                      p: 3,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}
                    >
                      绩效目标状态分布
                    </Typography>
                    <Box
                      component="table"
                      sx={{ minWidth: "100%", borderCollapse: "collapse" }}
                    >
                      <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                        <Box component="tr">
                          <Box
                            component="th"
                            sx={{
                              px: 2,
                              py: 1,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                            }}
                          >
                            状态
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 2,
                              py: 1,
                              textAlign: "right",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                            }}
                          >
                            数量
                          </Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {goalStatusData.map((item) => (
                          <Box
                            component="tr"
                            key={item.name}
                            sx={{ "&:hover": { bgcolor: "grey.50" } }}
                          >
                            <Box
                              sx={{
                                px: 2,
                                py: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  bgcolor: item.color,
                                }}
                              />
                              <Typography variant="body2">
                                {item.name}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                              >
                                {item.value}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    boxShadow: 1,
                    p: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}
                  >
                    部门平均绩效得分
                  </Typography>
                  <Box
                    component="table"
                    sx={{ minWidth: "100%", borderCollapse: "collapse" }}
                  >
                    <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                      <Box component="tr">
                        <Box
                          component="th"
                          sx={{
                            px: 2,
                            py: 1,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                          }}
                        >
                          部门
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 2,
                            py: 1,
                            textAlign: "right",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "grey.500",
                          }}
                        >
                          平均得分
                        </Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {departmentScoreData.map((item) => (
                        <Box
                          component="tr"
                          key={item.name}
                          sx={{ "&:hover": { bgcolor: "grey.50" } }}
                        >
                          <Box
                            sx={{
                              px: 2,
                              py: 1.5,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                bgcolor: item.color,
                              }}
                            />
                            <Typography variant="body2">{item.name}</Typography>
                          </Box>
                          <Box sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {item.value}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>

                {/* 排名表格 */}
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    boxShadow: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ overflowX: "auto" }}>
                    <Box
                      component="table"
                      sx={{ minWidth: "100%", borderCollapse: "collapse" }}
                    >
                      <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                        <Box component="tr">
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            排名
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            员工姓名
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            部门/岗位
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            KPI得分
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            能力得分
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            态度得分
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            综合得分
                          </Box>
                          <Box
                            component="th"
                            sx={{
                              px: 3,
                              py: 1.5,
                              textAlign: "left",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "grey.500",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            考核周期
                          </Box>
                        </Box>
                      </Box>
                      <Box
                        component="tbody"
                        sx={{ bgcolor: "background.paper" }}
                      >
                        {rankings.map((employee, index) => (
                          <Box
                            component="tr"
                            key={employee.id}
                            sx={{ "&:hover": { bgcolor: "grey.50" } }}
                          >
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                <Typography
                                  component="span"
                                  sx={{
                                    fontSize: "1.125rem",
                                    fontWeight: 700,
                                    color:
                                      index === 0
                                        ? "yellow.500"
                                        : index === 1
                                          ? "grey.400"
                                          : index === 2
                                            ? "orange.400"
                                            : "grey.600",
                                  }}
                                >
                                  #{employee.rank}
                                </Typography>
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500, color: "grey.900" }}
                              >
                                {employee.employee_name}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.900" }}
                              >
                                {employee.department}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.500" }}
                              >
                                {employee.position}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.900" }}
                              >
                                {employee.kpi_score}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.900" }}
                              >
                                {employee.capability_score}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.900" }}
                              >
                                {employee.attitude_score}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 700 }}
                                className={getScoreColor(employee.final_score)}
                              >
                                {employee.final_score}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2, whiteSpace: "nowrap" }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.500" }}
                              >
                                {employee.review_period}
                              </Typography>
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
      </Box>
    </Box>
  );
};

export default HrmPerformancePage;
