import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import {
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Target,
  CheckCircle,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from "@/components/templates";

const iconMap: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  TrendingUp,
  Users,
  FileText,
  Target,
  CheckCircle,
};

const barData = [
  { name: "华东", value: 280 },
  { name: "华南", value: 240 },
  { name: "华北", value: 200 },
  { name: "西南", value: 150 },
  { name: "西北", value: 80 },
];
const pieData = [
  { name: "新客户", value: 40 },
  { name: "老客户", value: 60 },
];
const lineData = [
  { name: "1月", value: 50 },
  { name: "2月", value: 65 },
  { name: "3月", value: 55 },
  { name: "4月", value: 80 },
  { name: "5月", value: 75 },
  { name: "6月", value: 90 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  const stats: StatCard[] = [
    {
      id: "customer-total",
      title: "客户总数",
      value: "1,256",
      change: 86,
      changeLabel: "vs 上周期",
      icon: <Users size={24} />,
      color: "primary",
    },
    {
      id: "opportunity-count",
      title: "商机数量",
      value: "89",
      change: 12,
      changeLabel: "vs 上周期",
      icon: <Target size={24} />,
      color: "info",
    },
    {
      id: "monthly-deals",
      title: "本月成交",
      value: "15",
      change: 3,
      changeLabel: "vs 上周期",
      icon: <CheckCircle size={24} />,
      color: "success",
    },
    {
      id: "sales-amount",
      title: "销售总额",
      value: "¥5,680,000",
      change: 15,
      changeLabel: "vs 上周期",
      icon: <TrendingUp size={24} />,
      color: "warning",
    },
  ];

  const charts: ChartCard[] = [
    {
      id: "regional-distribution",
      title: "区域客户分布",
      height: 300,
      chart: <BarChartComponent data={barData} xKey="name" yKey="value" />,
    },
    {
      id: "monthly-deal-trend",
      title: "月度成交趋势",
      height: 300,
      chart: <LineChartComponent data={lineData} xKey="name" yKey="value" />,
    },
    {
      id: "customer-ratio",
      title: "新老客户占比",
      height: 300,
      chart: <PieChartComponent data={pieData} />,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: "add-customer",
      label: "新增客户",
      icon: <ArrowRight size={20} />,
      href: "/crm/customers/create",
      color: "#3b82f6",
    },
    {
      id: "create-opportunity",
      label: "创建商机",
      icon: <ArrowRight size={20} />,
      href: "/crm/opportunities/create",
      color: "#3b82f6",
    },
    {
      id: "schedule-activity",
      label: "安排活动",
      icon: <ArrowRight size={20} />,
      href: "/crm/activities/create",
      color: "#3b82f6",
    },
    {
      id: "sales-report",
      label: "销售报表",
      icon: <ArrowRight size={20} />,
      href: "/crm/reports",
      color: "#3b82f6",
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "1.125rem", color: "grey.600" }}>
          加载中...
        </Typography>
      </Box>
    );
  }

  return (
    <DashboardTemplate
      title="客户关系管理"
      subtitle={`${getGreeting()}，客户管理与销售分析`}
      breadcrumbs={[
        { label: "首页", href: "/dashboard" },
        { label: "客户关系" },
      ]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle="快捷操作"
    />
  );
};

export default DashboardPage;
