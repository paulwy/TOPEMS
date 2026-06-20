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
import { QuickSearch } from "@/components/common";
import {
  FileText,
  ArrowRight,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  FileText,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
};

const barData = [{"name": "\u9879\u76eeA", "value": 85}, {"name": "\u9879\u76eeB", "value": 60}, {"name": "\u9879\u76eeC", "value": 90}, {"name": "\u9879\u76eeD", "value": 45}, {"name": "\u9879\u76eeE", "value": 70}];
const pieData = [{"name": "\u5f00\u53d1\u4e2d", "value": 40}, {"name": "\u6d4b\u8bd5\u4e2d", "value": 25}, {"name": "\u5f85\u8bc4\u5ba1", "value": 20}, {"name": "\u5df2\u5b8c\u6210", "value": 15}];
const lineData = [{"name": "W1", "value": 5}, {"name": "W2", "value": 8}, {"name": "W3", "value": 6}, {"name": "W4", "value": 10}, {"name": "W5", "value": 7}, {"name": "W6", "value": 9}];

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

  const stats = [{"label": "\u8fdb\u884c\u4e2d\u9879\u76ee", "value": "12", "icon": "FolderKanban", "trend": "+2"}, {"label": "\u5f85\u5b8c\u6210\u4efb\u52a1", "value": "86", "icon": "CheckSquare", "trend": "-15"}, {"label": "\u672c\u5468\u5b8c\u6210", "value": "32", "icon": "Trophy", "trend": "+8"}, {"label": "\u5ef6\u671f\u98ce\u9669", "value": "3", "icon": "AlertTriangle", "trend": "-1"}];
  const quickActions = [{"label": "\u521b\u5efa\u65b0\u9879\u76ee", "path": "/pm/projects/create"}, {"label": "\u5206\u914d\u4efb\u52a1", "path": "/pm/tasks/assign"}, {"label": "\u67e5\u770b\u65f6\u95f4\u7ebf", "path": "/pm/timeline"}, {"label": "\u751f\u6210\u62a5\u8868", "path": "/pm/reports"}];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Box sx={{ padding: "24px 32px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h4" sx={{  color: "#1e293b" , fontWeight: 600 }} >
            项目管理
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
            {getGreeting()}，项目进度与任务追踪
          </Typography>
        </Box>
        <QuickSearch
          placeholder="搜索项目..."
          onSearch={(query) => {
            navigate(`/pm/projects?search=${encodeURIComponent(query)}`);
          }}
          width={320}
        />
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || FileText;
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <CardContent sx={{ padding: "20px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 1 }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h4" sx={{  color: "#1e293b" , fontWeight: 600 }} >
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
            <Typography variant="h6" sx={{  mb: 3, color: "#1e293b" , fontWeight: 600 }} >
              项目进度分布
            </Typography>
            <BarChartComponent data={barData} xKey="name" yKey="value" />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{  mb: 3, color: "#1e293b" , fontWeight: 600 }} >
              本周任务完成趋势
            </Typography>
            <LineChartComponent data={lineData} xKey="name" yKey="value" />
          </Paper>
        </Box>

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{  mb: 3, color: "#1e293b" , fontWeight: 600 }} >
              项目状态分布
            </Typography>
            <PieChartComponent data={pieData} />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{  mb: 3, color: "#1e293b" , fontWeight: 600 }} >
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
                    <Box sx={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                      <ArrowRight size={18} />
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "left" }}>
                      <Typography variant="body1" sx={{  color: "#1e293b" , fontWeight: 500 }} >
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
