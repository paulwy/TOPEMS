import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowRight,
  MessageCircle,
  BarChart3,
  Repeat,
  ThumbsUp,
} from "lucide-react";
import { DashboardTemplate } from "@/components/templates";
import type { StatCard, ChartCard, QuickAction } from "@/components/templates";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  MessageCircle: <MessageCircle size={24} />,
  BarChart3: <BarChart3 size={24} />,
  Repeat: <Repeat size={24} />,
  ThumbsUp: <ThumbsUp size={24} />,
};

const barData = [
  { name: "问答", value: 1200 },
  { name: "分析", value: 600 },
  { name: "创作", value: 400 },
  { name: "翻译", value: 145 },
];
const pieData = [
  { name: "营销", value: 35 },
  { name: "运营", value: 30 },
  { name: "研发", value: 25 },
  { name: "客服", value: 10 },
];
const lineData = [
  { name: "周一", value: 300 },
  { name: "周二", value: 350 },
  { name: "周三", value: 280 },
  { name: "周四", value: 420 },
  { name: "周五", value: 380 },
  { name: "周六", value: 180 },
  { name: "周日", value: 135 },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "上午好";
  if (hour < 18) return "下午好";
  return "晚上好";
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = [
    {
      id: "conversation-count",
      title: "对话次数",
      value: "2,345",
      icon: iconMap.MessageCircle,
      change: 23,
      changeLabel: "% vs 上周期",
      color: "primary",
    },
    {
      id: "data-analysis",
      title: "数据分析",
      value: "156",
      icon: iconMap.BarChart3,
      change: 45,
      changeLabel: "vs 上周期",
      color: "info",
    },
    {
      id: "automation-flows",
      title: "自动化流程",
      value: "23",
      icon: iconMap.Repeat,
      change: 5,
      changeLabel: "vs 上周期",
      color: "success",
    },
    {
      id: "satisfaction-rate",
      title: "满意度",
      value: "94%",
      icon: iconMap.ThumbsUp,
      change: 2,
      changeLabel: "% vs 上周期",
      color: "warning",
    },
  ];

  const charts: ChartCard[] = [
    {
      id: "ai-feature-usage-stats",
      title: "AI功能使用统计",
      chart: <BarChartComponent data={barData} xKey="name" yKey="value" />,
      height: 300,
    },
    {
      id: "daily-invocation-trend",
      title: "每日调用趋势",
      chart: <LineChartComponent data={lineData} xKey="name" yKey="value" />,
      height: 300,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: "smart-dialogue",
      label: "智能对话",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/ai/chat"),
    },
    {
      id: "data-analysis",
      label: "数据分析",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/ai/analytics"),
    },
    {
      id: "create-workflow",
      label: "创建工作流",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/ai/workflows/create"),
    },
    {
      id: "model-management",
      label: "模型管理",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/ai/models"),
    },
  ];

  return (
    <DashboardTemplate
      title="AI智能助手"
      subtitle={`${getGreeting()}，智能对话与数据分析`}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle="快捷操作"
      loading={loading}
    />
  );
};

export default DashboardPage;
