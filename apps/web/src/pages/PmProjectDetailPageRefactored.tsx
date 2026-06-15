/**
 * PmProjectDetailPage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用统一的状态显示和格式化
 * 3. 保持业务逻辑不变
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Badge,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import GanttChart from "../components/pm/GanttChart";
import { pmApi } from "../api/pm";
import type {
  Project,
  ProjectPhase,
  ProjectMilestone,
  GanttPhase,
  GanttMilestone,
} from "../api/pm";
import { PageHeader } from "../components/layout";

// ============ 状态映射 ============
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "#dcfce7", color: "#166534" },
  completed: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#fef9c3", color: "#a16207" },
  approved: { bg: "#f3e8ff", color: "#7c3aed" },
  cancelled: { bg: "#f3f4f6", color: "#374151" },
  draft: { bg: "#f3f4f6", color: "#4b5563" },
};

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  pending: "待审批",
  approved: "已批准",
  cancelled: "已取消",
  draft: "草稿",
};

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: "#fee2e2", color: "#991b1b" },
  medium: { bg: "#fef9c3", color: "#a16207" },
  low: { bg: "#dcfce7", color: "#166534" },
};

const RISK_LABELS: Record<string, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

// ============ 辅助函数 ============
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("zh-CN");
};

const formatCurrency = (amount?: number) => {
  if (!amount) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
  }).format(amount);
};

// ============ 组件 ============
const PmProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjectData = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const [projectResponse, phasesResponse, milestonesResponse] = await Promise.all([
        pmApi.projects.get(projectId),
        pmApi.phases.list(projectId),
        pmApi.milestones.list(projectId),
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
      }
      if (phasesResponse.success && phasesResponse.data) {
        setPhases(phasesResponse.data.phases || []);
      }
      if (milestonesResponse.success && milestonesResponse.data) {
        setMilestones(milestonesResponse.data.milestones || []);
      }
    } catch (error) {
      console.error("Failed to load project data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id, loadProjectData]);

  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;

  const ganttPhases: GanttPhase[] = phases.map((p) => ({
    id: p.id,
    name: p.name,
    project_id: p.project_id,
    start_date: p.start_date,
    end_date: p.end_date,
    progress: p.progress,
    status: p.status,
    predecessor_ids: p.predecessor_ids || [],
  }));

  const ganttMilestones: GanttMilestone[] = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    project_id: m.project_id,
    date: m.date,
    status: m.status,
  }));

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "grey.50",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            border: "3px solid",
            borderColor: theme.palette.primary.main,
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
    );
  }

  if (!project) {
    return (
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "grey.50",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ color: "grey.500" }}>项目不存在</Typography>
      </Box>
    );
  }

  const projectStatusColor = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  const projectRiskColor = RISK_COLORS[project.risk_level || ""] || RISK_COLORS.low;

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={project.code}
        showBack
        onBack={() => navigate("/pm/projects")}
        actions={
          <Button
            variant="contained"
            startIcon={<Edit style={{ width: 16, height: 16 }} />}
            onClick={() => navigate(`/pm/projects/${id}/edit`)}
          >
            编辑项目
          </Button>
        }
      />

      <Box sx={{ p: 3 }}>
        {/* 项目信息卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "flex-start", md: "flex-start" },
                justifyContent: "space-between",
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                  <Badge sx={{ bgcolor: projectStatusColor.bg, color: projectStatusColor.color }}>
                    {STATUS_LABELS[project.status] || project.status}
                  </Badge>
                </Box>
                {project.description && (
                  <Typography sx={{ color: "grey.600", mt: 2 }}>
                    {project.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Badge sx={{ bgcolor: projectRiskColor.bg, color: projectRiskColor.color }}>
                  {RISK_LABELS[project.risk_level || ""] || "未评估"}
                </Badge>
                {project.priority && (
                  <Badge variant="outline">优先级: {project.priority}</Badge>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "#dbeafe" }}>
                  <Clock sx={{ width: 20, height: 20, color: "#3b82f6" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    项目进度
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                    {project.progress}%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, height: 8, bgcolor: "grey.200", borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ width: `${project.progress}%`, height: "100%", bgcolor: "#3b82f6", borderRadius: 3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "#dcfce7" }}>
                  <CheckCircle2 sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    阶段完成
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#16a34a" }}>
                    {completedPhases}/{phases.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "#fef3c7" }}>
                  <DollarSign sx={{ width: 20, height: 20, color: "#d97706" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    项目预算
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#d97706" }}>
                    {formatCurrency(project.budget)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "#f3e8ff" }}>
                  <TrendingUp sx={{ width: 20, height: 20, color: "#7c3aed" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    里程碑完成
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#7c3aed" }}>
                    {completedMilestones}/{milestones.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Tabs defaultValue="overview" sx={{ mb: 3 }}>
          <Tabs.List sx={{ bgcolor: "grey.100", p: 0.5 }}>
            <Tab value="overview">项目概览</Tab>
            <Tab value="gantt">甘特图</Tab>
            <Tab value="phases">阶段管理</Tab>
            <Tab value="milestones">里程碑</Tab>
            <Tab value="finance">财务</Tab>
          </Tabs.List>

          <Tab.Panel value="overview" sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>基本信息</Typography>
                </CardHeader>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { label: "项目编号", value: project.code },
                    { label: "项目类型", value: project.project_type },
                    { label: "项目负责人", value: project.leader || "-" },
                    { label: "开始日期", value: formatDate(project.start_date) },
                    { label: "结束日期", value: formatDate(project.end_date) },
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "grey.100",
                      }}
                    >
                      <Typography sx={{ color: "grey.500" }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 500, color: "grey.900" }}>{item.value}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>关键指标</Typography>
                </CardHeader>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[
                    { label: "整体进度", value: project.progress },
                    { label: "阶段进度", value: phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0 },
                    { label: "里程碑完成", value: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0 },
                  ].map((item, index) => (
                    <Box key={index}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2" sx={{ color: "grey.600" }}>{item.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.900" }}>{item.value}%</Typography>
                      </Box>
                      <Box sx={{ height: 12, bgcolor: "grey.200", borderRadius: 3, overflow: "hidden" }}>
                        <Box sx={{ width: `${item.value}%`, height: "100%", bgcolor: "#3b82f6", borderRadius: 3 }} />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </Tab.Panel>

          <Tab.Panel value="gantt" sx={{ mt: 3 }}>
            <Card>
              <CardHeader sx={{ pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>项目甘特图</Typography>
              </CardHeader>
              <CardContent>
                <GanttChart
                  phases={ganttPhases}
                  milestones={ganttMilestones}
                  projectStartDate={project.start_date}
                  projectEndDate={project.end_date}
                />
              </CardContent>
            </Card>
          </Tab.Panel>

          <Tab.Panel value="phases" sx={{ mt: 3 }}>
            <Card>
              <CardHeader sx={{ pb: 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>阶段列表</Typography>
                <Button variant="outline" size="sm">添加阶段</Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHead sx={{ width: 200 }}>阶段名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead sx={{ width: 180 }}>进度</TableHead>
                        <TableHead sx={{ width: 150 }}>时间</TableHead>
                        <TableHead sx={{ width: 120 }}>操作</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {phases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 6, color: "grey.500" }}>
                            暂无阶段数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        phases.map((phase) => (
                          <TableRow key={phase.id} sx={{ "&:hover": { bgcolor: "grey.50" } }}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 500, color: "grey.900" }}>{phase.name}</Typography>
                              {phase.description && (
                                <Typography variant="body2" sx={{ color: "grey.500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {phase.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge sx={{ bgcolor: phase.status === "completed" ? "#dcfce7" : phase.status === "active" ? "#dbeafe" : "#f3f4f6", color: phase.status === "completed" ? "#166534" : phase.status === "active" ? "#1e40af" : "#374151" }}>
                                {phase.status === "completed" ? "已完成" : phase.status === "active" ? "进行中" : "未开始"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box sx={{ width: 96, height: 8, bgcolor: "grey.200", borderRadius: 3, overflow: "hidden" }}>
                                  <Box sx={{ width: `${phase.progress}%`, height: "100%", bgcolor: "#3b82f6", borderRadius: 3 }} />
                                </Box>
                                <Typography variant="body2" sx={{ color: "grey.600" }}>{phase.progress}%</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                              <Typography variant="body2">{formatDate(phase.start_date)}</Typography>
                              <Typography variant="body2" sx={{ color: "grey.400", fontSize: "0.75rem" }}>至 {formatDate(phase.end_date)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" sx={{ gap: 0.5 }}>
                                <Edit sx={{ width: 16, height: 16 }} />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Tab.Panel>

          <Tab.Panel value="milestones" sx={{ mt: 3 }}>
            <Card>
              <CardHeader sx={{ pb: 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>里程碑列表</Typography>
                <Button variant="outline" size="sm">添加里程碑</Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHead sx={{ width: 200 }}>里程碑名称</TableHead>
                        <TableHead sx={{ width: 150 }}>目标日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>所属阶段</TableHead>
                        <TableHead sx={{ width: 120 }}>操作</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {milestones.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 6, color: "grey.500" }}>
                            暂无里程碑数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        milestones.map((milestone) => (
                          <TableRow key={milestone.id} sx={{ "&:hover": { bgcolor: "grey.50" } }}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 500, color: "grey.900" }}>{milestone.name}</Typography>
                              {milestone.description && (
                                <Typography variant="body2" sx={{ color: "grey.500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {milestone.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                              {formatDate(milestone.date)}
                            </TableCell>
                            <TableCell>
                              <Badge sx={{ bgcolor: milestone.status === "completed" ? "#dcfce7" : milestone.status === "active" ? "#dbeafe" : "#f3f4f6", color: milestone.status === "completed" ? "#166534" : milestone.status === "active" ? "#1e40af" : "#374151" }}>
                                {milestone.status === "completed" ? "已完成" : milestone.status === "active" ? "进行中" : "未开始"}
                              </Badge>
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                              {milestone.phase_id ? phases.find((p) => p.id === milestone.phase_id)?.name || "-" : "-"}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" sx={{ gap: 0.5 }}>
                                <Edit sx={{ width: 16, height: 16 }} />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Tab.Panel>

          <Tab.Panel value="finance" sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>预算执行概览</Typography>
                </CardHeader>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { label: "项目预算", value: formatCurrency(project.budget), color: "grey.900" },
                    { label: "实际成本", value: formatCurrency(project.actual_cost), color: "#d97706" },
                    { label: "已承诺成本", value: formatCurrency(project.committed_cost), color: "#3b82f6" },
                    { label: "剩余预算", value: formatCurrency(project.remaining_budget), color: "#16a34a" },
                    { label: "成本差异", value: formatCurrency(project.cost_variance), color: (project.cost_variance || 0) >= 0 ? "#16a34a" : "#dc2626" },
                    { label: "预算执行率", value: `${project.budget_utilization_rate?.toFixed(1) || "0"}%`, color: "grey.900" },
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "grey.100",
                      }}
                    >
                      <Typography sx={{ color: "grey.500" }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 500, color: item.color }}>{item.value}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>收入与利润</Typography>
                </CardHeader>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { label: "已确认收入", value: formatCurrency(project.revenue_recognized), color: "grey.900" },
                    { label: "应收账款", value: formatCurrency(project.accounts_receivable), color: "#d97706" },
                    { label: "已开票金额", value: formatCurrency((project.revenue_recognized || 0) - (project.accounts_receivable || 0)), color: "#3b82f6" },
                    { label: "毛利润", value: formatCurrency(project.gross_profit), color: "#16a34a" },
                    { label: "毛利率", value: `${project.gross_margin?.toFixed(1) || "0"}%`, color: "grey.900" },
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "grey.100",
                      }}
                    >
                      <Typography sx={{ color: "grey.500" }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 500, color: item.color }}>{item.value}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </Tab.Panel>
        </Tabs>
      </Box>
    </>
  );
};

export default PmProjectDetailPage;
