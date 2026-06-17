import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  User,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { expenseApi, type Expense } from "@/api/erp";
import {
  employeeApi,
  departmentApi,
  companyApi,
  type Employee,
  type Department,
  type Company,
} from "@/api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type { OrganizationFilterValue } from "@/components/ui/OrganizationFilter";
import OrganizationFilter from "@/components/ui/OrganizationFilter";
import { MetricCard } from "@/components/MetricCard";
import { StatsChart } from "@/components/StatsChart";

import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
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
import { ModeToggle } from "@/components/ModeToggle";

const FinanceExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({
      companyId: undefined,
      departmentId: undefined,
      employeeId: undefined,
    });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [newExpense, setNewExpense] = useState({
    expense_number: "",
    applicant_name: "",
    department_id: "",
    expense_type: "",
    amount: 0,
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    receipt_count: 0,
  });

  useEffect(() => {
    loadData();
  }, [organizationFilter]);

  const loadData = async () => {
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

      const [expenseRes, empRes, deptRes, companyRes] = await Promise.all([
        expenseApi.list(params),
        employeeApi.list(),
        departmentApi.list(),
        companyApi.list(),
      ]);

      if (expenseRes.success && expenseRes.data) {
        setExpenses(expenseRes.data.items || []);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items || []);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data.items || []);
      }
      if (companyRes.code === 200 && companyRes.data) {
        setCompanies(companyRes.data.items || []);
      }
    } catch (err: any) {
      addNotification({
        title: "加载失败",
        message: err.message || "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const configs: Record<
      string,
      {
        color:
          | "default"
          | "primary"
          | "secondary"
          | "success"
          | "error"
          | "info"
          | "warning";
        label: string;
      }
    > = {
      pending: { color: "warning", label: "待审批" },
      approved: { color: "primary", label: "已审批" },
      reimbursed: { color: "success", label: "已报销" },
      rejected: { color: "error", label: "已拒绝" },
    };

    const config = configs[status] || {
      color: "default" as const,
      label: status,
    };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getEmployeeName = (name: string) => {
    return name || "-";
  };

  const getDepartmentName = (id: string) => {
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

  const handleCreate = async () => {
    try {
      const res = await expenseApi.create({
        expense_number: newExpense.expense_number,
        applicant_name: newExpense.applicant_name || undefined,
        department_id: newExpense.department_id || undefined,
        expense_type: newExpense.expense_type || undefined,
        amount: newExpense.amount,
        description: newExpense.description || undefined,
        expense_date: newExpense.expense_date || undefined,
        receipt_count: newExpense.receipt_count,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "费用报销创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewExpense({
          expense_number: "",
          applicant_name: "",
          department_id: "",
          expense_type: "",
          amount: 0,
          description: "",
          expense_date: new Date().toISOString().split("T")[0],
          receipt_count: 0,
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "创建失败",
        type: "error",
      });
    }
  };

  const handleUpdate = async () => {
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
          title: "成功",
          message: "费用报销更新成功",
          type: "success",
        });
        setEditingExpense(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "更新失败",
        type: "error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条费用报销记录吗？")) return;

    try {
      const res = await expenseApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "费用报销删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "删除失败",
        type: "error",
      });
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      const res = await expenseApi.update(expense.id, {
        status: "approved",
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "已审批通过",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "审批失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "审批失败",
        type: "error",
      });
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) =>
        expenseApi.update(id, { status: "approved" }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: "成功",
          message: `批量审批成功，共 ${successCount} 条记录`,
          type: "success",
        });
      } else {
        addNotification({
          title: "部分成功",
          message: `成功审批 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: "warning",
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "批量审批失败",
        type: "error",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条费用报销记录吗？`))
      return;

    try {
      const promises = selectedIds.map((id) => expenseApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: "成功",
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: "success",
        });
      } else {
        addNotification({
          title: "部分成功",
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: "warning",
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "批量删除失败",
        type: "error",
      });
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) =>
        expenseApi.update(id, { status: "rejected" }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: "成功",
          message: `批量拒绝成功，共 ${successCount} 条记录`,
          type: "success",
        });
      } else {
        addNotification({
          title: "部分成功",
          message: `成功拒绝 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: "warning",
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "批量拒绝失败",
        type: "error",
      });
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterType && e.expense_type !== filterType) return false;
      return true;
    });
  }, [expenses, filterStatus, filterType]);

  const advancedFilters = useMemo(
    () => [
      {
        label: "状态",
        key: "status",
        type: "select" as const,
        options: [
          { value: "pending", label: "待审批" },
          { value: "approved", label: "已审批" },
          { value: "reimbursed", label: "已报销" },
          { value: "rejected", label: "已拒绝" },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
      {
        label: "费用类型",
        key: "expense_type",
        type: "select" as const,
        options: [
          { value: "travel", label: "差旅费" },
          { value: "office", label: "办公费" },
          { value: "meal", label: "餐费" },
          { value: "transportation", label: "交通费" },
          { value: "communication", label: "通讯费" },
          { value: "training", label: "培训费" },
          { value: "other", label: "其他" },
        ],
        value: filterType,
        onChange: setFilterType,
      },
    ],
    [filterStatus, filterType],
  );

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "expense_number",
        header: "报销编号",
        cell: ({ row }) => (
          <Box sx={{ fontWeight: 500, color: "primary.main" }}>
            {row.original.expense_number}
          </Box>
        ),
      },
      {
        accessorKey: "applicant_name",
        header: "申请人",
        cell: ({ row }) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.primary",
            }}
          >
            <User
              sx={{ width: 16, height: 16, mr: 1, color: "primary.main" }}
            />
            {getEmployeeName(row.original.applicant_name || "")}
          </Box>
        ),
      },
      {
        accessorKey: "department_id",
        header: "部门",
        cell: ({ row }) => (
          <Box sx={{ color: "text.primary" }}>
            {getDepartmentName(row.original.department_id || "")}
          </Box>
        ),
      },
      {
        accessorKey: "expense_type",
        header: "费用类型",
        cell: ({ row }) => (
          <Box sx={{ color: "text.primary" }}>
            {getExpenseTypeName(row.original.expense_type || "")}
          </Box>
        ),
      },
      {
        accessorKey: "amount",
        header: "金额",
        cell: ({ row }) => (
          <Box sx={{ fontWeight: 700, color: "success.main" }}>
            ¥{row.original.amount.toLocaleString()}
          </Box>
        ),
      },
      {
        accessorKey: "expense_date",
        header: "日期",
        cell: ({ row }) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.secondary",
              fontSize: "0.875rem",
            }}
          >
            <Calendar sx={{ width: 12, height: 12, mr: 0.5 }} />
            {row.original.expense_date?.split("T")[0] || "-"}
          </Box>
        ),
      },
      {
        accessorKey: "receipt_count",
        header: "票据数",
        cell: ({ row }) => (
          <Box sx={{ color: "text.primary" }}>
            {row.original.receipt_count || 0} 张
          </Box>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusChip(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <Stack direction="row" spacing={1}>
              {expense.status === "pending" && (
                <Tooltip title="审批">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleApprove(expense)}
                  >
                    <Check sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="编辑">
                <IconButton
                  size="small"
                  onClick={() => setEditingExpense(expense)}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(expense.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [departments],
  );

  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const reimbursedCount = expenses.filter(
    (e) => e.status === "reimbursed",
  ).length;
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expenseStats = useMemo(
    () => ({
      pendingCount,
      approvedCount,
      reimbursedCount,
      rejectedCount,
      totalAmount,
      totalExpenses: expenses.length,
      avgAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
    }),
    [
      expenses,
      pendingCount,
      approvedCount,
      reimbursedCount,
      rejectedCount,
      totalAmount,
    ],
  );

  const expenseStatusData = useMemo(
    () => [
      { name: "待审批", value: pendingCount, color: "#f59e0b" },
      { name: "已审批", value: approvedCount, color: "#3b82f6" },
      { name: "已报销", value: reimbursedCount, color: "#22c55e" },
      { name: "已拒绝", value: rejectedCount, color: "#ef4444" },
    ],
    [pendingCount, approvedCount, reimbursedCount, rejectedCount],
  );

  const expenseTypeData = useMemo(
    () => [
      {
        name: "差旅费",
        value: expenses
          .filter((e) => e.expense_type === "travel")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#3b82f6",
      },
      {
        name: "办公费",
        value: expenses
          .filter((e) => e.expense_type === "office")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#22c55e",
      },
      {
        name: "餐费",
        value: expenses
          .filter((e) => e.expense_type === "meal")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#f59e0b",
      },
      {
        name: "交通费",
        value: expenses
          .filter((e) => e.expense_type === "transportation")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#ef4444",
      },
      {
        name: "通讯费",
        value: expenses
          .filter((e) => e.expense_type === "communication")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#8b5cf6",
      },
      {
        name: "培训费",
        value: expenses
          .filter((e) => e.expense_type === "training")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#06b6d4",
      },
      {
        name: "其他",
        value: expenses
          .filter((e) => e.expense_type === "other")
          .reduce((sum, e) => sum + e.amount, 0),
        color: "#94a3b8",
      },
    ],
    [expenses],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: "sm",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                  }}
                >
                  <FileText
                    sx={{ width: 28, height: 28, mr: 1.5, color: "indigo.600" }}
                  />
                  费用报销
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理员工费用报销申请，审批报销流程
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <ModeToggle />
              <Button
                variant="contained"
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                新建报销
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 2, lg: 4 },
            gap: 2,
            mb: 3,
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: 2 },
            gap: 3,
            mb: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1.5,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              费用状态分布
            </Typography>
            <StatsChart type="pie" data={expenseStatusData} height={250} />
          </Box>

          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1.5,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              费用类型分布
            </Typography>
            <StatsChart type="bar" data={expenseTypeData} height={250} />
          </Box>
        </Box>

        <Stack
          sx={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
          spacing={2}
        >
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={true}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
            onClick={loadData}
          >
            刷新
          </Button>
        </Stack>

        {selectedIds.length > 0 && (
          <Card sx={{ mb: 2, bgcolor: "action.selected" }}>
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2" color="primary">
                  已选择 <Chip label={selectedIds.length} size="small" /> 条记录
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={<Check sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchApprove}
                  >
                    批量审批
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    startIcon={<AlertCircle sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchReject}
                  >
                    批量拒绝
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<Trash2 sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchDelete}
                  >
                    批量删除
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedIds([])}
                  >
                    取消选择
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    animation: "spin 1s linear infinite",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    border: 4,
                    borderColor: "primary.main",
                    borderTopColor: "transparent",
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  加载中...
                </Typography>
              </Box>
            ) : (
              <EnhancedDataTable
                columns={columns}
                data={filteredExpenses}
                searchPlaceholder="搜索报销编号、申请人..."
                searchKey="expense_number"
                loading={loading}
                enableSelection={true}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                selectionKey="id"
                enableAdvancedFilter={true}
                advancedFilters={advancedFilters}
                exportFileName="expense-report"
                onRefresh={loadData}
              />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Create Dialog */}
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
                value={newExpense.expense_number}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    expense_number: e.target.value,
                  })
                }
                placeholder="请输入报销编号"
              />
              <TextField
                label="申请人"
                fullWidth
                value={newExpense.applicant_name}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    applicant_name: e.target.value,
                  })
                }
                placeholder="请输入申请人姓名"
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>部门</InputLabel>
                <Select
                  value={newExpense.department_id}
                  label="部门"
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      department_id: e.target.value,
                    })
                  }
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
                  value={newExpense.expense_type}
                  label="费用类型"
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      expense_type: e.target.value,
                    })
                  }
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
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                placeholder="请输入金额"
              />
              <TextField
                label="日期"
                type="date"
                fullWidth
                value={newExpense.expense_date}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    expense_date: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="票据数量"
              type="number"
              fullWidth
              value={newExpense.receipt_count}
              onChange={(e) =>
                setNewExpense({
                  ...newExpense,
                  receipt_count: parseInt(e.target.value) || 0,
                })
              }
              slotProps={{ input: { inputProps: { min: 0 } } }}
              placeholder="请输入票据数量"
            />

            <TextField
              label="备注"
              fullWidth
              multiline
              rows={3}
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
              placeholder="请输入报销说明..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            提交申请
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
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
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label="申请人"
                  fullWidth
                  value={editingExpense.applicant_name || ""}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      applicant_name: e.target.value,
                    })
                  }
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>部门</InputLabel>
                  <Select
                    value={editingExpense.department_id || ""}
                    label="部门"
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        department_id: e.target.value || undefined,
                      })
                    }
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
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        expense_type: e.target.value,
                      })
                    }
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
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
                />
                <TextField
                  label="日期"
                  type="date"
                  fullWidth
                  value={editingExpense.expense_date?.split("T")[0] || ""}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      expense_date: e.target.value || undefined,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="票据数量"
                  type="number"
                  fullWidth
                  value={editingExpense.receipt_count || 0}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      receipt_count: parseInt(e.target.value) || 0,
                    })
                  }
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                />
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={editingExpense.status}
                    label="状态"
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        status: e.target.value,
                      })
                    }
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
                onChange={(e) =>
                  setEditingExpense({
                    ...editingExpense,
                    description: e.target.value || undefined,
                  })
                }
                placeholder="请输入报销说明..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceExpensePage;
