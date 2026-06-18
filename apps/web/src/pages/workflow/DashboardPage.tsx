import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import PieChartComponent from "../../components/charts/PieChart";
import BarChartComponent from "../../components/charts/BarChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
};

const pieData = [
  { name: "请假申请", value: 35 },
  { name: "采购审批", value: 25 },
  { name: "出差申请", value: 20 },
  { name: "其他", value: 20 },
];

const barData = [
  { name: "1月", value: 80 },
  { name: "2月", value: 120 },
  { name: "3月", value: 95 },
  { name: "4月", value: 150 },
  { name: "5月", value: 130 },
  { name: "6月", value: 180 },
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
    { label: "待我审批", value: "8", icon: "Clock", trend: "+3" },
    { label: "已提交申请", value: "24", icon: "FileText", trend: "+5" },
    { label: "已完成流程", value: "156", icon: "CheckCircle", trend: "+12" },
    { label: "超时预警", value: "2", icon: "AlertCircle", trend: "-1" },
  ];

  const quickActions = [
    { label: "发起流程", path: "/workflow-designer" },
    { label: "我的申请", path: "/flow/instances" },
    { label: "待我审批", path: "/flow/approvals" },
    { label: "流程统计", path: "/flow/statistics" },
  ];

  const recentApprovals = [
    { title: "请假申请 - 张三", time: "10分钟前", status: "待审批" },
    { title: "采购审批 - 办公室", time: "30分钟前", status: "待审批" },
    { title: "出差申请 - 李四", time: "1小时前", status: "待审批" },
    { title: "加班申请 - 王五", time: "2小时前", status: "审批中" },
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
        <Typography variant="h4" fontWeight={600} sx={{ color: "#1e293b" }}>
          工作流程
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，流程审批与进度追踪
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || Clock;
            return (
              <Grid item xs={12} sm={6} md={3} key={index}>
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
                          fontWeight={600}
                          sx={{ color: "#1e293b" }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
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
          <Grid item xs={12} md={8}>
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
                  <Typography variant="h6" fontWeight={600}>
                    待我审批
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowRight size={14} />}
                    onClick={() => navigate("/flow/approvals")}
                  >
                    查看全部
                  </Button>
                </Box>
                {recentApprovals.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.5,
                      borderBottom:
                        index < recentApprovals.length - 1
                          ? "1px solid #e2e8f0"
                          : "none",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#1e293b", fontWeight: 500 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#94a3b8" }}
                      >
                        {item.time}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          item.status === "待审批" ? "#f59e0b" : "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      {item.status}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                height: "100%",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  流程类型分布
                </Typography>
                <PieChartComponent data={pieData} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  月度流程数量趋势
                </Typography>
                <BarChartComponent data={barData} xKey="name" yKey="value" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mt: 4, mb: 2, color: "#1e293b" }}
        >
          快速操作
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
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
                    borderColor: "#8b5cf6",
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
