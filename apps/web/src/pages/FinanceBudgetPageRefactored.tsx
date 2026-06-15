/**
 * FinanceBudgetPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Building2,
  DollarSign,
  PieChart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  budgetApi,
  type Budget,
} from "../api/erp";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "../components/ui/OrganizationFilter";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";

// ============ 列定义 ============
const columns: ColumnDef<Budget>[] = [
  {
    id: "budget_type",
    header: "预算类型",
    accessor: "budget_type",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Building2 sx={{ width: 16, height: 16, mr: 1, color: "grey.400" }} />
        {getTypeLabel(value || "")}
      </Box>
    ),
  },
  {
    id: "fiscal_year",
    header: "预算年度",
    accessor: "fiscal_year",
  },
  {
    id: "total_budget",
    header: "预算金额",
    accessor: "total_budget",
    render: (value) => (
      <Box sx={{ fontWeight: "medium" }}>{formatCurrency(value)}</Box>
    ),
  },
  {
    id: "used_amount",
    header: "已使用",
    accessor: "used_amount",
    render: (value) => formatCurrency(value || 0),
  },
  {
    id: "remaining_amount",
    header: "剩余",
    accessor: "remaining_amount",
    render: (value) => formatCurrency(value || 0),
  },
  {
    id: "usage_rate",
    header: "使用率",
    accessor: "usage_rate",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, maxWidth: 100 }}>
          <LinearProgress
            variant="determinate"
            value={value || 0}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        <Box sx={{ color: "text.secondary", fontSize: "0.875rem", width: 50 }}>
          {formatPercent(value || 0)}
        </Box>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => getStatusChip(value),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (budget: Budget) => void,
  onEdit: (budget: Budget) => void,
  onDelete: (budget: Budget) => void,
): RowAction<Budget>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit2 style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索预算类型或年度...",
  },
  {
    id: "budget_type",
    label: "类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "operating", label: "运营预算" },
      { value: "capital", label: "资本预算" },
      { value: "project", label: "项目预算" },
      { value: "marketing", label: "市场预算" },
      { value: "personnel", label: "人事预算" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "active", label: "执行中" },
      { value: "completed", label: "已完成" },
      { value: "frozen", label: "已冻结" },
      { value: "expired", label: "已过期" },
    ],
  },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

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
  const config = variants[status] || variants.active;
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

// ============ 组件 ============
const FinanceBudgetPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});

  // 模态框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    department_id: "",
    budget_type: "operating",
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: "",
    status: "active",
  });

  // 获取预算列表
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await budgetApi.list();
      if (response.success && response.data) {
        setBudgets(response.data.items || []);
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取预算数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // 初始加载
  React.useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return budgets.filter((budget) => {
      const matchesSearch =
        !searchText ||
        budget.budget_type?.toLowerCase().includes(searchText.toLowerCase()) ||
        budget.fiscal_year?.includes(searchText);
      const matchesType = filterType === "all" || budget.budget_type === filterType;
      const matchesStatus = filterStatus === "all" || budget.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [budgets, searchText, filterType, filterStatus]);

  // 统计数据
  const budgetStats = useMemo(() => {
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
    return {
      totalBudget,
      totalUsed,
      totalRemaining,
      avgUsageRate,
      activeBudgets: budgets.filter((b) => b.status === "active").length,
      completedBudgets: budgets.filter((b) => b.status === "completed").length,
      frozenBudgets: budgets.filter((b) => b.status === "frozen").length,
      expiredBudgets: budgets.filter((b) => b.status === "expired").length,
    };
  }, [budgets]);

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

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "budget_type") setFilterType(value);
      if (filterId === "status") setFilterStatus(value);
    },
    [],
  );

  // 处理查看
  const handleView = useCallback((budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      department_id: budget.department_id || "",
      budget_type: budget.budget_type || "operating",
      fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
      total_budget: budget.total_budget.toString(),
      status: budget.status,
    });
    setShowCreateDialog(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (budget: Budget) => {
      if (!window.confirm("确定要删除此预算吗？")) return;
      try {
        const response = await budgetApi.delete(budget.id);
        if (response.success) {
          addNotification({
            type: "success",
            title: "删除成功",
            message: "预算已删除",
          });
          fetchBudgets();
        }
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除预算",
        });
      }
    },
    [addNotification, fetchBudgets],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.create(data);
      if (response.success) {
        addNotification({
          type: "success",
          title: "成功",
          message: "预算创建成功",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchBudgets();
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "错误",
        message: error.message || "创建预算失败",
      });
    }
  }, [formData, addNotification, fetchBudgets]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!editingBudget) return;
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.update(editingBudget.id, data);
      if (response.success) {
        addNotification({
          type: "success",
          title: "成功",
          message: "预算更新成功",
        });
        setEditingBudget(null);
        setShowCreateDialog(false);
        resetForm();
        fetchBudgets();
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "错误",
        message: error.message || "更新预算失败",
      });
    }
  }, [editingBudget, formData, addNotification, fetchBudgets]);

  const resetForm = () => {
    setFormData({
      department_id: "",
      budget_type: "operating",
      fiscal_year: new Date().getFullYear().toString(),
      total_budget: "",
      status: "active",
    });
  };

  return (
    <>
      <PageHeader
        title="预算管理"
        subtitle="管理企业各项预算的分配与执行情况"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => {
              setEditingBudget(null);
              resetForm();
              setShowCreateDialog(true);
            }}
          >
            新增预算
          </Button>
        }
      />

      {/* 组织筛选 */}
      <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 2, mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={false}
        />
      </Box>

      {/* 统计卡片 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
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
          mb: 3,
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
          mb: 3,
        }}
      >
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 3, boxShadow: 1 }}>
          <Box component="h6" sx={{ fontWeight: "semibold", mb: 2 }}>
            预算类型分布
          </Box>
          <StatsChart type="pie" data={budgetTypeData} height={250} />
        </Box>

        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 3, boxShadow: 1 }}>
          <Box component="h6" sx={{ fontWeight: "semibold", mb: 2 }}>
            预算状态分布
          </Box>
          <StatsChart type="pie" data={budgetStatusData} height={250} />
        </Box>
      </Box>

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchBudgets}
        emptyMessage="暂无预算数据"
      />

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
          <PieChart sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }} />
          预算详情
        </DialogTitle>
        <DialogContent>
          {selectedBudget && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    预算类型
                  </Box>
                  <Box sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {getTypeLabel(selectedBudget.budget_type || "")}
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    预算年度
                  </Box>
                  <Box sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedBudget.fiscal_year}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    预算金额
                  </Box>
                  <Box sx={{ fontWeight: "bold", color: "primary.main" }}>
                    {formatCurrency(selectedBudget.total_budget)}
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                  <Box>
                    <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                      已使用
                    </Box>
                    <Box sx={{ fontWeight: "bold", color: "warning.main", mt: 0.5 }}>
                      {formatCurrency(selectedBudget.used_amount || 0)}
                    </Box>
                  </Box>
                  <Box>
                    <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                      剩余预算
                    </Box>
                    <Box sx={{ fontWeight: "bold", color: "success.main", mt: 0.5 }}>
                      {formatCurrency(selectedBudget.remaining_amount || 0)}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    使用进度
                  </Box>
                  <Box sx={{ fontWeight: "medium" }}>
                    {formatPercent(selectedBudget.usage_rate || 0)}
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={selectedBudget.usage_rate || 0}
                  sx={{ height: 16, borderRadius: 1 }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>
                  状态
                </Box>
                {getStatusChip(selectedBudget.status)}
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", typography: "body2", color: "text.secondary" }}>
                <span>
                  创建时间: {new Date(selectedBudget.created_at).toLocaleDateString()}
                </span>
                <span>
                  更新时间: {new Date(selectedBudget.updated_at).toLocaleDateString()}
                </span>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FinanceBudgetPageRefactored;
