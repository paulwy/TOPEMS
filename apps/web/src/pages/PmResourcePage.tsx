import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Package,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Resource {
  id: string;
  name: string;
  type: string;
  project: string;
  assignedTo: string;
  status: "available" | "in_use" | "maintenance" | "retired";
  createdAt: string;
}

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
    assignedTo: "李四",
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

const PmResourcePage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    project: "",
    assignedTo: "",
    status: "available",
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    setTimeout(() => {
      setResources(mockResources);
      setLoading(false);
    }, 500);
  };

  const handleCreate = () => {
    const newResource: Resource = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setResources([...resources, newResource]);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleAssign = () => {
    if (!selectedResource) return;
    const updated = resources.map((r) =>
      r.id === selectedResource.id
        ? { ...r, assignedTo: formData.assignedTo, status: "in_use" as const }
        : r,
    );
    setResources(updated);
    setShowAssignDialog(false);
    setSelectedResource(null);
    resetForm();
  };

  const handleRelease = (resource: Resource) => {
    const updated = resources.map((r) =>
      r.id === resource.id ? { ...r, assignedTo: "", status: "available" as const } : r,
    );
    setResources(updated);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("确定要删除此资源吗？")) return;
    setResources(resources.filter((r) => r.id !== id));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      project: "",
      assignedTo: "",
      status: "available",
    });
  };

  const openDetailDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDetailDialog(true);
  };

  const openAssignDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setShowAssignDialog(true);
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || resource.type === filterType;
    const matchesStatus = !filterStatus || resource.status === filterStatus;
    const matchesProject = !filterProject || resource.project === filterProject;
    return matchesSearch && matchesType && matchesStatus && matchesProject;
  });

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

  const resourceTypes = ["服务器", "数据库", "工作站", "硬件", "软件", "网络设备"];
  const projects = ["电商平台", "移动端 App", "数据中台", "UI/UX", "AI 实验室"];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            资源管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理项目资源的分配与使用情况
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus sx={{ width: 16, height: 16 }} />}
          onClick={() => setShowCreateDialog(true)}
        >
          资源登记
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              size="small"
              placeholder="搜索资源名称或类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ width: 16, height: 16, color: "grey.400" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>资源类型</InputLabel>
              <Select
                value={filterType}
                label="资源类型"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                {resourceTypes.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>使用状态</InputLabel>
              <Select
                value={filterStatus}
                label="使用状态"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="available">可用</MenuItem>
                <MenuItem value="in_use">使用中</MenuItem>
                <MenuItem value="maintenance">维护中</MenuItem>
                <MenuItem value="retired">已退役</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>项目</InputLabel>
              <Select
                value={filterProject}
                label="项目"
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={loadResources}
              startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
            >
              刷新
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6">资源列表</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip label={`总计: ${resources.length}`} size="small" />
                <Chip label={`可用: ${resources.filter(r => r.status === "available").length}`} size="small" color="success" />
                <Chip label={`使用中: ${resources.filter(r => r.status === "in_use").length}`} size="small" color="warning" />
              </Box>
            </Box>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <LinearProgress />
              <Typography sx={{ mt: 2 }} color="text.secondary">加载中...</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>资源名称</TableCell>
                    <TableCell>资源类型</TableCell>
                    <TableCell>所属项目</TableCell>
                    <TableCell>分配给</TableCell>
                    <TableCell>使用状态</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredResources.length > 0 ? (
                    filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Package sx={{ width: 16, height: 16, mr: 2, color: "grey.400" }} />
                            {resource.name}
                          </Box>
                        </TableCell>
                        <TableCell>{resource.type}</TableCell>
                        <TableCell>{resource.project}</TableCell>
                        <TableCell>
                          {resource.assignedTo ? (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Users sx={{ width: 14, height: 14, mr: 1, color: "grey.400" }} />
                              {resource.assignedTo}
                            </Box>
                          ) : (
                            <Typography color="text.disabled">未分配</Typography>
                          )}
                        </TableCell>
                        <TableCell>{getStatusChip(resource.status)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Clock sx={{ width: 14, height: 14, mr: 1, color: "grey.400" }} />
                            {resource.createdAt}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="查看详情">
                            <IconButton size="small" onClick={() => openDetailDialog(resource)}>
                              <Eye sx={{ width: 16, height: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="分配">
                            <IconButton
                              size="small"
                              onClick={() => openAssignDialog(resource)}
                              disabled={resource.status !== "available"}
                            >
                              <Users sx={{ width: 16, height: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {resource.status === "in_use" && (
                            <Tooltip title="释放">
                              <IconButton size="small" onClick={() => handleRelease(resource)}>
                                <CheckCircle2 sx={{ width: 16, height: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(resource.id)}
                            >
                              <Trash2 sx={{ width: 16, height: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <AlertCircle sx={{ width: 48, height: 48, mx: "auto", color: "grey.300", mb: 1 }} />
                        <Typography color="text.secondary">暂无资源数据</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
                {resourceTypes.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>所属项目</InputLabel>
              <Select
                value={formData.project}
                label="所属项目"
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                {projects.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
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
            <Typography variant="body2" color="text.secondary">
              正在分配资源: <strong>{selectedResource?.name}</strong>
            </Typography>
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
          <Button variant="contained" onClick={handleAssign}>确认分配</Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <Package sx={{ width: 20, height: 20, mr: 1, color: "primary.main" }} />
          资源详情
        </DialogTitle>
        <DialogContent>
          {selectedResource && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">资源名称</Typography>
                <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.name}</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">资源类型</Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">所属项目</Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.project}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">分配给</Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedResource.assignedTo || "未分配"}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">使用状态</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedResource.status)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">创建时间</Typography>
                <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>{selectedResource.createdAt}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PmResourcePage;
