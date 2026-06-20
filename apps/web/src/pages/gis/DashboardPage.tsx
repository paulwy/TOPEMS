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
  FileText,
  ArrowRight,
  Activity,
  Layers,
  MapPin,
  Globe,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  FileText,
  Activity,
  Layers,
  MapPin,
  Globe,
};

const barData = [
  { name: "\u5317\u4eac", value: 520 },
  { name: "\u4e0a\u6d77", value: 480 },
  { name: "\u5e7f\u5dde", value: 350 },
  { name: "\u6df1\u5733", value: 320 },
  { name: "\u6210\u90fd", value: 280 },
];
const pieData = [
  { name: "\u9053\u8def", value: 30 },
  { name: "\u5efa\u7b51", value: 25 },
  { name: "\u7eff\u5730", value: 20 },
  { name: "\u6c34\u57df", value: 15 },
  { name: "\u5176\u4ed6", value: 10 },
];
const lineData = [
  { name: "Q1", value: 400 },
  { name: "Q2", value: 520 },
  { name: "Q3", value: 480 },
  { name: "Q4", value: 600 },
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
      label: "\u56fe\u5c42\u6570\u91cf",
      value: "15",
      icon: "Layers",
      trend: "+3",
    },
    {
      label: "\u70b9\u4f4d\u6570\u636e",
      value: "2,345",
      icon: "MapPin",
      trend: "+128",
    },
    {
      label: "\u5206\u6790\u4efb\u52a1",
      value: "8",
      icon: "Activity",
      trend: "+2",
    },
    {
      label: "\u5730\u56fe\u670d\u52a1",
      value: "5",
      icon: "Globe",
      trend: "0",
    },
  ];
  const quickActions = [
    { label: "\u67e5\u770b\u5730\u56fe", path: "/gis/map" },
    { label: "\u7ba1\u7406\u56fe\u5c42", path: "/gis/layers" },
    { label: "\u7a7a\u95f4\u5206\u6790", path: "/gis/analysis" },
    { label: "\u6570\u636e\u5bfc\u5165", path: "/gis/import" },
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
          地理信息系统
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，地图视图与空间分析
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
              城市数据分布
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
              季度数据趋势
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
              图层类型分布
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
