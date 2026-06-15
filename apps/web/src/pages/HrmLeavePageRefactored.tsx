/**
 * HrmLeavePage 重构后
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  leaveApi,
  employeeApi,
  type LeaveRequest,
  type Employee,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 列定义 ============
const getColumns = (
  employees: Employee[],
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<LeaveRequest>[] => [
  {
    id: "employee_id",
    header: "员工",
    accessor: "employee_id",
    minWidth: 150,
    render: (row: LeaveRequest) => {
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
    id: "leave_type",
    header: "休假类型",
    accessor: "leave_type",
    minWidth: 120,
    render: (value: string) => (
      <Chip size="small" variant="outlined" label={value || "-"} />
    ),
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
  {
    id: "end_date",
    header: "结束日期",
    accessor: "end_date",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "days",
    header: "天数",
    accessor: "days",
    minWidth: 80,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Clock sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || 0}天</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: LeaveRequest) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: LeaveRequest) => void,
  onEdit: (record: LeaveRequest) => void,
  onDelete: (record: LeaveRequest) => void,
): RowAction<LeaveRequest>[] => [
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
    id: "leave_type",
    label: "休假类型",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "年假", value: "年假" },
      { label: "病假", value: "病假" },
      { label: "事假", value: "事假" },
      { label: "婚假", value: "婚假" },
      { label: "产假", value: "产假" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "待审批", value: "pending" },
      { label: "已批准", value: "approved" },
      { label: "已拒绝", value: "rejected" },
    ],
  },
];

// ============ 组件 ============
const HrmLeavePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<LeaveRequest>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "error" | "default"; icon: JSX.Element; label: string }> = {
      approved: { color: "success", icon: <CheckCircle style={{ width: 14, height: 14 }} />, label: "已批准" },
      pending: { color: "warning", icon: <Clock style={{ width: 14, height: 14 }} />, label: "待审批" },
      rejected: { color: "error", icon: <XCircle style={{ width: 14, height: 14 }} />, label: "已拒绝" },
    };
    const c = config[status] || { color: "default", icon: null, label: status };
    return (
      <Chip size="small" color={c.color} icon={c.icon} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取请假申请列表
  const fetchRequests = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await leaveApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<LeaveRequest>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取请假数据失败",
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
    fetchRequests();
    fetchEmployees();
  }, [fetchRequests, fetchEmployees]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (leaveTypeFilter !== "all") params.leave_type = leaveTypeFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchRequests(params);
  }, [searchText, leaveTypeFilter, statusFilter, fetchRequests]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setLeaveTypeFilter("all");
    setStatusFilter("all");
    fetchRequests();
  }, [fetchRequests]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedRequest(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: LeaveRequest) => {
    setSelectedRequest(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: LeaveRequest) => {
    setSelectedRequest(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: LeaveRequest) => {
      if (!confirm(`确定要删除此请假申请吗？`)) return;
      try {
        await leaveApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchRequests();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchRequests],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await leaveApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchRequests();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchRequests],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRequest) return;
      try {
        await leaveApi.update(selectedRequest.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedRequest(null);
        fetchRequests();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedRequest, formData, fetchRequests],
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
      pending: items.filter((r) => r.status === "pending").length,
      approved: items.filter((r) => r.status === "approved").length,
      rejected: items.filter((r) => r.status === "rejected").length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "申请总数",
        value: stats.total,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "pending",
        title: "待审批",
        value: stats.pending,
        icon: <Clock style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "approved",
        title: "已批准",
        value: stats.approved,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "rejected",
        title: "已拒绝",
        value: stats.rejected,
        icon: <XCircle style={{ width: 24, height: 24 }} />,
        color: "error" as const,
      },
    ],
    [stats],
  );

  const columns = useMemo(() => getColumns(employees, getStatusBadge), [employees, getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.leave_type !== undefined) setLeaveTypeFilter(filters.leave_type);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="请假管理"
        subtitle={`共 ${data.total} 条申请`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增申请
          </Button>
        }
      />

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
            onPageChange: (page) => fetchRequests({ page: page + 1 }),
            onPageSizeChange: (pageSize) => fetchRequests({ page_size: pageSize }),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage="暂无请假申请"
        />
      </Paper>

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>请假详情</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">员工</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employees.find((e) => e.id === selectedRequest.employee_id)?.name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">休假类型</Typography>
                <Typography variant="body2">{selectedRequest.leave_type || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">开始日期</Typography>
                <Typography variant="body2">{selectedRequest.start_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">结束日期</Typography>
                <Typography variant="body2">{selectedRequest.end_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">天数</Typography>
                <Typography variant="body2">{selectedRequest.days || 0}天</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedRequest.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedRequest!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{showCreateModal ? "新增请假申请" : "编辑请假申请"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>员工 *</InputLabel>
              <Select
                value={(formData as LeaveRequest)?.employee_id || ""}
                label="员工 *"
                onChange={(e) => handleInputChange("employee_id", e.target.value)}
                required
              >
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>休假类型</InputLabel>
              <Select
                value={(formData as LeaveRequest)?.leave_type || "年假"}
                label="休假类型"
                onChange={(e) => handleInputChange("leave_type", e.target.value)}
              >
                <MenuItem value="年假">年假</MenuItem>
                <MenuItem value="病假">病假</MenuItem>
                <MenuItem value="事假">事假</MenuItem>
                <MenuItem value="婚假">婚假</MenuItem>
                <MenuItem value="产假">产假</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="开始日期"
                type="date"
                size="small"
                value={(formData as LeaveRequest)?.start_date || ""}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
              <TextField
                label="结束日期"
                type="date"
                size="small"
                value={(formData as LeaveRequest)?.end_date || ""}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </Box>

            <TextField
              label="天数"
              type="number"
              size="small"
              value={(formData as LeaveRequest)?.days || ""}
              onChange={(e) => handleInputChange("days", Number(e.target.value))}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as LeaveRequest)?.status || "pending"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="pending">待审批</MenuItem>
                <MenuItem value="approved">已批准</MenuItem>
                <MenuItem value="rejected">已拒绝</MenuItem>
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

export default HrmLeavePage;