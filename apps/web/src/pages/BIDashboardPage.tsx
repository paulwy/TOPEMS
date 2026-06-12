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
import { BarChart } from "../components/charts/BarChart";
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
} from "../api/bi";
import { LoadingSpinner } from "../components/LoadingSpinner";
import MetricCard from "../components/MetricCard";
import { ChartCard } from "../components/ChartCard";
import { BIChartColors } from "../components/charts/chartTheme";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

const MetricCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200/60">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

const ChartCardSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100">
      <Skeleton className="h-5 w-32" />
    </div>
    <div className="p-6">
      <Skeleton className="h-[240px] w-full rounded-lg" style={{ height }} />
    </div>
  </div>
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
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
      case "quality":
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case "maintenance":
        return <TrendingUp className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "production":
        return "bg-blue-50 border-blue-100";
      case "quality":
        return "bg-emerald-50 border-emerald-100";
      case "maintenance":
        return "bg-amber-50 border-amber-100";
      default:
        return "bg-slate-50 border-slate-100";
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 hover:shadow-sm animate-fade-in"
      style={{
        backgroundColor: "white",
        borderColor: "#E2E8F0",
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.type)}`}
      >
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {activity.title}
        </p>
        <p className="text-xs text-slate-500">{activity.time}</p>
      </div>
    </div>
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
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-6 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Metrics skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCardSkeleton height={280} />
            </div>
            <div>
              <ChartCardSkeleton height={280} />
            </div>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">数据大屏</h2>
            <p className="text-sm text-slate-500 mt-1">实时业务数据总览</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>最后更新: {new Date().toLocaleString("zh-CN")}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "刷新中..." : "刷新数据"}
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              className="animate-fade-in"
            />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
          </div>
          <div>
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
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
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
          </div>
          <div>
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
          </div>
          <div>
            <ChartCard
              title="最近活动"
              subtitle="系统动态"
              height={260}
              showExport={false}
              showRefresh={false}
            >
              <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
                {(summary?.recent_activities || defaultActivities).map(
                  (activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      index={index}
                    />
                  ),
                )}
              </div>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIDashboardPage;
