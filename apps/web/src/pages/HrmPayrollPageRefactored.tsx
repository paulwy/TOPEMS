/**
 * HrmPayrollPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import {
  payrollApi,
  employeeApi,
  type PayrollRun,
  type Employee,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  EmptyState,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<PayrollRun>[] => [
  {
    id: "period",
    header: "发放周期",
    accessor: "period",
    minWidth: 150,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "total_amount",
    header: "总金额",
    accessor: "total_amount",
    minWidth: 120,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <DollarSign sx={{ width: 16, height: 16, color: "success.main" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {value ? `¥${value.toLocaleString()}` : "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "employee_count",
    header: "员工数",
    accessor: "employee_count",
    minWidth: 80,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Users sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || 0}</Typography>
      </Box>
    ),
  },
  {
    id: "avg_salary",
    header: "平均薪资",
    accessor: "avg_salary",
    minWidth: 100,
    render: (value: number) => (
      <Typography variant="body2">
        {value ? `¥${value.toLocaleString()}` : "-"}
      </Typography>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: PayrollRun) => getStatusBadge(row.status),
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    minWidth: 150,
    render: (value: string) => (
      <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {value ? new Date(value).toLocaleDateString() : "-"}
      </Typography>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: PayrollRun) => void,
  onEdit: (record: PayrollRun) => void,
  onDelete: (record: PayrollRun) => void,
): RowAction<PayrollRun>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
    color: "primary",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (row) => onDelete(row),
    color: "error",
    divider: true,
  },
];

// ============ 筛选配置 ============
const getFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索周期...",
    width: 200,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "待审批", value: "pending" },
      { label: "已审批", value: "approved" },
      { label: "已发放", value: "paid" },
      { label: "已取消", value: "cancelled" },
    ],
  },
];

// ============ 组件 ============
const HrmPayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前标签页
  const [activeTab, setActiveTab] = useState("runs");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<PayrollRun>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<PayrollRun>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "info" | "default"; label: string }> = {
      pending: { color: "warning", label: "待审批" },
      approved: { color: "info", label: "已审批" },
      paid: { color: "success", label: "已发放" },
      cancelled: { color: "default", label: "已取消" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取薪资记录
  const fetchPayrollRuns = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await payrollApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<PayrollRun>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取薪资数据失败",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification],
  );

  // 初始加载
  React.useEffect(() => {
    fetchPayrollRuns();
  }, [fetchPayrollRuns]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchPayrollRuns(params);
  }, [searchText, statusFilter, fetchPayrollRuns]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchPayrollRuns();
  }, [fetchPayrollRuns]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedRun(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: PayrollRun) => {
    setSelectedRun(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: PayrollRun) => {
    setSelectedRun(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: PayrollRun) => {
      if (!confirm(`确定要删除此薪资发放记录吗？`)) return;
      try {
        await payrollApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchPayrollRuns();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchPayrollRuns],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await payrollApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchPayrollRuns();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchPayrollRuns],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRun) return;
      try {
        await payrollApi.update(selectedRun.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedRun(null);
        fetchPayrollRuns();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedRun, formData, fetchPayrollRuns],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const stats = useMemo(() => {
    const items = data.items || [];
    const totalAmount = items.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const avgSalary = items.length > 0 ? totalAmount / items.reduce((sum, r) => sum + (r.employee_count || 0), 0) : 0;
    return {
      totalRuns: items.length,
      totalAmount,
      avgSalary,
      paidCount: items.filter((r) => r.status === "paid").length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "runs",
        title: "发放批次",
        value: stats.totalRuns,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "amount",
        title: "总金额",
        value: `¥${stats.totalAmount.toLocaleString()}`,
        icon: <DollarSign style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "avg",
        title: "平均薪资",
        value: `¥${Math.round(stats.avgSalary).toLocaleString()}`,
        icon: <TrendingUp style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "paid",
        title: "已发放",
        value: stats.paidCount,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [stats],
  );

  const columns = useMemo(() => getColumns(getStatusBadge), [getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="薪酬管理"
        subtitle={`共 ${data.total} 个发放批次`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增发放
          </Button>
        }
      />

      {/* 标签页 */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab value="runs" label="薪资发放" />
          <Tab value="adjustments" label="调薪记录" />
          <Tab value="calculator" label="个税计算器" />
        </Tabs>
      </Paper>

      {activeTab === "runs" && (
        <>
          {/* 统计概览 */}
          <Paper sx={{ mb: 3, borderRadius: 2, p: 2 }}>
            <StatCardGroup stats={statCards} columns={4} />
          </Paper>

          {/* 筛选栏 */}
          <FilterBar
            filters={filterConfigs}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            onSearch={handleSearch}
          />

          {/* 数据列表 */}
          <Paper sx={{ borderRadius: 2, mt: 3 }}>
            <ListPageTemplate
              columns={columns}
              data={data.items}
              loading={loading}
              pagination={{
                page: data.page - 1,
                pageSize: data.page_size,
                total: data.total,
                onPageChange: (page) => fetchPayrollRuns({ page: page + 1 }),
                onPageSizeChange: (pageSize) => fetchPayrollRuns({ page_size: pageSize }),
              }}
              rowActions={rowActions}
              onRowClick={handleView}
              emptyMessage="暂无薪资发放记录"
            />
          </Paper>
        </>
      )}

      {activeTab === "adjustments" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📝" title="调薪记录" description="调薪记录功能开发中" compact />
        </Paper>
      )}

      {activeTab === "calculator" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="🧮" title="个税计算器" description="个税计算器功能开发中" compact />
        </Paper>
      )}

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>薪资发放详情</DialogTitle>
        <DialogContent>
          {selectedRun && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  发放周期
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedRun.period || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  总金额
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedRun.total_amount ? `¥${selectedRun.total_amount.toLocaleString()}` : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  员工数
                </Typography>
                <Typography variant="body2">{selectedRun.employee_count || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  平均薪资
                </Typography>
                <Typography variant="body2">
                  {selectedRun.avg_salary ? `¥${selectedRun.avg_salary.toLocaleString()}` : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedRun.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  创建时间
                </Typography>
                <Typography variant="body2">
                  {selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleString() : "-"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedRun!);
            }}
            sx={{ bgcolor: "#3b82f6" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{showCreateModal ? "新增薪资发放" : "编辑薪资发放"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <TextField
              label="发放周期"
              size="small"
              value={(formData as PayrollRun)?.period || ""}
              onChange={(e) => handleInputChange("period", e.target.value)}
              placeholder="如：2024年1月"
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="总金额"
                type="number"
                size="small"
                value={(formData as PayrollRun)?.total_amount || ""}
                onChange={(e) => handleInputChange("total_amount", Number(e.target.value))}
              />
              <TextField
                label="员工数"
                type="number"
                size="small"
                value={(formData as PayrollRun)?.employee_count || ""}
                onChange={(e) => handleInputChange("employee_count", Number(e.target.value))}
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as PayrollRun)?.status || "pending"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="pending">待审批</MenuItem>
                <MenuItem value="approved">已审批</MenuItem>
                <MenuItem value="paid">已发放</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="outlined">
                取消
              </Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>
                {showCreateModal ? "创建" : "保存"}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmPayrollPage;