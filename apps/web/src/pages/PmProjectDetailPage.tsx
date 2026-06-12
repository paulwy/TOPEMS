import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Users,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import GanttChart from "../components/pm/GanttChart";
import { pmApi } from "../api/pm";
import type {
  Project,
  ProjectPhase,
  ProjectMilestone,
  GanttPhase,
  GanttMilestone,
} from "../api/pm";

const PmProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      const [
        projectResponse,
        phasesResponse,
        milestonesResponse,
        ganttResponse,
      ] = await Promise.all([
        pmApi.projects.get(projectId),
        pmApi.phases.list(projectId),
        pmApi.milestones.list(projectId),
        pmApi.projects.gantt(projectId),
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
  };

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "draft":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "进行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待审批";
      case "approved":
        return "已批准";
      case "cancelled":
        return "已取消";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskLabel = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "高风险";
      case "medium":
        return "中风险";
      case "low":
        return "低风险";
      default:
        return "未评估";
    }
  };

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

  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed",
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <p className="text-gray-500">项目不存在</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/pm/projects")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex-1" />
          <Button onClick={() => navigate(`/pm/projects/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            编辑项目
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {project.name}
                  </h1>
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                <p className="text-gray-500">{project.code}</p>
                {project.description && (
                  <p className="text-gray-600 mt-4">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className={getRiskColor(project.risk_level)}
                >
                  {getRiskLabel(project.risk_level)}
                </Badge>
                {project.priority && (
                  <Badge variant="outline">优先级: {project.priority}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">项目进度</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {project.progress}%
                  </p>
                </div>
              </div>
              <Progress value={project.progress} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">阶段完成</p>
                  <p className="text-2xl font-bold text-green-600">
                    {completedPhases}/{phases.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">项目预算</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(project.budget)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">里程碑完成</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {completedMilestones}/{milestones.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white"
            >
              项目概览
            </TabsTrigger>
            <TabsTrigger value="gantt" className="data-[state=active]:bg-white">
              甘特图
            </TabsTrigger>
            <TabsTrigger
              value="phases"
              className="data-[state=active]:bg-white"
            >
              阶段管理
            </TabsTrigger>
            <TabsTrigger
              value="milestones"
              className="data-[state=active]:bg-white"
            >
              里程碑
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="data-[state=active]:bg-white"
            >
              财务
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">项目编号</span>
                    <span className="font-medium text-gray-900">
                      {project.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">项目类型</span>
                    <span className="font-medium text-gray-900">
                      {project.project_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">项目负责人</span>
                    <span className="font-medium text-gray-900">
                      {project.leader || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">开始日期</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(project.start_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">结束日期</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(project.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">风险等级</span>
                    <Badge className={getRiskColor(project.risk_level)}>
                      {getRiskLabel(project.risk_level)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">关键指标</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">整体进度</span>
                      <span className="text-sm font-medium text-gray-900">
                        {project.progress}%
                      </span>
                    </div>
                    <Progress value={project.progress} className="h-3" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">阶段进度</span>
                      <span className="text-sm font-medium text-gray-900">
                        {phases.length > 0
                          ? Math.round((completedPhases / phases.length) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        phases.length > 0
                          ? Math.round((completedPhases / phases.length) * 100)
                          : 0
                      }
                      className="h-3"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">里程碑完成</span>
                      <span className="text-sm font-medium text-gray-900">
                        {milestones.length > 0
                          ? Math.round(
                              (completedMilestones / milestones.length) * 100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        milestones.length > 0
                          ? Math.round(
                              (completedMilestones / milestones.length) * 100,
                            )
                          : 0
                      }
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gantt" className="mt-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">项目甘特图</CardTitle>
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
          </TabsContent>

          <TabsContent value="phases" className="mt-0">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">阶段列表</CardTitle>
                <Button variant="outline" size="sm">
                  添加阶段
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">阶段名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="w-[180px]">进度</TableHead>
                        <TableHead className="w-[150px]">时间</TableHead>
                        <TableHead className="w-[120px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phases.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-gray-500"
                          >
                            暂无阶段数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        phases.map((phase) => (
                          <TableRow key={phase.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {phase.name}
                                </p>
                                {phase.description && (
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {phase.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  phase.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : phase.status === "active"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {phase.status === "completed"
                                  ? "已完成"
                                  : phase.status === "active"
                                    ? "进行中"
                                    : "未开始"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-24">
                                  <Progress
                                    value={phase.progress}
                                    className="h-2"
                                  />
                                </div>
                                <span className="text-sm text-gray-600">
                                  {phase.progress}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              <div>
                                <p>{formatDate(phase.start_date)}</p>
                                <p className="text-xs text-gray-400">
                                  至 {formatDate(phase.end_date)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                              >
                                <Edit className="w-4 h-4" />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones" className="mt-0">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">里程碑列表</CardTitle>
                <Button variant="outline" size="sm">
                  添加里程碑
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">里程碑名称</TableHead>
                        <TableHead className="w-[150px]">目标日期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>所属阶段</TableHead>
                        <TableHead className="w-[120px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestones.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-gray-500"
                          >
                            暂无里程碑数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        milestones.map((milestone) => (
                          <TableRow
                            key={milestone.id}
                            className="hover:bg-gray-50"
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {milestone.name}
                                </p>
                                {milestone.description && (
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(milestone.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  milestone.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : milestone.status === "active"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {milestone.status === "completed"
                                  ? "已完成"
                                  : milestone.status === "active"
                                    ? "进行中"
                                    : "未开始"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {milestone.phase_id
                                ? phases.find(
                                    (p) => p.id === milestone.phase_id,
                                  )?.name || "-"
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                              >
                                <Edit className="w-4 h-4" />
                                编辑
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 预算执行概览 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">预算执行概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">项目预算</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(project.budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">实际成本</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(project.actual_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">已承诺成本</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(project.committed_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">剩余预算</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(project.remaining_budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">成本差异</span>
                    <span
                      className={`font-medium ${(project.cost_variance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(project.cost_variance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">预算执行率</span>
                    <span className="font-medium text-gray-900">
                      {project.budget_utilization_rate?.toFixed(1) || "0"}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 收入与利润 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">收入与利润</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">已确认收入</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(project.revenue_recognized)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">应收账款</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(project.accounts_receivable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">已开票金额</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(
                        (project.revenue_recognized || 0) -
                          (project.accounts_receivable || 0),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">毛利润</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(project.gross_profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">毛利率</span>
                    <span className="font-medium text-gray-900">
                      {project.gross_margin?.toFixed(1) || "0"}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 成本构成分析 */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">成本构成分析</CardTitle>
                  <Button variant="outline" size="sm">
                    查看详情
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">人工成本</p>
                      <p className="text-lg font-semibold text-blue-600">-</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">材料成本</p>
                      <p className="text-lg font-semibold text-green-600">-</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">费用支出</p>
                      <p className="text-lg font-semibold text-amber-600">-</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">分包成本</p>
                      <p className="text-lg font-semibold text-purple-600">-</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">其他成本</p>
                      <p className="text-lg font-semibold text-gray-600">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 成本中心信息 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">成本中心信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">成本中心ID</span>
                    <span className="font-medium text-gray-900">
                      {project.cost_center_id || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">成本中心名称</span>
                    <span className="font-medium text-gray-900">
                      {project.cost_center_name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">执行状态</span>
                    <Badge
                      className={
                        project.budget_utilization_rate &&
                        project.budget_utilization_rate > 100
                          ? "bg-red-100 text-red-800"
                          : project.budget_utilization_rate &&
                              project.budget_utilization_rate > 80
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                      }
                    >
                      {project.budget_utilization_rate &&
                      project.budget_utilization_rate > 100
                        ? "超预算"
                        : project.budget_utilization_rate &&
                            project.budget_utilization_rate > 80
                          ? "预警"
                          : "正常"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 快速操作 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">快速操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="w-4 h-4 mr-2" />
                    查看成本明细
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    查看项目发票
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    预算执行分析
                  </Button>
                  <Button className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    生成项目凭证
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PmProjectDetailPage;
