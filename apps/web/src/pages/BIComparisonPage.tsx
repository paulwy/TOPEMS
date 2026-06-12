import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Radar,
} from "lucide-react";
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
} from "../components/charts";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { LoadingSpinner } from "../components/LoadingSpinner";
import ExportButton from "../components/ExportButton";
import { getDateRange } from "../utils/export";

const modules = [
  { id: "rs", name: "研发管理", icon: "🔬" },
  { id: "lims", name: "实验室", icon: "🧪" },
  { id: "qms", name: "质量管理", icon: "✅" },
  { id: "ehs", name: "安全环保", icon: "🛡️" },
  { id: "srm", name: "供应链", icon: "📦" },
  { id: "pdm", name: "生产数据", icon: "🏭" },
];

const mockComparisonData = {
  rs: {
    monthly: [
      { month: "1月", value: 25, label: "项目数" },
      { month: "2月", value: 30, label: "项目数" },
      { month: "3月", value: 28, label: "项目数" },
      { month: "4月", value: 35, label: "项目数" },
      { month: "5月", value: 42, label: "项目数" },
      { month: "6月", value: 38, label: "项目数" },
    ],
    metrics: { total: 120, active: 45, completed: 75, efficiency: 85 },
  },
  lims: {
    monthly: [
      { month: "1月", value: 420, label: "样品数" },
      { month: "2月", value: 380, label: "样品数" },
      { month: "3月", value: 450, label: "样品数" },
      { month: "4月", value: 520, label: "样品数" },
      { month: "5月", value: 480, label: "样品数" },
      { month: "6月", value: 550, label: "样品数" },
    ],
    metrics: { total: 2450, active: 180, completed: 2150, efficiency: 98.5 },
  },
  qms: {
    monthly: [
      { month: "1月", value: 96.5, label: "合格率" },
      { month: "2月", value: 97.2, label: "合格率" },
      { month: "3月", value: 97.8, label: "合格率" },
      { month: "4月", value: 98.1, label: "合格率" },
      { month: "5月", value: 97.6, label: "合格率" },
      { month: "6月", value: 97.8, label: "合格率" },
    ],
    metrics: { total: 3250, active: 70, completed: 3180, efficiency: 97.8 },
  },
  ehs: {
    monthly: [
      { month: "1月", value: 15, label: "风险数" },
      { month: "2月", value: 12, label: "风险数" },
      { month: "3月", value: 18, label: "风险数" },
      { month: "4月", value: 8, label: "风险数" },
      { month: "5月", value: 10, label: "风险数" },
      { month: "6月", value: 15, label: "风险数" },
    ],
    metrics: { total: 125, active: 15, completed: 110, efficiency: 88 },
  },
  srm: {
    monthly: [
      { month: "1月", value: 220, label: "供应商数" },
      { month: "2月", value: 235, label: "供应商数" },
      { month: "3月", value: 240, label: "供应商数" },
      { month: "4月", value: 245, label: "供应商数" },
      { month: "5月", value: 250, label: "供应商数" },
      { month: "6月", value: 280, label: "供应商数" },
    ],
    metrics: { total: 280, active: 245, completed: 35, efficiency: 87.5 },
  },
  pdm: {
    monthly: [
      { month: "1月", value: 1850, label: "产量" },
      { month: "2月", value: 2100, label: "产量" },
      { month: "3月", value: 1980, label: "产量" },
      { month: "4月", value: 2350, label: "产量" },
      { month: "5月", value: 2200, label: "产量" },
      { month: "6月", value: 2420, label: "产量" },
    ],
    metrics: { total: 450, active: 28, completed: 415, efficiency: 98.5 },
  },
};

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

