import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  Users,
  Shield,
  Activity,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  Users,
  Shield,
  Activity,
  AlertTriangle,
};

const pieData = [
  { name: "管理员", value: 5 },
  { name: "审计员", value: 10 },
  { name: "普通用户", value: 75 },
  { name: "访客", value: 10 },
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
    { label: "用户总数", value: "1,280", icon: "Users", trend: "+45" },
    { label: "在线用户", value: "128", icon: "Activity", trend: "+12" },
    { label: "角色数量", value: "15", icon: "Shield", trend: "+2" },
    { label: "系统告警", value: "3", icon: "AlertTriangle", trend: "-5" },
  ];

  const quickActions = [
    { label: "用户管理", path: "/iam/users" },
    { label: "角色管理", path: "/iam/roles" },
    { label: "权限管理", path: "/iam/permissions" },
    { label: "审计日志", path: "/iam/audit" },
  ];

  const recentUsers = [
    { name: "张三", role: "管理员", status: "活跃", time: "10分钟前" },
    { name: "李四", role: "普通用户", status: "活跃", time: "30分钟前" },
    { name: "王五", role: "审计员", status: "离线", time: "1小时前" },
    { name: "赵六", role: "普通用户", status: "活跃", time: "2小时前" },
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
          系统管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，身份认证与访问控制
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || Users;
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
                            "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
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
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    最近活跃用户
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowRight size={14} />}
                    onClick={() => navigate("/iam/users")}
                  >
                    查看全部
                  </Button>
                </Box>
                {recentUsers.map((user, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.5,
                      borderBottom:
                        index < recentUsers.length - 1
                          ? "1px solid #e2e8f0"
                          : "none",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Users size={18} color="#64748b" />
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#1e293b", fontWeight: 500 }}
                        >
                          {user.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          {user.role} · {user.time}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor:
                            user.status === "活跃" ? "#10b981" : "#94a3b8",
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {user.status}
                      </Typography>
                    </Box>
                  </Box>
                ))}
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
                  用户角色分布
                </Typography>
                <PieChartComponent data={pieData} />
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
                    borderColor: "#f59e0b",
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
