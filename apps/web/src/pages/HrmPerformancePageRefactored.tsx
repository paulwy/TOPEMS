/**
 * HrmPerformancePage 重构后
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
  TrendingUp,
  Users,
  Star,
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  performanceApi,
  employeeApi,
  type PerformanceReview,
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
  employees: Employee[],
  getRatingBadge: (rating: number) => JSX.Element,
): ColumnDef<PerformanceReview>[] => [
  {
    id: "employee_id",
    header: "员工",
    accessor: "employee_id",
    minWidth: 150,
    render: (row: PerformanceReview) => {
      const emp = employees.find((e) => e.id === row.employee_id);
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Users sx={{ width: 16, height: 16, color: "text.secondary" }} />
          <Typography variant="body2">{emp?.name || "-"}</Typography>
        </Box>
      );
    },
  },
  {
    id: "review_period",
    header: "考核周期",
    accessor: "review_period",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "overall_score",
    header: "综合评分",
    accessor: "overall_score",
    minWidth: 120,
    render: (row: PerformanceReview) => getRatingBadge(row.overall_score || 0),
  },
  {
    id: "goals",
    header: "目标完成",
    accessor: "goals",
    minWidth: 100,
    render: (value: number) => (
      <Typography variant="body2">{value ? `${value}%` : "-"}</Typography>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: PerformanceReview) => {
      const config: Record<string, { color: "success" | "warning" | "default"; label: string }> = {
        completed: { color: "success", label: "已完成" },
        pending: { color: "warning", label: "待评估" },
        draft: { color: "default", label: "草稿" },
      };
      const c = config[row.status] || { color: "default", label: row.status || "-" };
      return <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />;
    },
  },
  {
    id: "created_at",
    header: "评估时间",
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
  onView: (record: PerformanceReview) => void,
  onEdit: (record: PerformanceReview) => void,
  onDelete: (record: PerformanceReview) => void,
): RowAction<PerformanceReview>[] => [
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
    placeholder: "搜索员工姓名...",
    width: 200,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "已完成", value: "completed" },
      { label: "待评估", value: "pending" },
      { label: "草稿", value: "draft" },
    ],
  },
];

// ============ 组件 ============
const HrmPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前标签页
  const [activeTab, setActiveTab] = useState("reviews");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<PerformanceReview>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<PerformanceReview>>({});

  // 评分徽章
  const getRatingBadge = useCallback((rating: number) => {
    const getColor = (r: number) => {
      if (r >= 90) return "success";
      if (r >= 70) return "info";
      if (r >= 60) return "warning";
      return "error";
    };
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Star sx={{ width: 16, height: 16, color: rating >= 70 ? "warning.main" : "grey.400" }} />
        <Chip size="small" color={getColor(rating)} label={`${rating}分`} sx={{ fontWeight: 500 }} />
      </Box>
    );
  }, []);

  // 获取绩效评估列表
  const fetchReviews = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await performanceApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<PerformanceReview>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取绩效数据失败",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification],
  );

  // 获取员工列表
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await employeeApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        setEmployees(responseData.items || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, [fetchReviews, fetchEmployees]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchReviews(params);
  }, [searchText, statusFilter, fetchReviews]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchReviews();
  }, [fetchReviews]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedReview(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: PerformanceReview) => {
    setSelectedReview(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: PerformanceReview) => {
    setSelectedReview(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: PerformanceReview) => {
      if (!confirm(`确定要删除此绩效评估吗？`)) return;
      try {
        await performanceApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchReviews();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchReviews],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await performanceApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchReviews();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchReviews],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedReview) return;
      try {
        await performanceApi.update(selectedReview.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedReview(null);
        fetchReviews();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedReview, formData, fetchReviews],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const stats = useMemo(() => {
    const items = data.items || [];
    const avgScore = items.length > 0
      ? items.reduce((sum, r) => sum + (r.overall_score || 0), 0) / items.length
      : 0;
    return {
      total: items.length,
      completed: items.filter((r) => r.status === "completed").length,
      pending: items.filter((r) => r.status === "pending").length,
      avgScore: Math.round(avgScore),
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "评估总数",
        value: stats.total,
        icon: <TrendingUp style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "completed",
        title: "已完成",
        value: stats.completed,
        icon: <Star style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "pending",
        title: "待评估",
        value: stats.pending,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "avg",
        title: "平均评分",
        value: `${stats.avgScore}分`,
        icon: <Star style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
    ],
    [stats],
  );

  const columns = useMemo(() => getColumns(employees, getRatingBadge), [employees, getRatingBadge]);
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
        title="绩效管理"
        subtitle={`共 ${data.total} 条评估记录`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增评估
          </Button>
        }
      />

      {/* 标签页 */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab value="reviews" label="绩效评估" />
          <Tab value="goals" label="目标管理" />
          <Tab value="ranking" label="绩效排名" />
        </Tabs>
      </Paper>

      {activeTab === "reviews" && (
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
                onPageChange: (page) => fetchReviews({ page: page + 1 }),
                onPageSizeChange: (pageSize) => fetchReviews({ page_size: pageSize }),
              }}
              rowActions={rowActions}
              onRowClick={handleView}
              emptyMessage="暂无绩效评估数据"
            />
          </Paper>
        </>
      )}

      {activeTab === "goals" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="🎯" title="目标管理" description="目标管理功能开发中" compact />
        </Paper>
      )}

      {activeTab === "ranking" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="🏆" title="绩效排名" description="绩效排名功能开发中" compact />
        </Paper>
      )}

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>绩效评估详情</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">员工</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employees.find((e) => e.id === selectedReview.employee_id)?.name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">考核周期</Typography>
                <Typography variant="body2">{selectedReview.review_period || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">综合评分</Typography>
                <Box sx={{ mt: 0.5 }}>{getRatingBadge(selectedReview.overall_score || 0)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">目标完成</Typography>
                <Typography variant="body2">{selectedReview.goals ? `${selectedReview.goals}%` : "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(() => {
                    const config: Record<string, { color: "success" | "warning" | "default"; label: string }> = {
                      completed: { color: "success", label: "已完成" },
                      pending: { color: "warning", label: "待评估" },
                      draft: { color: "default", label: "草稿" },
                    };
                    const c = config[selectedReview.status] || { color: "default", label: selectedReview.status || "-" };
                    return <Chip size="small" color={c.color} label={c.label} />;
                  })()}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">评估时间</Typography>
                <Typography variant="body2">
                  {selectedReview.created_at ? new Date(selectedReview.created_at).toLocaleString() : "-"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedReview!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{showCreateModal ? "新增绩效评估" : "编辑绩效评估"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>员工 *</InputLabel>
              <Select
                value={(formData as PerformanceReview)?.employee_id || ""}
                label="员工 *"
                onChange={(e) => handleInputChange("employee_id", e.target.value)}
                required
              >
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="考核周期"
              size="small"
              value={(formData as PerformanceReview)?.review_period || ""}
              onChange={(e) => handleInputChange("review_period", e.target.value)}
              placeholder="如：2024年Q1"
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="综合评分"
                type="number"
                size="small"
                value={(formData as PerformanceReview)?.overall_score || ""}
                onChange={(e) => handleInputChange("overall_score", Number(e.target.value))}
                inputProps={{ min: 0, max: 100 }}
              />
              <TextField
                label="目标完成率"
                type="number"
                size="small"
                value={(formData as PerformanceReview)?.goals || ""}
                onChange={(e) => handleInputChange("goals", Number(e.target.value))}
                inputProps={{ min: 0, max: 100 }}
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as PerformanceReview)?.status || "pending"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="draft">草稿</MenuItem>
                <MenuItem value="pending">待评估</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
              </Select>
            </FormControl>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="outlined">取消</Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>{showCreateModal ? "创建" : "保存"}</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmPerformancePage;