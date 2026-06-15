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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Checkbox,
  Typography,
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
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
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 6 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 6,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button variant="text" size="small" onClick={() => navigate(-1)}>
            <ArrowLeft sx={{ width: 20, height: 20 }} />
          </Button>
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "grey.800" }}
            >
              数据对比分析
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
              选择多个模块进行数据对比
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <ExportButton
            data={exportData}
            columns={["module", "total", "active", "completed", "efficiency"]}
            filename="bi-comparison-data"
          />
          <Button variant="outlined" onClick={() => navigate("/bi/dashboard")}>
            返回数据大屏
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, lg: "1fr 2fr" },
          gap: 6,
        }}
      >
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="选择对比模块" />
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {modules.map((module) => (
                <Box
                  key={module.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    p: 2,
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    bgcolor: selectedModules.includes(module.id)
                      ? "primary.50"
                      : "transparent",
                    border: selectedModules.includes(module.id)
                      ? "1px solid"
                      : "none",
                    borderColor: selectedModules.includes(module.id)
                      ? "primary.200"
                      : "transparent",
                    "&:hover": { bgcolor: "grey.50" },
                  }}
                  onClick={() => handleModuleToggle(module.id)}
                >
                  <Checkbox
                    checked={selectedModules.includes(module.id)}
                    onChange={() => handleModuleToggle(module.id)}
                    disabled={
                      !selectedModules.includes(module.id) &&
                      selectedModules.length >= 4
                    }
                  />
                  <Typography variant="h5">{module.icon}</Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, color: "grey.800" }}
                  >
                    {module.name}
                  </Typography>
                </Box>
              ))}
              <Typography variant="body2" sx={{ color: "grey.500", mt: 2 }}>
                已选择 {selectedModules.length}/4 个模块
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="选中模块概览" />
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {selectedModules.map((moduleId, index) => {
                const moduleData =
                  mockComparisonData[
                    moduleId as keyof typeof mockComparisonData
                  ];
                const moduleInfo = modules.find((m) => m.id === moduleId);
                return (
                  <Box
                    key={moduleId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: COLORS[index % COLORS.length],
                        }}
                      />
                      <Typography variant="h5">{moduleInfo?.icon}</Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 500, color: "grey.800" }}
                      >
                        {moduleInfo?.name}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: "bold", color: "grey.800" }}
                      >
                        {moduleData?.metrics.total || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "grey.500" }}>
                        总量
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardHeader
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pb: 0,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                对比图表
              </Typography>
              <Tabs
                value={chartType}
                onChange={(_, v) =>
                  setChartType(v as "bar" | "line" | "pie" | "radar")
                }
                sx={{ minWidth: 200 }}
              >
                <Tab
                  icon={<BarChart3 sx={{ width: 16, height: 16 }} />}
                  value="bar"
                />
                <Tab
                  icon={<LineChartIcon sx={{ width: 16, height: 16 }} />}
                  value="line"
                />
                <Tab
                  icon={<PieChartIcon sx={{ width: 16, height: 16 }} />}
                  value="pie"
                />
                <Tab
                  icon={<Radar sx={{ width: 16, height: 16 }} />}
                  value="radar"
                />
              </Tabs>
            </CardHeader>
            <CardContent sx={{ mt: 2 }}>
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
                  yKeys={yKeys}
                  height={350}
                />
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title="关键指标对比" />
            <CardContent>
              <Paper sx={{ overflow: "auto" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: "grey.600" }}>
                        指标
                      </TableCell>
                      {selectedModules.map((moduleId, index) => (
                        <TableCell
                          key={moduleId}
                          sx={{
                            fontWeight: 600,
                            color: COLORS[index % COLORS.length],
                          }}
                        >
                          {modules.find((m) => m.id === moduleId)?.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { key: "total", label: "总量" },
                      { key: "active", label: "活跃" },
                      { key: "completed", label: "完成" },
                      { key: "efficiency", label: "效率(%)" },
                    ].map((metric) => (
                      <TableRow key={metric.key}>
                        <TableCell sx={{ color: "grey.600" }}>
                          {metric.label}
                        </TableCell>
                        {selectedModules.map((moduleId) => {
                          const moduleData =
                            mockComparisonData[
                              moduleId as keyof typeof mockComparisonData
                            ];
                          return (
                            <TableCell
                              key={moduleId}
                              sx={{ fontWeight: 500, color: "grey.800" }}
                            >
                              {moduleData?.metrics[
                                metric.key as keyof typeof moduleData.metrics
                              ] || "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default BIComparisonPage;
