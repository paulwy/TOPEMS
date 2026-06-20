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
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Target,
  CheckCircle,
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
  Target,
  CheckCircle,
};

const barData = [
  { name: "\u534e\u4e1c", value: 280 },
  { name: "\u534e\u5357", value: 240 },
  { name: "\u534e\u5317", value: 200 },
  { name: "\u897f\u5357", value: 150 },
  { name: "\u897f\u5317", value: 80 },
];
const pieData = [
  { name: "\u65b0\u5ba2\u6237", value: 40 },
  { name: "\u8001\u5ba2\u6237", value: 60 },
];
const lineData = [
  { name: "1\u6708", value: 50 },
  { name: "2\u6708", value: 65 },
  { name: "3\u6708", value: 55 },
  { name: "4\u6708", value: 80 },
  { name: "5\u6708", value: 75 },
  { name: "6\u6708", value: 90 },
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
      label: "\u5ba2\u6237\u603b\u6570",
      value: "1,256",
      icon: "Users",
      trend: "+86",
    },
    {
      label: "\u5546\u673a\u6570\u91cf",
      value: "89",
      icon: "Target",
      trend: "+12",
    },
    {
      label: "\u672c\u6708\u6210\u4ea4",
      value: "15",
      icon: "CheckCircle",
      trend: "+3",
    },
    {
      label: "\u9500\u552e\u603b\u989d",
      value: "\u00a55,680,000",
      icon: "TrendingUp",
      trend: "+15%",
    },
  ];
  const quickActions = [
    { label: "\u65b0\u589e\u5ba2\u6237", path: "/crm/customers/create" },
    { label: "\u521b\u5efa\u5546\u673a", path: "/crm/opportunities/create" },
    { label: "\u5b89\u6392\u6d3b\u52a8", path: "/crm/activities/create" },
    { label: "\u9500\u552e\u62a5\u8868", path: "/crm/reports" },
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: 600 }}>
            客户关系管理
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
            {getGreeting()}，客户管理与销售分析
          </Typography>
        </Box>
        <QuickSearch
          placeholder="搜索客户..."
          onSearch={(query) => {
            navigate(`/crm/customers?search=${encodeURIComponent(query)}`);
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
              区域客户分布
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
              月度成交趋势
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
              新老客户占比
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
