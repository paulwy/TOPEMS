import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Building2,
  DollarSign,
  PieChart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { budgetApi, type Budget, type PaginatedResult } from "@/api/erp";
import { useAppStore } from "../../store";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "@/components/ui/OrganizationFilter";
import { MetricCard } from "@/components/MetricCard";
import { StatsChart } from "@/components/StatsChart";

const FinanceBudgetPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});

  const [formData, setFormData] = useState({
    department_id: "",
    budget_type: "operating",
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: "",
    status: "active",
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const response = await budgetApi.list();
      if (response.success && response.data) {
        setBudgets(response.data.items || []);
      }
    } catch (err) {
      console.error("加载预算数据失败:", err);
      addNotification({
        title: "错误",
        message: "加载预算数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.create(data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "预算创建成功",
          type: "success",
        });
        setShowCreateDialog(false);
        resetForm();
        loadBudgets();
      }
    } catch (err) {
      console.error("创建预算失败:", err);
      addNotification({
        title: "错误",
        message: "创建预算失败",
        type: "error",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingBudget) return;
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.update(editingBudget.id, data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "预算更新成功",
          type: "success",
        });
        setEditingBudget(null);
        setShowCreateDialog(false);
        resetForm();
        loadBudgets();
      }
    } catch (err) {
      console.error("更新预算失败:", err);
      addNotification({
        title: "错误",
        message: "更新预算失败",
        type: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除此预算吗？")) return;
    try {
      const response = await budgetApi.delete(id);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "预算删除成功",
          type: "success",
        });
        loadBudgets();
      }
    } catch (err) {
      console.error("删除预算失败:", err);
      addNotification({
        title: "错误",
        message: "删除预算失败",
        type: "error",
      });
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      department_id: budget.department_id || "",
      budget_type: budget.budget_type || "operating",
      fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
      total_budget: budget.total_budget.toString(),
      status: budget.status,
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      department_id: "",
      budget_type: "operating",
      fiscal_year: new Date().getFullYear().toString(),
      total_budget: "",
      status: "active",
    });
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      budget.budget_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.fiscal_year?.includes(searchTerm);
    const matchesType = !filterType || budget.budget_type === filterType;
    const matchesStatus = !filterStatus || budget.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount || 0), 0);
  const totalRemaining = budgets.reduce(
    (sum, b) => sum + (b.remaining_amount || 0),
    0,
  );
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate || 0), 0) /
        budgets.length
      : 0;

  // 预算统计数据
  const budgetStats = useMemo(
    () => ({
      totalBudget,
      totalUsed,
      totalRemaining,
      avgUsageRate,
      activeBudgets: budgets.filter((b) => b.status === "active").length,
      completedBudgets: budgets.filter((b) => b.status === "completed").length,
      frozenBudgets: budgets.filter((b) => b.status === "frozen").length,
      expiredBudgets: budgets.filter((b) => b.status === "expired").length,
    }),
    [budgets, totalBudget, totalUsed, totalRemaining, avgUsageRate],
  );

  // 预算类型分布数据
  const budgetTypeData = useMemo(
    () => [
      {
        name: "运营预算",
        value: budgets
          .filter((b) => b.budget_type === "operating")
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: "#3b82f6",
      },
      {
        name: "资本预算",
        value: budgets
          .filter((b) => b.budget_type === "capital")
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: "#22c55e",
      },
      {
        name: "项目预算",
        value: budgets
          .filter((b) => b.budget_type === "project")
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: "#f59e0b",
      },
      {
        name: "市场预算",
        value: budgets
          .filter((b) => b.budget_type === "marketing")
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: "#ef4444",
      },
      {
        name: "人事预算",
        value: budgets
          .filter((b) => b.budget_type === "personnel")
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: "#8b5cf6",
      },
    ],
    [budgets],
  );

  // 预算状态分布数据
  const budgetStatusData = useMemo(
    () => [
      {
        name: "执行中",
        value: budgets.filter((b) => b.status === "active").length,
        color: "#22c55e",
      },
      {
        name: "已完成",
        value: budgets.filter((b) => b.status === "completed").length,
        color: "#3b82f6",
      },
      {
        name: "已冻结",
        value: budgets.filter((b) => b.status === "frozen").length,
        color: "#94a3b8",
      },
      {
        name: "已过期",
        value: budgets.filter((b) => b.status === "expired").length,
        color: "#ef4444",
      },
    ],
    [budgets],
  );

  const getStatusChip = (status: string) => {
    const variants: Record<
      string,
      { color: "success" | "error" | "default" | "warning"; label: string }
    > = {
      active: { color: "success", label: "执行中" },
      expired: { color: "error", label: "已过期" },
      frozen: { color: "default", label: "已冻结" },
      completed: { color: "warning", label: "已完成" },
    };
    const config = variants[status as keyof typeof variants] || variants.active;
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      operating: "运营预算",
      capital: "资本预算",
      project: "项目预算",
      marketing: "市场预算",
      personnel: "人事预算",
    };
    return labels[type] || type;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            预算管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理企业各项预算的分配与执行情况
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus sx={{ width: 16, height: 16 }} />}
          onClick={() => {
            setEditingBudget(null);
            resetForm();
            setShowCreateDialog(true);
          }}
        >
          新增预算
        </Button>
      </Box>

      <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 2, mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={false}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <MetricCard
          title="总预算"
          value={formatCurrency(budgetStats.totalBudget)}
          icon={<DollarSign sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="blue"
        />
        <MetricCard
          title="已使用"
          value={formatCurrency(budgetStats.totalUsed)}
          icon={<PieChart sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="orange"
        />
        <MetricCard
          title="剩余预算"
          value={formatCurrency(budgetStats.totalRemaining)}
          icon={<CheckCircle2 sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="green"
        />
        <MetricCard
          title="平均使用率"
          value={formatPercent(budgetStats.avgUsageRate)}
          icon={<Calendar sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="purple"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <MetricCard
          title="执行中预算"
          value={budgetStats.activeBudgets}
          icon={<CheckCircle2 sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="green"
        />
        <MetricCard
          title="已完成预算"
          value={budgetStats.completedBudgets}
          icon={<CheckCircle2 sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="blue"
        />
        <MetricCard
          title="已冻结预算"
          value={budgetStats.frozenBudgets}
          icon={<XCircle sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="gray"
        />
        <MetricCard
          title="已过期预算"
          value={budgetStats.expiredBudgets}
          icon={<AlertCircle sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="red"
        />
      </Box>

      {/* 图表区域 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
          gap: 3,
        }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "semibold" }}
              gutterBottom
            >
              预算类型分布
            </Typography>
            <StatsChart type="pie" data={budgetTypeData} height={250} />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "semibold" }}
              gutterBottom
            >
              预算状态分布
            </Typography>
            <StatsChart type="pie" data={budgetStatusData} height={250} />
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardHeader
          title={
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">预算列表</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={loadBudgets}
                startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
              >
                刷新
              </Button>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              size="small"
              placeholder="搜索预算类型或年度..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ width: 16, height: 16, color: "grey.400" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1 }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>类型</InputLabel>
                <Select
                  value={filterType}
                  label="类型"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="operating">运营预算</MenuItem>
                  <MenuItem value="capital">资本预算</MenuItem>
                  <MenuItem value="project">项目预算</MenuItem>
                  <MenuItem value="marketing">市场预算</MenuItem>
                  <MenuItem value="personnel">人事预算</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={filterStatus}
                  label="状态"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="active">执行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="frozen">已冻结</MenuItem>
                  <MenuItem value="expired">已过期</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <LinearProgress />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                加载中...
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>预算类型</TableCell>
                    <TableCell>预算年度</TableCell>
                    <TableCell align="right">预算金额</TableCell>
                    <TableCell align="right">已使用</TableCell>
                    <TableCell align="right">剩余</TableCell>
                    <TableCell>使用率</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBudgets.length > 0 ? (
                    filteredBudgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Building2
                              sx={{
                                width: 16,
                                height: 16,
                                mr: 2,
                                color: "grey.400",
                              }}
                            />
                            {getTypeLabel(budget.budget_type || "")}
                          </Box>
                        </TableCell>
                        <TableCell>{budget.fiscal_year}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "medium" }}>
                          {formatCurrency(budget.total_budget)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(budget.used_amount || 0)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(budget.remaining_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ flex: 1, maxWidth: 100 }}>
                              <LinearProgress
                                variant="determinate"
                                value={budget.usage_rate || 0}
                                sx={{ height: 8, borderRadius: 1 }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ width: 50 }}
                            >
                              {formatPercent(budget.usage_rate || 0)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{getStatusChip(budget.status)}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => openDetailDialog(budget)}
                          >
                            <Eye sx={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(budget)}
                          >
                            <Edit2 sx={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(budget.id)}
                          >
                            <Trash2 sx={{ width: 16, height: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <AlertCircle
                          sx={{
                            width: 48,
                            height: 48,
                            mx: "auto",
                            color: "grey.300",
                            mb: 1,
                          }}
                        />
                        <Typography color="text.secondary">
                          暂无预算数据
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingBudget ? "编辑预算" : "新增预算"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>预算类型</InputLabel>
              <Select
                value={formData.budget_type}
                label="预算类型"
                onChange={(e) =>
                  setFormData({ ...formData, budget_type: e.target.value })
                }
              >
                <MenuItem value="operating">运营预算</MenuItem>
                <MenuItem value="capital">资本预算</MenuItem>
                <MenuItem value="project">项目预算</MenuItem>
                <MenuItem value="marketing">市场预算</MenuItem>
                <MenuItem value="personnel">人事预算</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              label="预算年度"
              value={formData.fiscal_year}
              onChange={(e) =>
                setFormData({ ...formData, fiscal_year: e.target.value })
              }
              fullWidth
            />
            <TextField
              size="small"
              type="number"
              label="预算金额"
              value={formData.total_budget}
              onChange={(e) =>
                setFormData({ ...formData, total_budget: e.target.value })
              }
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label="状态"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="active">执行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="frozen">已冻结</MenuItem>
                <MenuItem value="expired">已过期</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setShowCreateDialog(false);
              setEditingBudget(null);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={editingBudget ? handleUpdate : handleCreate}
          >
            {editingBudget ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <PieChart
            sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
          />
          预算详情
        </DialogTitle>
        <DialogContent>
          {selectedBudget && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    预算类型
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {getTypeLabel(selectedBudget.budget_type || "")}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    预算年度
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedBudget.fiscal_year}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  p: 2,
                  bgcolor: "linear-gradient(to right, #eff6ff, #eef2ff)",
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    预算金额
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold" }}
                    color="primary"
                  >
                    {formatCurrency(selectedBudget.total_budget)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      已使用
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold" }}
                      color="warning.main"
                    >
                      {formatCurrency(selectedBudget.used_amount || 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      剩余预算
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold" }}
                      color="success.main"
                    >
                      {formatCurrency(selectedBudget.remaining_amount || 0)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    使用进度
                  </Typography>
                  <Typography sx={{ fontWeight: "medium" }}>
                    {formatPercent(selectedBudget.usage_rate || 0)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={selectedBudget.usage_rate || 0}
                  sx={{ height: 16, borderRadius: 1 }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  状态
                </Typography>
                {getStatusChip(selectedBudget.status)}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  typography: "body2",
                  color: "text.secondary",
                }}
              >
                <span>
                  创建时间:{" "}
                  {new Date(selectedBudget.created_at).toLocaleDateString()}
                </span>
                <span>
                  更新时间:{" "}
                  {new Date(selectedBudget.updated_at).toLocaleDateString()}
                </span>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinanceBudgetPage;
