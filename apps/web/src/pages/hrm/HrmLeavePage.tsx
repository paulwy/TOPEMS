import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye, X, Check } from "lucide-react";
import {
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/notification/NotificationContainer";
import { StatusBadge } from "@/components/hrm/StatusBadge";
import {
  leaveApi,
  employeeApi,
  type LeaveRequest,
  type PaginatedResult,
  type ListParams,
} from "@/api/hrm";

const LeaveManagementPage: React.FC = () => {
  const { success, error, notifications, hideNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<LeaveRequest>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [employeeFilter, setEmployeeFilter] = useState("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({});

  const fetchLeaveRequests = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await leaveApi.list(params);
      if (response.code === 200) {
        setData(response.data!);
      }
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      if (response.code === 200) {
        const items = response.data?.items || response.data || [];
        if (Array.isArray(items)) {
          setEmployees(
            items.map((e: any) => ({ id: e.id, name: e.name })) || [],
          );
        } else {
          setEmployees([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, []);

  const handleSearch = () => {
    fetchLeaveRequests({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
      employee_id: employeeFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setTypeFilter("");
    setEmployeeFilter("");
    fetchLeaveRequests({ page: 1 });
  };

  const handleAdd = () => {
    setEditingLeave(null);
    setFormData({});
    setIsModalVisible(true);
  };

  const handleEdit = (record: LeaveRequest) => {
    setEditingLeave(record);
    setFormData(record);
    setIsModalVisible(true);
  };

  const handleView = (record: LeaveRequest) => {
    setEditingLeave(record);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await leaveApi.delete(id);
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Failed to delete leave request:", error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await leaveApi.approve(id, "admin");
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Failed to approve leave request:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await leaveApi.reject(id, "admin", "已拒绝");
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Failed to reject leave request:", error);
    }
  };

  const handleModalOk = async () => {
    try {
      if (editingLeave) {
        await leaveApi.update(editingLeave.id, formData);
      } else {
        await leaveApi.create(formData);
      }
      setIsModalVisible(false);
      fetchLeaveRequests();
    } catch (error) {
      console.error("Failed to save leave request:", error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getLeaveStatusBadge = (status: string) => (
    <StatusBadge status={status} category="leave" showIcon />
  );

  const getLeaveTypeText = (type: string) => {
    const types: Record<string, string> = {
      annual: "年假",
      sick: "病假",
      personal: "事假",
      maternity: "产假",
      paternity: "陪产假",
      other: "其他",
    };
    return types[type] || type;
  };

  const totalPages = Math.ceil(data.total / data.page_size);

  const leaveTypes = [
    { value: "annual", label: "年假" },
    { value: "sick", label: "病假" },
    { value: "personal", label: "事假" },
    { value: "maternity", label: "产假" },
    { value: "paternity", label: "陪产假" },
    { value: "other", label: "其他" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />
      <Box sx={{ p: 3 }}>
        {/* 面包屑导航 */}
        <Box sx={{ mb: 2 }}>
          <Typography
            component="a"
            href="/hrm"
            sx={{
              color: "text.secondary",
              textDecoration: "none",
              fontSize: "0.875rem",
              "&:hover": { color: "primary.main", textDecoration: "underline" },
            }}
          >
            人力资源
          </Typography>
          <Typography component="span" sx={{ mx: 1, color: "text.disabled" }}>
            /
          </Typography>
          <Typography
            component="span"
            sx={{ color: "text.primary", fontSize: "0.875rem" }}
          >
            休假管理
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            休假管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleAdd}
          >
            新增申请
          </Button>
        </Box>

        <Card sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                placeholder="搜索员工姓名"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                sx={{ minWidth: 200 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ display: "flex" }}>
                          <Search size={18} />
                        </Box>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>全部员工</InputLabel>
                <Select
                  value={employeeFilter}
                  label="全部员工"
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <MenuItem value="">全部员工</MenuItem>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>全部类型</InputLabel>
                <Select
                  value={typeFilter}
                  label="全部类型"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">全部类型</MenuItem>
                  {leaveTypes.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>全部状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="全部状态"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">全部状态</MenuItem>
                  <MenuItem value="pending">待审批</MenuItem>
                  <MenuItem value="approved">已批准</MenuItem>
                  <MenuItem value="rejected">已拒绝</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handleSearch}>
                  搜索
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  重置
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell>员工</TableCell>
                  <TableCell>休假类型</TableCell>
                  <TableCell>开始日期</TableCell>
                  <TableCell>结束日期</TableCell>
                  <TableCell>天数</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : data.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{
                        textAlign: "center",
                        color: "text.secondary",
                        py: 6,
                      }}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {employees.find((e) => e.id === item.employee_id)
                          ?.name || "-"}
                      </TableCell>
                      <TableCell>{getLeaveTypeText(item.leave_type)}</TableCell>
                      <TableCell>{item.start_date}</TableCell>
                      <TableCell>{item.end_date}</TableCell>
                      <TableCell>{item.days}</TableCell>
                      <TableCell>{getLeaveStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleView(item)}
                            title="查看"
                          >
                            <Eye size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(item)}
                            title="编辑"
                          >
                            <Edit size={18} />
                          </IconButton>
                          {item.status === "pending" && (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApprove(item.id)}
                                title="批准"
                              >
                                <Check size={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleReject(item.id)}
                                title="拒绝"
                              >
                                <X size={18} />
                              </IconButton>
                            </>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item.id)}
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {data.total > data.page_size && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 3,
                py: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                显示第 {(data.page - 1) * data.page_size + 1} -{" "}
                {Math.min(data.page * data.page_size, data.total)} 条，共{" "}
                {data.total} 条
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    data.page > 1 && fetchLeaveRequests({ page: data.page - 1 })
                  }
                  disabled={data.page <= 1}
                >
                  上一页
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      size="small"
                      variant={page === data.page ? "contained" : "outlined"}
                      onClick={() => fetchLeaveRequests({ page })}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    data.page < totalPages &&
                    fetchLeaveRequests({ page: data.page + 1 })
                  }
                  disabled={data.page >= totalPages}
                >
                  下一页
                </Button>
              </Stack>
            </Box>
          )}
        </Card>

        {/* 新增/编辑 Dialog */}
        <Dialog
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: { borderRadius: 2 },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>
            {editingLeave ? "编辑休假申请" : "新增休假申请"}
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
            >
              <FormControl fullWidth>
                <InputLabel>员工 *</InputLabel>
                <Select
                  value={(formData as LeaveRequest)?.employee_id || ""}
                  label="员工 *"
                  onChange={(e) =>
                    handleInputChange("employee_id", e.target.value)
                  }
                >
                  <MenuItem value="">请选择员工</MenuItem>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>休假类型 *</InputLabel>
                <Select
                  value={(formData as LeaveRequest)?.leave_type || ""}
                  label="休假类型 *"
                  onChange={(e) =>
                    handleInputChange("leave_type", e.target.value)
                  }
                >
                  <MenuItem value="">请选择休假类型</MenuItem>
                  {leaveTypes.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  type="date"
                  label="开始日期 *"
                  value={(formData as LeaveRequest)?.start_date || ""}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  label="结束日期 *"
                  value={(formData as LeaveRequest)?.end_date || ""}
                  onChange={(e) =>
                    handleInputChange("end_date", e.target.value)
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                type="number"
                label="休假天数 *"
                value={(formData as LeaveRequest)?.days || ""}
                onChange={(e) =>
                  handleInputChange("days", parseFloat(e.target.value) || 0)
                }
                placeholder="请输入休假天数"
                fullWidth
              />
              <TextField
                label="备注"
                value={(formData as LeaveRequest)?.reason || ""}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                multiline
                rows={3}
                placeholder="请输入备注信息"
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setIsModalVisible(false)} variant="outlined">
              取消
            </Button>
            <Button
              onClick={handleModalOk}
              variant="contained"
              startIcon={<Check size={18} />}
            >
              确定
            </Button>
          </DialogActions>
        </Dialog>

        {/* 查看详情 Dialog */}
        <Dialog
          open={isViewModalVisible}
          onClose={() => setIsViewModalVisible(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: { borderRadius: 2 },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>休假详情</DialogTitle>
          <DialogContent dividers>
            {editingLeave && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    员工:
                  </Typography>
                  <Typography variant="body2">
                    {employees.find((e) => e.id === editingLeave.employee_id)
                      ?.name || "-"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    休假类型:
                  </Typography>
                  <Typography variant="body2">
                    {getLeaveTypeText(editingLeave.leave_type)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    开始日期:
                  </Typography>
                  <Typography variant="body2">
                    {editingLeave.start_date}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    结束日期:
                  </Typography>
                  <Typography variant="body2">
                    {editingLeave.end_date}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    休假天数:
                  </Typography>
                  <Typography variant="body2">{editingLeave.days}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    备注:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editingLeave.reason || "-"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    状态:
                  </Typography>
                  {getLeaveStatusBadge(editingLeave.status)}
                </Box>
                {editingLeave.approver_id && (
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      审批人:
                    </Typography>
                    <Typography variant="body2">
                      {editingLeave.approver_id}
                    </Typography>
                  </Box>
                )}
                {editingLeave.rejection_reason && (
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      审批意见:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {editingLeave.rejection_reason}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    创建时间:
                  </Typography>
                  <Typography variant="body2">
                    {editingLeave.created_at}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setIsViewModalVisible(false)}
              variant="contained"
            >
              关闭
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default LeaveManagementPage;
