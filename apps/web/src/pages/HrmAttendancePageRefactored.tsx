/**
 * HrmAttendancePage 重构后
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
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  attendanceApi,
  employeeApi,
  type AttendanceRecord,
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
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<AttendanceRecord>[] => [
  {
    id: "employee_id",
    header: "员工姓名",
    accessor: "employee_id",
    minWidth: 150,
    render: (row: AttendanceRecord) => {
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
    id: "date",
    header: "日期",
    accessor: "date",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Calendar sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "check_in",
    header: "上班打卡",
    accessor: "check_in",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Clock sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "check_out",
    header: "下班打卡",
    accessor: "check_out",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Clock sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "hours",
    header: "工时",
    accessor: "hours",
    minWidth: 80,
    render: (value: number) => (
      <Typography variant="body2">{value ? `${value}h` : "-"}</Typography>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: AttendanceRecord) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: AttendanceRecord) => void,
  onEdit: (record: AttendanceRecord) => void,
  onDelete: (record: AttendanceRecord) => void,
): RowAction<AttendanceRecord>[] => [
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
      { label: "正常", value: "normal" },
      { label: "迟到", value: "late" },
      { label: "早退", value: "early" },
      { label: "缺勤", value: "absent" },
    ],
  },
  {
    id: "date_range",
    label: "日期范围",
    type: "date-range",
  },
];

// ============ 组件 ============
const HrmAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前标签页
  const [activeTab, setActiveTab] = useState("records");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<AttendanceRecord>>({
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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "error" | "default"; icon: JSX.Element; label: string }> = {
      normal: { color: "success", icon: <CheckCircle style={{ width: 14, height: 14 }} />, label: "正常" },
      late: { color: "warning", icon: <AlertCircle style={{ width: 14, height: 14 }} />, label: "迟到" },
      early: { color: "warning", icon: <AlertCircle style={{ width: 14, height: 14 }} />, label: "早退" },
      absent: { color: "error", icon: <XCircle style={{ width: 14, height: 14 }} />, label: "缺勤" },
    };
    const c = config[status] || { color: "default", icon: null, label: status };
    return (
      <Chip
        size="small"
        color={c.color}
        icon={c.icon}
        label={c.label}
        sx={{ fontWeight: 500 }}
      />
    );
  }, []);

  // 获取考勤记录
  const fetchRecords = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await attendanceApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<AttendanceRecord>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取考勤数据失败",
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
    fetchRecords();
    fetchEmployees();
  }, [fetchRecords, fetchEmployees]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchRecords(params);
  }, [searchText, statusFilter, fetchRecords]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchRecords();
  }, [fetchRecords]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedRecord(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: AttendanceRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: AttendanceRecord) => {
      if (!confirm(`确定要删除这条考勤记录吗？`)) return;
      try {
        await attendanceApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchRecords();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchRecords],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await attendanceApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchRecords();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchRecords],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRecord) return;
      try {
        await attendanceApi.update(selectedRecord.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedRecord(null);
        fetchRecords();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedRecord, formData, fetchRecords],
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
      normal: items.filter((r) => r.status === "normal").length,
      late: items.filter((r) => r.status === "late").length,
      absent: items.filter((r) => r.status === "absent").length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "考勤总数",
        value: stats.total,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "normal",
        title: "正常",
        value: stats.normal,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "late",
        title: "迟到",
        value: stats.late,
        icon: <AlertCircle style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "absent",
        title: "缺勤",
        value: stats.absent,
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
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="考勤管理"
        subtitle={`共 ${data.total} 条记录`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增记录
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
          <Tab value="records" label="考勤记录" />
          <Tab value="leave" label="请假申请" />
          <Tab value="stats" label="考勤统计" />
        </Tabs>
      </Paper>

      {activeTab === "records" && (
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
                onPageChange: (page) => fetchRecords({ page: page + 1 }),
                onPageSizeChange: (pageSize) => fetchRecords({ page_size: pageSize }),
              }}
              rowActions={rowActions}
              onRowClick={handleView}
              emptyMessage="暂无考勤记录"
            />
          </Paper>
        </>
      )}

      {activeTab === "leave" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📋" title="请假申请" description="请假申请功能开发中" compact />
        </Paper>
      )}

      {activeTab === "stats" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📊" title="考勤统计" description="考勤统计功能开发中" compact />
        </Paper>
      )}

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>考勤详情</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  员工
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {employees.find((e) => e.id === selectedRecord.employee_id)?.name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  日期
                </Typography>
                <Typography variant="body2">{selectedRecord.date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  上班打卡
                </Typography>
                <Typography variant="body2">{selectedRecord.check_in || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  下班打卡
                </Typography>
                <Typography variant="body2">{selectedRecord.check_out || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  工时
                </Typography>
                <Typography variant="body2">{selectedRecord.hours ? `${selectedRecord.hours}h` : "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedRecord.status)}</Box>
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
              handleEdit(selectedRecord!);
            }}
            sx={{ bgcolor: "#3b82f6" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{showCreateModal ? "新增考勤记录" : "编辑考勤记录"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>员工</InputLabel>
              <Select
                value={(formData as AttendanceRecord)?.employee_id || ""}
                label="员工"
                onChange={(e) => handleInputChange("employee_id", e.target.value)}
                required
              >
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="日期"
              type="date"
              size="small"
              value={(formData as AttendanceRecord)?.date || ""}
              onChange={(e) => handleInputChange("date", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="上班打卡"
                type="time"
                size="small"
                value={(formData as AttendanceRecord)?.check_in || ""}
                onChange={(e) => handleInputChange("check_in", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="下班打卡"
                type="time"
                size="small"
                value={(formData as AttendanceRecord)?.check_out || ""}
                onChange={(e) => handleInputChange("check_out", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as AttendanceRecord)?.status || "normal"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="normal">正常</MenuItem>
                <MenuItem value="late">迟到</MenuItem>
                <MenuItem value="early">早退</MenuItem>
                <MenuItem value="absent">缺勤</MenuItem>
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

export default HrmAttendancePage;