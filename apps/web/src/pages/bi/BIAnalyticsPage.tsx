import { Grid } from "@/components/Grid";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
} from "recharts";
import { fetchAnalyticsOverview } from "@/api/bi";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ChartCard } from "@/components/ChartCard";
import { BIChartColors } from "@/components/charts/chartTheme";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "@/components/ui/OrganizationFilter";
import { Button, Skeleton, Box, Typography } from "@mui/material";

const ModuleCard = ({
  id,
  name,
  icon,
  stats,
  trend,
  onSelect,
  color,
}: {
  id: string;
  name: string;
  icon: string;
  stats: any;
  trend: "up" | "down" | "stable";
  onSelect: (id: string) => void;
  color: string;
}) => {
  const getTrendIcon = () => {
    if (trend === "up")
      return (
        <TrendingUp sx={{ width: 16, height: 16, color: "success.main" }} />
      );
    if (trend === "down")
      return (
        <TrendingDown sx={{ width: 16, height: 16, color: "error.main" }} />
      );
    return <Minus sx={{ width: 16, height: 16, color: "grey.400" }} />;
  };

  const getTrendValue = () => {
    if (trend === "up") return "+12.5%";
    if (trend === "down") return "-3.2%";
    return "0%";
  };

  const getTrendTextColor = () => {
    if (trend === "up") return "success.main";
    if (trend === "down") return "error.main";
    return "grey.400";
  };

  return (
    <Box
      onClick={() => onSelect(id)}
      sx={{
        position: "relative",
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: 1,
        border: "1px solid",
        borderColor: "divider",
        p: 3,
        cursor: "pointer",
        transition: "all 0.3s",
        overflow: "hidden",
        "&:hover": {
          boxShadow: 2,
          borderColor: "grey.300",
          transform: "scale(1.02)",
        },
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 96,
          height: 96,
          opacity: 0.05,
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            borderRadius: "50%",
            filter: "blur(48px)",
            transform: "translate(32px, -32px)",
          }}
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 10 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h4">{icon}</Typography>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "grey.900" }}
              >
                {name}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.25,
                }}
              >
                {getTrendIcon()}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: getTrendTextColor(),
                  }}
                >
                  {getTrendValue()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <ArrowRight
            sx={{
              width: 20,
              height: 20,
              color: "grey.300",
              transition: "all 0.3s",
              ".group:hover &": {
                color: "grey.500",
                transform: "translateX(4px)",
              },
            }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {Object.entries(stats)
            .slice(0, 3)
            .map(([key, value]) => (
              <Box key={key} sx={{ textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "grey.900" }}
                >
                  {typeof value === "number"
                    ? value.toLocaleString()
                    : String(value)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "grey.500", mt: 0.25 }}
                >
                  {key}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
};

const BIAnalyticsPage = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await fetchAnalyticsOverview();
        if (res.success && res.data) {
          setOverview(res.data);
        }
      } catch (e) {
        console.error("Failed to load overview:", e);
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
              <Skeleton sx={{ height: 16, width: 96 }} />
            </Box>
          </Box>
          <Skeleton sx={{ height: 64, width: "100%", borderRadius: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", lg: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            <Skeleton
              sx={{
                gridColumn: { lg: "span 2" },
                height: 320,
                borderRadius: 3,
              }}
            />
            <Skeleton sx={{ height: 320, borderRadius: 3 }} />
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} sx={{ height: 160, borderRadius: 3 }} />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  const modules = [
    {
      id: "development",
      name: "研发管理",
      icon: "🔬",
      stats: { 项目总数: 120, 进行中: 45, 完成率: "85%" },
      trend: "up" as const,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "quality",
      name: "质量管理",
      icon: "✅",
      stats: { 检验总数: 3250, 合格率: "97.8%", 待处理: 70 },
      trend: "up" as const,
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "production",
      name: "生产数据",
      icon: "🏭",
      stats: { 批次总数: 450, 完成: 415, 效率: "92%" },
      trend: "stable" as const,
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "laboratory",
      name: "实验室",
      icon: "🧪",
      stats: { 样品总数: 2450, 完成检验: 2150, 仪器使用率: "87.5%" },
      trend: "up" as const,
      color: "from-violet-500 to-purple-500",
    },
    {
      id: "ehs",
      name: "安全环保",
      icon: "🛡️",
      stats: { 风险总数: 125, 高风险: 15, 安全事件: 18 },
      trend: "down" as const,
      color: "from-rose-500 to-pink-500",
    },
    {
      id: "srm",
      name: "供应链",
      icon: "📦",
      stats: { 供应商总数: 280, 合格: 220, 平均评分: 4.5 },
      trend: "up" as const,
      color: "from-cyan-500 to-blue-500",
    },
  ];

  const moduleData = overview?.modules || {};

  const chartData = Object.entries(moduleData).map(
    ([key, module]: [string, any]) => ({
      name: module.name || key,
      value:
        module.total_projects ||
        module.total_samples ||
        module.total_inspections ||
        module.total_risks ||
        module.total_suppliers ||
        module.total_batches ||
        0,
    }),
  );

  const fallbackChartData = modules.map((m) => ({
    name: m.name,
    value: (Object.values(m.stats)[0] as number) || 0,
  }));

  const finalChartData = chartData.length > 0 ? chartData : fallbackChartData;

  const handleModuleSelect = (moduleId: string) => {
    navigate(`/bi/module/${moduleId}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "grey.900" }}
            >
              概览分析
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
              各业务模块数据总览
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            border: "1px solid",
            borderColor: "divider",
            p: 2,
          }}
        >
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={true}
          />
        </Box>

        {/* Charts */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Box sx={{ gridColumn: { lg: "span 2" } }}>
            <ChartCard
              title="各业务模块数据统计"
              subtitle="模块数据量对比"
              height={300}
              showChartType
              activeChartType="bar"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart data={finalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {finalChartData.map((entry, index) => (
                      <rect
                        key={`cell-${index}`}
                        fill={
                          BIChartColors.series[
                            index % BIChartColors.series.length
                          ]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
          <Box>
            <ChartCard
              title="业务模块占比"
              subtitle="数据分布概览"
              height={300}
              showChartType
              activeChartType="pie"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <RechartsPieChart>
                  <Pie
                    data={finalChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    innerRadius={50}
                    dataKey="value"
                  >
                    {finalChartData.map((entry, index) => (
                      <rect
                        key={`cell-${index}`}
                        fill={
                          BIChartColors.series[
                            index % BIChartColors.series.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
        </Box>

        {/* Module Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              icon={module.icon}
              stats={module.stats}
              trend={module.trend}
              onSelect={handleModuleSelect}
              color={module.color}
            />
          ))}
        </Box>

        {/* System Status */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            border: "1px solid",
            borderColor: "divider",
            p: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "grey.800", mb: 2 }}
          >
            系统状态
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                数据更新时间
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "grey.900" }}
              >
                {new Date().toLocaleString("zh-CN")}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                系统状态
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 1.25,
                  py: 0.5,
                  bgcolor: "success.50",
                  color: "success.main",
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              >
                正常运行
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                数据源连接
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 1.25,
                  py: 0.5,
                  bgcolor: "success.50",
                  color: "success.main",
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              >
                已连接
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BIAnalyticsPage;
