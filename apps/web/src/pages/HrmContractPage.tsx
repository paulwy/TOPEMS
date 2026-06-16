import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Clock,
  FileTextIcon,
} from "lucide-react";
import type { Contract, ContractRenewal, Employee } from "../api/hrm";
import { contractApi, contractRenewalApi, employeeApi } from "../api/hrm";
import type { PaginatedResult } from "../api/hrm";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  FormLabel,
  Alert,
  Snackbar,
} from "@mui/material";

const contractTypes = [
  { value: "labor", label: "劳动合同" },
  { value: "probation", label: "试用期合同" },
  { value: "part-time", label: "兼职合同" },
  { value: "project", label: "项目合同" },
  { value: "consulting", label: "咨询合同" },
];

const statusMap: Record<
  string,
  { text: string; color: "success" | "error" | "default" | "warning" }
> = {
  active: { text: "生效中", color: "success" },
  expired: { text: "已到期", color: "error" },
  terminated: { text: "已终止", color: "default" },
  pending: { text: "待审批", color: "warning" },
};

const renewalStatusMap: Record<
  string,
  { text: string; color: "success" | "error" | "default" | "warning" | "info" }
> = {
  pending: { text: "待审批", color: "warning" },
  approved: { text: "已批准", color: "success" },
  rejected: { text: "已拒绝", color: "error" },
  executed: { text: "已执行", color: "info" },
};

const renewalTypes = [
  { value: "regular", label: "常规续签" },
  { value: "promotion", label: "升职续签" },
  { value: "demotion", label: "降职续签" },
  { value: "transfer", label: "调岗续签" },
];

interface FormState {
  employee_id: string;
  contract_no: string;
  contract_type: string;
  party_a_name: string;
  party_a_contact: string;
  party_b_name: string;
  party_b_contact: string;
  start_date: string;
  end_date: string;
  salary: string;
  probation_period_days: string;
  reminder_days: string;
  contract_file_path: string;
  notes: string;
}

interface RenewFormState {
  renewal_type: string;
  new_start_date: string;
  new_end_date: string;
  new_salary: string;
  renewal_reason: string;
}

