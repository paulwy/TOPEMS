import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { Project, Contract, PmStatistics } from "../api/pm";
import { pmApi } from "../api/pm";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import { PageHeader } from "../components/templates";

const PmDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PmStatistics>({
    total_projects: 0,
    draft_projects: 0,
    pending_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_contracts: 0,
    pending_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_budget: 0,
    spent_budget: 0,
    budget_usage_rate: 0,
    on_time_projects: 0,
    delayed_projects: 0,
    average_progress: 0,
    high_risk_projects: 0,
    medium_risk_projects: 0,
    low_risk_projects: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await pmApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        pmApi.projects.list().then((res) => {
          if (res.success && res.data) {
            setProjects(res.data.projects || []);
          }
        }),
        pmApi.contracts.list().then((res) => {
          if (res.success && res.data) {
            setContracts(res.data.contracts || []);
          }
        }),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return { bgcolor: "#dcfce7", color: "#166534" };
      case "completed":
        return { bgcolor: "#dbeafe", color: "#1e40af" };
      case "pending":
        return { bgcolor: "#fef9c3", color: "#a16207" };
      default:
        return { bgcolor: "#f3f4f6", color: "#374151" };
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "进行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待审批";
      case "cancelled":
        return "已取消";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const quickActions = [
    {
      title: "项目管理",
      description: "查看和管理所有项目",
      icon: FolderKanban,
      color: "#3b82f6",
      path: "/pm/projects",
    },
    {
      title: "合同管理",
      description: "管理项目相关合同",
      icon: FileCheck,
      color: "#a855f7",
      path: "/pm/contracts",
    },
    {
      title: "预算管理",
      description: "管理项目预算和支出",
      icon: DollarSign,
      color: "#22c55e",
      path: "/pm/projects",
    },
    {
      title: "项目报告",
      description: "查看项目统计报表",
      icon: BarChart3,
      color: "#f97316",
      path: "/pm/projects",
    },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: "grey.100", minHeight: "100vh" }}>
      <PageHeader
        title="项目管理中心"
        subtitle="统一管理所有项目、合同和相关资源"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "项目管理" },
        ]}
        backButton={{ onClick: () => navigate("/dashboard") }}
      />

      {/* 统计卡片区域 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(1, 1fr)",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
            xl: "repeat(6, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >
        <MetricCard
          title="项目总数"
          value={stats.total_projects}
          icon={<FolderKanban sx={{ width: 24, height: 24 }} />}
          gradient={["#8B5CF6", "#7C3AED"]}
          subtitle={`进行中: ${stats.active_projects}`}
          trend={stats.active_projects > 0 ? "up" : "neutral"}
        />
        <MetricCard
          title="已完成项目"
          value={stats.completed_projects}
          icon={<CheckCircle2 sx={{ width: 24, height: 24 }} />}
          gradient={["#00C897", "#00A878"]}
          trend="up"
        />
        <MetricCard
          title="合同总数"
          value={stats.total_contracts}
          icon={<FileCheck sx={{ width: 24, height: 24 }} />}
          gradient={["#6366F1", "#4F46E5"]}
          subtitle={`进行中: ${stats.active_contracts}`}
          trend={stats.active_contracts > 0 ? "up" : "neutral"}
        />
        <MetricCard
          title="预算使用"
          value={stats.budget_usage_rate}
          icon={<DollarSign sx={{ width: 24, height: 24 }} />}
          gradient={["#F59E0B", "#D97706"]}
          subtitle={`已用: ${(stats.spent_budget / 10000).toFixed(1)}万 / ${(stats.total_budget / 10000).toFixed(1)}万`}
          trend="neutral"
          suffix="%"
        />
        <MetricCard
          title="项目进度"
          value={stats.average_progress}
          icon={<TrendingUp sx={{ width: 24, height: 24 }} />}
          gradient={["#14B8A6", "#0D9488"]}
          subtitle={`准时: ${stats.on_time_projects} 个`}
          trend="up"
          suffix="%"
        />
        <MetricCard
          title="高风险项目"
          value={stats.high_risk_projects}
          icon={<AlertTriangle sx={{ width: 24, height: 24 }} />}
          gradient={["#EF4444", "#DC2626"]}
          subtitle={`中: ${stats.medium_risk_projects} 低: ${stats.low_risk_projects}`}
          trend={stats.high_risk_projects > 0 ? "down" : "neutral"}
        />
      </Box>

      {/* 数据可视化图表区域 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          mb: 4,
        }}
      >
        <StatsChart
          title="项目状态分布"
          type="pie"
          data={[
            { name: "草稿", value: stats.draft_projects, color: "#6B7280" },
            { name: "待审批", value: stats.pending_projects, color: "#F59E0B" },
            { name: "进行中", value: stats.active_projects, color: "#3B82F6" },
            {
              name: "已完成",
              value: stats.completed_projects,
              color: "#10B981",
            },
            {
              name: "已取消",
              value: stats.cancelled_projects,
              color: "#EF4444",
            },
          ].filter((d) => d.value > 0)}
          dataKey="value"
          nameKey="name"
        />
        <StatsChart
          title="项目进度对比"
          type="pie"
          data={[
            { name: "准时", value: stats.on_time_projects, color: "#10B981" },
            { name: "延迟", value: stats.delayed_projects, color: "#EF4444" },
          ].filter((d) => d.value > 0)}
          dataKey="value"
          nameKey="name"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900" }}
            >
              快速操作
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
            }}
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Box
                  key={index}
                  onClick={() => navigate(action.path)}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "grey.50" },
                    textAlign: "left",
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: action.color,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1.5,
                    }}
                  >
                    <Icon sx={{ width: 20, height: 20, color: "white" }} />
                  </Box>
                  <Typography
                    sx={{ fontWeight: 500, color: "grey.900", mb: 0.5 }}
                  >
                    {action.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    {action.description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Box
              onClick={() => navigate("/pm/projects/create")}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                px: 2,
                py: 1.5,
                bgcolor: "#2563eb",
                color: "white",
                borderRadius: 2,
                cursor: "pointer",
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              <Plus sx={{ width: 20, height: 20 }} />
              创建新项目
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900" }}
            >
              最新项目
            </Typography>
            <Box
              onClick={() => navigate("/pm/projects")}
              sx={{
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                "&:hover": { color: "#1d4ed8" },
              }}
            >
              <Typography variant="body2">查看全部</Typography>
              <ArrowRight sx={{ width: 16, height: 16 }} />
            </Box>
          </Box>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid",
                  borderColor: "#2563eb",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, color: "grey.500" }}>
              暂无项目
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {projects.slice(0, 5).map((project) => (
                <Box
                  key={project.id}
                  onClick={() => navigate(`/pm/projects/${project.id}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "grey.50" },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      {project.code}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", mr: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          ...getProjectStatusColor(project.status),
                        }}
                      >
                        {getProjectStatusLabel(project.status)}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        width: 80,
                        bgcolor: "grey.200",
                        borderRadius: "9999px",
                        height: 8,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          borderRadius: "9999px",
                          width: `${project.progress}%`,
                          bgcolor:
                            project.status === "completed"
                              ? "#16a34a"
                              : "#2563eb",
                        }}
                      />
                    </Box>
                  </Box>
                  <Calendar sx={{ width: 20, height: 20, color: "grey.400" }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900" }}
            >
              项目进度概览
            </Typography>
          </Box>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid",
                  borderColor: "#2563eb",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {projects.slice(0, 5).map((project) => (
                <Box
                  key={project.id}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 500,
                        color: "grey.900",
                        fontSize: "0.875rem",
                      }}
                    >
                      {project.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      {project.progress}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: "100%",
                      bgcolor: "grey.200",
                      borderRadius: "9999px",
                      height: 8,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        borderRadius: "9999px",
                        width: `${project.progress}%`,
                        bgcolor:
                          project.status === "completed"
                            ? "#16a34a"
                            : "#2563eb",
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
                    {formatDate(project.start_date)} -{" "}
                    {formatDate(project.end_date)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900" }}
            >
              最新合同
            </Typography>
            <Box
              onClick={() => navigate("/pm/contracts")}
              sx={{
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                "&:hover": { color: "#1d4ed8" },
              }}
            >
              <Typography variant="body2">查看全部</Typography>
              <ArrowRight sx={{ width: 16, height: 16 }} />
            </Box>
          </Box>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid",
                  borderColor: "#2563eb",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </Box>
          ) : contracts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, color: "grey.500" }}>
              暂无合同
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {contracts.slice(0, 5).map((contract) => (
                <Box
                  key={contract.id}
                  onClick={() => navigate(`/pm/contracts/${contract.id}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "grey.50" },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                      {contract.contract_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      {contract.contract_code}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", mr: 2 }}>
                    <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                      {contract.amount
                        ? new Intl.NumberFormat("zh-CN", {
                            style: "currency",
                            currency: "CNY",
                          }).format(contract.amount)
                        : "-"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "grey.500", fontSize: "0.75rem" }}
                    >
                      {formatDate(contract.signing_date)}
                    </Typography>
                  </Box>
                  <FileCheck
                    sx={{ width: 20, height: 20, color: "grey.400" }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PmDashboardPage;
