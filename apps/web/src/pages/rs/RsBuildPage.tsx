import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Search,
  Play,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Filter,
} from "lucide-react";

interface Build {
  id: string;
  build_no: string;
  build_task: string;
  trigger_type: string;
  status: string;
  duration: number;
  build_time: string;
}

const RsBuildPage: React.FC = () => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  useEffect(() => {
    const mockBuilds: Build[] = [
      {
        id: "1",
        build_no: "BUILD-20240615-001",
        build_task: "frontend-main",
        trigger_type: "push",
        status: "success",
        duration: 320,
        build_time: "2024-06-15 14:30:00",
      },
      {
        id: "2",
        build_no: "BUILD-20240615-002",
        build_task: "backend-api",
        trigger_type: "manual",
        status: "running",
        duration: 0,
        build_time: "2024-06-15 14:25:00",
      },
      {
        id: "3",
        build_no: "BUILD-20240614-003",
        build_task: "mobile-app",
        trigger_type: "tag",
        status: "failed",
        duration: 180,
        build_time: "2024-06-14 16:20:00",
      },
      {
        id: "4",
        build_no: "BUILD-20240614-002",
        build_task: "shared-utils",
        trigger_type: "pr",
        status: "success",
        duration: 145,
        build_time: "2024-06-14 10:15:00",
      },
      {
        id: "5",
        build_no: "BUILD-20240614-001",
        build_task: "data-service",
        trigger_type: "schedule",
        status: "success",
        duration: 420,
        build_time: "2024-06-14 02:00:00",
      },
    ];
    setBuilds(mockBuilds);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string): "success" | "error" | "primary" | "default" => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "running":
        return "primary";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle size={14} />;
      case "failed":
        return <XCircle size={14} />;
      case "running":
        return <Loader size={14} className="animate-spin" />;
      default:
        return <Clock size={14} />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "success":
        return "成功";
      case "failed":
        return "失败";
      case "running":
        return "运行中";
      case "pending":
        return "等待中";
      default:
        return status;
    }
  };

  const getTriggerTypeLabel = (type: string): string => {
    switch (type) {
      case "push":
        return "代码推送";
      case "manual":
        return "手动触发";
      case "tag":
        return "标签发布";
      case "pr":
        return "合并请求";
      case "schedule":
        return "定时任务";
      default:
        return type;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const filteredBuilds = builds.filter((build) => {
    const matchesSearch =
      build.build_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      build.build_task.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || build.status === statusFilter;
    const matchesTaskType = !taskTypeFilter || build.build_task.includes(taskTypeFilter);
    return matchesSearch && matchesStatus && matchesTaskType;
  });

  const uniqueTaskTypes = [...new Set(builds.map((b) => b.build_task))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTriggerBuild = () => {
    const newBuild: Build = {
      id: String(Date.now()),
      build_no: `BUILD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(builds.length + 1).padStart(3, "0")}`,
      build_task: "new-task",
      trigger_type: "manual",
      status: "running",
      duration: 0,
      build_time: new Date().toLocaleString(),
    };
    setBuilds([newBuild, ...builds]);
  };

  const handleViewLog = (build: Build) => {
    setSelectedBuild(build);
    setLogDialogOpen(true);
  };

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#3b82f6" }}>
            构建管理
          </Typography>
          <Button variant="contained" startIcon={<Play size={18} />} sx={{ bgcolor: "#3b82f6" }} onClick={handleTriggerBuild}>
            触发构建
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="搜索构建编号、任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>构建状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="构建状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="success">成功</MenuItem>
                <MenuItem value="failed">失败</MenuItem>
                <MenuItem value="running">运行中</MenuItem>
                <MenuItem value="pending">等待中</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>任务类型</InputLabel>
              <Select
                value={taskTypeFilter || ""}
                label="任务类型"
                onChange={(e) => setTaskTypeFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                {uniqueTaskTypes.map((task) => (
                  <MenuItem key={task} value={task}>
                    {task}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>构建编号</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>构建任务</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>触发方式</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>状态</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>耗时</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>构建时间</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBuilds
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((build) => (
                    <TableRow key={build.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Package size={16} color="#3b82f6" />
                          {build.build_no}
                        </Box>
                      </TableCell>
                      <TableCell>{build.build_task}</TableCell>
                      <TableCell>
                        <Chip label={getTriggerTypeLabel(build.trigger_type)} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(build.status)}
                          label={getStatusLabel(build.status)}
                          size="small"
                          color={getStatusColor(build.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Clock size={14} />
                          {formatDuration(build.duration)}
                        </Box>
                      </TableCell>
                      <TableCell>{build.build_time}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看日志">
                            <IconButton size="small" onClick={() => handleViewLog(build)}>
                              <FileText size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="制品管理">
                            <IconButton size="small">
                              <Package size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredBuilds.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>构建日志</DialogTitle>
        <DialogContent>
          {selectedBuild && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedBuild.build_no} - {selectedBuild.build_task}
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: "#1e1e1e", color: "#d4d4d4", fontFamily: "monospace", fontSize: 12 }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`[14:30:00] Starting build...
[14:30:01] Cloning repository...
[14:30:05] Installing dependencies...
[14:30:15] Dependencies installed successfully
[14:30:16] Running tests...
[14:30:45] All tests passed
[14:30:46] Building application...
[14:31:20] Build completed successfully
[14:31:21] Generating artifacts...
[14:31:25] Artifacts generated: app.tar.gz
[14:31:26] Build finished with status: SUCCESS`}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsBuildPage;
