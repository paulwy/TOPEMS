import React, { useState, useMemo } from "react";
import {
  Box,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { DataExport } from "@/components/common";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  supplier: string;
  payment_method: string;
  amount: number;
  bank_account: string;
  status: string;
}

const mockPaymentData: Payment[] = [
  {
    id: "1",
    payment_number: "FK202401001",
    payment_date: "2024-01-15",
    supplier: "广州电子有限公司",
    payment_method: "银行转账",
    amount: 113000,
    bank_account: "招商银行 ****1234",
    status: "已付款",
  },
  {
    id: "2",
    payment_number: "FK202401002",
    payment_date: "2024-01-18",
    supplier: "东莞制造有限公司",
    payment_method: "银行承兑汇票",
    amount: 56500,
    bank_account: "工商银行 ****5678",
    status: "审批中",
  },
  {
    id: "3",
    payment_number: "FK202401003",
    payment_date: "2024-01-20",
    supplier: "惠州材料有限公司",
    payment_method: "银行转账",
    amount: 226000,
    bank_account: "建设银行 ****9012",
    status: "已付款",
  },
  {
    id: "4",
    payment_number: "FK202401004",
    payment_date: "2024-01-22",
    supplier: "深圳物流公司",
    payment_method: "现金",
    amount: 5000,
    bank_account: "库存现金",
    status: "已付款",
  },
  {
    id: "5",
    payment_number: "FK202401005",
    payment_date: "2024-01-25",
    supplier: "广州电子有限公司",
    payment_method: "银行转账",
    amount: 50000,
    bank_account: "招商银行 ****1234",
    status: "待审批",
  },
  {
    id: "6",
    payment_number: "FK202402001",
    payment_date: "2024-02-05",
    supplier: "佛山配件厂",
    payment_method: "银行转账",
    amount: 85000,
    bank_account: "农业银行 ****3456",
    status: "已付款",
  },
  {
    id: "7",
    payment_number: "FK202402002",
    payment_date: "2024-02-10",
    supplier: "东莞制造有限公司",
    payment_method: "商业承兑汇票",
    amount: 100000,
    bank_account: "中国银行 ****7890",
    status: "审批中",
  },
  {
    id: "8",
    payment_number: "FK202402003",
    payment_date: "2024-02-15",
    supplier: "广州电子有限公司",
    payment_method: "银行转账",
    amount: 30000,
    bank_account: "招商银行 ****1234",
    status: "已付款",
  },
];

const FinancePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [paymentData, setPaymentData] = useState<Payment[]>(mockPaymentData);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [newPayment, setNewPayment] = useState({
    supplier: "",
    payment_method: "银行转账",
    amount: 0,
    bank_account: "",
  });

  const filteredData = useMemo(() => {
    return paymentData.filter((payment) => {
      if (filterMethod && payment.payment_method !== filterMethod) return false;
      if (filterStatus && payment.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !payment.payment_number.toLowerCase().includes(query) &&
          !payment.supplier.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [paymentData, filterMethod, filterStatus, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: "success" | "warning" | "error" | "default";
        icon: React.ReactNode;
      }
    > = {
      已付款: { color: "success", icon: <CheckCircle size={12} /> },
      审批中: { color: "warning", icon: <Clock size={12} /> },
      待审批: { color: "default", icon: <Clock size={12} /> },
      已拒绝: { color: "error", icon: <XCircle size={12} /> },
    };
    return configs[status] || { color: "default", icon: null };
  };

  const handleCreate = () => {
    const newEntry: Payment = {
      id: String(paymentData.length + 1),
      payment_number: `FK${Date.now()}`,
      payment_date: new Date().toISOString().split("T")[0],
      supplier: newPayment.supplier,
      payment_method: newPayment.payment_method,
      amount: newPayment.amount,
      bank_account: newPayment.bank_account || "默认账户",
      status: "待审批",
    };
    setPaymentData([...paymentData, newEntry]);
    addNotification({
      title: "成功",
      message: "付款申请已提交",
      type: "success",
    });
    setShowCreateModal(false);
    setNewPayment({
      supplier: "",
      payment_method: "银行转账",
      amount: 0,
      bank_account: "",
    });
  };

  const handleApprove = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowApproveModal(true);
  };

  const confirmApprove = () => {
    if (!selectedPayment) return;
    setPaymentData(
      paymentData.map((p) =>
        p.id === selectedPayment.id ? { ...p, status: "已付款" } : p,
      ),
    );
    addNotification({ title: "成功", message: "付款已确认", type: "success" });
    setShowApproveModal(false);
  };

  const handleReject = (payment: Payment) => {
    if (!confirm("确定要拒绝该付款申请吗？")) return;
    setPaymentData(
      paymentData.map((p) =>
        p.id === payment.id ? { ...p, status: "已拒绝" } : p,
      ),
    );
    addNotification({
      title: "已拒绝",
      message: "付款申请已拒绝",
      type: "warning",
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该付款记录吗？")) return;
    setPaymentData(paymentData.filter((p) => p.id !== id));
    addNotification({
      title: "成功",
      message: "付款记录已删除",
      type: "success",
    });
  };

  const handleExport = () => {
    addNotification({
      title: "导出成功",
      message: "付款数据已导出",
      type: "success",
    });
  };

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "payment_number",
        header: "付款单号",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 600, color: "success.main" }}>
            {row.original.payment_number}
          </MuiBox>
        ),
      },
      {
        accessorKey: "payment_date",
        header: "付款日期",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.original.payment_date}
          </MuiBox>
        ),
      },
      {
        accessorKey: "supplier",
        header: "供应商",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 500 }}>{row.original.supplier}</MuiBox>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "付款方式",
        cell: ({ row }) => (
          <Chip label={row.original.payment_method} size="small" />
        ),
      },
      {
        accessorKey: "amount",
        header: "付款金额",
        cell: ({ row }) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: "error.main",
              fontFamily: "monospace",
            }}
          >
            ¥{row.original.amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        accessorKey: "bank_account",
        header: "银行账户",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.original.bank_account}
          </MuiBox>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const config = getStatusConfig(row.original.status);
          return (
            <Chip
              label={row.original.status}
              size="small"
              color={config.color}
              icon={config.icon as React.ReactElement}
            />
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            {row.original.status === "待审批" && (
              <>
                <Tooltip title="审批">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleApprove(row.original)}
                  >
                    <CheckCircle sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="拒绝">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleReject(row.original)}
                  >
                    <XCircle sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {row.original.status === "已付款" && (
              <Tooltip title="查看">
                <IconButton size="small">
                  <Eye sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="删除">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row.original.id)}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  const advancedFilters = useMemo(
    () => [
      {
        label: "付款方式",
        key: "payment_method",
        type: "select" as const,
        options: [
          { value: "银行转账", label: "银行转账" },
          { value: "银行承兑汇票", label: "银行承兑汇票" },
          { value: "商业承兑汇票", label: "商业承兑汇票" },
          { value: "现金", label: "现金" },
        ],
        value: filterMethod,
        onChange: setFilterMethod,
      },
      {
        label: "状态",
        key: "status",
        type: "select" as const,
        options: [
          { value: "已付款", label: "已付款" },
          { value: "审批中", label: "审批中" },
          { value: "待审批", label: "待审批" },
          { value: "已拒绝", label: "已拒绝" },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterMethod, filterStatus],
  );

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: "payment_number", title: "付款单号" },
      { key: "payment_date", title: "付款日期" },
      { key: "supplier", title: "供应商" },
      { key: "payment_method", title: "付款方式" },
      { key: "amount", title: "付款金额" },
      { key: "bank_account", title: "银行账户" },
      { key: "status", title: "状态" },
    ],
    [],
  );

  return (
    <MuiBox sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <MuiBox
        sx={{
          bgcolor: "background.paper",
          boxShadow: "sm",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <MuiBox>
                <Typography
                  variant="h5"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component="span"
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: "success.main",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CreditCard size={28} />
                  </MuiBox>
                  付款管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理供应商付款申请，审批和确认付款
                </Typography>
              </MuiBox>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download sx={{ width: 20, height: 20 }} />}
                onClick={handleExport}
              >
                导出
              </Button>
              <DataExport
                data={paymentData as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName="付款数据"
                buttonText="数据导出"
              />
              <Button
                variant="contained"
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                付款申请
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Stack
          sx={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="搜索付款单号、供应商..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ width: 16, height: 16, color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 280 }}
            />
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="搜索付款..."
              searchKey="payment_number"
              enableAdvancedFilter={true}
              advancedFilters={advancedFilters}
              exportFileName="finance-payments"
            />
          </CardContent>
        </Card>
      </MuiBox>

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>付款申请</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              label="供应商 *"
              fullWidth
              value={newPayment.supplier}
              onChange={(e) =>
                setNewPayment({ ...newPayment, supplier: e.target.value })
              }
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>付款方式</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  label="付款方式"
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <MenuItem value="银行转账">银行转账</MenuItem>
                  <MenuItem value="银行承兑汇票">银行承兑汇票</MenuItem>
                  <MenuItem value="商业承兑汇票">商业承兑汇票</MenuItem>
                  <MenuItem value="现金">现金</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="付款金额 *"
                type="number"
                fullWidth
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment({
                    ...newPayment,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Stack>
            <TextField
              label="银行账户"
              fullWidth
              value={newPayment.bank_account}
              onChange={(e) =>
                setNewPayment({ ...newPayment, bank_account: e.target.value })
              }
              placeholder="请输入银行账户"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            提交申请
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Modal */}
      <Dialog
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认付款</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    付款单号
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 600, color: "success.main" }}
                  >
                    {selectedPayment.payment_number}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    付款日期
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedPayment.payment_date}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">
                  供应商
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedPayment.supplier}
                </Typography>
              </MuiBox>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox
                  sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    付款方式
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedPayment.payment_method}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    付款金额
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "error.main" }}
                  >
                    ¥{selectedPayment.amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">
                  银行账户
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedPayment.bank_account}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmApprove}>
            确认付款
          </Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinancePaymentPage;
