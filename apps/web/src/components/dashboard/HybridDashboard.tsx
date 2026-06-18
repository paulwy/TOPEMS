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
      <Box sx={{ mt: 8 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} lg={8}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
              待办事项
            </Typography>
            <RecentActivities />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 4 }}>
              系统状态
            </Typography>
            <ModuleStatsCard />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};