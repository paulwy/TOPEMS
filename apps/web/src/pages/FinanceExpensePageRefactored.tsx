/**
 * FinanceExpensePage 重构版本
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
  Edit,
  Trash2,
  Check,
  FileText,
  Clock,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  User,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  expenseApi,
  type Expense,
} from "../api/erp";
import {
  departmentApi,
  type Department,
} from "../api/hrm";
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
const columns: ColumnDef<Expense>[] = [
  {
    id: "expense_number",
    header: "报销编号",
    accessor: "expense_number",
    render: (value) => (
      <Box sx={{ fontWeight: 500, color: "primary.main" }}>{value}</Box>
    ),
  },
  {
    id: "applicant_name",
    header: "申请人",
    accessor: "applicant_name",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <User sx={{ width: 16, height: 16, mr: 1, color: "primary.main" }} />
        {value || "-"}
      </Box>
    ),
  },
  {
    id: "department_id",
    header: "部门",
    accessor: "department_id",
    render: (value, row) => getDepartmentName(value, row._data?.departments || []),
  },
  {
    id: "expense_type",
    header: "费用类型",
    accessor: "expense_type",
    render: (value) => getExpenseTypeName(value || ""),
  },
  {
    id: "amount",
    header: "金额",
    accessor: "amount",
    render: (value) => (
      <Box sx={{ fontWeight: 700, color: "success.main" }}>
        ¥{value.toLocaleString()}
      </Box>
    ),
  },
  {
    id: "expense_date",
    header: "日期",
    accessor: "expense_date",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", color: "text.secondary", fontSize: "0.875rem" }}>
        <Calendar sx={{ width: 12, height: 12, mr: 0.5 }} />
        {value?.split("T")[0] || "-"}
      </Box>
    ),
  },
  {
    id: "receipt_count",
    header: "票据数",
    accessor: "receipt_count",
    render: (value) => `${value || 0} 张`,
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => getStatusChip(value),
  },
];

// ============ 辅助函数 ============
const getStatusChip = (status: string) => {
  const configs: Record<
    string,
    { color: "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning"; label: string }
  > = {
    pending: { color: "warning", label: "待审批" },
    approved: { color: "primary", label: "已审批" },
    reimbursed: { color: "success", label: "已报销" },
    rejected: { color: "error", label: "已拒绝" },
  };
  const config = configs[status] || { color: "default" as const, label: status };
  return <Chip label={config.label} color={config.color} size="small" />;
};

const getDepartmentName = (id: string, departments: Department[]) => {
  const dept = departments.find((d) => d.id === id);
  return dept?.name || "-";
};

const getExpenseTypeName = (type: string) => {
  const types: Record<string, string> = {
    travel: "差旅费",
    office: "办公费",
    meal: "餐费",
    transportation: "交通费",
    communication: "通讯费",
    training: "培训费",
    other: "其他",
  };
  return types[type] || type;
};

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "pending", label: "待审批" },
      { value: "approved", label: "已审批" },
      { value: "reimbursed", label: "已报销" },
      { value: "rejected", label: "已拒绝" },
    ],
  },
  {
    id: "expense_type",
    label: "费用类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "travel", label: "差旅费" },
      { value: "office", label: "办公费" },
      { value: "meal", label: "餐费" },
      { value: "transportation", label: "交通费" },
      { value: "communication", label: "通讯费" },
      { value: "training", label: "培训费" },
      { value: "other", label: "其他" },
    ],
  },
];

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量审批",
    icon: <Check style={{ width: 16, height: 16 }} />,
    color: "success" as const,
  },
  {
    label: "批量拒绝",
    icon: <AlertCircle style={{ width: 16, height: 16 }} />,
    color: "warning" as const,
  },
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
];

// ============ 组件 ============
const FinanceExpensePageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 筛选状态
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});

  // 选中状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    expense_number: "",
    applicant_name: "",
    department_id: "",
    expense_type: "",
    amount: 0,
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    receipt_count: 0,
  });

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (organizationFilter.companyId) {
        params.company_id = organizationFilter.companyId;
      }
      if (organizationFilter.departmentId) {
        params.department_id = organizationFilter.departmentId;
      }
      if (organizationFilter.employeeId) {
        params.employee_id = organizationFilter.employeeId;
      }

      const [expenseRes, deptRes] = await Promise.all([
        expenseApi.list(params),
        departmentApi.list(),
      ]);

      if (expenseRes.success && expenseRes.data) {
        setExpenses(expenseRes.data.items || []);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data.items || []);
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: err.message || "加载数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [organizationFilter, addNotification]);

  // 初始加载
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 带部门数据的行操作
  const getRowActions = useCallback(
    (): RowAction<Expense>[] => [
      {
        label: "审批",
        icon: <Check style={{ width: 16, height: 16 }} />,
        onClick: (expense) => handleApprove(expense),
        show: (expense) => expense.status === "pending",
        color: "success",
      },
      {
        label: "编辑",
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (expense) => setEditingExpense(expense),
      },
      {
        label: "删除",
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (expense) => handleDelete(expense.id),
        color: "error",
      },
    ],
    [],
  );

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterType !== "all" && e.expense_type !== filterType) return false;
      return true;
    });
  }, [expenses, filterStatus, filterType]);

  // 统计数据
  const expenseStats = useMemo(() => {
    const pendingCount = expenses.filter((e) => e.status === "pending").length;
    const approvedCount = expenses.filter((e) => e.status === "approved").length;
    const reimbursedCount = expenses.filter((e) => e.status === "reimbursed").length;
    const rejectedCount = expenses.filter((e) => e.status === "rejected").length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      pendingCount,
      approvedCount,
      reimbursedCount,
      rejectedCount,
      totalAmount,
      totalExpenses: expenses.length,
      avgAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
    };
  }, [expenses]);

  // 费用状态分布数据
  const expenseStatusData = useMemo(
    () => [
      { name: "待审批", value: expenseStats.pendingCount, color: "#f59e0b" },
      { name: "已审批", value: expenseStats.approvedCount, color: "#3b82f6" },
      { name: "已报销", value: expenseStats.reimbursedCount, color: "#22c55e" },
      { name: "已拒绝", value: expenseStats.rejectedCount, color: "#ef4444" },
    ],
    [expenseStats],
  );

  // 费用类型分布数据
  const expenseTypeData = useMemo(
    () => [
      { name: "差旅费", value: expenses.filter((e) => e.expense_type === "travel").reduce((sum, e) => sum + e.amount, 0), color: "#3b82f6" },
      { name: "办公费", value: expenses.filter((e) => e.expense_type === "office").reduce((sum, e) => sum + e.amount, 0), color: "#22c55e" },
      { name: "餐费", value: expenses.filter((e) => e.expense_type === "meal").reduce((sum, e) => sum + e.amount, 0), color: "#f59e0b" },
      { name: "交通费", value: expenses.filter((e) => e.expense_type === "transportation").reduce((sum, e) => sum + e.amount, 0), color: "#ef4444" },
      { name: "通讯费", value: expenses.filter((e) => e.expense_type === "communication").reduce((sum, e) => sum + e.amount, 0), color: "#8b5cf6" },
      { name: "培训费", value: expenses.filter((e) => e.expense_type === "training").reduce((sum, e) => sum + e.amount, 0), color: "#06b6d4" },
      { name: "其他", value: expenses.filter((e) => e.expense_type === "other").reduce((sum, e) => sum + e.amount, 0), color: "#94a3b8" },
    ],
    [expenses],
  );

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "status") setFilterStatus(value);
      if (filterId === "expense_type") setFilterType(value);
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const res = await expenseApi.create({
        expense_number: formData.expense_number,
        applicant_name: formData.applicant_name || undefined,
        department_id: formData.department_id || undefined,
        expense_type: formData.expense_type || undefined,
        amount: formData.amount,
        description: formData.description || undefined,
        expense_date: formData.expense_date || undefined,
        receipt_count: formData.receipt_count,
      });

      if (res.success) {
        addNotification({
          type: "success",
          title: "成功",
          message: "费用报销创建成功",
        });
        setShowCreateModal(false);
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "错误",
        message: err.message || "创建失败",
      });
    }
  }, [formData, addNotification, fetchData]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!editingExpense) return;
    try {
      const res = await expenseApi.update(editingExpense.id, {
        applicant_name: editingExpense.applicant_name || undefined,
        department_id: editingExpense.department_id || undefined,
        expense_type: editingExpense.expense_type || undefined,
        amount: editingExpense.amount,
        description: editingExpense.description || undefined,
        expense_date: editingExpense.expense_date || undefined,
        receipt_count: editingExpense.receipt_count,
        status: editingExpense.status,
      });

      if (res.success) {
        addNotification({
          type: "success",
          title: "成功",
          message: "费用报销更新成功",
        });
        setEditingExpense(null);
        fetchData();
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "错误",
        message: err.message || "更新失败",
      });
    }
  }, [editingExpense, addNotification, fetchData]);

  // 处理删除
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定要删除这条费用报销记录吗？")) return;
      try {
        const res = await expenseApi.delete(id);
        if (res.success) {
          addNotification({
            type: "success",
            title: "成功",
            message: "费用报销删除成功",
          });
          fetchData();
        }
      } catch (err: any) {
        addNotification({
          type: "error",
          title: "错误",
          message: err.message || "删除失败",
        });
      }
    },
    [addNotification, fetchData],
  );

  // 处理审批
  const handleApprove = useCallback(
    async (expense: Expense) => {
      try {
        const res = await expenseApi.update(expense.id, { status: "approved" });
        if (res.success) {
          addNotification({
            type: "success",
            title: "成功",
            message: "已审批通过",
          });
          fetchData();
        }
      } catch (err: any) {
        addNotification({
          type: "error",
          title: "错误",
          message: err.message || "审批失败",
        });
      }
    },
    [addNotification, fetchData],
  );

  // 批量审批
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.length === 0) return;
    try {
      const promises = selectedIds.map((id) => expenseApi.update(id, { status: "approved" }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      addNotification({
        type: successCount === selectedIds.length ? "success" : "warning",
        title: successCount === selectedIds.length ? "成功" : "部分成功",
        message: `成功审批 ${successCount} 条${successCount < selectedIds.length ? `，失败 ${selectedIds.length - successCount} 条` : ""}`,
      });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      addNotification({ type: "error", title: "错误", message: err.message || "批量审批失败" });
    }
  }, [selectedIds, addNotification, fetchData]);

  // 批量拒绝
  const handleBatchReject = useCallback(async () => {
    if (selectedIds.length === 0) return;
    try {
      const promises = selectedIds.map((id) => expenseApi.update(id, { status: "rejected" }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      addNotification({
        type: successCount === selectedIds.length ? "success" : "warning",
        title: successCount === selectedIds.length ? "成功" : "部分成功",
        message: `成功拒绝 ${successCount} 条${successCount < selectedIds.length ? `，失败 ${selectedIds.length - successCount} 条` : ""}`,
      });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      addNotification({ type: "error", title: "错误", message: err.message || "批量拒绝失败" });
    }
  }, [selectedIds, addNotification, fetchData]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条费用报销记录吗？`)) return;
    try {
      const promises = selectedIds.map((id) => expenseApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      addNotification({
        type: successCount === selectedIds.length ? "success" : "warning",
        title: successCount === selectedIds.length ? "成功" : "部分成功",
        message: `成功删除 ${successCount} 条${successCount < selectedIds.length ? `，失败 ${selectedIds.length - successCount} 条` : ""}`,
      });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      addNotification({ type: "error", title: "错误", message: err.message || "批量删除失败" });
    }
  }, [selectedIds, addNotification, fetchData]);

  const resetForm = () => {
    setFormData({
      expense_number: "",
      applicant_name: "",
      department_id: "",
      expense_type: "",
      amount: 0,
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
      receipt_count: 0,
    });
  };

  return (
    <>
      <PageHeader
        title="费用报销"
        subtitle="管理员工费用报销申请，审批报销流程"
        showBack
        onBack={() => navigate("/dashboard")}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => setShowCreateModal(true)}
          >
            新建报销
          </Button>
        }
      />

      {/* 组织筛选 */}
      <Box sx={{ mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={true}
        />
      </Box>

      {/* 统计卡片 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, md: 2, lg: 4 },
          gap: 2,
          mb: 2,
        }}
      >
        <MetricCard
          title="待审批"
          value={expenseStats.pendingCount}
          icon={<Clock sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="orange"
        />
        <MetricCard
          title="已审批"
          value={expenseStats.approvedCount}
          icon={<Check sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="blue"
        />
        <MetricCard
          title="已报销"
          value={expenseStats.reimbursedCount}
          icon={<DollarSign sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="green"
        />
        <MetricCard
          title="总金额"
          value={`¥${expenseStats.totalAmount.toLocaleString()}`}
          icon={<Send sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="purple"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, md: 3 },
          gap: 2,
          mb: 3,
        }}
      >
        <MetricCard
          title="已拒绝"
          value={expenseStats.rejectedCount}
          icon={<AlertCircle sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="red"
        />
        <MetricCard
          title="费用总数"
          value={expenseStats.totalExpenses}
          icon={<FileText sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="blue"
        />
        <MetricCard
          title="平均金额"
          value={`¥${Math.round(expenseStats.avgAmount).toLocaleString()}`}
          icon={<DollarSign sx={{ width: 20, height: 20 }} />}
          trend={null}
          color="teal"
        />
      </Box>

      {/* 图表区域 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, lg: 2 },
          gap: 3,
          mb: 3,
        }}
      >
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1.5, boxShadow: 1, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            费用状态分布
          </Typography>
          <StatsChart type="pie" data={expenseStatusData} height={250} />
        </Box>

        <Box sx={{ bgcolor: "background.paper", borderRadius: 1.5, boxShadow: 1, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            费用类型分布
          </Typography>
          <StatsChart type="bar" data={expenseTypeData} height={250} />
        </Box>
      </Box>

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        rowActions={getRowActions()}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchData}
        emptyMessage="暂无费用报销数据"
        selection={{
          selected: selectedIds,
          onChange: setSelectedIds,
        }}
        batchActions={batchActions}
        onBatchAction={(action) => {
          if (action.label === "批量审批") handleBatchApprove();
          else if (action.label === "批量拒绝") handleBatchReject();
          else if (action.label === "批量删除") handleBatchDelete();
        }}
      />

      {/* 创建对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建费用报销</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="报销编号 *"
                required
                fullWidth
                value={formData.expense_number}
                onChange={(e) => setFormData({ ...formData, expense_number: e.target.value })}
                placeholder="请输入报销编号"
              />
              <TextField
                label="申请人"
                fullWidth
                value={formData.applicant_name}
                onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                placeholder="请输入申请人姓名"
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>部门</InputLabel>
                <Select
                  value={formData.department_id}
                  label="部门"
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                >
                  <MenuItem value="">请选择部门</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>费用类型</InputLabel>
                <Select
                  value={formData.expense_type}
                  label="费用类型"
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                >
                  <MenuItem value="">请选择类型</MenuItem>
                  <MenuItem value="travel">差旅费</MenuItem>
                  <MenuItem value="office">办公费</MenuItem>
                  <MenuItem value="meal">餐费</MenuItem>
                  <MenuItem value="transportation">交通费</MenuItem>
                  <MenuItem value="communication">通讯费</MenuItem>
                  <MenuItem value="training">培训费</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="金额 *"
                required
                type="number"
                fullWidth
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                placeholder="请输入金额"
              />
              <TextField
                label="日期"
                type="date"
                fullWidth
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="票据数量"
              type="number"
              fullWidth
              value={formData.receipt_count}
              onChange={(e) => setFormData({ ...formData, receipt_count: parseInt(e.target.value) || 0 })}
              slotProps={{ input: { inputProps: { min: 0 } } }}
              placeholder="请输入票据数量"
            />

            <TextField
              label="备注"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入报销说明..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>提交申请</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑费用报销</DialogTitle>
        <DialogContent>
          {editingExpense && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="报销编号"
                  fullWidth
                  value={editingExpense.expense_number}
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="申请人"
                  fullWidth
                  value={editingExpense.applicant_name || ""}
                  onChange={(e) => setEditingExpense({ ...editingExpense, applicant_name: e.target.value })}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>部门</InputLabel>
                  <Select
                    value={editingExpense.department_id || ""}
                    label="部门"
                    onChange={(e) => setEditingExpense({ ...editingExpense, department_id: e.target.value || undefined })}
                  >
                    <MenuItem value="">请选择部门</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>费用类型</InputLabel>
                  <Select
                    value={editingExpense.expense_type || ""}
                    label="费用类型"
                    onChange={(e) => setEditingExpense({ ...editingExpense, expense_type: e.target.value })}
                  >
                    <MenuItem value="">请选择类型</MenuItem>
                    <MenuItem value="travel">差旅费</MenuItem>
                    <MenuItem value="office">办公费</MenuItem>
                    <MenuItem value="meal">餐费</MenuItem>
                    <MenuItem value="transportation">交通费</MenuItem>
                    <MenuItem value="communication">通讯费</MenuItem>
                    <MenuItem value="training">培训费</MenuItem>
                    <MenuItem value="other">其他</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="金额"
                  type="number"
                  fullWidth
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                />
                <TextField
                  label="日期"
                  type="date"
                  fullWidth
                  value={editingExpense.expense_date?.split("T")[0] || ""}
                  onChange={(e) => setEditingExpense({ ...editingExpense, expense_date: e.target.value || undefined })}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="票据数量"
                  type="number"
                  fullWidth
                  value={editingExpense.receipt_count || 0}
                  onChange={(e) => setEditingExpense({ ...editingExpense, receipt_count: parseInt(e.target.value) || 0 })}
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={editingExpense.status}
                    label="状态"
                    onChange={(e) => setEditingExpense({ ...editingExpense, status: e.target.value })}
                  >
                    <MenuItem value="pending">待审批</MenuItem>
                    <MenuItem value="approved">已审批</MenuItem>
                    <MenuItem value="reimbursed">已报销</MenuItem>
                    <MenuItem value="rejected">已拒绝</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="备注"
                fullWidth
                multiline
                rows={3}
                value={editingExpense.description || ""}
                onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value || undefined })}
                placeholder="请输入报销说明..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate}>保存</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceExpensePageRefactored;
