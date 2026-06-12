import React from "react";
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { PmStatistics, ProjectBenefit } from "../../api/pm";

interface ProjectReportProps {
  stats: PmStatistics;
  benefits: ProjectBenefit[];
}

const ProjectReport: React.FC<ProjectReportProps> = ({ stats, benefits }) => {
  const projectStatusData = [
    { name: "草稿", value: stats.draft_projects, fill: "#6B7280" },
    { name: "待审批", value: stats.pending_projects, fill: "#F59E0B" },
    { name: "进行中", value: stats.active_projects, fill: "#3B82F6" },
    { name: "已完成", value: stats.completed_projects, fill: "#10B981" },
    { name: "已取消", value: stats.cancelled_projects, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const riskData = [
    { name: "高风险", value: stats.high_risk_projects, fill: "#EF4444" },
    { name: "中风险", value: stats.medium_risk_projects, fill: "#F59E0B" },
    { name: "低风险", value: stats.low_risk_projects, fill: "#10B981" },
  ].filter((d) => d.value > 0);

  const trendData = benefits.slice(0, 6).map((b, index) => ({
    month: `第${index + 1}期`,
    cpi: b.cpi,
    spi: b.spi,
  }));

  const budgetUtilization =
    stats.total_budget > 0
      ? (stats.spent_budget / stats.total_budget) * 100
      : 0;

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      benefits: benefits,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">项目报表</h2>
          <p className="text-gray-500 mt-1">
            生成时间: {new Date().toLocaleString("zh-CN")}
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          导出报表
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">项目总数</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.total_projects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.completed_projects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">预算使用</p>
                <p className="text-xl font-bold text-amber-600">
                  {stats.budget_usage_rate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">高风险</p>
                <p className="text-xl font-bold text-red-600">
                  {stats.high_risk_projects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">项目状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} 个`, "数量"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">风险分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={60}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} 个项目`, "数量"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CPI/SPI 趋势分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  trendData.length > 0
                    ? trendData
                    : [{ month: "暂无数据", cpi: 1, spi: 1 }]
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0.5, 1.5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpi"
                  name="CPI"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="spi"
                  name="SPI"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">预算执行情况</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">预算利用率</span>
            <span className="text-sm font-medium text-gray-900">
              {budgetUtilization.toFixed(1)}%
            </span>
          </div>
          <Progress value={budgetUtilization} className="h-4" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">总预算</p>
              <p className="text-lg font-bold text-blue-800">
                {stats.total_budget.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">已使用</p>
              <p className="text-lg font-bold text-green-800">
                {stats.spent_budget.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">剩余</p>
              <p className="text-lg font-bold text-gray-800">
                {(stats.total_budget - stats.spent_budget).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">项目进度统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "准时", value: stats.on_time_projects },
                  { name: "延迟", value: stats.delayed_projects },
                ].filter((d) => d.value > 0)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="项目数">
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">效益指标汇总</CardTitle>
        </CardHeader>
        <CardContent>
          {benefits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600">
                      期间
                    </th>
                    <th className="text-right p-3 font-medium text-gray-600">
                      CPI
                    </th>
                    <th className="text-right p-3 font-medium text-gray-600">
                      SPI
                    </th>
                    <th className="text-right p-3 font-medium text-gray-600">
                      CV
                    </th>
                    <th className="text-right p-3 font-medium text-gray-600">
                      SV
                    </th>
                    <th className="text-right p-3 font-medium text-gray-600">
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benefits.map((benefit, index) => (
                    <tr key={benefit.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-900">第{index + 1}期</td>
                      <td className="p-3 text-right">
                        <Badge
                          className={
                            benefit.cpi >= 1
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {benefit.cpi.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          className={
                            benefit.spi >= 1
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {benefit.spi.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {benefit.cv.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {benefit.sv.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            benefit.roi >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {(benefit.roi * 100).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无效益数据</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectReport;
