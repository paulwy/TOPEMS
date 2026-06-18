import React, { useState, useEffect } from "react";
import { Box, Grid, Typography, Container, Paper, Divider } from "@mui/material";
import {
  Users,
  FileText,
  Clock,
  AlertCircle,
  Activity,
  TrendingUp,
  Building,
  FolderKanban,
  FlaskConical,
  Truck,
  Bot,
  Map,
} from "lucide-react";
import { navigationRegistry } from "../../lib/NavigationRegistry";
import { ModuleCard } from "./ModuleCard";
import { ServiceStatusMonitor } from "./ServiceStatusMonitor";
import { RecentActivities } from "./RecentActivities";
import { ModuleStatsCard } from "./ModuleStatsCard";
import { DashboardHeader } from "./DashboardHeader";
import BarChartComponent from "../../components/charts/BarChart";
import PieChartComponent from "../../components/charts/PieChart";
import LineChartComponent from "../../components/charts/LineChart";
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <Paper
    sx={{
      p: 4,
      borderRadius: 2,
      border: 1,
      borderColor: "grey.100",
      transition: "transform 0.2s, boxShadow 0.2s",
      '&:hover': {
        transform: "translateY(-2px)",
        boxShadow: 2,
      },
    }}
  >
    <Box display="flex" alignItems="center" gap={3}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          bgcolor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box flex={1}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={600}>
          {value}
        </Typography>
        {trend && (<Typography variant="caption" color="success.main">
          {trend}
        </Typography>)}
      </Box>
    </Box>
  </Paper>
);

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Building,
  FolderKanban,
  FlaskConical,
  Truck,
  Users,
  Bot,
  Map,
};

const colorMap: Record<string, string> = {
  erp: "bg-blue-500",
  pm: "bg-purple-500",
  rs: "bg-green-500",
  scm: "bg-emerald-500",
  crm: "bg-rose-500",
  ai: "bg-violet-500",
  gis: "bg-cyan-500",
  hrm: "bg-amber-500",
};

const descriptionMap: Record<string, string> = {
  erp: "企业资源规划与财务管理",
  pm: "项目全生命周期管理",
  rs: "研发项目与文档管理",
  scm: "供应链与物流管理",
  crm: "客户关系与销售管理",
  ai: "智能助手与数据分析",
  gis: "地理信息与空间分析",
  hrm: "人力资源与培训管理",
};

const homeBarData = [
  { name: "ERP", value: 120 },
  { name: "PM", value: 85 },
  { name: "SCM", value: 95 },
  { name: "CRM", value: 110 },
  { name: "AI", value: 75 },
  { name: "HRM", value: 65 },
];

const homePieData = [
  { name: "生产", value: 30 },
  { name: "销售", value: 25 },
  { name: "研发", value: 20 },
  { name: "财务", value: 15 },
  { name: "其他", value: 10 },
];

const homeLineData = [
  { name: "1月", value: 200 },
  { name: "2月", value: 250 },
  { name: "3月", value: 220 },
  { name: "4月", value: 300 },
  { name: "5月", value: 280 },
  { name: "6月", value: 350 },
];

export const HybridDashboard: React.FC = () => {
  const [moduleCards, setModuleCards] = useState<any[]>([]);
  useEffect(() => {
    const cards = navigationRegistry.getModuleCards();
    const mappedCards = cards.map((card) => ({
      title: card.name,
      icon: iconMap[card.icon] || FolderKanban,
      description: descriptionMap[card.code] || card.name,
      path: card.path,
      color: colorMap[card.code] || "bg-blue-500",
      status: card.status || "running",
    }));
    setModuleCards(mappedCards);
  }, []);
  const stats = [
    { title: "待审批", value: 12, icon: <Clock size={24} color="white" />, color: "primary.main", trend: "+3 今天" },
    { title: "待处理", value: 8, icon: <AlertCircle size={24} color="white" />, color: "warning.main" },
    { title: "在线用户", value: 156, icon: <Users size={24} color="white" />, color: "success.main", trend: "+12%" },
    { title: "文件数量", value: "2.4K", icon: <FileText size={24} color="white" />, color: "info.main" },
  ];
  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <DashboardHeader />
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
          数据概览
        </Typography>
        <Grid container spacing={3}>
          {stats.map((stat, index) => (<Grid key={index} item xs={12} sm={6} md={3}>
            <StatCard {...stat} />
          </Grid>))}
        </Grid>
      </Box>
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
          业务分析
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, borderRadius: 2, border: 1, borderColor: "grey.100" }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                模块使用量
              </Typography>
              <BarChartComponent data={homeBarData} xKey="name" yKey="value" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 2, border: 1, borderColor: "grey.100" }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                业务分布
              </Typography>
              <PieChartComponent data={homePieData} />
            </Paper>
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, border: 1, borderColor: "grey.100" }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                月度活跃趋势
              </Typography>
              <LineChartComponent data={homeLineData} xKey="name" yKey="value" />
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
          服务监控
        </Typography>
        <ServiceStatusMonitor />
      </Box>
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
          模块入口
        </Typography>
        <Grid container spacing={3}>
          {moduleCards.map((card) => (<Grid key={card.path} item xs={12} sm={6} md={4} lg={3}>
            <ModuleCard item={card} onClick={() => {}} />
          </Grid>))}
        </Grid>
      </Box>
      <Box sx={{ mt: { xs: 4, sm: 6, lg: 8 } }}>
        <Grid container spacing={{ xs: 3, sm: 4, lg: 6 }}>
          <Grid item xs={12} md={8} lg={8}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: { xs: 2, sm: 3, lg: 4 } }}>
              待办事项
            </Typography>
            <RecentActivities />
          </Grid>
          <Grid item xs={12} md={4} lg={4}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: { xs: 2, sm: 3, lg: 4 } }}>
              系统状态
            </Typography>
            <ModuleStatsCard />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};