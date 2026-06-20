import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  Package,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  Factory,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import PieChartComponent from "../../components/charts/PieChart";
import LineChartComponent from "../../components/charts/LineChart";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  Package,
  ClipboardList,
  AlertCircle,
  Factory,
};

const barData = [
  { name: "W1", value: 120 },
  { name: "W2", value: 150 },
  { name: "W3", value: 135 },
  { name: "W4", value: 180 },
  { name: "W5", value: 200 },
  { name: "W6", value: 175 },
];
const pieData = [
  { name: "生产中", value: 45 },
  { name: "待排产", value: 25 },
  { name: "已完成", value: 30 },
];
const lineData = [
  { name: "1日", value: 85 },
  { name: "2日", value: 92 },
  { name: "3日", value: 78 },
  { name: "4日", value: 95 },
  { name: "5日", value: 88 },
  { name: "6日", value: 100 },
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
    { label: "生产工单", value: "128", icon: "ClipboardList", trend: "+12" },
    { label: "生产中", value: "24", icon: "Factory", trend: "+5" },
    { label: "今日产出", value: "1,580", icon: "Package", trend: "+8%" },
    { label: "异常工单", value: "3", icon: "AlertCircle", trend: "-2" },
  ];

  const quickActions = [
    { label: "创建工单", path: "/mes/orders/create" },
    { label: "工单列表", path: "/mes/orders" },
    { label: "工艺配置", path: "/mes/processes" },
    { label: "工位管理", path: "/mes/workstations" },
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
          生产执行管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，生产进度与工单追踪
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || Package;
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      transform: "translateY(-2px)",
                    },
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
                      </Box>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "12px",
                          background:
                            "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        <IconComponent size={24} />
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: stat.trend.startsWith("-")
                          ? "#ef4444"
                          : "#10b981",
                        mt: 1,
                      }}
                    >
                      {stat.trend} vs 上周期
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                height: "100%",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  每周产量趋势
                </Typography>
                <BarChartComponent data={barData} xKey="name" yKey="value" />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                height: "100%",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  工单状态分布
                </Typography>
                <PieChartComponent data={pieData} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={12}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  每日产出趋势
                </Typography>
                <LineChartComponent data={lineData} xKey="name" yKey="value" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography
          variant="h6"
          sx={{ mt: 4, mb: 2, color: "#1e293b", fontWeight: 600 }}
        >
          快速操作
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                onClick={() => navigate(action.path)}
                sx={{
                  padding: "16px",
                  borderRadius: "12px",
                  borderColor: "#e2e8f0",
                  color: "#475569",
                  textTransform: "none",
                  justifyContent: "space-between",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {action.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;
