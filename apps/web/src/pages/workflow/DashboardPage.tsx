import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import { DashboardTemplate } from "@/components/templates";
import type {
  StatCard,
  ChartCard,
  QuickAction,
  RecentItem,
} from "@/components/templates";
import PieChartComponent from "../../components/charts/PieChart";
import BarChartComponent from "../../components/charts/BarChart";

const iconMap: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle size={24} />,
  Clock: <Clock size={24} />,
  AlertCircle: <AlertCircle size={24} />,
  FileText: <FileText size={24} />,
};

const pieData = [
  { name: "请假申请", value: 35 },
  { name: "采购审批", value: 25 },
  { name: "出差申请", value: 20 },
  { name: "其他", value: 20 },
];

const barData = [
  { name: "1月", value: 80 },
  { name: "2月", value: 120 },
  { name: "3月", value: 95 },
  { name: "4月", value: 150 },
  { name: "5月", value: 130 },
  { name: "6月", value: 180 },
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
      id: "pending-approvals",
      title: "待我审批",
      value: "8",
      icon: iconMap.Clock,
      change: 3,
      changeLabel: "vs 上周期",
      color: "warning",
    },
    {
      id: "submitted-applications",
      title: "已提交申请",
      value: "24",
      icon: iconMap.FileText,
      change: 5,
      changeLabel: "vs 上周期",
      color: "info",
    },
    {
      id: "completed-processes",
      title: "已完成流程",
      value: "156",
      icon: iconMap.CheckCircle,
      change: 12,
      changeLabel: "vs 上周期",
      color: "success",
    },
    {
      id: "timeout-warning",
      title: "超时预警",
      value: "2",
      icon: iconMap.AlertCircle,
      change: -1,
      changeLabel: "vs 上周期",
      color: "error",
    },
  ];

  const charts: ChartCard[] = [
    {
      id: "process-type-distribution",
      title: "流程类型分布",
      chart: <PieChartComponent data={pieData} />,
      height: 300,
    },
    {
      id: "monthly-process-trend",
      title: "月度流程数量趋势",
      chart: <BarChartComponent data={barData} xKey="name" yKey="value" />,
      height: 300,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: "approval-1",
      title: "请假申请 - 张三",
      description: "10分钟前",
      onClick: () => navigate("/flow/approvals"),
    },
    {
      id: "approval-2",
      title: "采购审批 - 办公室",
      description: "30分钟前",
      onClick: () => navigate("/flow/approvals"),
    },
    {
      id: "approval-3",
      title: "出差申请 - 李四",
      description: "1小时前",
      onClick: () => navigate("/flow/approvals"),
    },
    {
      id: "approval-4",
      title: "加班申请 - 王五",
      description: "2小时前",
      onClick: () => navigate("/flow/approvals"),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: "start-process",
      label: "发起流程",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/workflow-designer"),
    },
    {
      id: "my-applications",
      label: "我的申请",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/flow/instances"),
    },
    {
      id: "pending-approval",
      label: "待我审批",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/flow/approvals"),
    },
    {
      id: "process-statistics",
      label: "流程统计",
      icon: <ArrowRight size={18} />,
      onClick: () => navigate("/flow/statistics"),
    },
  ];

  return (
    <DashboardTemplate
      title="工作流程"
      subtitle={`${getGreeting()}，流程审批与进度追踪`}
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle="待我审批"
      quickActions={quickActions}
      quickActionsTitle="快速操作"
      loading={loading}
    />
  );
};

export default DashboardPage;
