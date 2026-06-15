/**
 * BIDashboardPage 重构版本
 *
 * 重构要点：
 * 1. 使用 DashboardTemplate 替代手写布局
 * 2. 使用 PageHeader 统一页面头部
 * 3. 保持业务逻辑不变
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
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
import { ChartCard } from "../components/ChartCard";
import { BIChartColors } from "../components/charts/chartTheme";
import MetricCard from "../components/MetricCard";
import { DashboardTemplate } from "../components/templates";
import { PageHeader } from "../components/layout";

// ============ 类型定义 ============
interface MetricItem {
  title: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down";
  color: string;
  icon: React.ReactNode;
  sparklineData?: number[];
}

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  time: string;
}

interface ChartItem {
  id: string;
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  height?: number;
}

// ============ 默认数据 ============
const defaultMetrics: MetricItem[] = [
  {
    title: "生产效率",
    value: 85.5,
    unit: "%",
    change: 2.3,
    trend: "up",
    color: "from-blue-500 to-cyan-400",
    icon: <ArrowUpRight style={{ width: 24, height: 24 }} />,
    sparklineData: [78, 82, 85, 83, 86, 85.5],
  },
  {
    title: "质量合格率",
    value: 98.2,
    unit: "%",
    change: 0.8,
    trend: "up",
    color: "from-emerald-500 to-teal-400",
    icon: <Activity style={{ width: 24, height: 24 }} />,
    sparklineData: [96, 97, 97.5, 98, 98, 98.2],
  },
  {
    title: "设备稼动率",
    value: 92.3,
    unit: "%",
    change: -1.2,
    trend: "down",
    color: "from-amber-500 to-orange-400",
    icon: <TrendingDown style={{ width: 24, height: 24 }} />,
    sparklineData: [94, 93, 93.5, 92, 92.5, 92.3],
  },
  {
    title: "交付准时率",
    value: 96.8,
    unit: "%",
    change: 1.5,
    trend: "up",
    color: "from-rose-500 to-pink-400",
    icon: <TrendingUp style={{ width: 24, height: 24 }} />,
    sparklineData: [94, 95, 96, 95.5, 96.5, 96.8],
  },
];

const defaultActivities: ActivityItem[] = [
  { id: 1, type: "production", title: "完成生产订单 PO-2024-001", time: "10分钟前" },
  { id: 2, type: "quality", title: "质量检验完成，批次 B-001", time: "25分钟前" },
  { id: 3, type: "maintenance", title: "设备维护完成：生产线A", time: "1小时前" },
];

// ============ 组件 ============
const BIDashboardPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // 数据状态
  const [summary, setSummary] = useState<SummaryDashboard | null>(null);
  const [development, setDevelopment] = useState<DevelopmentAnalytics | null>(null);
  const [quality, setQuality] = useState<QualityAnalytics | null>(null);
  const [production, setProduction] = useState<ProductionAnalytics | null>(null);
  const [laboratory, setLaboratory] = useState<LaboratoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取数据
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [summaryRes, devRes, qualityRes, prodRes, labRes] = await Promise.all([
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // 处理模块点击
  const handleModuleClick = useCallback((moduleId: string) => {
    navigate(`/bi/module/${moduleId}`);
  }, [navigate]);

  // 处理最近活动点击
  const handleActivityClick = useCallback((activity: ActivityItem) => {
    console.log("Activity clicked:", activity);
  }, []);

  // 获取指标数据
  const metrics: MetricItem[] = (summary?.key_metrics || defaultMetrics).map(
    (metric, index) => ({
      ...metric,
      color: `from-${["blue", "emerald", "amber", "rose"][index]}-500 to-${["cyan", "teal", "orange", "pink"][index]}-400`,
      icon: [ArrowUpRight, Activity, TrendingDown, TrendingUp][index],
    }),
  );

  // 检验类型分布数据
  const testTypeData = laboratory
    ? [
        { name: "化学检验", value: laboratory.test_type_distribution.chemical, color: BIChartColors.series[0] },
        { name: "物理检验", value: laboratory.test_type_distribution.physical, color: BIChartColors.series[1] },
        { name: "微生物检验", value: laboratory.test_type_distribution.microbiological, color: BIChartColors.series[2] },
        { name: "其他", value: laboratory.test_type_distribution.other, color: BIChartColors.series[3] },
      ]
    : [
        { name: "化学检验", value: 40, color: BIChartColors.series[0] },
        { name: "物理检验", value: 30, color: BIChartColors.series[1] },
        { name: "微生物检验", value: 20, color: BIChartColors.series[2] },
        { name: "其他", value: 10, color: BIChartColors.series[3] },
      ];

  // 月度新增项目数据
  const monthlyProjectData = development?.monthly_new_projects || [
    { month: "1月", count: 25 },
    { month: "2月", count: 30 },
    { month: "3月", count: 28 },
    { month: "4月", count: 35 },
    { month: "5月", count: 42 },
    { month: "6月", count: 38 },
  ];

  // 质量趋势数据
  const qualityTrendData = quality?.quality_trend || [
    { month: "1月", pass_rate: 96.5 },
    { month: "2月", pass_rate: 97.2 },
    { month: "3月", pass_rate: 97.8 },
    { month: "4月", pass_rate: 98.1 },
    { month: "5月", pass_rate: 97.6 },
    { month: "6月", pass_rate: 97.8 },
  ];

  // 日产量数据
  const dailyOutputData = production?.daily_output || [
    { date: "1日", output: 1850 },
    { date: "2日", output: 2100 },
    { date: "3日", output: 1980 },
    { date: "4日", output: 2350 },
    { date: "5日", output: 2200 },
    { date: "6日", output: 2420 },
  ];

  // 统计数据
  const stats = metrics.map((metric, index) => ({
    id: `stat-${index}`,
    title: metric.title,
    value: metric.value,
    unit: metric.unit,
    change: metric.change,
    changeLabel: "%",
    color: ["primary", "success", "warning", "error"][index] as any,
    icon: metric.icon,
    onClick: () => handleModuleClick(metric.title),
  }));

  // 图表数据
  const charts: ChartItem[] = [
    {
      id: "monthly-projects",
      title: "月度新增项目",
      subtitle: "研发项目月度趋势",
      height: 300,
      chart: (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={monthlyProjectData} xKey="month" yKeys={[{ key: "count", name: "项目数", color: BIChartColors.series[0] }]} height={240} barRadius={6} animate />
        </ResponsiveContainer>
      ),
    },
    {
      id: "test-distribution",
      title: "检验类型分布",
      subtitle: "实验室检验构成",
      height: 300,
      chart: (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <RechartsPieChart>
            <Pie
              data={testTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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
      ),
    },
    {
      id: "quality-trend",
      title: "质量合格率趋势",
      subtitle: "月度质量走势",
      height: 280,
      chart: (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <RechartsLineChart data={qualityTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis domain={[90, 100]} tick={{ fill: "#64748B", fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="pass_rate"
              stroke={BIChartColors.semantic.success}
              strokeWidth={2.5}
              dot={{ fill: BIChartColors.semantic.success, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: BIChartColors.semantic.success }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: "daily-output",
      title: "日产量统计",
      subtitle: "生产批次日趋势",
      height: 280,
      chart: (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={dailyOutputData}
            xKey="date"
            yKeys={[{ key: "output", name: "产量", color: BIChartColors.semantic.warning }]}
            height={220}
            barRadius={[4, 4, 0, 0]}
            animate
          />
        </ResponsiveContainer>
      ),
    },
  ];

  // 最近活动
  const recentActivities = (summary?.recent_activities || defaultActivities).map((activity) => ({
    id: String(activity.id),
    title: activity.title,
    time: activity.time,
    onClick: () => handleActivityClick(activity as ActivityItem),
  }));

  // 刷新按钮
  const RefreshButton = (
    <Button
      variant="outlined"
      onClick={handleRefresh}
      disabled={isRefreshing}
      startIcon={<RefreshCw style={{ width: 16, height: 16, animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />}
    >
      {isRefreshing ? "刷新中..." : "刷新数据"}
    </Button>
  );

  // 头部右侧内容
  const headerContent = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 14, color: "grey.500" }}>
        <Clock sx={{ width: 16, height: 16 }} />
        <Typography variant="body2" sx={{ color: "grey.500" }}>
          最后更新: {new Date().toLocaleString("zh-CN")}
        </Typography>
      </Box>
      {RefreshButton}
    </Box>
  );

  return (
    <DashboardTemplate
      title="数据大屏"
      subtitle="实时业务数据总览"
      stats={stats}
      charts={charts.slice(0, 2)}
      recentItems={recentActivities}
      recentTitle="最近活动"
      loading={loading}
      headerContent={headerContent}
    >
      {/* 第二行图表 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, lg: 3 }, gap: 3, mt: 3 }}>
        {charts.slice(2).map((chart) => (
          <ChartCard
            key={chart.id}
            title={chart.title}
            subtitle={chart.subtitle}
            height={260}
            showExport={false}
            showRefresh={false}
          >
            {chart.chart}
          </ChartCard>
        ))}
      </Box>
    </DashboardTemplate>
  );
};

export default BIDashboardPageRefactored;
