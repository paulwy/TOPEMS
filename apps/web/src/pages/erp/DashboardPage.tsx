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
  Wallet,
  Package,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
  FlaskConical,
  CheckCircle,
  Rocket,
  ShoppingCart,
  RefreshCw,
  Truck,
  Target,
  MessageCircle,
  ThumbsUp,
  Repeat,
  Layers,
  MapPin,
  Globe,
  UserPlus,
  GraduationCap,
  Award,
} from "lucide-react";
import BarChartComponent from "../../components/charts/BarChart";
import LineChartComponent from "../../components/charts/LineChart";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  TrendingUp,
  Users,
  FileText,
  Clock,
  Wallet,
  Package,
  FolderKanban,
  CheckSquare,
  Trophy,
  AlertTriangle,
  FlaskConical,
  CheckCircle,
  Rocket,
  ShoppingCart,
  RefreshCw,
  Truck,
  Target,
  MessageCircle,
  ThumbsUp,
  Repeat,
  Layers,
  MapPin,
  Globe,
  UserPlus,
  GraduationCap,
  Award,
};

const barData = [{"name": "1\u6708", "value": 4000}, {"name": "2\u6708", "value": 3000}, {"name": "3\u6708", "value": 5000}, {"name": "4\u6708", "value": 4500}, {"name": "5\u6708", "value": 6000}, {"name": "6\u6708", "value": 5500}];
const pieData = [{"name": "\u539f\u6750\u6599", "value": 45}, {"name": "\u6210\u54c1", "value": 35}, {"name": "\u534a\u6210\u54c1", "value": 20}];
const lineData = [{"name": "\u5468\u4e00", "value": 120}, {"name": "\u5468\u4e8c", "value": 130}, {"name": "\u5468\u4e09", "value": 110}, {"name": "\u5468\u56db", "value": 140}, {"name": "\u5468\u4e94", "value": 160}, {"name": "\u5468\u516d", "value": 90}, {"name": "\u5468\u65e5", "value": 80}];

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

  const stats = [{"label": "\u603b\u8d44\u4ea7", "value": "\u00a512,580,000", "icon": "TrendingUp", "trend": "+8.5%"}, {"label": "\u672c\u6708\u6536\u5165", "value": "\u00a52,340,000", "icon": "Wallet", "trend": "+12%"}, {"label": "\u5e93\u5b58\u603b\u91cf", "value": "15,680", "icon": "Package", "trend": "-3%"}, {"label": "\u5f85\u5ba1\u6279\u5355\u636e", "value": "23", "icon": "FileText", "trend": "+5"}];
  const quickActions = [{"label": "\u65b0\u5efa\u91c7\u8d2d\u8ba2\u5355", "path": "/erp/purchasing/create"}, {"label": "\u67e5\u770b\u8d22\u52a1\u62a5\u8868", "path": "/erp/finance/reports"}, {"label": "\u5e93\u5b58\u76d8\u70b9", "path": "/erp/inventory/stocktake"}, {"label": "\u9500\u552e\u6570\u636e\u5206\u6790", "path": "/erp/sales/analysis"}];

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
          企业资源管理
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，财务管理与库存概览
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
              <BarChart3 size={20} sx={{ mr: 1 }} />
              数据概览
            </Typography>
            <BarChartComponent data={barData} xKey="name" yKey="value" />
          </Paper>

          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              <Activity size={20} sx={{ mr: 1 }} />
              趋势分析
            </Typography>
            <LineChartComponent data={lineData} xKey="name" yKey="value" />
          </Paper>
        </Box>

        <Box sx={{ mt: 6, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: "24px" }}>
          <Paper sx={{ padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: "#1e293b" }}>
              分类占比
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
