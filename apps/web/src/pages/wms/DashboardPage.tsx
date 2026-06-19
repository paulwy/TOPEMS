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
  Warehouse,
  Package,
  AlertCircle,
  ArrowRight,
  Truck,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import PieChartComponent from "../../components/charts/PieChart";
import LineChartComponent from "../../components/charts/LineChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Warehouse,
  Package,
  AlertCircle,
  Truck,
};

const barData = [
  { name: "A区", value: 1200 },
  { name: "B区", value: 980 },
  { name: "C区", value: 1500 },
  { name: "D区", value: 750 },
  { name: "E区", value: 1100 },
  { name: "F区", value: 620 },
];
const pieData = [
  { name: "原材料", value: 35 },
  { name: "成品", value: 45 },
  { name: "半成品", value: 20 },
];
const lineData = [
  { name: "周一", value: 85 },
  { name: "周二", value: 92 },
  { name: "周三", value: 78 },
  { name: "周四", value: 95 },
  { name: "周五", value: 88 },
  { name: "周六", value: 45 },
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
    { label: "仓库数量", value: "6", icon: "Warehouse", trend: "+1" },
    { label: "库存总量", value: "6,150", icon: "Package", trend: "+320" },
    { label: "今日入库", value: "128", icon: "Truck", trend: "+25" },
    { label: "库存预警", value: "5", icon: "AlertCircle", trend: "-3" },
  ];

  const quickActions = [
    { label: "入库登记", path: "/wms/inbound-orders/create" },
    { label: "出库登记", path: "/wms/outbound-orders/create" },
    { label: "库存查询", path: "/wms/inventory" },
    { label: "仓库设置", path: "/wms/warehouses" },
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
          仓储管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，仓库库存与物流概览
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
                          background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
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
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  各仓库库存分布
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
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  库存类型分布
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
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  每日出入库趋势
                </Typography>
                <LineChartComponent data={lineData} xKey="name" yKey="value" />
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
                    borderColor: "#10b981",
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
