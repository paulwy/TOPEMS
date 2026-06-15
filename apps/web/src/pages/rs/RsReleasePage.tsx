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
  Eye,
  RotateCcw,
  Package,
  Calendar,
  User,
  Filter,
  Tag,
} from "lucide-react";

interface Release {
  id: string;
  version: string;
  release_time: string;
  release_note: string;
  environment: string;
  status: string;
  release_by: string;
}

const RsReleasePage: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [envFilter, setEnvFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newReleaseDialogOpen, setNewReleaseDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [newReleaseForm, setNewReleaseForm] = useState({
    version: "",
    environment: "staging",
    release_note: "",
  });

  useEffect(() => {
    const mockReleases: Release[] = [
      {
        id: "1",
        version: "v2.3.1",
        release_time: "2024-06-15 14:30:00",
        release_note: "修复用户登录问题，优化性能",
        environment: "production",
        status: "released",
        release_by: "张三",
      },
      {
        id: "2",
        version: "v2.3.0",
        release_time: "2024-06-10 10:00:00",
        release_note: "新增数据分析功能",
        environment: "production",
        status: "released",
        release_by: "李四",
      },
      {
        id: "3",
        version: "v2.4.0-beta",
        release_time: "2024-06-20 09:00:00",
        release_note: "新版本测试发布",
        environment: "staging",
        status: "planning",
        release_by: "王五",
      },
      {
        id: "4",
        version: "v2.2.5",
        release_time: "2024-06-05 16:45:00",
        release_note: "紧急修复生产问题",
        environment: "production",
        status: "rolled_back",
        release_by: "赵六",
      },
      {
        id: "5",
        version: "v2.2.4",
        release_time: "2024-06-01 11:20:00",
        release_note: "常规版本更新",
        environment: "production",
        status: "released",
        release_by: "孙七",
      },
    ];
    setReleases(mockReleases);
    setLoading(false);
  }, []);

  const getEnvColor = (env: string): "error" | "warning" | "success" => {
    switch (env) {
      case "production":
        return "error";
      case "staging":
        return "warning";
      case "development":
        return "success";
      default:
        return "success";
    }
  };

  const getEnvLabel = (env: string): string => {
    switch (env) {
      case "production":
        return "生产环境";
      case "staging":
        return "预发布环境";
      case "development":
        return "开发环境";
      default:
        return env;
    }
  };

  const getStatusColor = (status: string): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "released":
        return "success";
      case "planning":
        return "warning";
      case "rolled_back":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "released":
        return "已发布";
      case "planning":
        return "规划中";
      case "rolled_back":
        return "已回滚";
      default:
        return status;
    }
  };

  const filteredReleases = releases.filter((release) => {
    const matchesSearch =
      release.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.release_note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.release_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnv = !envFilter || release.environment === envFilter;
    const matchesStatus = !statusFilter || release.status === statusFilter;
    const matchesDateRange =
      (!dateRange.start || release.release_time >= dateRange.start) &&
      (!dateRange.end || release.release_time <= dateRange.end);
    return matchesSearch && matchesEnv && matchesStatus && matchesDateRange;
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (release: Release) => {
    setSelectedRelease(release);
    setDetailDialogOpen(true);
  };

  const handleRollback = (releaseId: string) => {
    const newRollback: Release = {
      id: String(Date.now()),
      version: "上一版本",
      release_time: new Date().toLocaleString(),
      release_note: "回滚操作",
      environment: releases.find((r) => r.id === releaseId)?.environment || "staging",
      status: "planning",
      release_by: "当前用户",
    };
    setReleases([newRollback, ...releases]);
  };

  const handleCreateRelease = () => {
    const newRelease: Release = {
      id: String(Date.now()),
      version: newReleaseForm.version,
      release_time: new Date().toLocaleString(),
      release_note: newReleaseForm.release_note,
      environment: newReleaseForm.environment,
      status: "planning",
      release_by: "当前用户",
    };
    setReleases([newRelease, ...releases]);
    setNewReleaseDialogOpen(false);
    setNewReleaseForm({ version: "", environment: "staging", release_note: "" });
  };

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#3b82f6" }}>
            发布管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
            onClick={() => setNewReleaseDialogOpen(true)}
          >
            新建发布
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="搜索版本、说明..."
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
              <InputLabel>环境</InputLabel>
              <Select
                value={envFilter || ""}
                label="环境"
                onChange={(e) => setEnvFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="production">生产环境</MenuItem>
                <MenuItem value="staging">预发布环境</MenuItem>
                <MenuItem value="development">开发环境</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="released">已发布</MenuItem>
                <MenuItem value="planning">规划中</MenuItem>
                <MenuItem value="rolled_back">已回滚</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="开始日期"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="结束日期"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>版本号</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>发布时间</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>发布说明</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>发布环境</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>状态</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>发布人</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReleases
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((release) => (
                    <TableRow key={release.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Tag size={16} color="#3b82f6" />
                          {release.version}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Calendar size={14} />
                          {release.release_time}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={release.release_note}>
                          <Box sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {release.release_note}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip label={getEnvLabel(release.environment)} size="small" color={getEnvColor(release.environment)} />
                      </TableCell>
                      <TableCell>
                        <Chip label={getStatusLabel(release.status)} size="small" color={getStatusColor(release.status)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <User size={14} />
                          {release.release_by}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看详情">
                            <IconButton size="small" onClick={() => handleViewDetail(release)}>
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {release.status === "released" && (
                            <Tooltip title="回滚">
                              <IconButton size="small" onClick={() => handleRollback(release.id)}>
                                <RotateCcw size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
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
            count={filteredReleases.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>发布详情</DialogTitle>
        <DialogContent>
          {selectedRelease && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedRelease.version}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip label={getEnvLabel(selectedRelease.environment)} size="small" color={getEnvColor(selectedRelease.environment)} />
                <Chip label={getStatusLabel(selectedRelease.status)} size="small" color={getStatusColor(selectedRelease.status)} />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  发布说明
                </Typography>
                <Paper sx={{ p: 2, mt: 1, bgcolor: "#f5f5f5" }}>
                  <Typography variant="body2">{selectedRelease.release_note}</Typography>
                </Paper>
              </Box>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    发布时间
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedRelease.release_time}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    发布人
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedRelease.release_by}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newReleaseDialogOpen} onClose={() => setNewReleaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建发布</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="版本号"
              fullWidth
              value={newReleaseForm.version}
              onChange={(e) => setNewReleaseForm({ ...newReleaseForm, version: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>发布环境</InputLabel>
              <Select
                value={newReleaseForm.environment}
                label="发布环境"
                onChange={(e) => setNewReleaseForm({ ...newReleaseForm, environment: e.target.value })}
              >
                <MenuItem value="production">生产环境</MenuItem>
                <MenuItem value="staging">预发布环境</MenuItem>
                <MenuItem value="development">开发环境</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="发布说明"
              fullWidth
              multiline
              rows={4}
              value={newReleaseForm.release_note}
              onChange={(e) => setNewReleaseForm({ ...newReleaseForm, release_note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReleaseDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: "#3b82f6" }} onClick={handleCreateRelease}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsReleasePage;
