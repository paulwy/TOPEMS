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
  Edit,
  Bug,
  User,
  Filter,
  CheckCircle,
} from "lucide-react";

interface Bug {
  id: string;
  bug_no: string;
  bug_title: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
  create_time: string;
  description: string;
}

const RsBugPage: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [newBugDialogOpen, setNewBugDialogOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newBugForm, setNewBugForm] = useState({
    bug_title: "",
    severity: "medium",
    priority: "medium",
    description: "",
  });

  useEffect(() => {
    const mockBugs: Bug[] = [
      {
        id: "1",
        bug_no: "BUG-001",
        bug_title: "用户登录后页面空白",
        severity: "critical",
        priority: "high",
        status: "open",
        assignee: "张三",
        create_time: "2024-06-15 10:30:00",
        description: "用户反馈登录成功后页面显示空白，需要刷新才能正常显示",
      },
      {
        id: "2",
        bug_no: "BUG-002",
        bug_title: "数据导出功能报错",
        severity: "major",
        priority: "high",
        status: "in_progress",
        assignee: "李四",
        create_time: "2024-06-14 14:20:00",
        description: "Excel导出时遇到大数据量会抛出内存溢出错误",
      },
      {
        id: "3",
        bug_no: "BUG-003",
        bug_title: "表单验证提示不准确",
        severity: "minor",
        priority: "low",
        status: "resolved",
        assignee: "王五",
        create_time: "2024-06-13 09:15:00",
        description: "邮箱格式验证提示信息不够友好",
      },
      {
        id: "4",
        bug_no: "BUG-004",
        bug_title: "移动端样式错位",
        severity: "major",
        priority: "medium",
        status: "open",
        assignee: "赵六",
        create_time: "2024-06-12 16:45:00",
        description: "在移动端设备上列表页布局错乱",
      },
      {
        id: "5",
        bug_no: "BUG-005",
        bug_title: "搜索结果分页异常",
        severity: "critical",
        priority: "high",
        status: "closed",
        assignee: "孙七",
        create_time: "2024-06-11 11:00:00",
        description: "搜索结果超过100条时分页按钮显示异常",
      },
      {
        id: "6",
        bug_no: "BUG-006",
        bug_title: "图片上传进度条不更新",
        severity: "minor",
        priority: "low",
        status: "in_progress",
        assignee: "周八",
        create_time: "2024-06-10 15:30:00",
        description: "上传大图片时进度条卡在50%不再更新",
      },
    ];
    setBugs(mockBugs);
    setLoading(false);
  }, []);

  const getSeverityColor = (
    severity: string,
  ): "error" | "warning" | "info" | "default" => {
    switch (severity) {
      case "critical":
        return "error";
      case "major":
        return "warning";
      case "minor":
        return "info";
      default:
        return "default";
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "严重";
      case "major":
        return "主要";
      case "minor":
        return "次要";
      default:
        return severity;
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return priority;
    }
  };

  const getStatusColor = (
    status: string,
  ): "default" | "primary" | "success" | "error" => {
    switch (status) {
      case "open":
        return "error";
      case "in_progress":
        return "primary";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "open":
        return "待处理";
      case "in_progress":
        return "处理中";
      case "resolved":
        return "已解决";
      case "closed":
        return "已关闭";
      default:
        return status;
    }
  };

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.bug_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.bug_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = !severityFilter || bug.severity === severityFilter;
    const matchesPriority = !priorityFilter || bug.priority === priorityFilter;
    const matchesStatus = !statusFilter || bug.status === statusFilter;
    const matchesAssignee = !assigneeFilter || bug.assignee === assigneeFilter;
    return (
      matchesSearch &&
      matchesSeverity &&
      matchesPriority &&
      matchesStatus &&
      matchesAssignee
    );
  });

  const uniqueAssignees = [...new Set(bugs.map((b) => b.assignee))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateBug = () => {
    const newBug: Bug = {
      id: String(Date.now()),
      bug_no: `BUG-${String(bugs.length + 1).padStart(3, "0")}`,
      bug_title: newBugForm.bug_title,
      severity: newBugForm.severity,
      priority: newBugForm.priority,
      status: "open",
      assignee: "未分配",
      create_time: new Date().toLocaleString(),
      description: newBugForm.description,
    };
    setBugs([newBug, ...bugs]);
    setNewBugDialogOpen(false);
    setNewBugForm({
      bug_title: "",
      severity: "medium",
      priority: "medium",
      description: "",
    });
  };

  const handleViewDetail = (bug: Bug) => {
    setSelectedBug(bug);
    setDetailDialogOpen(true);
  };

  const handleCloseBug = (bugId: string) => {
    setBugs(bugs.map((b) => (b.id === bugId ? { ...b, status: "closed" } : b)));
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
          <Typography variant="h5"  sx={{ ...{ color: "#3b82f6" }, fontWeight: 'bold' }}>
            缺陷管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
            onClick={() => setNewBugDialogOpen(true)}
          >
            新建缺陷
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <TextField
              size="small"
              placeholder="搜索缺陷编号、标题..."
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
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={severityFilter || ""}
                label="严重程度"
                onChange={(e) => setSeverityFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="critical">严重</MenuItem>
                <MenuItem value="major">主要</MenuItem>
                <MenuItem value="minor">次要</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>优先级</InputLabel>
              <Select
                value={priorityFilter || ""}
                label="优先级"
                onChange={(e) => setPriorityFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter || ""}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="open">待处理</MenuItem>
                <MenuItem value="in_progress">处理中</MenuItem>
                <MenuItem value="resolved">已解决</MenuItem>
                <MenuItem value="closed">已关闭</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>指派人</InputLabel>
              <Select
                value={assigneeFilter || ""}
                label="指派人"
                onChange={(e) => setAssigneeFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                {uniqueAssignees.map((assignee) => (
                  <MenuItem key={assignee} value={assignee}>
                    {assignee}
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
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    缺陷编号
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    缺陷标题
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    严重程度
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    优先级
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    状态
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    指派给
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    创建时间
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBugs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((bug) => (
                    <TableRow key={bug.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Bug size={16} color="#3b82f6" />
                          {bug.bug_no}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={bug.bug_title}>
                          <Box
                            sx={{
                              maxWidth: 250,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {bug.bug_title}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSeverityLabel(bug.severity)}
                          size="small"
                          color={getSeverityColor(bug.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPriorityLabel(bug.priority)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(bug.status)}
                          size="small"
                          color={getStatusColor(bug.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <User size={14} />
                          {bug.assignee}
                        </Box>
                      </TableCell>
                      <TableCell>{bug.create_time}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看详情">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(bug)}
                            >
                              <Bug size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small">
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          {bug.status !== "closed" && (
                            <Tooltip title="关闭">
                              <IconButton
                                size="small"
                                onClick={() => handleCloseBug(bug.id)}
                              >
                                <CheckCircle size={16} />
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
            count={filteredBugs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog
        open={newBugDialogOpen}
        onClose={() => setNewBugDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建缺陷</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="缺陷标题"
              fullWidth
              value={newBugForm.bug_title}
              onChange={(e) =>
                setNewBugForm({ ...newBugForm, bug_title: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={newBugForm.severity}
                label="严重程度"
                onChange={(e) =>
                  setNewBugForm({ ...newBugForm, severity: e.target.value })
                }
              >
                <MenuItem value="critical">严重</MenuItem>
                <MenuItem value="major">主要</MenuItem>
                <MenuItem value="minor">次要</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={newBugForm.priority}
                label="优先级"
                onChange={(e) =>
                  setNewBugForm({ ...newBugForm, priority: e.target.value })
                }
              >
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="缺陷描述"
              fullWidth
              multiline
              rows={4}
              value={newBugForm.description}
              onChange={(e) =>
                setNewBugForm({ ...newBugForm, description: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBugDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleCreateBug}
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
        <DialogTitle>缺陷详情</DialogTitle>
        <DialogContent>
          {selectedBug && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {selectedBug.bug_no} - {selectedBug.bug_title}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={getSeverityLabel(selectedBug.severity)}
                  size="small"
                  color={getSeverityColor(selectedBug.severity)}
                />
                <Chip
                  label={getPriorityLabel(selectedBug.priority)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={getStatusLabel(selectedBug.status)}
                  size="small"
                  color={getStatusColor(selectedBug.status)}
                />
              </Stack>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    指派人
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {selectedBug.assignee}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {selectedBug.create_time}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  缺陷描述
                </Typography>
                <Paper sx={{ p: 2, mt: 1, bgcolor: "#f5f5f5" }}>
                  <Typography variant="body2">
                    {selectedBug.description || "无描述"}
                  </Typography>
                </Paper>
              </Box>
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

export default RsBugPage;
