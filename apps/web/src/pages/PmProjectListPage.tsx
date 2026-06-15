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
  Badge,
  TextField,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { Project } from "../api/pm";
import { pmApi } from "../api/pm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import Pagination from "../components/pm/Pagination";

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return { bgcolor: "#dcfce7", color: "#166534" };
      case "completed":
        return { bgcolor: "#dbeafe", color: "#1e40af" };
      case "pending":
        return { bgcolor: "#fef9c3", color: "#a16207" };
      case "approved":
        return { bgcolor: "#f3e8ff", color: "#7c3aed" };
      case "cancelled":
        return { bgcolor: "#f3f4f6", color: "#374151" };
      case "draft":
        return { bgcolor: "#f3f4f6", color: "#4b5563" };
      default:
        return { bgcolor: "#f3f4f6", color: "#374151" };
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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "slate.50" }}>
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
          <Button onClick={() => navigate("/pm/projects/create")}>
            <Plus sx={{ width: 16, height: 16, mr: 1 }} />
            创建项目
          </Button>
        </Box>

        <Card>
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
              <Box sx={{ flex: 1, position: "relative" }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    color: "grey.400",
                  }}
                />
                <Input
                  type="text"
                  placeholder="搜索项目名称或编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ pl: 5 }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger sx={{ width: 144 }}>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger sx={{ width: 144 }}>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
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
                <FolderKanban
                  sx={{ width: 24, height: 24, color: "#2563eb" }}
                />
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

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
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
                <TrendingUp sx={{ width: 24, height: 24, color: "#16a34a" }} />
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

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
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
                <Calendar sx={{ width: 24, height: 24, color: "#ca8a04" }} />
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

          <Card sx={{ "&:hover": { boxShadow: 6 } }}>
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
                <Users sx={{ width: 24, height: 24, color: "#2563eb" }} />
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
          <CardHeader sx={{ px: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <CardTitle sx={{ fontSize: "1.125rem" }}>项目列表</CardTitle>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                共 {totalCount} 个项目
              </Typography>
            </Box>
          </CardHeader>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead sx={{ width: 200 }}>项目名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead sx={{ width: 180 }}>进度</TableHead>
                    <TableHead>预算</TableHead>
                    <TableHead sx={{ width: 150 }}>时间</TableHead>
                    <TableHead sx={{ width: 120 }}>操作</TableHead>
                  </TableRow>
                </TableHeader>
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
                          <Badge sx={getStatusColor(project.status)}>
                            {getStatusLabel(project.status)}
                          </Badge>
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
                              <Progress
                                value={project.progress}
                                sx={{ height: 8 }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.600" }}
                            >
                              {project.progress}%
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                sx={{ width: 32, height: 32 }}
                              >
                                <MoreVertical sx={{ width: 16, height: 16 }} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}`)
                                }
                              >
                                <Eye sx={{ width: 16, height: 16, mr: 1 }} />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}/edit`)
                                }
                              >
                                <Edit sx={{ width: 16, height: 16, mr: 1 }} />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(project.id)}
                                sx={{ color: "#dc2626" }}
                              >
                                <Trash2 sx={{ width: 16, height: 16, mr: 1 }} />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
            {!loading && totalPages > 1 && (
              <Box
                sx={{ p: 2, borderTop: "1px solid", borderColor: "grey.200" }}
              >
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PmProjectListPage;
