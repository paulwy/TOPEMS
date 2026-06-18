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
  TrendingUp,
  Users,
  FileText,
  Clock,
  ArrowRight,
  BarChart3,
  Activity,
} from "lucide-react";

interface ModuleDashboardProps {
  moduleName: string;
  moduleCode: string;
  subtitle: string;
  stats?: { label: string; value: string; icon: React.ReactNode; trend?: string }[];
  quickActions?: { label: string; path: string; icon: React.ReactNode }[];
}

export const ModuleDashboardPage: React.FC<ModuleDashboardProps> = ({
  moduleName,
  moduleCode,
  subtitle,
  stats = [],
  quickActions = [],
}) => {
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

  const defaultStats = stats.length > 0 ? stats : [
    {
      label: "总记录",
      value: "1,234",
      icon: <FileText size={24} />,
      trend: "+12%",
    },
    {
      label: "活跃用户",
      value: "56",
      icon: <Users size={24} />,
    },
    {
      label: "待处理",
      value: "23",
      icon: <Clock size={24} />,
    },
    {
      label: "增长率",
      value: "18%",
      icon: <TrendingUp size={24} />,
      trend: "+5%",
    },
  ];

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
          {moduleName}
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，{subtitle}
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={3}>
          {defaultStats.map((stat, index) => (
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
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {quickActions.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              快捷操作
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
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
                      {action.icon}
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "left" }}>
                      <Typography variant="body1" fontWeight={500} sx={{ color: "#1e293b" }}>
                        {action.label}
                      </Typography>
                    </Box>
                    <ArrowRight size={16} sx={{ color: "#94a3b8" }} />
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              <BarChart3 size={20} sx={{ mr: 1 }} />
              数据概览
            </Typography>
            <Box sx={{ height: "200px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: "#94a3b8" }}>图表占位区域</Typography>
            </Box>
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              <Activity size={20} sx={{ mr: 1 }} />
              实时状态
            </Typography>
            <Box sx={{ height: "200px", background: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: "#94a3b8" }}>状态监控区域</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ModuleDashboardPage;