import React, { useEffect, useState } from "react";
import {
  FolderKanban,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

interface ProjectSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delayed_projects: number;
  total_budget: number;
  total_actual_cost: number;
  avg_progress: number;
  total_members: number;
}

interface ProjectTypeStats {
  project_type: string;
  count: number;
  total_budget: number;
  avg_progress: number;
}

interface TrendData {
  date: string;
  project_count: number;
  completed_count: number;
  avg_progress: number;
  total_budget: number;
  total_cost: number;
}

interface PerformanceMetrics {
  on_time_delivery_rate: number;
  budget_adherence_rate: number;
  avg_completion_time_days: number;
  resource_utilization_rate: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  progress: number;
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
}

const ProjectDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [typeStats, setTypeStats] = useState<ProjectTypeStats[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(
    null,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, typeRes, trendsRes, perfRes, projectsRes] =
        await Promise.all([
          apiClient.rs.get("/api/v1/reports/projects/summary"),
          apiClient.rs.get("/api/v1/reports/projects/types"),
          apiClient.rs.get("/api/v1/reports/projects/trends"),
          apiClient.rs.get("/api/v1/reports/projects/performance"),
          apiClient.rs.get("/api/v1/projects"),
        ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (typeRes.success) setTypeStats(typeRes.data);
      if (trendsRes.success) setTrends(trendsRes.data);
      if (perfRes.success) setPerformance(perfRes.data);
      if (projectsRes.success) {
        setActiveProjects(projectsRes.data || []);
        setActiveProjects(
          (projectsRes.data || []).filter(
            (p: Project) => p.status === "active",
          ),
        );
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">项目管理驾驶舱</h1>
        <p className="text-gray-500 mt-1">实时监控项目状态、进度和绩效</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总项目数</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_projects || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FolderKanban className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
              进行中 {summary?.active_projects || 0}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
              已完成 {summary?.completed_projects || 0}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均进度</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(summary?.avg_progress || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${summary?.avg_progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总预算</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary?.total_budget || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            实际支出: {formatCurrency(summary?.total_actual_cost || 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">团队成员</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_members || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            利用率: {formatPercent(performance?.resource_utilization_rate || 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">逾期项目</p>
              <p className="text-2xl font-bold text-red-600">
                {summary?.delayed_projects || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">准时交付率</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPercent(performance?.on_time_delivery_rate || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">预算遵守率</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPercent(performance?.budget_adherence_rate || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均完成周期</p>
              <p className="text-2xl font-bold text-purple-600">
                {performance?.avg_completion_time_days || 0}天
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              项目类型分布
            </h3>
          </div>
          <div className="space-y-4">
            {typeStats.map((stat, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{stat.project_type}</span>
                  <span className="text-gray-500">{stat.count} 个项目</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${(stat.count / (summary?.total_projects || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>预算: {formatCurrency(stat.total_budget)}</span>
                  <span>平均进度: {formatPercent(stat.avg_progress)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              项目趋势
            </h3>
          </div>
          <div className="space-y-3">
            {trends.slice(0, 5).map((trend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{trend.date}</p>
                  <p className="text-xs text-gray-500">
                    新建 {trend.project_count} 个，完成 {trend.completed_count}{" "}
                    个
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {formatPercent(trend.avg_progress)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(trend.total_budget)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              进行中项目
            </h3>
            <button
              onClick={() => navigate("/rs")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              查看全部 →
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  项目名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  进度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  预算
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  结束日期
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeProjects.slice(0, 5).map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500">{project.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {project.project_type}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {project.budget ? formatCurrency(project.budget) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboardPage;
