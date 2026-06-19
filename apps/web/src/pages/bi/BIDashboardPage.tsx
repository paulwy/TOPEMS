import { Grid } from "@/components/Grid";
import { useState, useEffect } from "react";
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import BarChart from "@/components/charts/BarChart";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  type SummaryDashboard,
  type DevelopmentAnalytics,
  type QualityAnalytics,
  type ProductionAnalytics,
  type LaboratoryAnalytics,
} from "@/api/bi";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MetricCard from "@/components/MetricCard";
import { ChartCard } from "@/components/ChartCard";
import { BIChartColors } from "@/components/charts/chartTheme";
import { Button, Skeleton, Box, Typography } from "@mui/material";
import { PageHeader } from "@/components/templates/PageHeader";

const MetricCardSkeleton = () => (
  <Box
    sx={{
      bgcolor: "background.paper",
      borderRadius: 3,
      boxShadow: 1,
      p: 3,
      border: "1px solid",
      borderColor: "divider",
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
      <Box sx={{ flex: 1 }}>
        <Skeleton sx={{ height: 16, width: 96, mb: 1 }} />
        <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
        <Skeleton sx={{ height: 16, width: 80 }} />
      </Box>
      <Skeleton sx={{ width: 48, height: 48, borderRadius: 2 }} />
    </Box>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Skeleton sx={{ height: 16, width: 64 }} />
      <Skeleton sx={{ height: 32, width: 80 }} />
    </Box>
  </Box>
);

const ChartCardSkeleton = ({ height = 300 }: { height?: number }) => (
  <Box
    sx={{
      bgcolor: "background.paper",
      borderRadius: 3,
      boxShadow: 1,
      border: "1px solid",
      borderColor: "divider",
      overflow: "hidden",
    }}
  >
    <Box
      sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Skeleton sx={{ height: 20, width: 128 }} />
    </Box>
    <Box sx={{ p: 3 }}>
      <Skeleton
        sx={{ height: 240, width: "100%", borderRadius: 1 }}
        style={{ height }}
      />
    </Box>
  </Box>
);

const ActivityItem = ({
  activity,
  index,
}: {
  activity: { id: number; type: string; title: string; time: string };
  index: number;
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "production":
        return (
          <BarChart3 sx={{ width: 16, height: 16, color: "primary.main" }} />
        );
      case "quality":
        return (
          <Activity sx={{ width: 16, height: 16, color: "success.main" }} />
        );
      case "maintenance":
        return (
          <TrendingUp sx={{ width: 16, height: 16, color: "warning.main" }} />
        );
      default:
        return <Activity sx={{ width: 16, height: 16, color: "grey.600" }} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "production":
        return { bgcolor: "blue.50", borderColor: "blue.100" };
      case "quality":
        return { bgcolor: "green.50", borderColor: "green.100" };
      case "maintenance":
        return { bgcolor: "orange.50", borderColor: "orange.100" };
      default:
        return { bgcolor: "grey.50", borderColor: "grey.100" };
    }
  };

  const colors = getActivityColor(activity.type);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        transition: "all 0.3s",
        "&:hover": {
          boxShadow: 1,
        },
        animation: "fadeIn 0.5s ease-in-out",
        animationDelay: `${index * 100}ms`,
        animationFillMode: "both",
        ...colors,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...colors,
        }}
      >
        {getActivityIcon(activity.type)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: "grey.800",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activity.title}
        </Typography>
        <Typography variant="caption" sx={{ color: "grey.500" }}>
          {activity.time}
        </Typography>
      </Box>
    </Box>
  );
};

