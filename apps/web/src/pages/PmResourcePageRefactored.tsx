/**
 * PmResourcePage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. 使用 mock 数据
 * 6. 主题色：蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Package,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
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
  Stack,
} from "@mui/material";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型定义 ============
interface Resource {
  id: string;
  name: string;
  type: string;
  project: string;
  assignedTo: string;
  status: "available" | "in_use" | "maintenance" | "retired";
  createdAt: string;
}

// ============ Mock 数据 ============
const mockResources: Resource[] = [
  {
    id: "1",
    name: "开发服务器 A",
    type: "服务器",
    project: "电商平台",
    assignedTo: "张三",
    status: "in_use",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "测试服务器 B",
    type: "服务器",
    project: "移动端 App",
    assignedTo: "",
    status: "available",
    createdAt: "2024-02-20",
  },
  {
    id: "3",
    name: "数据库集群",
    type: "数据库",
    project: "数据中台",
    assignedTo: "王五",
    status: "in_use",
    createdAt: "2024-03-10",
  },
  {
    id: "4",
    name: "设计工作站",
    type: "工作站",
    project: "UI/UX",
    assignedTo: "赵六",
    status: "maintenance",
    createdAt: "2024-04-05",
  },
  {
    id: "5",
    name: "GPU 计算卡",
    type: "硬件",
    project: "AI 实验室",
    assignedTo: "孙七",
    status: "in_use",
    createdAt: "2024-05-12",
  },
];

// ============ 辅助函数 ============
const getStatusChip = (status: string) => {
  const config: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
    available: { color: "success", label: "可用" },
    in_use: { color: "warning", label: "使用中" },
    maintenance: { color: "error", label: "维护中" },
    retired: { color: "default", label: "已退役" },
  };
  const c = config[status] || config.available;
  return <Chip size="small" color={c.color} label={c.label} />;
};

// ============ 列定义 ============
const columns: ColumnDef<Resource>[] = [
  {
    id: "name",
    header: "资源名称",
    accessor: "name",
    render: (_, row) => (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Package sx={{ width: 16, height: 16, mr: 1, color: "blue.400" }} />
        {row.name}
      </Box>
    ),
  },
  {
    id: "type",
    header: "资源类型",
    accessor: "type",
  },
  {
    id: "project",
    header: "所属项目",
    accessor: "project",
  },
  {
    id: "assignedTo",
    header: "分配给",
    accessor: "assignedTo",
    render: (value) =>
      value ? (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Users sx={{ width: 14, height: 14, mr: 1, color: "grey.400" }} />
          {value}
        </Box>
      ) : (
        <Box component="span" sx={{ color: "text.disabled" }}>未分配</Box>
      ),
  },
  {
    id: "status",
    header: "使用状态",
    accessor: "status",
    render: (value) => getStatusChip(value),
  },
  {
    id: "createdAt",
    header: "创建时间",
    accessor: "createdAt",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Clock sx={{ width: 14, height: 14, mr: 1, color: "grey.400" }} />
        {value}
      </Box>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (resource: Resource) => void,
  onAssign: (resource: Resource) => void,
  onRelease: (resource: Resource) => void,
  onDelete: (resource: Resource) => void,
): RowAction<Resource>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "分配",
    icon: <Users style={{ width: 16, height: 16 }} />,
    onClick: onAssign,
  },
  {
    label: "释放",
    icon: <CheckCircle2 style={{ width: 16, height: 16 }} />,
    onClick: onRelease,
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
    placeholder: "搜索资源名称或类型...",
  },
  {
    id: "type",
    label: "资源类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "服务器", label: "服务器" },
      { value: "数据库", label: "数据库" },
      { value: "工作站", label: "工作站" },
      { value: "硬件", label: "硬件" },
    ],
  },
  {
    id: "status",
    label: "使用状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "available", label: "可用" },
      { value: "in_use", label: "使用中" },
      { value: "maintenance", label: "维护中" },
      { value: "retired", label: "已退役" },
    ],
  },
  {
    id: "project",
    label: "项目",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "电商平台", label: "电商平台" },
      { value: "移动端 App", label: "移动端 App" },
      { value: "数据中台", label: "数据中台" },
      { value: "UI/UX", label: "UI/UX" },
      { value: "AI 实验室", label: "AI 实验室" },
    ],
  },
];

// ============ 组件 ============
const PmResourcePageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  // 模态框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    project: "",
    status: "available",
  });

  // 获取资源列表
  const fetchResources = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setResources(mockResources);
      setLoading(false);
    }, 500);
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        !searchText ||
        resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
        resource.type.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = filterType === "all" || resource.type === filterType;
      const matchesStatus = filterStatus === "all" || resource.status === filterStatus;
      const matchesProject = filterProject === "all" || resource.project === filterProject;
      return matchesSearch && matchesType && matchesStatus && matchesProject;
    });
  }, [resources, searchText, filterType, filterStatus, filterProject]);

  // 统计数据
  const stats = useMemo(() => ({
    total: resources.length,
    available: resources.filter((r) => r.status === "available").length,
    inUse: resources.filter((r) => r.status === "in_use").length,
    maintenance: resources.filter((r) => r.status === "maintenance").length,
  }), [resources]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "type") setFilterType(value);
      if (filterId === "status") setFilterStatus(value);
      if (filterId === "project") setFilterProject(value);
    },
    [],
  );

  // 处理查看
  const handleView = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setShowDetailDialog(true);
  }, []);

  // 处理分配
  const handleAssign = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setShowAssignDialog(true);
  }, []);

  // 处理释放
  const handleRelease = useCallback((resource: Resource) => {
    const updated = resources.map((r) =>
      r.id === resource.id ? { ...r, assignedTo: "", status: "available" as const } : r,
    );
    setResources(updated);
  }, [resources]);

  // 处理删除
  const handleDelete = useCallback((resource: Resource) => {
    if (!window.confirm("确定要删除此资源吗？")) return;
    setResources(resources.filter((r) => r.id !== resource.id));
  }, [resources]);

  // 处理创建
  const handleCreate = useCallback(() => {
    const newResource: Resource = {
      id: Date.now().toString(),
      ...formData,
      assignedTo: "",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setResources([...resources, newResource]);
    setShowCreateDialog(false);
    resetForm();
  }, [formData, resources]);

  // 处理分配确认
  const handleAssignConfirm = useCallback(() => {
    if (!selectedResource) return;
    const updated = resources.map((r) =>
      r.id === selectedResource.id
        ? { ...r, assignedTo: formData.assignedTo || selectedResource.assignedTo, status: "in_use" as const }
        : r,
    );
    setResources(updated);
    setShowAssignDialog(false);
    setSelectedResource(null);
    resetForm();
  }, [selectedResource, formData, resources]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      project: "",
      status: "available",
    });
  };

  return (
    <>
      <PageHeader
        title="资源管理"
        subtitle="管理项目资源的分配与使用情况"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
          >
            资源登记
          </Button>
        }
      />

      {/* 统计信息 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 2, boxShadow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Package sx={{ width: 20, height: 20, color: "blue.500" }} />
            <Box>
              <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>资源总数</Box>
              <Box sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>{stats.total}</Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 2, boxShadow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle2 sx={{ width: 20, height: 20, color: "green.500" }} />
            <Box>
              <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>可用</Box>
              <Box sx={{ fontWeight: "bold", fontSize: "1.5rem", color: "green.600" }}>{stats.available}</Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 2, boxShadow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Users sx={{ width: 20, height: 20, color: "orange.500" }} />
            <Box>
              <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>使用中</Box>
              <Box sx={{ fontWeight: "bold", fontSize: "1.5rem", color: "orange.600" }}>{stats.inUse}</Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 2, boxShadow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AlertCircle sx={{ width: 20, height: 20, color: "red.500" }} />
            <Box>
              <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>维护中</Box>
              <Box sx={{ fontWeight: "bold", fontSize: "1.5rem", color: "red.600" }}>{stats.maintenance}</Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        rowActions={getRowActions(handleView, handleAssign, handleRelease, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchResources}
        emptyMessage="暂无资源数据"
      />

      {/* 创建资源对话框 */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>资源登记</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              size="small"
              label="资源名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>资源类型</InputLabel>
              <Select
                value={formData.type}
                label="资源类型"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="服务器">服务器</MenuItem>
                <MenuItem value="数据库">数据库</MenuItem>
                <MenuItem value="工作站">工作站</MenuItem>
                <MenuItem value="硬件">硬件</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>所属项目</InputLabel>
              <Select
                value={formData.project}
                label="所属项目"
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                <MenuItem value="电商平台">电商平台</MenuItem>
                <MenuItem value="移动端 App">移动端 App</MenuItem>
                <MenuItem value="数据中台">数据中台</MenuItem>
                <MenuItem value="UI/UX">UI/UX</MenuItem>
                <MenuItem value="AI 实验室">AI 实验室</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>初始状态</InputLabel>
              <Select
                value={formData.status}
                label="初始状态"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="available">可用</MenuItem>
                <MenuItem value="in_use">使用中</MenuItem>
                <MenuItem value="maintenance">维护中</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowCreateDialog(false); resetForm(); }}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* 分配对话框 */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>分配资源</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>正在分配</Box>
              <Box sx={{ fontWeight: "medium" }}>{selectedResource?.name}</Box>
            </Box>
            <TextField
              size="small"
              label="分配给"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowAssignDialog(false); setSelectedResource(null); }}>取消</Button>
          <Button variant="contained" onClick={handleAssignConfirm}>确认分配</Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <Package sx={{ width: 20, height: 20, mr: 1, color: "blue.500" }} />
          资源详情
        </DialogTitle>
        <DialogContent>
          {selectedResource && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>资源名称</Box>
                <Box sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.name}</Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>资源类型</Box>
                  <Box sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.type}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>所属项目</Box>
                  <Box sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.project}</Box>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>分配给</Box>
                  <Box sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.assignedTo || "未分配"}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>使用状态</Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedResource.status)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>创建时间</Box>
                <Box sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.createdAt}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PmResourcePageRefactored;
