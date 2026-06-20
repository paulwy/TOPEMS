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
  Users,
  FileText,
  ArrowRight,
  ShoppingCart,
  RefreshCw,
  Truck,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  Users,
  FileText,
  ShoppingCart,
  RefreshCw,
  Truck,
};

const barData = [
  { name: "\u4f9b\u5e94\u5546A", value: 35 },
  { name: "\u4f9b\u5e94\u5546B", value: 28 },
  { name: "\u4f9b\u5e94\u5546C", value: 22 },
  { name: "\u4f9b\u5e94\u5546D", value: 15 },
];
const pieData = [
  { name: "\u539f\u6750\u6599", value: 50 },
  { name: "\u914d\u4ef6", value: 30 },
  { name: "\u8bbe\u5907", value: 20 },
];
const lineData = [
  { name: "1\u5468", value: 8 },
  { name: "2\u5468", value: 12 },
  { name: "3\u5468", value: 10 },
  { name: "4\u5468", value: 15 },
  { name: "5\u5468", value: 11 },
  { name: "6\u5468", value: 14 },
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
    { label: "\u4f9b\u5e94\u5546", value: "128", icon: "Users", trend: "+5" },
    {
      label: "\u91c7\u8d2d\u8ba2\u5355",
      value: "45",
      icon: "ShoppingCart",
      trend: "+8",
    },
    {
      label: "\u5e93\u5b58\u5468\u8f6c\u7387",
      value: "4.2",
      icon: "RefreshCw",
      trend: "+0.3",
    },
    { label: "\u8fd0\u8f93\u4e2d", value: "12", icon: "Truck", trend: "+3" },
  ];
  const quickActions = [
    { label: "\u65b0\u589e\u4f9b\u5e94\u5546", path: "/scm/suppliers/create" },
    { label: "\u521b\u5efa\u91c7\u8d2d\u5355", path: "/scm/purchasing/create" },
    { label: "\u4ed3\u5e93\u7ba1\u7406", path: "/scm/warehouse" },
    { label: "\u7269\u6d41\u8ffd\u8e2a", path: "/scm/logistics" },
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
          供应链管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，供应商与物流追踪
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
              供应商采购量
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
              每周采购趋势
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
              采购类型分布
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
