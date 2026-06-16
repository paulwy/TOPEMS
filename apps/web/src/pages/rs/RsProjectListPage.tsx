import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  leader: string;
  progress: number;
  start_date: string;
  end_date: string | null;
  budget: number | null;
}

const RsProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: "1",
        name: "新型催化剂研发项目",
        code: "RS-2024-001",
        project_type: "新产品研发",
        status: "进行中",
        leader: "张三",
        progress: 65,
        start_date: "2024-01-15",
        end_date: "2024-12-31",
        budget: 500000,
      },
      {
        id: "2",
        name: "聚合物改性研究",
        code: "RS-2024-002",
        project_type: "工艺改进",
        status: "进行中",
        leader: "李四",
        progress: 42,
        start_date: "2024-02-01",
        end_date: "2024-08-30",
        budget: 300000,
      },
      {
        id: "3",
        name: "环保材料开发",
        code: "RS-2024-003",
        project_type: "新产品研发",
        status: "已完成",
        leader: "王五",
        progress: 100,
        start_date: "2024-03-01",
        end_date: "2024-06-30",
        budget: 200000,
      },
      {
        id: "4",
        name: "纳米材料合成工艺",
        code: "RS-2024-004",
        project_type: "工艺改进",
        status: "暂停",
        leader: "赵六",
        progress: 30,
        start_date: "2024-04-01",
        end_date: null,
        budget: 400000,
      },
      {
        id: "5",
        name: "高性能涂料配方优化",
        code: "RS-2024-005",
        project_type: "配方优化",
        status: "进行中",
        leader: "孙七",
        progress: 78,
        start_date: "2024-05-01",
        end_date: "2024-10-31",
        budget: 150000,
      },
    ];
    setProjects(mockProjects);
    setLoading(false);
  }, []);

  const getStatusColor = (
    status: string,
  ): "primary" | "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "进行中":
        return "primary";
      case "已完成":
        return "success";
      case "暂停":
        return "warning";
      case "取消":
        return "error";
      default:
        return "default";
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id));
    }
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  };

  const handleExport = () => {
    // 导出功能
    console.log("导出项目列表");
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面标题和操作栏 */}
      <div style={{ marginBottom: 12 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
              研发项目管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理研发项目、跟踪进度、分配资源
            </Typography>
          </div>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus />}
              component={Link}
              to="/rs/projects/create"
            >
              新建项目
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* 搜索和筛选 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            placeholder="搜索项目名称或编码..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 300 }}
          />
          <Button
            variant="outlined"
            startIcon={<Filter />}
            onClick={(e) => setFilterMenuOpen(true)}
          >
            状态筛选
            {statusFilter && `: ${statusFilter}`}
          </Button>
          <Menu
            open={filterMenuOpen}
            onClose={() => setFilterMenuOpen(false)}
            anchorEl={null}
          >
            <MenuItem
              onClick={() => {
                setStatusFilter(null);
                setFilterMenuOpen(false);
              }}
            >
              全部
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter("进行中");
                setFilterMenuOpen(false);
              }}
            >
              进行中
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter("已完成");
                setFilterMenuOpen(false);
              }}
            >
              已完成
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter("暂停");
                setFilterMenuOpen(false);
              }}
            >
              暂停
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter("取消");
                setFilterMenuOpen(false);
              }}
            >
              已取消
            </MenuItem>
          </Menu>
        </Stack>
      </Paper>

      {/* 项目列表表格 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>项目编码</TableCell>
              <TableCell>项目名称</TableCell>
              <TableCell>项目类型</TableCell>
              <TableCell>负责人</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>进度</TableCell>
              <TableCell>开始日期</TableCell>
              <TableCell>预算(万元)</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProjects
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {project.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{project.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={project.project_type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{project.leader}</TableCell>
                  <TableCell>
                    <Chip
                      label={project.status}
                      size="small"
                      color={getStatusColor(project.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <LinearProgress
                        variant="determinate"
                        value={project.progress}
                        sx={{ width: 80 }}
                      />
                      <Typography variant="body2">
                        {project.progress}%
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{project.start_date}</TableCell>
                  <TableCell>
                    {project.budget ? (project.budget / 10000).toFixed(1) : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ justifyContent: "center" }}
                    >
                      <Tooltip title="查看详情">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/rs/projects/${project.id}`)}
                        >
                          <Eye />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/rs/projects/${project.id}/edit`)
                          }
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(project)}
                        >
                          <Trash2 />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {filteredProjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 4 }}
                  >
                    暂无项目数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredProjects.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`
          }
        />
      </TableContainer>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除项目 "{selectedProject?.name}" 吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RsProjectListPage;
