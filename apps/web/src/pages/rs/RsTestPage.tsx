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
import { FileUpload } from "@/components/common";
import {
  Plus,
  Search,
  Play,
  FileText,
  Edit,
  Trash2,
  ClipboardList,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface TestCase {
  id: string;
  case_no: string;
  case_name: string;
  case_type: string;
  priority: string;
  status: string;
  related_requirement: string;
}

const RsTestPage: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    case_name: "",
    case_type: "功能测试",
    priority: "medium",
    related_requirement: "",
  });
  const [testReportAttachments, setTestReportAttachments] = useState<string[]>([]);

  useEffect(() => {
    const mockTestCases: TestCase[] = [
      {
        id: "1",
        case_no: "TC-001",
        case_name: "用户登录功能测试",
        case_type: "功能测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-001",
      },
      {
        id: "2",
        case_no: "TC-002",
        case_name: "用户注册流程测试",
        case_type: "功能测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-002",
      },
      {
        id: "3",
        case_no: "TC-003",
        case_name: "数据导出性能测试",
        case_type: "性能测试",
        priority: "medium",
        status: "failed",
        related_requirement: "REQ-003",
      },
      {
        id: "4",
        case_no: "TC-004",
        case_name: "接口并发测试",
        case_type: "压力测试",
        priority: "medium",
        status: "pending",
        related_requirement: "REQ-004",
      },
      {
        id: "5",
        case_no: "TC-005",
        case_name: "UI兼容性测试",
        case_type: "UI测试",
        priority: "low",
        status: "passed",
        related_requirement: "REQ-005",
      },
      {
        id: "6",
        case_no: "TC-006",
        case_name: "安全性测试-SQL注入",
        case_type: "安全测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-006",
      },
    ];
    setTestCases(mockTestCases);
    setLoading(false);
  }, []);

  const getPriorityColor = (
    priority: string,
  ): "error" | "warning" | "default" => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "default";
      default:
        return "default";
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
  ): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case "passed":
        return "success";
      case "failed":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "passed":
        return "已通过";
      case "failed":
        return "未通过";
      case "pending":
        return "待执行";
      default:
        return status;
    }
  };

  const getCaseTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      功能测试: "功能测试",
      性能测试: "性能测试",
      压力测试: "压力测试",
      UI测试: "UI测试",
      安全测试: "安全测试",
    };
    return types[type] || type;
  };

  const filteredTestCases = testCases.filter((tc) => {
    const matchesSearch =
      tc.case_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.case_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.related_requirement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !caseTypeFilter || tc.case_type === caseTypeFilter;
    const matchesPriority = !priorityFilter || tc.priority === priorityFilter;
    const matchesStatus = !statusFilter || tc.status === statusFilter;
    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  const uniqueCaseTypes = [...new Set(testCases.map((tc) => tc.case_type))];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateCase = () => {
    const newCase: TestCase = {
      id: String(Date.now()),
      case_no: `TC-${String(testCases.length + 1).padStart(3, "0")}`,
      case_name: newCaseForm.case_name,
      case_type: newCaseForm.case_type,
      priority: newCaseForm.priority,
      status: "pending",
      related_requirement: newCaseForm.related_requirement,
    };
    setTestCases([newCase, ...testCases]);
    setNewCaseDialogOpen(false);
    setNewCaseForm({
      case_name: "",
      case_type: "功能测试",
      priority: "medium",
      related_requirement: "",
    });
  };

  const handleViewDetail = (tc: TestCase) => {
    setSelectedCase(tc);
    setDetailDialogOpen(true);
  };

  const handleExecuteTest = (tcId: string) => {
    setTestCases(
      testCases.map((tc) =>
        tc.id === tcId ? { ...tc, status: "passed" } : tc,
      ),
    );
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
            测试管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: "#3b82f6" }}
            onClick={() => {
              setTestReportAttachments([]);
              setNewCaseDialogOpen(true);
            }}
          >
            新建用例
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
              placeholder="搜索用例编号、名称..."
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
              <InputLabel>用例类型</InputLabel>
              <Select
                value={caseTypeFilter || ""}
                label="用例类型"
                onChange={(e) => setCaseTypeFilter(e.target.value || null)}
              >
                <MenuItem value="">全部</MenuItem>
                {uniqueCaseTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getCaseTypeLabel(type)}
                  </MenuItem>
                ))}
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
                <MenuItem value="passed">已通过</MenuItem>
                <MenuItem value="failed">未通过</MenuItem>
                <MenuItem value="pending">待执行</MenuItem>
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
                    用例编号
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    用例名称
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    用例类型
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    优先级
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    状态
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    关联需求
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTestCases
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((tc) => (
                    <TableRow key={tc.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <ClipboardList size={16} color="#3b82f6" />
                          {tc.case_no}
                        </Box>
                      </TableCell>
                      <TableCell>{tc.case_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={getCaseTypeLabel(tc.case_type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPriorityLabel(tc.priority)}
                          size="small"
                          color={getPriorityColor(tc.priority)}
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
                          {tc.status === "passed" ? (
                            <CheckCircle size={14} color="green" />
                          ) : tc.status === "failed" ? (
                            <XCircle size={14} color="red" />
                          ) : (
                            <Clock size={14} color="orange" />
                          )}
                          <Chip
                            label={getStatusLabel(tc.status)}
                            size="small"
                            color={getStatusColor(tc.status)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{tc.related_requirement}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="查看详情">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(tc)}
                            >
                              <FileText size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="执行测试">
                            <IconButton
                              size="small"
                              onClick={() => handleExecuteTest(tc.id)}
                            >
                              <Play size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small">
                              <Edit size={16} />
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
            count={filteredTestCases.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>

      <Dialog
        open={newCaseDialogOpen}
        onClose={() => setNewCaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建用例</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="用例名称"
              fullWidth
              value={newCaseForm.case_name}
              onChange={(e) =>
                setNewCaseForm({ ...newCaseForm, case_name: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>用例类型</InputLabel>
              <Select
                value={newCaseForm.case_type}
                label="用例类型"
                onChange={(e) =>
                  setNewCaseForm({ ...newCaseForm, case_type: e.target.value })
                }
              >
                <MenuItem value="功能测试">功能测试</MenuItem>
                <MenuItem value="性能测试">性能测试</MenuItem>
                <MenuItem value="压力测试">压力测试</MenuItem>
                <MenuItem value="UI测试">UI测试</MenuItem>
                <MenuItem value="安全测试">安全测试</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={newCaseForm.priority}
                label="优先级"
                onChange={(e) =>
                  setNewCaseForm({ ...newCaseForm, priority: e.target.value })
                }
              >
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="关联需求"
              fullWidth
              value={newCaseForm.related_requirement}
              onChange={(e) =>
                setNewCaseForm({
                  ...newCaseForm,
                  related_requirement: e.target.value,
                })
              }
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                测试报告附件
              </Typography>
              <FileUpload
                value={testReportAttachments}
                onChange={setTestReportAttachments}
                accept={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png']}
                maxCount={5}
                maxSize={20}
                maxTotalSize={100}
                uploadText="上传测试报告"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCaseDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleCreateCase}
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
        <DialogTitle>用例详情</DialogTitle>
        <DialogContent>
          {selectedCase && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {selectedCase.case_no} - {selectedCase.case_name}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={getCaseTypeLabel(selectedCase.case_type)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={getPriorityLabel(selectedCase.priority)}
                  size="small"
                  color={getPriorityColor(selectedCase.priority)}
                />
                <Chip
                  label={getStatusLabel(selectedCase.status)}
                  size="small"
                  color={getStatusColor(selectedCase.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  关联需求: {selectedCase.related_requirement}
                </Typography>
              </Box>
              <Paper sx={{ p: 2, mt: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2">
                  测试步骤和预期结果区域 - 待实现
                </Typography>
              </Paper>
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

export default RsTestPage;
