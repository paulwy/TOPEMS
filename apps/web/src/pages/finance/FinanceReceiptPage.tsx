import React, { useState, useMemo } from "react";
import {
  Box,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
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

interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  customer: string;
  receipt_method: string;
  amount: number;
  bank_account: string;
  status: string;
}

const mockReceiptData: Receipt[] = [
  { id: "1", receipt_number: "SK202401001", receipt_date: "2024-01-15", customer: "深圳市贸易公司", receipt_method: "银行转账", amount: 113000, bank_account: "招商银行 ****1234", status: "已到账" },
  { id: "2", receipt_number: "SK202401002", receipt_date: "2024-01-18", customer: "广州商贸公司", receipt_method: "银行承兑汇票", amount: 56500, bank_account: "工商银行 ****5678", status: "待核销" },
  { id: "3", receipt_number: "SK202401003", receipt_date: "2024-01-20", customer: "东莞实业公司", receipt_method: "银行转账", amount: 226000, bank_account: "建设银行 ****9012", status: "已到账" },
  { id: "4", receipt_number: "SK202401004", receipt_date: "2024-01-22", customer: "佛山贸易公司", receipt_method: "现金", amount: 5000, bank_account: "库存现金", status: "已核销" },
  { id: "5", receipt_number: "SK202401005", receipt_date: "2024-01-25", customer: "惠州商贸公司", receipt_method: "银行转账", amount: 80000, bank_account: "农业银行 ****3456", status: "待到账" },
  { id: "6", receipt_number: "SK202402001", receipt_date: "2024-02-05", customer: "深圳科技有限公司", receipt_method: "银行转账", amount: 150000, bank_account: "中国银行 ****7890", status: "已到账" },
  { id: "7", receipt_number: "SK202402002", receipt_date: "2024-02-10", customer: "广州电子公司", receipt_method: "商业承兑汇票", amount: 100000, bank_account: "招商银行 ****1234", status: "待核销" },
  { id: "8", receipt_number: "SK202402003", receipt_date: "2024-02-15", customer: "东莞制造公司", receipt_method: "银行转账", amount: 75000, bank_account: "建设银行 ****9012", status: "已核销" },
];

const FinanceReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [receiptData, setReceiptData] = useState<Receipt[]>(mockReceiptData);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const [newReceipt, setNewReceipt] = useState({
    customer: "",
    receipt_method: "银行转账",
    amount: 0,
    bank_account: "",
  });

  const filteredData = useMemo(() => {
    return receiptData.filter((receipt) => {
      if (filterMethod && receipt.receipt_method !== filterMethod) return false;
      if (filterStatus && receipt.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!receipt.receipt_number.toLowerCase().includes(query) && 
            !receipt.customer.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [receiptData, filterMethod, filterStatus, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
      "已到账": { color: "success", icon: <CheckCircle size={12} /> },
      "已核销": { color: "success", icon: <Check size={12} /> },
      "待核销": { color: "warning", icon: <Clock size={12} /> },
      "待到账": { color: "default", icon: <Clock size={12} /> },
    };
    return configs[status] || { color: "default", icon: null };
  };

  const handleCreate = () => {
    const newEntry: Receipt = {
      id: String(receiptData.length + 1),
      receipt_number: `SK${Date.now()}`,
      receipt_date: new Date().toISOString().split("T")[0],
      customer: newReceipt.customer,
      receipt_method: newReceipt.receipt_method,
      amount: newReceipt.amount,
      bank_account: newReceipt.bank_account || "默认账户",
      status: "待到账",
    };
    setReceiptData([...receiptData, newEntry]);
    addNotification({ title: "成功", message: "收款登记成功", type: "success" });
    setShowCreateModal(false);
    setNewReceipt({ customer: "", receipt_method: "银行转账", amount: 0, bank_account: "" });
  };

  const handleConfirm = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowConfirmModal(true);
  };

  const confirmReceipt = () => {
    if (!selectedReceipt) return;
    setReceiptData(receiptData.map(r => r.id === selectedReceipt.id ? { ...r, status: "已到账" } : r));
    addNotification({ title: "成功", message: "收款已确认到账", type: "success" });
    setShowConfirmModal(false);
  };

  const handleVerify = (receipt: Receipt) => {
    setReceiptData(receiptData.map(r => r.id === receipt.id ? { ...r, status: "已核销" } : r));
    addNotification({ title: "成功", message: "收款已核销", type: "success" });
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该收款记录吗？")) return;
    setReceiptData(receiptData.filter(r => r.id !== id));
    addNotification({ title: "成功", message: "收款记录已删除", type: "success" });
  };

  const handleExport = () => {
    addNotification({ title: "导出成功", message: "收款数据已导出", type: "success" });
  };

  const columns = useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        accessorKey: "receipt_number",
        header: "收款单号",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 600, color: "success.main" }}>
            {row.original.receipt_number}
          </MuiBox>
        ),
      },
      {
        accessorKey: "receipt_date",
        header: "收款日期",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.original.receipt_date}
          </MuiBox>
        ),
      },
      {
        accessorKey: "customer",
        header: "客户",
        cell: ({ row }) => <MuiBox sx={{ fontWeight: 500 }}>{row.original.customer}</MuiBox>,
      },
      {
        accessorKey: "receipt_method",
        header: "收款方式",
        cell: ({ row }) => <Chip label={row.original.receipt_method} size="small" />,
      },
      {
        accessorKey: "amount",
        header: "收款金额",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 700, color: "success.main", fontFamily: "monospace" }}>
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
            {row.original.status === "待到账" && (
              <Tooltip title="确认到账">
                <IconButton size="small" color="success" onClick={() => handleConfirm(row.original)}>
                  <CheckCircle sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {row.original.status === "已到账" && (
              <Tooltip title="核销">
                <IconButton size="small" color="success" onClick={() => handleVerify(row.original)}>
                  <Check sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="查看">
              <IconButton size="small">
                <Eye sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton size="small" color="error" onClick={() => handleDelete(row.original.id)}>
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
        label: "收款方式",
        key: "receipt_method",
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
          { value: "已到账", label: "已到账" },
          { value: "已核销", label: "已核销" },
          { value: "待核销", label: "待核销" },
          { value: "待到账", label: "待到账" },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterMethod, filterStatus],
  );

  return (
    <MuiBox sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <MuiBox sx={{ bgcolor: "background.paper", boxShadow: "sm", borderBottom: 1, borderColor: "divider" }}>
        <MuiBox sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <MuiBox>
                <Typography variant="h5" sx={{ display: "flex", alignItems: "center", fontWeight: 700 }}>
                  <MuiBox sx={{ width: 28, height: 28, mr: 1.5, color: "success.main", display: "flex", alignItems: "center" }}>
                    <Banknote size={28} />
                  </MuiBox>
                  收款管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理客户收款登记，确认到账和核销
                </Typography>
              </MuiBox>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Download sx={{ width: 20, height: 20 }} />} onClick={handleExport}>
                导出
              </Button>
              <Button variant="contained" startIcon={<Plus sx={{ width: 20, height: 20 }} />} onClick={() => setShowCreateModal(true)}>
                收款登记
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <Stack sx={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="搜索收款单号、客户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ width: 16, height: 16, color: "text.secondary" }} /></InputAdornment> } }}
              sx={{ width: 280 }}
            />
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="搜索收款..."
              searchKey="receipt_number"
              enableAdvancedFilter={true}
              advancedFilters={advancedFilters}
              exportFileName="finance-receipts"
            />
          </CardContent>
        </Card>
      </MuiBox>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>收款登记</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField label="客户 *" fullWidth value={newReceipt.customer} onChange={(e) => setNewReceipt({ ...newReceipt, customer: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>收款方式</InputLabel>
                <Select value={newReceipt.receipt_method} label="收款方式" onChange={(e) => setNewReceipt({ ...newReceipt, receipt_method: e.target.value })}>
                  <MenuItem value="银行转账">银行转账</MenuItem>
                  <MenuItem value="银行承兑汇票">银行承兑汇票</MenuItem>
                  <MenuItem value="商业承兑汇票">商业承兑汇票</MenuItem>
                  <MenuItem value="现金">现金</MenuItem>
                </Select>
              </FormControl>
              <TextField label="收款金额 *" type="number" fullWidth value={newReceipt.amount} onChange={(e) => setNewReceipt({ ...newReceipt, amount: parseFloat(e.target.value) || 0 })} />
            </Stack>
            <TextField label="银行账户" fullWidth value={newReceipt.bank_account} onChange={(e) => setNewReceipt({ ...newReceipt, bank_account: e.target.value })} placeholder="请输入银行账户" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>登记</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认到账</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">收款单号</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>{selectedReceipt.receipt_number}</Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">收款日期</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.receipt_date}</Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">客户</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.customer}</Typography>
              </MuiBox>
              <MuiBox sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <MuiBox sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">收款方式</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.receipt_method}</Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">收款金额</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>¥{selectedReceipt.amount.toLocaleString()}</Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">银行账户</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.bank_account}</Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmReceipt}>确认到账</Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinanceReceiptPage;