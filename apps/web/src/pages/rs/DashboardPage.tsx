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
  FlaskConical,
  CheckCircle,
  Rocket,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  FileText,
  FlaskConical,
  CheckCircle,
  Rocket,
};

const barData = [{"name": "API", "value": 95}, {"name": "Web", "value": 88}, {"name": "Mobile", "value": 72}, {"name": "Desktop", "value": 80}, {"name": "IoT", "value": 65}];
const pieData = [{"name": "\u9700\u6c42\u6587\u6863", "value": 30}, {"name": "\u8bbe\u8ba1\u6587\u6863", "value": 25}, {"name": "\u5f00\u53d1\u6587\u6863", "value": 35}, {"name": "\u6d4b\u8bd5\u6587\u6863", "value": 10}];
const lineData = [{"name": "Jan", "value": 10}, {"name": "Feb", "value": 15}, {"name": "Mar", "value": 12}, {"name": "Apr", "value": 18}, {"name": "May", "value": 20}, {"name": "Jun", "value": 16}];

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

  const stats = [{"label": "\u7814\u53d1\u9879\u76ee", "value": "8", "icon": "FlaskConical", "trend": "+1"}, {"label": "\u6587\u6863\u6570\u91cf", "value": "256", "icon": "FileText", "trend": "+24"}, {"label": "\u6d4b\u8bd5\u7528\u4f8b", "value": "1,234", "icon": "CheckCircle", "trend": "+156"}, {"label": "\u7248\u672c\u53d1\u5e03", "value": "5", "icon": "Rocket", "trend": "+2"}];
  const quickActions = [{"label": "\u521b\u5efa\u7814\u53d1\u9879\u76ee", "path": "/rs/projects/create"}, {"label": "\u4e0a\u4f20\u6587\u6863", "path": "/rs/documents/upload"}, {"label": "\u7f16\u5199\u6d4b\u8bd5\u7528\u4f8b", "path": "/rs/tests/create"}, {"label": "\u53d1\u5e03\u65b0\u7248\u672c", "path": "/rs/releases/new"}];

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
          研发管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，研发项目与文档管理
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
              项目类型分布
            </Typography>
            <BarChartComponent data={barData} xKey="name" yKey="value" />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              月度发布趋势
            </Typography>
            <LineChartComponent data={lineData} xKey="name" yKey="value" />
          </Paper>
        </Box>

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              文档类型分布
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
