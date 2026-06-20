import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import { Grid } from "@/components/common";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Upload,
  Download,
  CreditCard,
  Wallet,
  Receipt,
  PieChart,
  BarChart3,
  Building2,
} from "lucide-react";
import { DashboardTemplate } from "@/components/templates";

interface StatCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "error";
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: "voucher" | "invoice" | "payment";
}

const mockStats: StatCard[] = [
  {
    title: "本月凭证数",
    value: "156",
    change: 12.5,
    changeLabel: "较上月",
    icon: <FileText size={24} />,
    color: "primary",
  },
  {
    title: "应收账款",
    value: "¥2,345,678",
    change: -5.2,
    changeLabel: "较上月",
    icon: <CreditCard size={24} />,
    color: "warning",
  },
  {
    title: "应付账款",
    value: "¥1,876,543",
    change: 8.3,
    changeLabel: "较上月",
    icon: <Wallet size={24} />,
    color: "error",
  },
  {
    title: "净利润",
    value: "¥4,567,890",
    change: 15.8,
    changeLabel: "较上月",
    icon: <TrendingUp size={24} />,
    color: "success",
  },
];

const mockQuickActions: QuickAction[] = [
  {
    label: "新建凭证",
    icon: <Plus size={20} />,
    path: "/finance/vouchers/create",
    color: "#1976d2",
  },
  {
    label: "导入凭证",
    icon: <Upload size={20} />,
    path: "/finance/vouchers/import",
    color: "#388e3c",
  },
  {
    label: "凭证列表",
    icon: <FileText size={20} />,
    path: "/finance/vouchers",
    color: "#7b1fa2",
  },
  {
    label: "财务报表",
    icon: <BarChart3 size={20} />,
    path: "/finance/reports",
    color: "#f57c00",
  },
];

const mockRecentVouchers: RecentItem[] = [
  {
    id: "1",
    title: "记-2024-001",
    subtitle: "支付办公费用",
    time: "2024-01-15 10:30",
    type: "voucher",
  },
  {
    id: "2",
    title: "记-2024-002",
    subtitle: "收到客户货款",
    time: "2024-01-15 11:20",
    type: "voucher",
  },
  {
    id: "3",
    title: "INV-2024-001",
    subtitle: "销售发票 #001",
    time: "2024-01-15 14:00",
    type: "invoice",
  },
  {
    id: "4",
    title: "PAY-2024-001",
    subtitle: "供应商付款",
    time: "2024-01-15 15:30",
    type: "payment",
  },
];

const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  const handleViewAll = (path: string) => {
    navigate(path);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const statsCards = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: 3,
      }}
    >
      {mockStats.map((stat, index) => (
        <Card
          key={index}
          sx={{
            "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
            transition: "all 0.3s",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor:
                    stat.color === "primary"
                      ? "primary.light"
                      : stat.color === "success"
                        ? "success.light"
                        : stat.color === "warning"
                          ? "warning.light"
                          : "error.light",
                }}
              >
                <Box
                  sx={{
                    color:
                      stat.color === "primary"
                        ? "primary.main"
                        : stat.color === "success"
                          ? "success.main"
                          : stat.color === "warning"
                            ? "warning.main"
                            : "error.main",
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
              <Chip
                size="small"
                icon={
                  stat.change >= 0 ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )
                }
                label={`${stat.change >= 0 ? "+" : ""}${stat.change}%`}
                sx={{
                  bgcolor: stat.change >= 0 ? "success.light" : "error.light",
                  color: stat.change >= 0 ? "success.dark" : "error.dark",
                  fontWeight: 600,
                  "& .MuiChip-icon": {
                    color: "inherit",
                  },
                }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stat.title}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {stat.changeLabel}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const quickActions = (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          快捷操作
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {mockQuickActions.map((action, index) => (
            <Button
              key={index}
              variant="outlined"
              startIcon={action.icon}
              onClick={() => handleQuickAction(action.path)}
              sx={{
                borderColor: action.color,
                color: action.color,
                "&:hover": {
                  borderColor: action.color,
                  bgcolor: `${action.color}10`,
                },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  const recentVouchers = (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            最近凭证
          </Typography>
          <Button
            size="small"
            onClick={() => handleViewAll("/finance/vouchers")}
          >
            查看全部
          </Button>
        </Box>
        <Stack spacing={2}>
          {mockRecentVouchers.map((item) => (
            <Box
              key={item.id}
              onClick={() => navigate(`/finance/vouchers/${item.id}`)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                borderRadius: 2,
                bgcolor: "grey.50",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "grey.100",
                  transform: "translateX(4px)",
                },
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor:
                      item.type === "voucher"
                        ? "primary.light"
                        : item.type === "invoice"
                          ? "success.light"
                          : "warning.light",
                    color:
                      item.type === "voucher"
                        ? "primary.main"
                        : item.type === "invoice"
                          ? "success.main"
                          : "warning.main",
                  }}
                >
                  {item.type === "voucher" ? (
                    <FileText size={20} />
                  ) : item.type === "invoice" ? (
                    <Receipt size={20} />
                  ) : (
                    <Wallet size={20} />
                  )}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.subtitle}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.disabled">
                {item.time}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  const financialCharts = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
        gap: 3,
      }}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            收入支出对比
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  收入
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "success.main" }}
                >
                  ¥5,234,567
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={65}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "success.light",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "success.main",
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  支出
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "error.main" }}
                >
                  ¥3,876,543
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={48}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "error.light",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "error.main",
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            账户余额分布
          </Typography>
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <PieChart size={80} style={{ color: "#1976d2" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                ¥8,765,432
              </Typography>
              <Typography variant="caption" color="text.secondary">
                银行存款
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <BarChart3 size={80} style={{ color: "#388e3c" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                ¥2,345,678
              </Typography>
              <Typography variant="caption" color="text.secondary">
                应收账款
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Building2 size={80} style={{ color: "#f57c00" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                ¥1,234,567
              </Typography>
              <Typography variant="caption" color="text.secondary">
                固定资产
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <DashboardTemplate
      title="财务概览"
      breadcrumbs={[{ label: "首页", href: "/dashboard" }, { label: "财务" }]}
      statsArea={statsCards}
      recentItemsArea={recentVouchers}
      quickActionsArea={quickActions}
      chartsArea={financialCharts}
    />
  );
};

export default FinanceDashboardPage;
