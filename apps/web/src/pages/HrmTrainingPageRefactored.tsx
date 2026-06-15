/**
 * HrmTrainingPage 重构后
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
  Card,
  CardContent,
} from "@mui/material";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  trainingApi,
  type TrainingCourse,
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
): ColumnDef<TrainingCourse>[] => [
  {
    id: "title",
    header: "课程名称",
    accessor: "title",
    minWidth: 200,
    render: (row: TrainingCourse) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <BookOpen sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.title || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "instructor",
    header: "讲师",
    accessor: "instructor",
    minWidth: 120,
    render: (value: string) => (
      <Typography variant="body2">{value || "-"}</Typography>
    ),
  },
  {
    id: "duration",
    header: "课程时长",
    accessor: "duration",
    minWidth: 100,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Clock sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value ? `${value}小时` : "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "enrolled_count",
    header: "报名人数",
    accessor: "enrolled_count",
    minWidth: 100,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Users sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || 0}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: TrainingCourse) => getStatusBadge(row.status),
  },
  {
    id: "start_date",
    header: "开始日期",
    accessor: "start_date",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: TrainingCourse) => void,
  onEdit: (record: TrainingCourse) => void,
  onDelete: (record: TrainingCourse) => void,
): RowAction<TrainingCourse>[] => [
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
    placeholder: "搜索课程名称...",
    width: 200,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "进行中", value: "ongoing" },
      { label: "已结束", value: "completed" },
      { label: "未开始", value: "pending" },
    ],
  },
];

// ============ 组件 ============
const HrmTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前标签页
  const [activeTab, setActiveTab] = useState("courses");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<TrainingCourse>>({
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
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<TrainingCourse>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "info" | "default"; label: string }> = {
      ongoing: { color: "success", label: "进行中" },
      completed: { color: "info", label: "已结束" },
      pending: { color: "warning", label: "未开始" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取培训课程列表
  const fetchCourses = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await trainingApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<TrainingCourse>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取培训数据失败",
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
    fetchCourses();
  }, [fetchCourses]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchCourses(params);
  }, [searchText, statusFilter, fetchCourses]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchCourses();
  }, [fetchCourses]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedCourse(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: TrainingCourse) => {
    setSelectedCourse(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: TrainingCourse) => {
    setSelectedCourse(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: TrainingCourse) => {
      if (!confirm(`确定要删除课程"${record.title}"吗？`)) return;
      try {
        await trainingApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchCourses();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchCourses],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await trainingApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchCourses();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchCourses],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourse) return;
      try {
        await trainingApi.update(selectedCourse.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedCourse(null);
        fetchCourses();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedCourse, formData, fetchCourses],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const stats = useMemo(() => {
    const items = data.items || [];
    return {
      total: items.length,
      ongoing: items.filter((c) => c.status === "ongoing").length,
      enrolled: items.reduce((sum, c) => sum + (c.enrolled_count || 0), 0),
      completed: items.filter((c) => c.status === "completed").length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "课程总数",
        value: stats.total,
        icon: <BookOpen style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "ongoing",
        title: "进行中",
        value: stats.ongoing,
        icon: <BookOpen style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "enrolled",
        title: "报名人数",
        value: stats.enrolled,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "completed",
        title: "已结束",
        value: stats.completed,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
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
        title="培训管理"
        subtitle={`共 ${data.total} 门课程`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增课程
          </Button>
        }
      />

      {/* 标签页 */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab value="courses" label="培训课程" />
          <Tab value="plans" label="培训计划" />
          <Tab value="records" label="培训记录" />
        </Tabs>
      </Paper>

      {activeTab === "courses" && (
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
                onPageChange: (page) => fetchCourses({ page: page + 1 }),
                onPageSizeChange: (pageSize) => fetchCourses({ page_size: pageSize }),
              }}
              rowActions={rowActions}
              onRowClick={handleView}
              emptyMessage="暂无培训课程"
            />
          </Paper>
        </>
      )}

      {activeTab === "plans" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📋" title="培训计划" description="培训计划功能开发中" compact />
        </Paper>
      )}

      {activeTab === "records" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📝" title="培训记录" description="培训记录功能开发中" compact />
        </Paper>
      )}

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>课程详情</DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">课程名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedCourse.title || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">讲师</Typography>
                <Typography variant="body2">{selectedCourse.instructor || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">课程时长</Typography>
                <Typography variant="body2">{selectedCourse.duration ? `${selectedCourse.duration}小时` : "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">报名人数</Typography>
                <Typography variant="body2">{selectedCourse.enrolled_count || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedCourse.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">开始日期</Typography>
                <Typography variant="body2">{selectedCourse.start_date || "-"}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedCourse!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{showCreateModal ? "新增课程" : "编辑课程"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <TextField
              label="课程名称"
              size="small"
              value={(formData as TrainingCourse)?.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="讲师"
                size="small"
                value={(formData as TrainingCourse)?.instructor || ""}
                onChange={(e) => handleInputChange("instructor", e.target.value)}
              />
              <TextField
                label="课程时长(小时)"
                type="number"
                size="small"
                value={(formData as TrainingCourse)?.duration || ""}
                onChange={(e) => handleInputChange("duration", Number(e.target.value))}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="报名人数"
                type="number"
                size="small"
                value={(formData as TrainingCourse)?.enrolled_count || ""}
                onChange={(e) => handleInputChange("enrolled_count", Number(e.target.value))}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={(formData as TrainingCourse)?.status || "pending"}
                  label="状态"
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  <MenuItem value="pending">未开始</MenuItem>
                  <MenuItem value="ongoing">进行中</MenuItem>
                  <MenuItem value="completed">已结束</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="开始日期"
              type="date"
              size="small"
              value={(formData as TrainingCourse)?.start_date || ""}
              onChange={(e) => handleInputChange("start_date", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

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

export default HrmTrainingPage;