const BIDashboardPage = () => {
  const [summary, setSummary] = useState<SummaryDashboard | null>(null);
  const [development, setDevelopment] = useState<DevelopmentAnalytics | null>(
    null,
  );
  const [quality, setQuality] = useState<QualityAnalytics | null>(null);
  const [production, setProduction] = useState<ProductionAnalytics | null>(
    null,
  );
  const [laboratory, setLaboratory] = useState<LaboratoryAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);
    try {
      const [summaryRes, devRes, qualityRes, prodRes, labRes] =
        await Promise.all([
          fetchSummaryDashboard(),
          fetchDevelopmentAnalytics(),
          fetchQualityAnalytics(),
          fetchProductionAnalytics(),
          fetchLaboratoryAnalytics(),
        ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (devRes.success && devRes.data) {
        setDevelopment(devRes.data);
      }
      if (qualityRes.success && qualityRes.data) {
        setQuality(qualityRes.data);
      }
      if (prodRes.success && prodRes.data) {
        setProduction(prodRes.data);
      }
      if (labRes.success && labRes.data) {
        setLaboratory(labRes.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Header skeleton */}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Skeleton sx={{ height: 40, width: 128 }} />
              <Skeleton sx={{ height: 40, width: 96 }} />
            </Box>
          </Box>

          {/* Metrics skeleton */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </Box>

          {/* Charts skeleton */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", lg: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            <Box sx={{ lgColumnSpan: 2 }}>
              <ChartCardSkeleton height={280} />
            </Box>
            <Box>
              <ChartCardSkeleton height={280} />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  const defaultMetrics = [
    {
      title: "生产效率",
      value: 85.5,
      unit: "%",
      change: 2.3,
      trend: "up" as const,
      sparklineData: [78, 82, 85, 83, 86, 85.5],
    },
    {
      title: "质量合格率",
      value: 98.2,
      unit: "%",
      change: 0.8,
      trend: "up" as const,
      sparklineData: [96, 97, 97.5, 98, 98, 98.2],
    },
    {
      title: "设备稼动率",
      value: 92.3,
      unit: "%",
      change: -1.2,
      trend: "down" as const,
      sparklineData: [94, 93, 93.5, 92, 92.5, 92.3],
    },
    {
      title: "交付准时率",
      value: 96.8,
      unit: "%",
      change: 1.5,
      trend: "up" as const,
      sparklineData: [94, 95, 96, 95.5, 96.5, 96.8],
    },
  ];

  const defaultActivities = [
    {
      id: 1,
      type: "production",
      title: "完成生产订单 PO-2024-001",
      time: "10分钟前",
    },
    {
      id: 2,
      type: "quality",
      title: "质量检验完成，批次 B-001",
      time: "25分钟前",
    },
    {
      id: 3,
      type: "maintenance",
      title: "设备维护完成：生产线A",
      time: "1小时前",
    },
  ];

  const testTypeData = laboratory
    ? [
        {
          name: "化学检验",
          value: laboratory.test_type_distribution.chemical,
          color: BIChartColors.series[0],
        },
        {
          name: "物理检验",
          value: laboratory.test_type_distribution.physical,
          color: BIChartColors.series[1],
        },
        {
          name: "微生物检验",
          value: laboratory.test_type_distribution.microbiological,
          color: BIChartColors.series[2],
        },
        {
          name: "其他",
          value: laboratory.test_type_distribution.other,
          color: BIChartColors.series[3],
        },
      ]
    : [
        { name: "化学检验", value: 40, color: BIChartColors.series[0] },
        { name: "物理检验", value: 30, color: BIChartColors.series[1] },
        { name: "微生物检验", value: 20, color: BIChartColors.series[2] },
        { name: "其他", value: 10, color: BIChartColors.series[3] },
      ];

  const metrics = (summary?.key_metrics || defaultMetrics).map(
    (metric, index) => ({
      ...metric,
      color: `from-${["blue", "emerald", "amber", "rose"][index]}-500 to-${["cyan", "teal", "orange", "pink"][index]}-400`,
      icon: [ArrowUpRight, Activity, TrendingDown, TrendingUp][index],
    }),
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <PageHeader
        title="数据大屏"
        subtitle="实时业务数据总览"
        pageIcon={<BarChart3 style={{ width: 20, height: 20 }} />}
        pageColor="linear-gradient(135deg, #10B981, #059669)"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "BI" },
          { label: "数据大屏" },
        ]}
        onRefresh={handleRefresh}
        loading={loading}
      />

      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Metrics Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              change={metric.change}
              trend={(metric as any).trend}
              icon={metric.icon}
              color={metric.color}
              sparklineData={(metric as any).sparklineData}
            />
          ))}
        </Box>

        {/* Charts Row 1 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Box sx={{ gridColumn: { lg: "span 2" } }}>
            <ChartCard
              title="月度新增项目"
              subtitle="研发项目月度趋势"
              height={280}
              showChartType
              activeChartType="bar"
              onChartTypeChange={(type) =>
                console.log("Chart type changed:", type)
              }
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={
                    development?.monthly_new_projects || [
                      { month: "1月", count: 25 },
                      { month: "2月", count: 30 },
                      { month: "3月", count: 28 },
                      { month: "4月", count: 35 },
                      { month: "5月", count: 42 },
                      { month: "6月", count: 38 },
                    ]
                  }
                  xKey="month"
                  yKeys={[
                    {
                      key: "count",
                      name: "项目数",
                      color: BIChartColors.series[0],
                    },
                  ]}
                  height={240}
                  barRadius={6}
                  animate
                />
              </ResponsiveContainer>
            </ChartCard>
          </Box>
          <Box>
            <ChartCard
              title="检验类型分布"
              subtitle="实验室检验构成"
              height={280}
              showChartType
              activeChartType="pie"
              onChartTypeChange={(type) =>
                console.log("Chart type changed:", type)
              }
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <RechartsPieChart>
                  <Pie
                    data={testTypeData}
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
                    {testTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
        </Box>

        {/* Charts Row 2 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <Box>
            <ChartCard
              title="质量合格率趋势"
              subtitle="月度质量走势"
              height={260}
              trend="up"
              trendValue="+0.8%"
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <RechartsLineChart
                  data={
                    quality?.quality_trend || [
                      { month: "1月", pass_rate: 96.5 },
                      { month: "2月", pass_rate: 97.2 },
                      { month: "3月", pass_rate: 97.8 },
                      { month: "4月", pass_rate: 98.1 },
                      { month: "5月", pass_rate: 97.6 },
                      { month: "6月", pass_rate: 97.8 },
                    ]
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[90, 100]}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="pass_rate"
                    stroke={BIChartColors.semantic.success}
                    strokeWidth={2.5}
                    dot={{
                      fill: BIChartColors.semantic.success,
                      strokeWidth: 0,
                      r: 4,
                    }}
                    activeDot={{ r: 6, fill: BIChartColors.semantic.success }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
          <Box>
            <ChartCard
              title="日产量统计"
              subtitle="生产批次日趋势"
              height={260}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={
                    production?.daily_output || [
                      { date: "1日", output: 1850 },
                      { date: "2日", output: 2100 },
                      { date: "3日", output: 1980 },
                      { date: "4日", output: 2350 },
                      { date: "5日", output: 2200 },
                      { date: "6日", output: 2420 },
                    ]
                  }
                  xKey="date"
                  yKeys={[
                    {
                      key: "output",
                      name: "产量",
                      color: BIChartColors.semantic.warning,
                    },
                  ]}
                  height={220}
                  barRadius={[4, 4, 0, 0]}
                  animate
                />
              </ResponsiveContainer>
            </ChartCard>
          </Box>
          <Box>
            <ChartCard
              title="最近活动"
              subtitle="系统动态"
              height={260}
              showExport={false}
              showRefresh={false}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  overflowY: "auto",
                  maxHeight: 220,
                  pr: 1,
                }}
              >
                {(summary?.recent_activities || defaultActivities).map(
                  (activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      index={index}
                    />
                  ),
                )}
              </Box>
            </ChartCard>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BIDashboardPage;
