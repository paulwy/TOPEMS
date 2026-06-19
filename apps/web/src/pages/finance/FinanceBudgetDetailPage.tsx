import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Grid,
} from "@mui/material";
import {
  ChevronLeft,
  Download,
  PieChart,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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

const FinanceBudgetDetailPage: React.FC = () => {
  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    loadBudgetDetail();
  }, []);

  const loadBudgetDetail = () => {
    setLoading(true);
    setTimeout(() => {
      setBudget(mockBudgetDetail);
      setLoading(false);
    }, 500);
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: "success" | "error" | "default" | "warning"; label: string }
    > = {
      active: { color: "success", label: "执行中" },
      completed: { color: "warning", label: "已完成" },
      frozen: { color: "default", label: "已冻结" },
      expired: { color: "error", label: "已过期" },
    };
    return config[status] || config.active;
  };

  const handleExport = () => {
    alert("导出预算明细功能");
  };

  if (loading || !budget) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          加载中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 页面头部 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Button
            variant="text"
            startIcon={<ChevronLeft sx={{ width: 20, height: 20 }} />}
            sx={{ mb: 1 }}
          >
            返回
          </Button>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            {budget.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            预算编号: {budget.code} | {budget.department} | {budget.fiscalYear}
            年度
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PieChart sx={{ width: 16, height: 16 }} />}
            onClick={() => setShowAnalysis(true)}
          >
            执行分析
          </Button>
          <Button
            variant="contained"
            startIcon={<Download sx={{ width: 16, height: 16 }} />}
            onClick={handleExport}
          >
            导出
          </Button>
        </Stack>
      </Box>

      {/* 预算基本信息 */}
      <Card>
        <CardHeader title="预算基本信息" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center", p: 2 }}>
                <DollarSign
                  sx={{ width: 32, height: 32, color: "primary.main", mb: 1 }}
                />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", color: "primary.main" }}
                >
                  {formatCurrency(budget.totalBudget)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  总预算
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center", p: 2 }}>
                <TrendingUp
                  sx={{ width: 32, height: 32, color: "warning.main", mb: 1 }}
                />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", color: "warning.main" }}
                >
                  {formatCurrency(budget.usedAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  已使用
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center", p: 2 }}>
                <CheckCircle2
                  sx={{ width: 32, height: 32, color: "success.main", mb: 1 }}
                />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", color: "success.main" }}
                >
                  {formatCurrency(budget.remainingAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  剩余预算
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center", p: 2 }}>
                <Chip
                  label={getStatusConfig(budget.status).label}
                  color={getStatusConfig(budget.status).color}
                  size="medium"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={budget.usageRate}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    使用率: <strong>{budget.usageRate}%</strong>
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 预算科目明细 */}
      <Card>
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
                {budget.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: "medium" }}>
                        {item.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.category}
                        size="small"
                        variant="outlined"
                      />
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box sx={{ flex: 1, maxWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={item.usageRate}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ width: 40 }}
                        >
                          {item.usageRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.usageRate >= 80 ? (
                        <Chip label="超限预警" size="small" color="error" />
                      ) : item.usageRate >= 60 ? (
                        <Chip label="正常" size="small" color="success" />
                      ) : (
                        <Chip label="偏低" size="small" color="warning" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 执行进度 */}
      <Card>
        <CardHeader title="执行进度分析" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    时间进度
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    50%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={50}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  已过半年，预算执行正常
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    预算执行
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {budget.usageRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={budget.usageRate}
                  color={budget.usageRate > 80 ? "error" : "primary"}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  {budget.usageRate > 80 ? "执行较快，需关注" : "执行进度正常"}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    预测年底剩余
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "medium", color: "success.main" }}
                  >
                    {formatCurrency(
                      Math.max(
                        0,
                        budget.remainingAmount - budget.usedAmount * 0.1,
                      ),
                    )}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={65}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  预计年末有结余
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 执行分析对话框 */}
      <Dialog
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <PieChart sx={{ width: 20, height: 20, mr: 1 }} />
          预算执行分析
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: "blue.50", borderRadius: 1 }}>
                <AlertCircle
                  sx={{ width: 24, height: 24, color: "blue.600", mb: 1 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  执行提醒
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  市场推广科目使用率达78%，接近预算上限，建议关注后续支出。
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: "green.50", borderRadius: 1 }}>
                <CheckCircle2
                  sx={{ width: 24, height: 24, color: "green.600", mb: 1 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  正向指标
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  研发投入执行率偏低(42.86%)，可根据项目进度适当加快投入。
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 2 }}>
            调整建议
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              • 建议适当调增市场推广预算或控制后续支出
            </Typography>
            <Typography variant="body2">• 研发投入可按计划加快执行</Typography>
            <Typography variant="body2">
              • 设备采购执行良好，可考虑跨科目调配
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceBudgetDetailPage;