export default function ContractManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Contract>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [formState, setFormState] = useState<FormState>({
    employee_id: "",
    contract_no: "",
    contract_type: "",
    party_a_name: "",
    party_a_contact: "",
    party_b_name: "",
    party_b_contact: "",
    start_date: "",
    end_date: "",
    salary: "",
    probation_period_days: "",
    reminder_days: "30",
    contract_file_path: "",
    notes: "",
  });

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewFormState, setRenewFormState] = useState<RenewFormState>({
    renewal_type: "regular",
    new_start_date: "",
    new_end_date: "",
    new_salary: "",
    renewal_reason: "",
  });
  const [renewContractId, setRenewContractId] = useState("");

  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);
  const [showRenewals, setShowRenewals] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    onConfirm: () => void;
  } | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
    },
    [],
  );

  const showConfirm = useCallback((title: string, onConfirm: () => void) => {
    setConfirmDialog({ title, onConfirm });
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [currentPage, statusFilter, showExpiringOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: 20,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (showExpiringOnly) {
        const result = await contractApi.getExpiring({
          days: 30,
          page: currentPage,
          page_size: 20,
        });
        if (result.code === 0 && result.data) {
          setData(result.data);
        } else {
          showNotification("error", result.message || "获取即将到期合同失败");
        }
      } else {
        const result = await contractApi.list(params);
        if (result.code === 0 && result.data) {
          setData(result.data);
        } else {
          showNotification("error", result.message || "获取合同列表失败");
        }
      }
    } catch (error) {
      showNotification("error", "获取合同列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await employeeApi.list({ page: 1, page_size: 100 });
      if (result.code === 0 && result.data) {
        setEmployees(result.data.items);
      }
    } catch (error) {
      showNotification("error", "获取员工列表失败");
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleCreate = () => {
    setModalType("create");
    setCurrentContract(null);
    setFormState({
      employee_id: "",
      contract_no: "",
      contract_type: "",
      party_a_name: "",
      party_a_contact: "",
      party_b_name: "",
      party_b_contact: "",
      start_date: "",
      end_date: "",
      salary: "",
      probation_period_days: "",
      reminder_days: "30",
      contract_file_path: "",
      notes: "",
    });
    setModalVisible(true);
  };

  const handleEdit = (contract: Contract) => {
    setModalType("edit");
    setCurrentContract(contract);
    setFormState({
      employee_id: contract.employee_id || "",
      contract_no: contract.contract_no || "",
      contract_type: contract.contract_type || "",
      party_a_name: contract.party_a_name || "",
      party_a_contact: contract.party_a_contact || "",
      party_b_name: contract.party_b_name || "",
      party_b_contact: contract.party_b_contact || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      salary: contract.salary?.toString() || "",
      probation_period_days: contract.probation_period_days?.toString() || "",
      reminder_days: contract.reminder_days?.toString() || "30",
      contract_file_path: contract.contract_file_path || "",
      notes: contract.notes || "",
    });
    setModalVisible(true);
  };

  const handleView = async (contract: Contract) => {
    setModalType("view");
    setCurrentContract(contract);
    const result = await contractRenewalApi.list({ contract_id: contract.id });
    if (result.code === 0 && result.data) {
      setRenewals(result.data.items);
    }
    setShowRenewals(false);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await contractApi.delete(id);
      if (result.code === 0) {
        showNotification("success", "删除成功");
        loadData();
      } else {
        showNotification("error", result.message || "删除失败");
      }
    } catch (error) {
      showNotification("error", "删除失败");
    }
  };

  const handleSave = async () => {
    if (!formState.employee_id) {
      showNotification("error", "请选择员工");
      return;
    }
    if (!formState.contract_type) {
      showNotification("error", "请选择合同类型");
      return;
    }
    if (!formState.start_date) {
      showNotification("error", "请选择开始日期");
      return;
    }

    const values = {
      ...formState,
      salary: formState.salary ? parseInt(formState.salary) : undefined,
      probation_period_days: formState.probation_period_days
        ? parseInt(formState.probation_period_days)
        : undefined,
      reminder_days: formState.reminder_days
        ? parseInt(formState.reminder_days)
        : undefined,
    };

    try {
      if (modalType === "create") {
        const result = await contractApi.create(values);
        if (result.code === 0) {
          showNotification("success", "创建成功");
          setModalVisible(false);
          loadData();
        } else {
          showNotification("error", result.message || "创建失败");
        }
      } else if (currentContract) {
        const result = await contractApi.update(currentContract.id, values);
        if (result.code === 0) {
          showNotification("success", "更新成功");
          setModalVisible(false);
          loadData();
        } else {
          showNotification("error", result.message || "更新失败");
        }
      }
    } catch (error) {
      showNotification("error", "保存失败");
    }
  };

  const handleRenew = (contract: Contract) => {
    setRenewContractId(contract.id);
    setRenewFormState({
      renewal_type: "regular",
      new_start_date:
        contract.end_date || new Date().toISOString().split("T")[0],
      new_end_date: "",
      new_salary: "",
      renewal_reason: "",
    });
    setRenewModalVisible(true);
  };

  const handleSubmitRenew = async () => {
    if (!renewFormState.new_start_date) {
      showNotification("error", "请选择新合同开始日期");
      return;
    }

    const values = {
      ...renewFormState,
      new_salary: renewFormState.new_salary
        ? parseInt(renewFormState.new_salary)
        : undefined,
    };

    try {
      const result = await contractApi.renew(renewContractId, values);
      if (result.code === 0) {
        showNotification("success", "续签申请提交成功");
        setRenewModalVisible(false);
      } else {
        showNotification("error", result.message || "提交失败");
      }
    } catch (error) {
      showNotification("error", "提交失败");
    }
  };

  const handleApproveRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.approve(id);
      if (result.code === 0) {
        showNotification("success", "续签申请已批准");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleRejectRenewal = async (id: string) => {
    const reason = prompt("请输入拒绝理由：");
    if (!reason) return;
    try {
      const result = await contractRenewalApi.reject(id, reason);
      if (result.code === 0) {
        showNotification("success", "续签申请已拒绝");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleExecuteRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.execute(id);
      if (result.code === 0) {
        showNotification("success", "合同续签已执行");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return "-";
    return employees.find((e) => e.id === id)?.name || "-";
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const hasExpiringSoon = (endDate?: string) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days > 0 && days <= 30;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={notification?.type} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        maxWidth="sm"
      >
        <DialogTitle>{confirmDialog?.title}</DialogTitle>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmDialog(null)}>
            取消
          </Button>
          <Button
            color="error"
            onClick={() => {
              confirmDialog?.onConfirm();
              setConfirmDialog(null);
            }}
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          bgcolor: "white",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: 1,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 2 }}>
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
              合同管理
            </Typography>
          </Box>

          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "grey.900" }}
              >
                合同管理
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                管理员工合同信息，包括合同创建、到期提醒和续签流程
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleCreate}
              startIcon={<Plus size={18} />}
            >
              新建合同
            </Button>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
        <Card sx={{ boxShadow: 1 }}>
          <CardHeader
            sx={{ pb: 1 }}
            title={
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
                spacing={2}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: "center" }}
                  spacing={2}
                >
                  <TextField
                    size="small"
                    type="text"
                    placeholder="搜索合同编号或员工姓名"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search
                            size={16}
                            style={{ marginRight: 8, color: "#9ca3af" }}
                          />
                        ),
                      },
                    }}
                    sx={{ width: 280 }}
                  />
                  <FormControl size="small" sx={{ width: 160 }}>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={statusFilter}
                      label="状态"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="">全部状态</MenuItem>
                      <MenuItem value="active">生效中</MenuItem>
                      <MenuItem value="expired">已到期</MenuItem>
                      <MenuItem value="terminated">已终止</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showExpiringOnly}
                        onChange={(e) => {
                          setShowExpiringOnly(e.target.checked);
                          setCurrentPage(1);
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        仅显示即将到期(30天内)
                      </Typography>
                    }
                  />
                </Stack>
                <Button
                  variant="outlined"
                  onClick={loadData}
                  startIcon={<RefreshCw size={16} />}
                >
                  刷新
                </Button>
              </Stack>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 128 }}>合同编号</TableCell>
                    <TableCell>员工</TableCell>
                    <TableCell>合同类型</TableCell>
                    <TableCell sx={{ width: 96 }}>薪资</TableCell>
                    <TableCell sx={{ width: 192 }}>有效期</TableCell>
                    <TableCell sx={{ width: 80 }}>状态</TableCell>
                    <TableCell sx={{ width: 160 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <Box
                            sx={{
                              animation: "spin 1s linear infinite",
                              width: 32,
                              height: 32,
                              border: 2,
                              borderColor: "primary.main",
                              borderTopColor: "transparent",
                              borderRadius: "50%",
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : data.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 6, color: "grey.500" }}
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => {
                      const days = getDaysUntilExpiry(item.end_date);
                      const isExpiringSoon = hasExpiringSoon(item.end_date);

                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Stack
                              direction="row"
                              sx={{ alignItems: "center" }}
                              spacing={1}
                            >
                              <FileTextIcon
                                size={16}
                                style={{ color: "#3b82f6" }}
                              />
                              <Typography
                                sx={{ fontWeight: 500, color: "grey.900" }}
                              >
                                {item.contract_no || "-"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {getEmployeeName(item.employee_id)}
                          </TableCell>
                          <TableCell>
                            {contractTypes.find(
                              (t) => t.value === item.contract_type,
                            )?.label || item.contract_type}
                          </TableCell>
                          <TableCell>
                            {item.salary
                              ? `${item.salary.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              sx={{ alignItems: "center" }}
                              spacing={1}
                            >
                              <Calendar
                                size={14}
                                style={{ color: "#9ca3af" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isExpiringSoon
                                    ? "warning.main"
                                    : "grey.600",
                                  fontWeight: isExpiringSoon ? 500 : 400,
                                }}
                              >
                                {new Date(item.start_date).toLocaleDateString(
                                  "zh-CN",
                                )}{" "}
                                ~{" "}
                                {item.end_date
                                  ? new Date(item.end_date).toLocaleDateString(
                                      "zh-CN",
                                    )
                                  : "无固定期限"}
                              </Typography>
                            </Stack>
                            {isExpiringSoon && days !== null && (
                              <Stack
                                sx={{
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  mt: 0.5,
                                }}
                              >
                                <AlertCircle
                                  size={12}
                                  style={{ color: "#ea580c" }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: "warning.main" }}
                                >
                                  剩余{days}天到期
                                </Typography>
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                statusMap[item.status]?.text || item.status
                              }
                              color={statusMap[item.status]?.color || "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="查看">
                                <IconButton
                                  size="small"
                                  onClick={() => handleView(item)}
                                >
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="编辑">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Edit2 size={16} />
                                </IconButton>
                              </Tooltip>
                              {item.status === "active" && (
                                <Tooltip title="续签">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRenew(item)}
                                    sx={{
                                      color: "success.main",
                                      "&:hover": { bgcolor: "success.lighter" },
                                    }}
                                  >
                                    <RefreshCw size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="删除">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    showConfirm("确定删除该合同吗?", () =>
                                      handleDelete(item.id),
                                    )
                                  }
                                  sx={{
                                    color: "error.main",
                                    "&:hover": { bgcolor: "error.lighter" },
                                  }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                共 {data.total} 条记录
              </Typography>
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <Button
                  variant="outlined"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Typography variant="body2" sx={{ px: 1, color: "grey.600" }}>
                  第 {currentPage} 页
                </Typography>
                <Button
                  variant="outlined"
                  disabled={currentPage * data.page_size >= data.total}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {modalType === "create"
            ? "新建合同"
            : modalType === "edit"
              ? "编辑合同"
              : "合同详情"}
        </DialogTitle>
        <DialogContent dividers>
          {modalType !== "view" ? (
            <Stack spacing={2}>
              <Box>
                <FormLabel>员工 *</FormLabel>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>员工</InputLabel>
                  <Select
                    value={formState.employee_id}
                    label="员工"
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        employee_id: e.target.value,
                      }))
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
              </Box>

              <TextField
                label="合同编号"
                size="small"
                fullWidth
                value={formState.contract_no}
                onChange={(e) =>
                  setFormState((s) => ({
                    ...s,
                    contract_no: e.target.value,
                  }))
                }
                disabled={modalType === "create"}
                placeholder={modalType === "create" ? "自动生成" : ""}
              />

              <Box>
                <FormLabel>合同类型 *</FormLabel>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>合同类型</InputLabel>
                  <Select
                    value={formState.contract_type}
                    label="合同类型"
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        contract_type: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">请选择合同类型</MenuItem>
                    {contractTypes.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="甲方名称"
                  size="small"
                  fullWidth
                  value={formState.party_a_name}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      party_a_name: e.target.value,
                    }))
                  }
                  placeholder="公司名称"
                />
                <TextField
                  label="甲方联系人"
                  size="small"
                  fullWidth
                  value={formState.party_a_contact}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      party_a_contact: e.target.value,
                    }))
                  }
                  placeholder="联系人姓名"
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="乙方名称"
                  size="small"
                  fullWidth
                  value={formState.party_b_name}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      party_b_name: e.target.value,
                    }))
                  }
                  placeholder="员工姓名"
                />
                <TextField
                  label="乙方联系人"
                  size="small"
                  fullWidth
                  value={formState.party_b_contact}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      party_b_contact: e.target.value,
                    }))
                  }
                  placeholder="员工联系方式"
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="开始日期 *"
                  size="small"
                  type="date"
                  fullWidth
                  value={formState.start_date}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      start_date: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="结束日期"
                  size="small"
                  type="date"
                  fullWidth
                  value={formState.end_date}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      end_date: e.target.value,
                    }))
                  }
                  placeholder="无固定期限"
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="薪资"
                  size="small"
                  type="number"
                  fullWidth
                  value={formState.salary}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, salary: e.target.value }))
                  }
                  placeholder="0"
                />
                <TextField
                  label="试用期(天)"
                  size="small"
                  type="number"
                  fullWidth
                  value={formState.probation_period_days}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      probation_period_days: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
                <TextField
                  label="提前提醒天数"
                  size="small"
                  type="number"
                  fullWidth
                  value={formState.reminder_days}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      reminder_days: e.target.value,
                    }))
                  }
                  placeholder="30"
                />
              </Stack>

              <TextField
                label="合同文件路径"
                size="small"
                fullWidth
                value={formState.contract_file_path}
                onChange={(e) =>
                  setFormState((s) => ({
                    ...s,
                    contract_file_path: e.target.value,
                  }))
                }
                placeholder="上传文件路径"
              />

              <TextField
                label="备注"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={formState.notes}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, notes: e.target.value }))
                }
                placeholder="备注信息"
              />
            </Stack>
          ) : (
            <Box>
              {currentContract && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          合同编号
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {currentContract.contract_no || "-"}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          员工
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {getEmployeeName(currentContract.employee_id)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          合同类型
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {contractTypes.find(
                            (t) => t.value === currentContract.contract_type,
                          )?.label || currentContract.contract_type}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          状态
                        </Typography>
                        <Chip
                          size="small"
                          label={
                            statusMap[currentContract.status]?.text ||
                            currentContract.status
                          }
                          color={
                            statusMap[currentContract.status]?.color ||
                            "default"
                          }
                        />
                      </CardContent>
                    </Card>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          薪资
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {currentContract.salary?.toLocaleString() || "-"}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{ flex: 1, bgcolor: "grey.50", boxShadow: "none" }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          试用期
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {currentContract.probation_period_days || 0} 天
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                  <Card sx={{ bgcolor: "grey.50", boxShadow: "none" }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        有效期
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {new Date(
                          currentContract.start_date,
                        ).toLocaleDateString("zh-CN")}
                        ~{" "}
                        {currentContract.end_date
                          ? new Date(
                              currentContract.end_date,
                            ).toLocaleDateString("zh-CN")
                          : "无固定期限"}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: "grey.50", boxShadow: "none" }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        甲方信息
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {currentContract.party_a_name || "-"}
                      </Typography>
                      <Typography variant="body2">
                        {currentContract.party_a_contact || "-"}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: "grey.50", boxShadow: "none" }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        乙方信息
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {currentContract.party_b_name || "-"}
                      </Typography>
                      <Typography variant="body2">
                        {currentContract.party_b_contact || "-"}
                      </Typography>
                    </CardContent>
                  </Card>
                  {currentContract.notes && (
                    <Card sx={{ bgcolor: "grey.50", boxShadow: "none" }}>
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          备注
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {currentContract.notes}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              )}

              {showRenewals && (
                <Box
                  sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}
                >
                  <Typography sx={{ fontWeight: 500, mb: 1.5 }}>
                    续签记录
                  </Typography>
                  {renewals.length === 0 ? (
                    <Typography
                      sx={{ color: "grey.500", textAlign: "center", py: 2 }}
                    >
                      暂无续签记录
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {renewals.map((renewal) => (
                        <Card
                          key={renewal.id}
                          sx={{ border: 1, borderColor: "divider" }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            <Stack
                              sx={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                mb: 1,
                              }}
                            >
                              <Box>
                                <Typography sx={{ fontWeight: 500 }}>
                                  {renewalTypes.find(
                                    (t) => t.value === renewal.renewal_type,
                                  )?.label || renewal.renewal_type}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "grey.500", ml: 1 }}
                                >
                                  {new Date(renewal.created_at).toLocaleString(
                                    "zh-CN",
                                  )}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={
                                  renewalStatusMap[renewal.status]?.text ||
                                  renewal.status
                                }
                                color={
                                  renewalStatusMap[renewal.status]?.color ||
                                  "default"
                                }
                              />
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ color: "grey.600", mb: 1 }}
                            >
                              新合同期限:{" "}
                              {new Date(
                                renewal.new_start_date,
                              ).toLocaleDateString("zh-CN")}{" "}
                              ~{" "}
                              {renewal.new_end_date
                                ? new Date(
                                    renewal.new_end_date,
                                  ).toLocaleDateString("zh-CN")
                                : "无固定期限"}
                            </Typography>
                            {renewal.new_salary && (
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.600", mb: 1 }}
                              >
                                新薪资: {renewal.new_salary.toLocaleString()}
                              </Typography>
                            )}
                            {renewal.renewal_reason && (
                              <Typography
                                variant="body2"
                                sx={{ color: "grey.600", mb: 1 }}
                              >
                                续签原因: {renewal.renewal_reason}
                              </Typography>
                            )}
                            {renewal.rejection_reason && (
                              <Typography
                                variant="body2"
                                sx={{ color: "error.main" }}
                              >
                                拒绝理由: {renewal.rejection_reason}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                              {renewal.status === "pending" && (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() =>
                                      handleApproveRenewal(renewal.id)
                                    }
                                    startIcon={<Check size={12} />}
                                  >
                                    批准
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="contained"
                                    onClick={() =>
                                      handleRejectRenewal(renewal.id)
                                    }
                                    startIcon={<X size={12} />}
                                  >
                                    拒绝
                                  </Button>
                                </>
                              )}
                              {renewal.status === "approved" && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    handleExecuteRenewal(renewal.id)
                                  }
                                  startIcon={<RefreshCw size={12} />}
                                >
                                  执行续签
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {modalType !== "view" ? (
            <>
              <Button color="inherit" onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button variant="contained" onClick={handleSave}>
                {modalType === "create" ? "创建" : "保存"}
              </Button>
            </>
          ) : (
            <>
              <Button
                color="inherit"
                onClick={() => setShowRenewals(!showRenewals)}
              >
                {showRenewals ? "隐藏续签记录" : "查看续签记录"}
              </Button>
              <Button
                variant="contained"
                onClick={() => setModalVisible(false)}
              >
                关闭
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={renewModalVisible}
        onClose={() => setRenewModalVisible(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>合同续签申请</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <FormLabel>续签类型 *</FormLabel>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>续签类型</InputLabel>
                <Select
                  value={renewFormState.renewal_type}
                  label="续签类型"
                  onChange={(e) =>
                    setRenewFormState((s) => ({
                      ...s,
                      renewal_type: e.target.value,
                    }))
                  }
                >
                  {renewalTypes.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField
                label="新合同开始日期 *"
                size="small"
                type="date"
                fullWidth
                value={renewFormState.new_start_date}
                onChange={(e) =>
                  setRenewFormState((s) => ({
                    ...s,
                    new_start_date: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="新合同结束日期"
                size="small"
                type="date"
                fullWidth
                value={renewFormState.new_end_date}
                onChange={(e) =>
                  setRenewFormState((s) => ({
                    ...s,
                    new_end_date: e.target.value,
                  }))
                }
                placeholder="无固定期限"
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="新薪资"
              size="small"
              type="number"
              fullWidth
              value={renewFormState.new_salary}
              onChange={(e) =>
                setRenewFormState((s) => ({
                  ...s,
                  new_salary: e.target.value,
                }))
              }
              placeholder="不修改请留空"
            />

            <TextField
              label="续签原因"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={renewFormState.renewal_reason}
              onChange={(e) =>
                setRenewFormState((s) => ({
                  ...s,
                  renewal_reason: e.target.value,
                }))
              }
              placeholder="请说明续签原因"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRenewModalVisible(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSubmitRenew}>
            提交申请
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
