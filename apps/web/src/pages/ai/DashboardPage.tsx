import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import {
  FileText,
  ArrowRight,
  MessageCircle,
  BarChart3,
  Repeat,
  ThumbsUp,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  FileText,
  MessageCircle,
  BarChart3,
  Repeat,
  ThumbsUp,
};

const barData = [{"name": "\u95ee\u7b54", "value": 1200}, {"name": "\u5206\u6790", "value": 600}, {"name": "\u521b\u4f5c", "value": 400}, {"name": "\u7ffb\u8bd1", "value": 145}];
const pieData = [{"name": "\u8425\u9500", "value": 35}, {"name": "\u8fd0\u8425", "value": 30}, {"name": "\u7814\u53d1", "value": 25}, {"name": "\u5ba2\u670d", "value": 10}];
const lineData = [{"name": "\u5468\u4e00", "value": 300}, {"name": "\u5468\u4e8c", "value": 350}, {"name": "\u5468\u4e09", "value": 280}, {"name": "\u5468\u56db", "value": 420}, {"name": "\u5468\u4e94", "value": 380}, {"name": "\u5468\u516d", "value": 180}, {"name": "\u5468\u65e5", "value": 135}];

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

  const stats = [{"label": "\u5bf9\u8bdd\u6b21\u6570", "value": "2,345", "icon": "MessageCircle", "trend": "+23%"}, {"label": "\u6570\u636e\u5206\u6790", "value": "156", "icon": "BarChart3", "trend": "+45"}, {"label": "\u81ea\u52a8\u5316\u6d41\u7a0b", "value": "23", "icon": "Repeat", "trend": "+5"}, {"label": "\u6ee1\u610f\u5ea6", "value": "94%", "icon": "ThumbsUp", "trend": "+2%"}];
  const quickActions = [{"label": "\u667a\u80fd\u5bf9\u8bdd", "path": "/ai/chat"}, {"label": "\u6570\u636e\u5206\u6790", "path": "/ai/analytics"}, {"label": "\u521b\u5efa\u5de5\u4f5c\u6d41", "path": "/ai/workflows/create"}, {"label": "\u6a21\u578b\u7ba1\u7406", "path": "/ai/models"}];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Box sx={{ padding: "24px 32px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <Typography variant="h4" fontWeight={600} sx={{ color: "#1e293b" }}>
          AI智能助手
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，智能对话与数据分析
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || FileText;
            return (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <CardContent sx={{ padding: "20px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 1 }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h4" fontWeight={600} sx={{ color: "#1e293b" }}>
                          {stat.value}
                        </Typography>
                        {stat.trend && (
                          <Typography variant="caption" sx={{ color: "#22c55e", mt: 1, display: "block" }}>
                            {stat.trend}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                        <IconComponent size={24} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              AI功能使用统计
            </Typography>
            <BarChartComponent data={barData} xKey="name" yKey="value" />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              每日调用趋势
            </Typography>
            <LineChartComponent data={lineData} xKey="name" yKey="value" />
          </Paper>
        </Box>

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              使用场景分布
            </Typography>
            <PieChartComponent data={pieData} />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              快捷操作
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} key={index}>
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
                    <Box sx={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                      <ArrowRight size={18} />
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "left" }}>
                      <Typography variant="body1" fontWeight={500} sx={{ color: "#1e293b" }}>
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
