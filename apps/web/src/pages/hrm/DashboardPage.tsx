import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  TrendingUp,
  Users,
  FileText,
  Clock,
  ArrowRight,
  BarChart3,
  Activity,
  Wallet,
  Package,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
  FlaskConical,
  CheckCircle,
  Rocket,
  ShoppingCart,
  RefreshCw,
  Truck,
  Target,
  MessageCircle,
  ThumbsUp,
  Repeat,
  Layers,
  MapPin,
  Globe,
  UserPlus,
  GraduationCap,
  Award,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  TrendingUp,
  Users,
  FileText,
  Clock,
  Wallet,
  Package,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
  FlaskConical,
  CheckCircle,
  Rocket,
  ShoppingCart,
  RefreshCw,
  Truck,
  Target,
  MessageCircle,
  ThumbsUp,
  Repeat,
  Layers,
  MapPin,
  Globe,
  UserPlus,
  GraduationCap,
  Award,
};

const barData = [
  { name: "\u6280\u672f\u90e8", value: 85 },
  { name: "\u4ea7\u54c1\u90e8", value: 45 },
  { name: "\u5e02\u573a\u90e8", value: 52 },
  { name: "\u8d22\u52a1\u90e8", value: 28 },
  { name: "\u4eba\u4e8b\u90e8", value: 18 },
  { name: "\u8fd0\u8425\u90e8", value: 28 },
];
const pieData = [
  { name: "\u8bd5\u7528\u671f", value: 15 },
  { name: "\u6b63\u5f0f", value: 75 },
  { name: "\u5b9e\u4e60", value: 10 },
];
const lineData = [
  { name: "1\u6708", value: 2 },
  { name: "2\u6708", value: 3 },
  { name: "3\u6708", value: 5 },
  { name: "4\u6708", value: 4 },
  { name: "5\u6708", value: 6 },
  { name: "6\u6708", value: 8 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

  const stats = [
    {
      label: "\u5458\u5de5\u603b\u6570",
      value: "256",
      icon: "Users",
      trend: "+12",
    },
    {
      label: "\u672c\u6708\u5165\u804c",
      value: "8",
      icon: "UserPlus",
      trend: "+3",
    },
    {
      label: "\u57f9\u8bad\u8bfe\u7a0b",
      value: "23",
      icon: "GraduationCap",
      trend: "+5",
    },
    {
      label: "\u7ee9\u6548\u8003\u6838",
      value: "189",
      icon: "Award",
      trend: "+45",
    },
  ];
  const quickActions = [
    { label: "\u65b0\u589e\u5458\u5de5", path: "/hrm/employees/create" },
    { label: "\u62db\u8058\u7ba1\u7406", path: "/hrm/recruitment" },
    { label: "\u57f9\u8bad\u8ba1\u5212", path: "/hrm/training" },
    { label: "\u7ee9\u6548\u8003\u6838", path: "/hrm/performance" },
  ];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Box
        sx={{
          padding: "24px 32px",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: 600 }}>
          人力资源管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，员工管理与绩效考核
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || FileText;
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <CardContent sx={{ padding: "20px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748b", mb: 1 }}
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{ color: "#1e293b", fontWeight: 600 }}
                        >
                          {stat.value}
                        </Typography>
                        {stat.trend && (
                          <Typography
                            variant="caption"
                            sx={{ color: "#22c55e", mt: 1, display: "block" }}
                          >
                            {stat.trend}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                        }}
                      >
                        <IconComponent size={24} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Box
          sx={{
            mt: 6,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: "24px",
          }}
        >
          <Paper
            sx={{
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 3, color: "#1e293b", fontWeight: 600 }}
            >
              <BarChart3 size={20} sx={{ mr: 1 }} />
              数据概览
            </Typography>
            <BarChartComponent data={barData} xKey="name" yKey="value" />
          </Paper>

          <Paper
            sx={{
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 3, color: "#1e293b", fontWeight: 600 }}
            >
              <Activity size={20} sx={{ mr: 1 }} />
              趋势分析
            </Typography>
            <LineChartComponent data={lineData} xKey="name" yKey="value" />
          </Paper>
        </Box>

        <Box
          sx={{
            mt: 6,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" },
            gap: "24px",
          }}
        >
          <Paper
            sx={{
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 3, color: "#1e293b", fontWeight: 600 }}
            >
              分类占比
            </Typography>
            <PieChartComponent data={pieData} />
          </Paper>

          <Paper
            sx={{
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 3, color: "#1e293b", fontWeight: 600 }}
            >
              快捷操作
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{
                      padding: "16px",
                      borderRadius: "12px",
                      borderColor: "#e2e8f0",
                      "&:hover": {
                        borderColor: "#3b82f6",
                        background: "#eff6ff",
                      },
                      justifyContent: "flex-start",
                      gap: "12px",
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <Box
                      sx={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                      }}
                    >
                      <ArrowRight size={18} />
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "left" }}>
                      <Typography
                        variant="body1"
                        sx={{ color: "#1e293b", fontWeight: 500 }}
                      >
                        {action.label}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
