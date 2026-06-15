import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { budgetApi, type Budget } from "../api/erp";
import { departmentApi, type Department } from "../api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

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
  FormLabel,
  Chip,
  Checkbox,
  FormControlLabel,
  Box,
  IconButton,
} from "@mui/material";
import { ModeToggle } from "@/components/ModeToggle";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "../components/ui/OrganizationFilter";

const BudgetManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>("");

  const handleBatchUpdateStatus = () => {
    setShowBatchStatusModal(true);
  };

  const confirmBatchUpdateStatus = async () => {
    if (selectedIds.length === 0 || !batchStatus) return;

    try {
      const promises = selectedIds.map((id) =>
        budgetApi.update(id, { status: batchStatus }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: "批量更新成功",
        message: `成功更新 ${successCount} 条预算状态，失败 ${selectedIds.length - successCount} 条`,
        type: "success",
      });

      setSelectedIds([]);
      setShowBatchStatusModal(false);
      setBatchStatus("");
      loadData();
    } catch (err: any) {
      addNotification({
        title: "批量更新失败",
        message: err.message || "批量更新状态失败",
        type: "error",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => budgetApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: "批量删除成功",
        message: `成功删除 ${successCount} 条预算，失败 ${selectedIds.length - successCount} 条`,
        type: "success",
      });

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "批量删除失败",
        message: err.message || "批量删除失败",
        type: "error",
      });
    }
  };
  const [newBudget, setNewBudget] = useState({
    department_id: "",
    budget_type: "",
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetRes, deptRes] = await Promise.all([
        budgetApi.list(),
        departmentApi.list(),
      ]);

      if (budgetRes.success && budgetRes.data) {
        setBudgets(budgetRes.data.items || []);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data.items || []);
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

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { color: "primary" | "default" | "error" | "warning"; label: string }
    > = {
      active: { color: "primary", label: "执行中" },
      frozen: { color: "warning", label: "已冻结" },
      exhausted: { color: "error", label: "已耗尽" },
    };

    const badgeConfig = config[status] || {
      color: "default" as const,
      label: status,
    };
    return (
      <Chip size="small" label={badgeConfig.label} color={badgeConfig.color} />
    );
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || "-";
  };

  const getBudgetTypeName = (type: string) => {
    const types: Record<string, string> = {
      office: "办公费",
      marketing: "市场费",
      development: "研发费",
      travel: "差旅费",
      training: "培训费",
      other: "其他",
    };
    return types[type] || type;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-red-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const handleCreate = async () => {
    try {
      const res = await budgetApi.create({
        department_id: newBudget.department_id || undefined,
        budget_type: newBudget.budget_type || undefined,
        fiscal_year: newBudget.fiscal_year,
        total_budget: newBudget.total_budget,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "预算创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewBudget({
          department_id: "",
          budget_type: "",
          fiscal_year: new Date().getFullYear().toString(),
          total_budget: 0,
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
    if (!editingBudget) return;

    try {
      const res = await budgetApi.update(editingBudget.id, {
        department_id: editingBudget.department_id || undefined,
        budget_type: editingBudget.budget_type || undefined,
        fiscal_year: editingBudget.fiscal_year,
        total_budget: editingBudget.total_budget,
        used_amount: editingBudget.used_amount,
        status: editingBudget.status,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "预算更新成功",
          type: "success",
        });
        setEditingBudget(null);
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
    if (!confirm("确定要删除这条预算记录吗？")) return;

    try {
      const res = await budgetApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "预算删除成功",
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

  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        accessorKey: "department_id",
        header: "部门",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {getDepartmentName(row.original.department_id || "")}
          </div>
        ),
      },
      {
        accessorKey: "budget_type",
        header: "预算类型",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
            {getBudgetTypeName(row.original.budget_type || "")}
          </div>
        ),
      },
      {
        accessorKey: "fiscal_year",
        header: "财年",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
            {row.original.fiscal_year}年
          </div>
        ),
      },
      {
        accessorKey: "total_budget",
        header: "预算总额",
        cell: ({ row }) => (
          <div className="font-bold text-blue-600">
            ¥{row.original.total_budget.toLocaleString()}
          </div>
        ),
      },
      {
        id: "usage",
        header: "使用进度",
        cell: ({ row }) => (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400">
                已用: ¥{(row.original.used_amount ?? 0).toLocaleString()}
              </span>
              <span
                className={`font-bold ${(row.original.usage_rate ?? 0) > 80 ? "text-red-600" : "text-blue-600"}`}
              >
                {(row.original.usage_rate ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(row.original.usage_rate ?? 0)}`}
                style={{
                  width: `${Math.min(row.original.usage_rate ?? 0, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "remaining_amount",
        header: "剩余",
        cell: ({ row }) => (
          <div
            className={`font-bold ${
              (row.original.remaining_amount ?? 0) <
              row.original.total_budget * 0.2
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            ¥{(row.original.remaining_amount ?? 0).toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <IconButton
              size="small"
              onClick={() => setEditingBudget(row.original)}
            >
              <Edit className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.original.id)}
              sx={{ color: "error.main" }}
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [departments],
  );

  // 统计卡片数据

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount ?? 0), 0);
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate ?? 0), 0) /
        budgets.length
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </IconButton>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <TrendingUp className="w-7 h-7 mr-3 text-green-600" />
                  预算管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理各部门预算，追踪预算使用情况
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                新增预算
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 组织筛选 */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6">
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={false}
          />
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    总预算
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    ¥{totalBudget.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    已使用
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    ¥{totalUsed.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    平均使用率
                  </p>
                  <p
                    className={`text-2xl font-bold mt-2 ${
                      avgUsageRate > 80
                        ? "text-red-600"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {avgUsageRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预算列表 */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  加载中...
                </p>
              </div>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedIds.length === budgets.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(budgets.map((b) => b.id));
                                } else {
                                  setSelectedIds([]);
                                }
                              }}
                            />
                          }
                          label={
                            <span className="text-sm text-slate-600">
                              已选择 {selectedIds.length} 项
                            </span>
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleBatchUpdateStatus}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        批量更新状态
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        批量删除
                      </Button>
                    </div>
                  </div>
                )}
                <EnhancedDataTable
                  columns={columns}
                  data={budgets}
                  searchPlaceholder="搜索预算..."
                  searchKey="fiscal_year"
                  loading={loading}
                  enableSelection={true}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  selectionKey="id"
                  enableAdvancedFilter={true}
                  advancedFilters={[
                    {
                      key: "status",
                      label: "状态",
                      type: "select",
                      options: [
                        { value: "", label: "全部" },
                        { value: "active", label: "进行中" },
                        { value: "frozen", label: "已冻结" },
                        { value: "exhausted", label: "已耗尽" },
                      ],
                    },
                    {
                      key: "budget_type",
                      label: "预算类型",
                      type: "select",
                      options: [
                        { value: "", label: "全部" },
                        { value: "office", label: "办公费" },
                        { value: "marketing", label: "市场费" },
                        { value: "development", label: "研发费" },
                        { value: "travel", label: "差旅费" },
                        { value: "training", label: "培训费" },
                        { value: "other", label: "其他" },
                      ],
                    },
                  ]}
                  exportFileName="budget-report"
                  onRefresh={loadData}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建预算弹窗 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新增预算</DialogTitle>
        <DialogContent>
          <div className="space-y-4 py-4">
            <div>
              <FormLabel htmlFor="department">部门</FormLabel>
              <FormControl size="small" fullWidth>
                <Select
                  value={newBudget.department_id}
                  onChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      department_id: e.target.value,
                    })
                  }
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    选择部门
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div>
              <FormLabel htmlFor="type">预算类型</FormLabel>
              <FormControl size="small" fullWidth>
                <Select
                  value={newBudget.budget_type}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, budget_type: e.target.value })
                  }
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    选择类型
                  </MenuItem>
                  <MenuItem value="office">办公费</MenuItem>
                  <MenuItem value="marketing">市场费</MenuItem>
                  <MenuItem value="development">研发费</MenuItem>
                  <MenuItem value="travel">差旅费</MenuItem>
                  <MenuItem value="training">培训费</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div>
              <FormLabel htmlFor="year">财年</FormLabel>
              <TextField
                id="year"
                size="small"
                fullWidth
                type="text"
                value={newBudget.fiscal_year}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, fiscal_year: e.target.value })
                }
                placeholder="例如: 2024"
              />
            </div>

            <div>
              <FormLabel htmlFor="amount">预算金额</FormLabel>
              <TextField
                id="amount"
                size="small"
                fullWidth
                type="number"
                value={newBudget.total_budget}
                onChange={(e) =>
                  setNewBudget({
                    ...newBudget,
                    total_budget: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="输入预算金额"
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleCreate}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑预算弹窗 */}
      <Dialog
        open={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑预算</DialogTitle>
        <DialogContent>
          {editingBudget && (
            <div className="space-y-4 py-4">
              <div>
                <FormLabel htmlFor="edit-department">部门</FormLabel>
                <FormControl size="small" fullWidth>
                  <Select
                    value={editingBudget.department_id || ""}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        department_id: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      选择部门
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div>
                <FormLabel htmlFor="edit-type">预算类型</FormLabel>
                <FormControl size="small" fullWidth>
                  <Select
                    value={editingBudget.budget_type || ""}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        budget_type: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      选择类型
                    </MenuItem>
                    <MenuItem value="office">办公费</MenuItem>
                    <MenuItem value="marketing">市场费</MenuItem>
                    <MenuItem value="development">研发费</MenuItem>
                    <MenuItem value="travel">差旅费</MenuItem>
                    <MenuItem value="training">培训费</MenuItem>
                    <MenuItem value="other">其他</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div>
                <FormLabel htmlFor="edit-year">财年</FormLabel>
                <TextField
                  id="edit-year"
                  size="small"
                  fullWidth
                  type="text"
                  value={editingBudget.fiscal_year}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      fiscal_year: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <FormLabel htmlFor="edit-total">预算总额</FormLabel>
                <TextField
                  id="edit-total"
                  size="small"
                  fullWidth
                  type="number"
                  value={editingBudget.total_budget}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      total_budget: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <FormLabel htmlFor="edit-used">已使用金额</FormLabel>
                <TextField
                  id="edit-used"
                  size="small"
                  fullWidth
                  type="number"
                  value={editingBudget.used_amount}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      used_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <FormLabel htmlFor="edit-status">状态</FormLabel>
                <FormControl size="small" fullWidth>
                  <Select
                    value={editingBudget.status}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="active">执行中</MenuItem>
                    <MenuItem value="frozen">已冻结</MenuItem>
                    <MenuItem value="exhausted">已耗尽</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditingBudget(null)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleUpdate}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showBatchStatusModal}
        onClose={() => setShowBatchStatusModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>批量更新状态</DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <FormLabel htmlFor="batch_status">选择新状态</FormLabel>
              <FormControl size="small" fullWidth>
                <Select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    请选择状态
                  </MenuItem>
                  <MenuItem value="active">进行中</MenuItem>
                  <MenuItem value="frozen">已冻结</MenuItem>
                  <MenuItem value="exhausted">已耗尽</MenuItem>
                </Select>
              </FormControl>
            </div>
            <p className="text-sm text-slate-500">
              将批量更新{" "}
              <span className="font-semibold">{selectedIds.length}</span>{" "}
              条预算的状态
            </p>
          </div>
        </DialogContent>
        <DialogActions sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setShowBatchStatusModal(false);
              setBatchStatus("");
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatus}
          >
            确认更新
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BudgetManagementPage;