const BIComparisonPage = () => {
  const navigate = useNavigate();
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "rs",
    "qms",
  ]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "radar">(
    "bar",
  );

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) => {
      if (prev.includes(moduleId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== moduleId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, moduleId];
    });
  };

  const getComparisonData = () => {
    const data: any[] = [];
    const months = ["1月", "2月", "3月", "4月", "5月", "6月"];

    months.forEach((month) => {
      const row: any = { month };
      selectedModules.forEach((moduleId, index) => {
        const moduleData =
          mockComparisonData[moduleId as keyof typeof mockComparisonData];
        const monthData = moduleData?.monthly.find((m) => m.month === month);
        row[modules.find((m) => m.id === moduleId)?.name || moduleId] =
          monthData?.value || 0;
      });
      data.push(row);
    });

    return data;
  };

  const getRadarData = () => {
    const subjects = ["总量", "活跃", "完成", "效率"];
    return subjects.map((subject) => {
      const row: any = { subject };
      selectedModules.forEach((moduleId) => {
        const moduleData =
          mockComparisonData[moduleId as keyof typeof mockComparisonData];
        const metricKey =
          subject === "总量"
            ? "total"
            : subject === "活跃"
              ? "active"
              : subject === "完成"
                ? "completed"
                : "efficiency";
        row[modules.find((m) => m.id === moduleId)?.name || moduleId] =
          moduleData?.metrics[metricKey] || 0;
      });
      return row;
    });
  };

  const getPieData = () => {
    return selectedModules.map((moduleId) => {
      const moduleData =
        mockComparisonData[moduleId as keyof typeof mockComparisonData];
      return {
        name: modules.find((m) => m.id === moduleId)?.name || moduleId,
        value: moduleData?.metrics.total || 0,
      };
    });
  };

  const exportData = selectedModules.map((moduleId) => {
    const moduleData =
      mockComparisonData[moduleId as keyof typeof mockComparisonData];
    const moduleInfo = modules.find((m) => m.id === moduleId);
    return {
      module: moduleInfo?.name || moduleId,
      ...moduleData?.metrics,
    };
  });

  const yKeys = selectedModules.map((moduleId, index) => ({
    key: modules.find((m) => m.id === moduleId)?.name || moduleId,
    name: modules.find((m) => m.id === moduleId)?.name || moduleId,
    color: COLORS[index % COLORS.length],
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">数据对比分析</h2>
            <p className="text-sm text-gray-500 mt-1">
              选择多个模块进行数据对比
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={exportData}
            columns={["module", "total", "active", "completed", "efficiency"]}
            filename="bi-comparison-data"
          />
          <Button variant="secondary" onClick={() => navigate("/bi/dashboard")}>
            返回数据大屏
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>选择对比模块</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {modules.map((module) => (
                <label
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedModules.includes(module.id)
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => handleModuleToggle(module.id)}
                    disabled={
                      !selectedModules.includes(module.id) &&
                      selectedModules.length >= 4
                    }
                  />
                  <span className="text-xl">{module.icon}</span>
                  <span className="font-medium text-gray-800">
                    {module.name}
                  </span>
                </label>
              ))}
              <p className="text-sm text-gray-500 mt-4">
                已选择 {selectedModules.length}/4 个模块
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>选中模块概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedModules.map((moduleId, index) => {
                const moduleData =
                  mockComparisonData[
                    moduleId as keyof typeof mockComparisonData
                  ];
                const moduleInfo = modules.find((m) => m.id === moduleId);
                return (
                  <div
                    key={moduleId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-xl">{moduleInfo?.icon}</span>
                      <span className="font-medium text-gray-800">
                        {moduleInfo?.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-800">
                        {moduleData?.metrics.total || 0}
                      </div>
                      <div className="text-xs text-gray-500">总量</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>对比图表</CardTitle>
              <Tabs
                value={chartType}
                onValueChange={(v) => setChartType(v as any)}
                className="w-auto"
              >
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="bar">
                    <BarChart3 className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="line">
                    <LineChartIcon className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="pie">
                    <PieChartIcon className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="radar">
                    <Radar className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {chartType === "bar" && (
                <BarChart
                  data={getComparisonData()}
                  xKey="month"
                  yKeys={yKeys}
                  height={350}
                />
              )}
              {chartType === "line" && (
                <LineChart
                  data={getComparisonData()}
                  xKey="month"
                  yKeys={yKeys}
                  height={350}
                />
              )}
              {chartType === "pie" && (
                <PieChart data={getPieData()} height={350} />
              )}
              {chartType === "radar" && (
                <RadarChart
                  data={getRadarData()}
                  dataKey="name"
                  nameKey="subject"
                  yKeys={yKeys}
                  height={350}
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>关键指标对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-medium text-gray-600">
                        指标
                      </th>
                      {selectedModules.map((moduleId, index) => (
                        <th
                          key={moduleId}
                          className="p-3 font-medium"
                          style={{ color: COLORS[index % COLORS.length] }}
                        >
                          {modules.find((m) => m.id === moduleId)?.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "total", label: "总量" },
                      { key: "active", label: "活跃" },
                      { key: "completed", label: "完成" },
                      { key: "efficiency", label: "效率(%)" },
                    ].map((metric) => (
                      <tr key={metric.key} className="border-b border-gray-100">
                        <td className="p-3 text-gray-600">{metric.label}</td>
                        {selectedModules.map((moduleId) => {
                          const moduleData =
                            mockComparisonData[
                              moduleId as keyof typeof mockComparisonData
                            ];
                          return (
                            <td
                              key={moduleId}
                              className="p-3 text-gray-800 font-medium"
                            >
                              {moduleData?.metrics[
                                metric.key as keyof typeof moduleData.metrics
                              ] || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BIComparisonPage;
