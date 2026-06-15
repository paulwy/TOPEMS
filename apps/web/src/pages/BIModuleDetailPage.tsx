import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  RefreshCw,
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
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import { Button, Card, CardContent, Skeleton } from "@mui/material";
import { MetricCard } from "../components/MetricCard";
import { ChartCard } from "../components/ChartCard";
import { BIChartColors } from "../components/charts/chartTheme";
import { fetchModuleDetailData } from "../api/bi";

const moduleConfig = {
  rs: { name: "研发管理", icon: "🔬", color: BIChartColors.series[0] },
  lims: { name: "实验室管理", icon: "🧪", color: BIChartColors.series[1] },
  qms: { name: "质量管理", icon: "✅", color: BIChartColors.series[2] },
  ehs: { name: "安全环保", icon: "🛡️", color: BIChartColors.series[3] },
  srm: { name: "供应链管理", icon: "📦", color: BIChartColors.series[4] },
  pdm: { name: "生产数据", icon: "🏭", color: BIChartColors.series[5] },
};

const SummaryCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <div
        className={`p-2 rounded-lg bg-opacity-10`}
        style={{ backgroundColor: `${color}20` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
    <div className="text-2xl font-bold text-slate-900">
      {typeof value === "number" ? value.toLocaleString() : value}
    </div>
  </div>
);

const BIModuleDetailPage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [moduleData, setModuleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const config = moduleConfig[moduleId as keyof typeof moduleConfig] || {
    name: "未知模块",
    icon: "📊",
    color: "#6B7280",
  };

  const loadModuleData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchModuleDetailData(moduleId || "");
      if (res.success && res.data) {
        setModuleData(res.data);
      } else {
        setModuleData(getMockData(moduleId || ""));
      }
    } catch (error) {
      console.error("Failed to load module data:", error);
      setModuleData(getMockData(moduleId || ""));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [moduleId]);

  const getMockData = (module: string) => {
    switch (module) {
      case "rs":
        return {
          summary: {
            total_projects: 120,
            active_projects: 45,
            completed_projects: 75,
            avg_duration: 45.5,
          },
          timeline: [
            { month: "1月", count: 25 },
            { month: "2月", count: 30 },
            { month: "3月", count: 28 },
            { month: "4月", count: 35 },
            { month: "5月", count: 42 },
            { month: "6月", count: 38 },
          ],
          success_rate: [
            { month: "1月", rate: 85 },
            { month: "2月", rate: 88 },
            { month: "3月", rate: 90 },
            { month: "4月", rate: 87 },
            { month: "5月", rate: 92 },
            { month: "6月", rate: 95 },
          ],
          distribution: [
            { name: "研发", value: 60 },
            { name: "改进", value: 30 },
            { name: "创新", value: 10 },
          ],
        };
      case "lims":
        return {
          summary: {
            total_samples: 2450,
            completed_tests: 2150,
            pending_tests: 180,
            avg_turnaround: 48,
          },
          timeline: [
            { month: "1月", count: 420 },
            { month: "2月", count: 380 },
            { month: "3月", count: 450 },
            { month: "4月", count: 520 },
            { month: "5月", count: 480 },
            { month: "6月", count: 550 },
          ],
          pass_rate: [
            { month: "1月", rate: 96.5 },
            { month: "2月", rate: 97.2 },
            { month: "3月", rate: 97.8 },
            { month: "4月", rate: 98.1 },
            { month: "5月", rate: 97.6 },
            { month: "6月", rate: 98.5 },
          ],
          distribution: [
            { name: "化学检验", value: 40 },
            { name: "物理检验", value: 30 },
            { name: "微生物检验", value: 20 },
            { name: "其他", value: 10 },
          ],
        };
      case "qms":
        return {
          summary: {
            total_inspections: 3250,
            passed: 3180,
            failed: 70,
            pass_rate: 97.8,
          },
          timeline: [
            { month: "1月", count: 520 },
            { month: "2月", count: 480 },
            { month: "3月", count: 550 },
            { month: "4月", count: 620 },
            { month: "5月", count: 580 },
            { month: "6月", count: 650 },
          ],
          quality_trend: [
            { month: "1月", rate: 96.5 },
            { month: "2月", rate: 97.2 },
            { month: "3月", rate: 97.8 },
            { month: "4月", rate: 98.1 },
            { month: "5月", rate: 97.6 },
            { month: "6月", rate: 97.8 },
          ],
          distribution: [
            { name: "合格", value: 97.8 },
            { name: "不合格", value: 2.2 },
          ],
        };
      case "ehs":
        return {
          summary: {
            total_risks: 125,
            high_risks: 15,
            incidents: 18,
            resolved: 110,
          },
          timeline: [
            { month: "1月", count: 15 },
            { month: "2月", count: 12 },
            { month: "3月", count: 18 },
            { month: "4月", count: 8 },
            { month: "5月", count: 10 },
            { month: "6月", count: 15 },
          ],
          incident_trend: [
            { month: "1月", count: 3 },
            { month: "2月", count: 2 },
            { month: "3月", count: 4 },
            { month: "4月", count: 1 },
            { month: "5月", count: 2 },
            { month: "6月", count: 3 },
          ],
          distribution: [
            { name: "高风险", value: 15 },
            { name: "中风险", value: 45 },
            { name: "低风险", value: 65 },
          ],
        };
      case "srm":
        return {
          summary: {
            total_suppliers: 280,
            qualified: 220,
            avg_rating: 4.5,
            pending_orders: 35,
          },
          timeline: [
            { month: "1月", count: 220 },
            { month: "2月", count: 235 },
            { month: "3月", count: 240 },
            { month: "4月", count: 245 },
            { month: "5月", count: 250 },
            { month: "6月", count: 280 },
          ],
          order_trend: [
            { month: "1月", count: 120 },
            { month: "2月", count: 135 },
            { month: "3月", count: 140 },
            { month: "4月", count: 155 },
            { month: "5月", count: 160 },
            { month: "6月", count: 180 },
          ],
          distribution: [
            { name: "合格", value: 220 },
            { name: "待审核", value: 45 },
            { name: "不合格", value: 15 },
          ],
        };
      case "pdm":
        return {
          summary: {
            total_batches: 450,
            completed: 415,
            in_progress: 28,
            efficiency: 92.5,
          },
          timeline: [
            { month: "1月", count: 1850 },
            { month: "2月", count: 2100 },
            { month: "3月", count: 1980 },
            { month: "4月", count: 2350 },
            { month: "5月", count: 2200 },
            { month: "6月", count: 2420 },
          ],
          production_trend: [
            { month: "1月", rate: 88 },
            { month: "2月", rate: 90 },
            { month: "3月", rate: 92 },
            { month: "4月", rate: 95 },
            { month: "5月", rate: 93 },
            { month: "6月", rate: 92.5 },
          ],
          distribution: [
            { name: "已完成", value: 415 },
            { name: "进行中", value: 28 },
            { name: "已取消", value: 7 },
          ],
        };
      default:
        return {
          summary: {},
          timeline: [],
          distribution: [],
        };
    }
  };

  const handleRefresh = () => {
    loadModuleData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const summaryLabels: Record<string, string> = {
    total_projects: "项目总数",
    active_projects: "进行中",
    completed_projects: "已完成",
    avg_duration: "平均周期(天)",
    total_samples: "样品总数",
    completed_tests: "完成检验",
    pending_tests: "待检验",
    avg_turnaround: "平均周期(小时)",
    total_inspections: "检验总数",
    passed: "合格数",
    failed: "不合格数",
    pass_rate: "合格率(%)",
    total_risks: "风险总数",
    high_risks: "高风险",
    incidents: "安全事件",
    resolved: "已解决",
    total_suppliers: "供应商总数",
    qualified: "合格供应商",
    avg_rating: "平均评分",
    pending_orders: "待处理订单",
    total_batches: "批次总数",
    completed: "已完成",
    in_progress: "进行中",
    efficiency: "效率(%)",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/bi/analytics">
            <Button variant="text" size="small" sx={{ borderRadius: 1 }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {config.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">详细数据分析</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>最后更新: {new Date().toLocaleString("zh-CN")}</span>
          </div>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "刷新中..." : "刷新数据"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {moduleData?.summary &&
          Object.entries(moduleData.summary).map(([key, value]) => (
            <SummaryCard
              key={key}
              label={summaryLabels[key] || key}
              value={value as string | number}
              icon={<BarChart3 className="w-4 h-4" />}
              color={config.color}
            />
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {moduleData?.timeline && (
          <ChartCard
            title="月度趋势"
            subtitle="数据变化走势"
            height={320}
            showChartType
            activeChartType="bar"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <BarChart data={moduleData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#64748B", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill={config.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {moduleData?.distribution && (
          <ChartCard
            title="分布占比"
            subtitle="数据构成分析"
            height={320}
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
                  data={moduleData.distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="value"
                >
                  {moduleData.distribution.map((entry: any, index: number) => (
                    <Cell
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
        )}
      </div>

      {/* Success Rate / Pass Rate Chart */}
      {(moduleData?.success_rate ||
        moduleData?.pass_rate ||
        moduleData?.quality_trend) && (
        <ChartCard
          title="趋势分析"
          subtitle="关键指标走势"
          height={320}
          showChartType
          activeChartType="line"
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
          >
            <RechartsLineChart
              data={
                moduleData.success_rate ||
                moduleData.pass_rate ||
                moduleData.quality_trend
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis
                domain={[80, 100]}
                tick={{ fill: "#64748B", fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={config.color}
                strokeWidth={2.5}
                dot={{ fill: config.color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: config.color }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
};

export default BIModuleDetailPage;
