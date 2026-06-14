import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
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
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Science as ScienceIcon,
} from "@mui/icons-material";

interface Experiment {
  id: string;
  name: string;
  code: string;
  project_name: string;
  phase: string;
  status: string;
  experimenter: string;
  started_at: string;
  completed_at: string | null;
  batch_number: string | null;
}

const RsExperimentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] =
    useState<Experiment | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockExperiments: Experiment[] = [
      {
        id: "1",
        name: "催化剂活性测试-第1轮",
        code: "EXP-2024-001",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "李四",
        started_at: "2024-04-16",
        completed_at: "2024-04-25",
        batch_number: "B-2024-001",
      },
      {
        id: "2",
        name: "催化剂活性测试-第2轮",
        code: "EXP-2024-002",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "李四",
        started_at: "2024-05-01",
        completed_at: "2024-05-10",
        batch_number: "B-2024-002",
      },
      {
        id: "3",
        name: "催化剂活性测试-第3轮",
        code: "EXP-2024-003",
        project_name: "新型催化剂研发项目",
        phase: "中试",
        status: "进行中",
        experimenter: "王五",
        started_at: "2024-07-15",
        completed_at: null,
        batch_number: "B-2024-003",
      },
      {
        id: "4",
        name: "热稳定性评估",
        code: "EXP-2024-004",
        project_name: "新型催化剂研发项目",
        phase: "小试",
        status: "已完成",
        experimenter: "赵六",
        started_at: "2024-05-15",
        completed_at: "2024-05-20",
        batch_number: null,
      },
      {
        id: "5",
        name: "配方优化实验",
        code: "EXP-2024-005",
        project_name: "新型催化剂研发项目",
        phase: "中试",
        status: "进行中",
        experimenter: "李四",
        started_at: "2024-08-01",
        completed_at: null,
        batch_number: "B-2024-005",
      },
      {
        id: "6",
        name: "聚合物拉伸强度测试",
        code: "EXP-2024-006",
        project_name: "聚合物改性研究",
        phase: "小试",
        status: "已完成",
        experimenter: "张三",
        started_at: "2024-03-01",
        completed_at: "2024-03-15",
        batch_number: null,
      },
      {
        id: "7",
        name: "环保材料降解测试",
        code: "EXP-2024-007",
        project_name: "环保材料开发",
        phase: "放大",
        status: "已完成",
        experimenter: "王五",
        started_at: "2024-06-01",
        completed_at: "2024-06-30",
        batch_number: "B-2024-007",
      },
    ];
    setExperiments(mockExperiments);
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
      case "失败":
        return "error";
      default:
        return "default";
    }
  };

  const getPhaseColor = (
    phase: string,
  ): "info" | "warning" | "error" | "default" => {
    switch (phase) {
      case "小试":
        return "info";
      case "中试":
        return "warning";
      case "放大":
        return "error";
      default:
        return "default";
    }
  };

  const filteredExperiments = experiments.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || exp.status === statusFilter;
    const matchesPhase = !phaseFilter || exp.phase === phaseFilter;

    // 标签页筛选
    if (activeTab === 1 && exp.phase !== "小试") return false;
    if (activeTab === 2 && exp.phase !== "中试") return false;
    if (activeTab === 3 && exp.phase !== "放大") return false;

    return matchesSearch && matchesStatus && matchesPhase;
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

  const handleDeleteClick = (experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedExperiment) {
      setExperiments(experiments.filter((e) => e.id !== selectedExperiment.id));
    }
    setDeleteDialogOpen(false);
    setSelectedExperiment(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面标题和操作栏 */}
      <div style={{ marginBottom: 12 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
              试验管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理研发试验、记录数据、追踪批次
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            to="/rs/experiments/create"
          >
            新建试验
          </Button>
        </Stack>
      </div>

      {/* 标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="全部试验" />
          <Tab label="小试阶段" icon={<ScienceIcon />} iconPosition="start" />
          <Tab label="中试阶段" icon={<ScienceIcon />} iconPosition="start" />
          <Tab label="放大试验" icon={<ScienceIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* 搜索和筛选 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            placeholder="搜索试验名称或编码..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
             } }}
            sx={{ width: 300 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
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
          </Menu>
        </Stack>
      </Paper>

      {/* 试验列表表格 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>试验编码</TableCell>
              <TableCell>试验名称</TableCell>
              <TableCell>所属项目</TableCell>
              <TableCell>阶段</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>实验员</TableCell>
              <TableCell>开始日期</TableCell>
              <TableCell>批次号</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExperiments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {exp.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{exp.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{exp.project_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exp.phase}
                      size="small"
                      color={getPhaseColor(exp.phase)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exp.status}
                      size="small"
                      color={getStatusColor(exp.status)}
                    />
                  </TableCell>
                  <TableCell>{exp.experimenter}</TableCell>
                  <TableCell>{exp.started_at}</TableCell>
                  <TableCell>{exp.batch_number || "-"}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
                      <Tooltip title="查看详情">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/rs/experiments/${exp.id}`)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/rs/experiments/${exp.id}/edit`)
                          }
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(exp)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {filteredExperiments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 4 }}
                  >
                    暂无试验数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredExperiments.length}
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
            确定要删除试验 "{selectedExperiment?.name}" 吗？此操作不可恢复。
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

export default RsExperimentListPage;
