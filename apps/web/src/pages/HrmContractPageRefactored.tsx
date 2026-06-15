/**
 * HrmContractPage 重构后
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
  FileText,
  Calendar,
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import {
  contractApi,
  employeeApi,
  type Contract,
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
): ColumnDef<Contract>[] => [
  {
    id: "contract_no",
    header: "合同编号",
    accessor: "contract_no",
    width: 140,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FileText sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {value || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "employee_id",
    header: "员工",
    accessor: "employee_id",
    minWidth: 150,
    render: (row: Contract) => {
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
    id: "contract_type",
    header: "合同类型",
    accessor: "contract_type",
    minWidth: 100,
    render: (value: string) => (
      <Chip size="small" variant="outlined" label={value || "-"} />
    ),
  },
  {
    id: "salary",
    header: "薪资",
    accessor: "salary",
    minWidth: 100,
    render: (value: number) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value ? `¥${value.toLocaleString()}` : "-"}
      </Typography>
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
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: Contract) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: Contract) => void,
  onEdit: (record: Contract) => void,
  onDelete: (record: Contract) => void,
): RowAction<Contract>[] => [
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
    placeholder: "搜索合同编号/员工姓名...",
    width: 220,
  },
  {
    id: "contract_type",
    label: "合同类型",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "劳动合同", value: "劳动合同" },
      { label: "实习协议", value: "实习协议" },
      { label: "劳务合同", value: "劳务合同" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "生效中", value: "active" },
      { label: "待签署", value: "pending" },
      { label: "已到期", value: "expired" },
      { label: "已终止", value: "terminated" },
    ],
  },
];

// ============ 组件 ============
const HrmContractPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Contract>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Contract>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
      active: { color: "success", label: "生效中" },
      pending: { color: "warning", label: "待签署" },
      expired: { color: "error", label: "已到期" },
      terminated: { color: "default", label: "已终止" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取合同列表
  const fetchContracts = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await contractApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<Contract>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取合同数据失败",
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
    fetchContracts();
    fetchEmployees();
  }, [fetchContracts, fetchEmployees]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (contractTypeFilter !== "all") params.contract_type = contractTypeFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchContracts(params);
  }, [searchText, contractTypeFilter, statusFilter, fetchContracts]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setContractTypeFilter("all");
    setStatusFilter("all");
    fetchContracts();
  }, [fetchContracts]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedContract(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Contract) => {
    setSelectedContract(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Contract) => {
    setSelectedContract(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: Contract) => {
      if (!confirm(`确定要删除合同"${record.contract_no}"吗？`)) return;
      try {
        await contractApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchContracts();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchContracts],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await contractApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchContracts();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchContracts],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedContract) return;
      try {
        await contractApi.update(selectedContract.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedContract(null);
        fetchContracts();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedContract, formData, fetchContracts],
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
      active: items.filter((c) => c.status === "active").length,
      pending: items.filter((c) => c.status === "pending").length,
      expiring: items.filter((c) => {
        if (!c.end_date) return false;
        const endDate = new Date(c.end_date);
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return endDate > now && endDate < thirtyDaysLater;
      }).length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "合同总数",
        value: stats.total,
        icon: <FileText style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "生效中",
        value: stats.active,
        icon: <FileText style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "pending",
        title: "待签署",
        value: stats.pending,
        icon: <FileText style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "expiring",
        title: "即将到期",
        value: stats.expiring,
        icon: <Calendar style={{ width: 24, height: 24 }} />,
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
      if (filters.contract_type !== undefined) setContractTypeFilter(filters.contract_type);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="合同管理"
        subtitle={`共 ${data.total} 份合同`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增合同
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
            onPageChange: (page) => fetchContracts({ page: page + 1 }),
            onPageSizeChange: (pageSize) => fetchContracts({ page_size: pageSize }),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage="暂无合同数据"
        />
      </Paper>

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>合同详情</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">合同编号</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedContract.contract_no || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">员工</Typography>
                <Typography variant="body2">{employees.find((e) => e.id === selectedContract.employee_id)?.name || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">合同类型</Typography>
                <Typography variant="body2">{selectedContract.contract_type || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">薪资</Typography>
                <Typography variant="body2">{selectedContract.salary ? `¥${selectedContract.salary.toLocaleString()}` : "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">开始日期</Typography>
                <Typography variant="body2">{selectedContract.start_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">结束日期</Typography>
                <Typography variant="body2">{selectedContract.end_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedContract.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedContract!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{showCreateModal ? "新增合同" : "编辑合同"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>员工 *</InputLabel>
              <Select
                value={(formData as Contract)?.employee_id || ""}
                label="员工 *"
                onChange={(e) => handleInputChange("employee_id", e.target.value)}
                required
              >
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="合同编号"
                size="small"
                value={(formData as Contract)?.contract_no || ""}
                onChange={(e) => handleInputChange("contract_no", e.target.value)}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>合同类型</InputLabel>
                <Select
                  value={(formData as Contract)?.contract_type || "劳动合同"}
                  label="合同类型"
                  onChange={(e) => handleInputChange("contract_type", e.target.value)}
                >
                  <MenuItem value="劳动合同">劳动合同</MenuItem>
                  <MenuItem value="实习协议">实习协议</MenuItem>
                  <MenuItem value="劳务合同">劳务合同</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="薪资"
                type="number"
                size="small"
                value={(formData as Contract)?.salary || ""}
                onChange={(e) => handleInputChange("salary", Number(e.target.value))}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={(formData as Contract)?.status || "pending"}
                  label="状态"
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  <MenuItem value="active">生效中</MenuItem>
                  <MenuItem value="pending">待签署</MenuItem>
                  <MenuItem value="expired">已到期</MenuItem>
                  <MenuItem value="terminated">已终止</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="开始日期"
                type="date"
                size="small"
                value={(formData as Contract)?.start_date || ""}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="结束日期"
                type="date"
                size="small"
                value={(formData as Contract)?.end_date || ""}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

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

export default HrmContractPage;