import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FolderKanban,
  TrendingUp,
  Calendar,
  Users,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import type { Project } from "@/api/pm";
import { pmApi } from "@/api/pm";
import { DataExport } from "@/components/common";

const PROJECT_TYPES = [
  { value: "__ALL__", label: "全部类型" },
  { value: "research", label: "科研项目" },
  { value: "production", label: "生产项目" },
  { value: "construction", label: "施工项目" },
  { value: "design", label: "设计项目" },
  { value: "service", label: "服务项目" },
];

const STATUS_OPTIONS = [
  { value: "__ALL__", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已批准" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("__ALL__");
  const [selectedStatus, setSelectedStatus] = useState("__ALL__");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
    loadProjects(1);
  }, [selectedType, selectedStatus]);

  const loadProjects = async (page: number) => {
    setLoading(true);
    try {
      const response = await pmApi.projects.list({
        project_type: selectedType === "__ALL__" ? undefined : selectedType,
        status: selectedStatus === "__ALL__" ? undefined : selectedStatus,
        page,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
        setTotalPages(response.data.total_pages || 1);
        setTotalCount(response.data.total_count || 0);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProjects(page);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个项目吗？")) return;
    try {
      const response = await pmApi.projects.delete(id);
      if (response.success) {
        loadProjects(currentPage);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (
    status: string,
  ): "success" | "primary" | "warning" | "default" | "error" => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "completed":
        return "primary";
      case "pending":
        return "warning";
      case "approved":
        return "primary";
      case "cancelled":
        return "default";
      case "draft":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "进行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待审批";
      case "approved":
        return "已批准";
      case "cancelled":
        return "已取消";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = PROJECT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeCount = projects.filter((p) => p.status === "active").length;
  const pendingCount = projects.filter((p) => p.status === "pending").length;
  const completedCount = projects.filter(
    (p) => p.status === "completed",
  ).length;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ flex: 1, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "grey.900" }}
            >
              项目管理
            </Typography>
            <Typography sx={{ color: "grey.500", mt: 0.5 }}>
              管理所有类型的项目，跟踪进度和状态
            </Typography>
          </Box>
          <DataExport
            data={projects as unknown as Record<string, unknown>[]}
            fields={[
              { key: "name", title: "项目名称" },
              { key: "code", title: "项目编码" },
              { key: "project_type", title: "项目类型" },
              { key: "status", title: "状态" },
              { key: "progress", title: "进度" },
              { key: "budget", title: "预算" },
              { key: "start_date", title: "开始日期" },
              { key: "end_date", title: "结束日期" },
            ]}
            defaultFileName="项目数据"
            buttonText="导出"
          />
          <Button
            variant="contained"
            onClick={() => navigate("/pm/projects/create")}
            startIcon={<Plus size={16} />}
          >
            创建项目
          </Button>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <TextField
                type="text"
                placeholder="搜索项目名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        size={20}
                        style={{ color: "#9ca3af", marginRight: 8 }}
                      />
                    ),
                  },
                }}
              />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 144 }}>
                  <InputLabel>类型</InputLabel>
                  <Select
                    value={selectedType}
                    label="类型"
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {PROJECT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 144 }}>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedStatus}
                    label="状态"
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            my: 3,
          }}
        >
          <Card>
            <CardContent
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "#dbeafe",
                }}
              >
                <FolderKanban size={24} style={{ color: "#2563eb" }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  总项目数
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "grey.900" }}
                >
                  {projects.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "#dcfce7",
                }}
              >
                <TrendingUp size={24} style={{ color: "#16a34a" }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  进行中
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#16a34a" }}
                >
                  {activeCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "#fef9c3",
                }}
              >
                <Calendar size={24} style={{ color: "#ca8a04" }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  待审批
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#ca8a04" }}
                >
                  {pendingCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "#dbeafe",
                }}
              >
                <Users size={24} style={{ color: "#2563eb" }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  已完成
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#2563eb" }}
                >
                  {completedCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{ px: 3 }}
            title={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
                  项目列表
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  共 {totalCount} 个项目
                </Typography>
              </Box>
            }
          />
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 200 }}>项目名称</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell sx={{ width: 180 }}>进度</TableCell>
                    <TableCell>预算</TableCell>
                    <TableCell sx={{ width: 150 }}>时间</TableCell>
                    <TableCell sx={{ width: 120 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 6 }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            border: "2px solid",
                            borderColor: "#2563eb",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            mx: "auto",
                            animation: "spin 1s linear infinite",
                            "@keyframes spin": {
                              "0%": { transform: "rotate(0deg)" },
                              "100%": { transform: "rotate(360deg)" },
                            },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 6, color: "grey.500" }}
                      >
                        暂无项目数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        sx={{ "&:hover": { bgcolor: "grey.50" } }}
                      >
                        <TableCell>
                          <Box>
                            <Typography
                              sx={{ fontWeight: 500, color: "grey.900" }}
                            >
                              {project.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.500" }}
                            >
                              {project.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: "grey.600" }}
                          >
                            {getTypeLabel(project.project_type)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={getStatusLabel(project.status)}
                            color={getStatusColor(project.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Box sx={{ width: 96 }}>
                              <LinearProgress
                                variant="determinate"
                                value={project.progress || 0}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.600" }}
                            >
                              {project.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{ fontSize: "0.875rem", color: "grey.600" }}
                        >
                          {formatCurrency(project.budget)}
                        </TableCell>
                        <TableCell
                          sx={{ fontSize: "0.875rem", color: "grey.600" }}
                        >
                          <Box>
                            <Typography variant="body2">
                              {formatDate(project.start_date)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.400", fontSize: "0.75rem" }}
                            >
                              至 {formatDate(project.end_date)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="查看详情">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}`)
                                }
                              >
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}/edit`)
                                }
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(project.id)}
                                sx={{ color: "error.main" }}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
            {!loading && totalPages > 1 && (
              <Box
                sx={{
                  p: 2,
                  borderTop: "1px solid",
                  borderColor: "grey.200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  上一页
                </Button>
                <Typography variant="body2" sx={{ color: "grey.600" }}>
                  第 {currentPage} / {totalPages} 页
                </Typography>
                <Button
                  variant="outlined"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  下一页
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PmProjectListPage;
