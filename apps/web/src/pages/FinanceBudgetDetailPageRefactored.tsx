/**
 * FinanceBudgetDetailPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 Grid 布局优化预算信息展示
 * 3. 使用 Card 组件重构预算科目明细
 * 4. 使用 mock 数据
 * 5. 主题色：绿色 (#22c55e)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Download,
  PieChart,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { PageHeader } from "../components/layout";

// ============ 类型定义 ============
interface BudgetItem {
  id: string;
  subject: string;
  category: string;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
}

interface BudgetDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  fiscalYear: string;
  department: string;
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
  status: "active" | "completed" | "frozen" | "expired";
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

// ============ Mock 数据 ============
const mockBudgetDetail: BudgetDetail = {
  id: "BD001",
  code: "BUD-2024-001",
  name: "2024年度运营预算",
  type: "operating",
  fiscalYear: "2024",
  department: "企业管理部",
  totalBudget: 5000000,
  usedAmount: 3250000,
  remainingAmount: 1750000,
  usageRate: 65,
  status: "active",
  createdAt: "2024-01-01",
  updatedAt: "2024-06-15",
  items: [
    {
      id: "I1",
      subject: "人员成本",
      category: "人力成本",
      budgetAmount: 2000000,
      usedAmount: 1400000,
      remainingAmount: 600000,
      usageRate: 70,
    },
    {
      id: "I2",
      subject: "办公费用",
      category: "运营成本",
      budgetAmount: 500000,
      usedAmount: 320000,
      remainingAmount: 180000,
      usageRate: 64,
    },
    {
      id: "I3",
      subject: "设备采购",
      category: "资本支出",
      budgetAmount: 800000,
      usedAmount: 450000,
      remainingAmount: 350000,
      usageRate: 56.25,
    },
    {
      id: "I4",
      subject: "市场推广",
      category: "营销成本",
      budgetAmount: 1000000,
      usedAmount: 780000,
      remainingAmount: 220000,
      usageRate: 78,
    },
    {
      id: "I5",
      subject: "研发投入",
      category: "研发成本",
      budgetAmount: 700000,
      usedAmount: 300000,
      remainingAmount: 400000,
      usageRate: 42.86,
    },
  ],
};

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const config: Record<string, { color: "success" | "error" | "default" | "warning"; label: string }> = {
    active: { color: "success", label: "执行中" },
    completed: { color: "warning", label: "已完成" },
    frozen: { color: "default", label: "已冻结" },
    expired: { color: "error", label: "已过期" },
  };
  return config[status] || config.active;
};

const getUsageRateStatus = (rate: number) => {
  if (rate >= 80) return { color: "error" as const, label: "超限预警" };
  if (rate >= 60) return { color: "success" as const, label: "正常" };
  return { color: "warning" as const, label: "偏低" };
};

// ============ 组件 ============
const FinanceBudgetDetailPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [budget, setBudget] = useState<BudgetDetail | null>(mockBudgetDetail);
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 加载数据
  const fetchBudgetDetail = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setBudget(mockBudgetDetail);
      setLoading(false);
    }, 500);
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchBudgetDetail();
  }, [fetchBudgetDetail]);

  // 统计数据
  const stats = useMemo(() => {
    if (!budget) return null;
    return {
      timeProgress: 50,
      forecastRemaining: Math.max(0, budget.remainingAmount - budget.usedAmount * 0.1),
    };
  }, [budget]);

  // 处理导出
  const handleExport = () => {
    alert("导出预算明细功能");
  };

  if (loading || !budget) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title={budget.name}
        subtitle={`预算编号: ${budget.code} | ${budget.department} | ${budget.fiscalYear}年度`}
        showBack
        onBack={() => navigate(-1)}
        rightContent={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<PieChart style={{ width: 18, height: 18 }} />}
              onClick={() => setShowAnalysis(true)}
            >
              执行分析
            </Button>
            <Button
              variant="contained"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={handleExport}
            >
              导出
            </Button>
          </Stack>
        }
      />

      {/* 预算基本信息 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 3,
          mb: 3,
        }}
      >
        <Card sx={{ bgcolor: "green.50", border: 1, borderColor: "green.200" }}>
          <CardContent sx={{ textAlign: "center", p: 3 }}>
            <DollarSign sx={{ width: 32, height: 32, color: "green.600", mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "green.700" }}>
              {formatCurrency(budget.totalBudget)}
            </Typography>
            <Typography variant="body2" color="text.secondary">总预算</Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: "orange.50", border: 1, borderColor: "orange.200" }}>
          <CardContent sx={{ textAlign: "center", p: 3 }}>
            <TrendingUp sx={{ width: 32, height: 32, color: "orange.600", mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "orange.700" }}>
              {formatCurrency(budget.usedAmount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">已使用</Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: "blue.50", border: 1, borderColor: "blue.200" }}>
          <CardContent sx={{ textAlign: "center", p: 3 }}>
            <CheckCircle2 sx={{ width: 32, height: 32, color: "blue.600", mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "blue.700" }}>
              {formatCurrency(budget.remainingAmount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">剩余预算</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: "center", p: 3 }}>
            <Chip
              label={getStatusConfig(budget.status).label}
              color={getStatusConfig(budget.status).color}
              size="medium"
              sx={{ mb: 2 }}
            />
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="text.secondary">使用率</Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>{budget.usageRate}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={budget.usageRate}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 预算科目明细 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="预算科目明细"
          action={
            <Chip
              label={`共 ${budget.items.length} 个科目`}
              size="small"
              variant="outlined"
            />
          }
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>科目名称</TableCell>
                  <TableCell>科目类别</TableCell>
                  <TableCell align="right">预算金额</TableCell>
                  <TableCell align="right">已使用</TableCell>
                  <TableCell align="right">剩余</TableCell>
                  <TableCell>执行进度</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budget.items.map((item) => {
                  const usageStatus = getUsageRateStatus(item.usageRate);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: "medium" }}>{item.subject}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: "medium" }}>
                          {formatCurrency(item.budgetAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="warning.main">
                          {formatCurrency(item.usedAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">
                          {formatCurrency(item.remainingAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, maxWidth: 80 }}>
                            <LinearProgress
                              variant="determinate"
                              value={item.usageRate}
                              color={usageStatus.color}
                              sx={{ height: 6, borderRadius: 1 }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ width: 40 }}>
                            {item.usageRate}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={usageStatus.label} size="small" color={usageStatus.color} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 执行进度 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 3,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar sx={{ width: 20, height: 20, color: "blue.500" }} />
                <Typography variant="subtitle2">时间进度</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: "medium" }}>50%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={50} sx={{ height: 8, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              已过半年，预算执行正常
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BarChart3 sx={{ width: 20, height: 20, color: "green.500" }} />
                <Typography variant="subtitle2">预算执行</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: "medium" }}>{budget.usageRate}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={budget.usageRate}
              color={budget.usageRate > 80 ? "error" : "primary"}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {budget.usageRate > 80 ? "执行较快，需关注" : "执行进度正常"}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingUp sx={{ width: 20, height: 20, color: "purple.500" }} />
                <Typography variant="subtitle2">预测年底剩余</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: "medium", color: "success.main" }}>
                {formatCurrency(stats?.forecastRemaining || 0)}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={65} sx={{ height: 8, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              预计年末有结余
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 执行分析对话框 */}
      <Dialog open={showAnalysis} onClose={() => setShowAnalysis(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <PieChart sx={{ width: 20, height: 20, mr: 1, color: "green.600" }} />
          预算执行分析
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: "blue.50", borderRadius: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <AlertCircle sx={{ width: 24, height: 24, color: "blue.600" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>执行提醒</Typography>
                </Box>
                <Typography variant="body2">
                  市场推广科目使用率达78%，接近预算上限，建议关注后续支出。
                </Typography>
              </Box>
            </Grid>
            <Grid xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: "green.50", borderRadius: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <CheckCircle2 sx={{ width: 24, height: 24, color: "green.600" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>正向指标</Typography>
                </Box>
                <Typography variant="body2">
                  研发投入执行率偏低(42.86%)，可根据项目进度适当加快投入。
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 2 }}>调整建议</Typography>
          <Stack spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "green.500" }} />
              <Typography variant="body2">建议适当调增市场推广预算或控制后续支出</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "green.500" }} />
              <Typography variant="body2">研发投入可按计划加快执行</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "green.500" }} />
              <Typography variant="body2">设备采购执行良好，可考虑跨科目调配</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceBudgetDetailPageRefactored;
