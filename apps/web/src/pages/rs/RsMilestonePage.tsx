import React, { useState, useEffect } from "react";
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
  Edit,
  Trash2,
  Flag,
  Calendar,
  Link2,
  Eye,
  Filter,
} from "lucide-react";

interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  related_project: string;
  status: string;
}

const RsMilestonePage: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [newMilestoneDialogOpen, setNewMilestoneDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    related_project: "",
  });

  useEffect(() => {
    const mockMilestones: Milestone[] = [
      {
        id: "1",
        name: "v1.0.0 发布",
        start_date: "2024-06-01",
        end_date: "2024-06-30",
        progress: 75,
        related_project: "用户中心重构",
        status: "active",
      },
      {
        id: "2",
        name: "性能优化",
        start_date: "2024-05-01",
        end_date: "2024-05-31",
        progress: 100,
        related_project: "系统优化项目",
        status: "completed",
      },
      {
        id: "3",
        name: "移动端适配",
        start_date: "2024-06-15",
        end_date: "2024-07-15",
        progress: 30,
        related_project: "移动端开发",
        status: "active",
      },
      {
        id: "4",
        name: "数据库迁移",
        start_date: "2024-04-01",
        end_date: "2024-04-30",
        progress: 100,
        related_project: "数据库升级",
        status: "completed",
      },
      {
        id: "5",
        name: "API v2开发",
        start_date: "2024-07-01",
        end_date: "2024-08-31",
        progress: 0,
        related_project: "API重构",
        status: "planning",
      },
    ];
    setMilestones(mockMilestones);
    setLoading(false);
  }, []);

  const getStatusColor = (
    status: string,
  ): "success" | "primary" | "warning" | "default" => {
    switch (status) {
      case "completed":
        return "success";
      case "active":
        return "primary";
      case "planning":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "completed":
        return "已完成";
      case "active":
        return "进行中";
      case "planning":
        return "规划中";
      default:
        return status;
    }
  };

  const filteredMilestones = milestones.filter((ms) => {
    const matchesSearch =
      ms.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ms.related_project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || ms.status === statusFilter;
    const matchesDateRange =
      (!dateRange.start || ms.end_date >= dateRange.start) &&
      (!dateRange.end || ms.start_date <= dateRange.end);
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateMilestone = () => {
    const newMs: Milestone = {
      id: String(Date.now()),
      name: newMilestoneForm.name,
      start_date: newMilestoneForm.start_date,
      end_date: newMilestoneForm.end_date,
      progress: 0,
      related_project: newMilestoneForm.related_project,
      status: "planning",
    };
    setMilestones([newMs, ...milestones]);
    setNewMilestoneDialogOpen(false);
    setNewMilestoneForm({
      name: "",
      start_date: "",
      end_date: "",
      related_project: "",
    });
  };

  const handleViewDetail = (ms: Milestone) => {
    setSelectedMilestone(ms);
    setDetailDialogOpen(true);
  };

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", py: 3 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{ ...{ color: "#3b82f6" }, fontWeight: "bold" }}
          >
            里程碑
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
            onClick={() => setNewMilestoneDialogOpen(true)}
          >
            新建里程碑
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <TextField
              size="small"
              placeholder="搜索里程碑名称、项目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 250 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="active">进行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="planning">规划中</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="开始日期"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label="结束日期"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#3b82f6" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    里程碑名称
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    开始日期
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    结束日期
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    进度
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    关联项目
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    状态
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMilestones
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((ms) => (
                    <TableRow key={ms.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Flag size={16} color="#3b82f6" />
                          {ms.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Calendar size={14} />
                          {ms.start_date}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Calendar size={14} />
                          {ms.end_date}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={ms.progress}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption">
                            {ms.progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Link2 size={14} />
                          {ms.related_project}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(ms.status)}
                          size="small"
                          color={getStatusColor(ms.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看进度">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(ms)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small">
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="关联项目">
                            <IconButton size="small">
                              <Link2 size={16} />
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
            count={filteredMilestones.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog
        open={newMilestoneDialogOpen}
        onClose={() => setNewMilestoneDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建里程碑</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="里程碑名称"
              fullWidth
              value={newMilestoneForm.name}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  name: e.target.value,
                })
              }
            />
            <TextField
              label="开始日期"
              type="date"
              fullWidth
              value={newMilestoneForm.start_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  start_date: e.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="结束日期"
              type="date"
              fullWidth
              value={newMilestoneForm.end_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  end_date: e.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="关联项目"
              fullWidth
              value={newMilestoneForm.related_project}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  related_project: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewMilestoneDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleCreateMilestone}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>里程碑详情</DialogTitle>
        <DialogContent>
          {selectedMilestone && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedMilestone.name}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={getStatusLabel(selectedMilestone.status)}
                  size="small"
                  color={getStatusColor(selectedMilestone.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  进度
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
                >
                  <LinearProgress
                    variant="determinate"
                    value={selectedMilestone.progress}
                    sx={{ flex: 1, height: 10, borderRadius: 4 }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedMilestone.progress}%
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    开始日期
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedMilestone.start_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    结束日期
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedMilestone.end_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    关联项目
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedMilestone.related_project}
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
    </Box>
  );
};

export default RsMilestonePage;
