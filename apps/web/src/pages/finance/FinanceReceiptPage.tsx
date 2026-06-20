import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Banknote,
  CheckCircle,
  Clock,
  Eye,
  Check,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataExport } from "@/components/common";
import { ListPageTemplate, StatCardGroup } from "@/components/mui";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/notification/NotificationContainer";
import { apiLogger } from "@/utils/logger";

import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
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
  {
    id: "1",
    receipt_number: "SK202401001",
    receipt_date: "2024-01-15",
    customer: "深圳市贸易公司",
    receipt_method: "银行转账",
    amount: 113000,
    bank_account: "招商银行 ****1234",
    status: "已到账",
  },
  {
    id: "2",
    receipt_number: "SK202401002",
    receipt_date: "2024-01-18",
    customer: "广州商贸公司",
    receipt_method: "银行承兑汇票",
    amount: 56500,
    bank_account: "工商银行 ****5678",
    status: "待核销",
  },
  {
    id: "3",
    receipt_number: "SK202401003",
    receipt_date: "2024-01-20",
    customer: "东莞实业公司",
    receipt_method: "银行转账",
    amount: 226000,
    bank_account: "建设银行 ****9012",
    status: "已到账",
  },
  {
    id: "4",
    receipt_number: "SK202401004",
    receipt_date: "2024-01-22",
    customer: "佛山贸易公司",
    receipt_method: "现金",
    amount: 5000,
    bank_account: "库存现金",
    status: "已核销",
  },
  {
    id: "5",
    receipt_number: "SK202401005",
    receipt_date: "2024-01-25",
    customer: "惠州商贸公司",
    receipt_method: "银行转账",
    amount: 80000,
    bank_account: "农业银行 ****3456",
    status: "待到账",
  },
  {
    id: "6",
    receipt_number: "SK202402001",
    receipt_date: "2024-02-05",
    customer: "深圳科技有限公司",
    receipt_method: "银行转账",
    amount: 150000,
    bank_account: "中国银行 ****7890",
    status: "已到账",
  },
  {
    id: "7",
    receipt_number: "SK202402002",
    receipt_date: "2024-02-10",
    customer: "广州电子公司",
    receipt_method: "商业承兑汇票",
    amount: 100000,
    bank_account: "招商银行 ****1234",
    status: "待核销",
  },
  {
    id: "8",
    receipt_number: "SK202402003",
    receipt_date: "2024-02-15",
    customer: "东莞制造公司",
    receipt_method: "银行转账",
    amount: 75000,
    bank_account: "建设银行 ****9012",
    status: "已核销",
  },
];

const FinanceReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [receiptData, setReceiptData] = useState<Receipt[]>(mockReceiptData);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

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
        if (
          !receipt.receipt_number.toLowerCase().includes(query) &&
          !receipt.customer.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [receiptData, filterMethod, filterStatus, searchQuery]);

  // 统计卡片数据
  const statCards = useMemo(() => {
    const totalCount = receiptData.length;
    const receivedCount = receiptData.filter(
      (r) => r.status === "已到账",
    ).length;
    const pendingCount = receiptData.filter(
      (r) => r.status === "待到账",
    ).length;
    const verifyCount = receiptData.filter((r) => r.status === "待核销").length;
    const totalAmount = receiptData.reduce((sum, r) => sum + r.amount, 0);

    return [
      {
        title: "总收款数",
        value: totalCount,
        icon: <Banknote size={24} />,
        color: "primary" as const,
      },
      {
        title: "已到账",
        value: receivedCount,
        icon: <CheckCircle size={24} />,
        color: "success" as const,
      },
      {
        title: "待到账",
        value: pendingCount,
        icon: <Clock size={24} />,
        color: "warning" as const,
      },
      {
        title: "待核销",
        value: verifyCount,
        icon: <Clock size={24} />,
        color: "error" as const,
      },
      {
        title: "总金额",
        value: `¥${totalAmount.toLocaleString()}`,
        icon: <Banknote size={24} />,
        color: "secondary" as const,
      },
    ];
  }, [receiptData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: "success" | "warning" | "error" | "default";
        icon: React.ReactNode;
      }
    > = {
      已到账: { color: "success", icon: <CheckCircle size={12} /> },
      已核销: { color: "success", icon: <Check size={12} /> },
      待核销: { color: "warning", icon: <Clock size={12} /> },
      待到账: { color: "default", icon: <Clock size={12} /> },
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
    success("收款登记成功");
    setShowCreateModal(false);
    setNewReceipt({
      customer: "",
      receipt_method: "银行转账",
      amount: 0,
      bank_account: "",
    });
  };

  const handleConfirm = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowConfirmModal(true);
  };

  const confirmReceipt = () => {
    if (!selectedReceipt) return;
    setReceiptData(
      receiptData.map((r) =>
        r.id === selectedReceipt.id ? { ...r, status: "已到账" } : r,
      ),
    );
    success("收款已确认到账");
    setShowConfirmModal(false);
  };

  const handleVerify = (receipt: Receipt) => {
    setReceiptData(
      receiptData.map((r) =>
        r.id === receipt.id ? { ...r, status: "已核销" } : r,
      ),
    );
    success("收款已核销");
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该收款记录吗？")) return;
    setReceiptData(receiptData.filter((r) => r.id !== id));
    success("收款记录已删除");
  };

  const handleSearch = () => {
    // 搜索逻辑已在 filteredData 中处理
  };

  const handleReset = () => {
    setSearchQuery("");
    setFilterMethod("");
    setFilterStatus("");
  };

  const columns = useMemo(
    () => [
      {
        id: "receipt_number",
        label: "收款单号",
        render: (row: Receipt) => (
          <MuiBox sx={{ fontWeight: 600, color: "success.main" }}>
            {row.receipt_number}
          </MuiBox>
        ),
      },
      {
        id: "receipt_date",
        label: "收款日期",
        render: (row: Receipt) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.receipt_date}
          </MuiBox>
        ),
      },
      {
        id: "customer",
        label: "客户",
        render: (row: Receipt) => (
          <MuiBox sx={{ fontWeight: 500 }}>{row.customer}</MuiBox>
        ),
      },
      {
        id: "receipt_method",
        label: "收款方式",
        render: (row: Receipt) => (
          <Chip label={row.receipt_method} size="small" />
        ),
      },
      {
        id: "amount",
        label: "收款金额",
        render: (row: Receipt) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: "success.main",
              fontFamily: "monospace",
            }}
          >
            ¥{row.amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: "bank_account",
        label: "银行账户",
        render: (row: Receipt) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.bank_account}
          </MuiBox>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row: Receipt) => {
          const config = getStatusConfig(row.status);
          return (
            <Chip
              label={row.status}
              size="small"
              color={config.color}
              icon={config.icon as React.ReactElement}
            />
          );
        },
      },
    ],
    [],
  );

  const rowActions = useMemo(
    () => [
      {
        label: "确认到账",
        icon: <CheckCircle sx={{ width: 16, height: 16 }} />,
        color: "success" as const,
        show: (row: Receipt) => row.status === "待到账",
        onClick: (row: Receipt) => handleConfirm(row),
      },
      {
        label: "核销",
        icon: <Check sx={{ width: 16, height: 16 }} />,
        color: "success" as const,
        show: (row: Receipt) => row.status === "已到账",
        onClick: (row: Receipt) => handleVerify(row),
      },
      {
        label: "查看",
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: Receipt) => apiLogger.info("查看", row),
      },
      {
        label: "删除",
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: "error" as const,
        onClick: (row: Receipt) => handleDelete(row.id),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: "receipt_method",
        label: "收款方式",
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
        id: "status",
        label: "状态",
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

  const exportFields = useMemo(
    () => [
      { key: "receipt_number", title: "收款单号" },
      { key: "receipt_date", title: "收款日期" },
      { key: "customer", title: "客户" },
      { key: "receipt_method", title: "收款方式" },
      { key: "amount", title: "收款金额" },
      { key: "bank_account", title: "银行账户" },
      { key: "status", title: "状态" },
    ],
    [],
  );

  return (
    <MuiBox sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />
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
              <IconButton onClick={() => window.location.reload()}>
                <RefreshCw sx={{ width: 20, height: 20 }} />
              </IconButton>
              <DataExport
                data={receiptData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName="收款数据"
                buttonText="数据导出"
              />
              <Button
                variant="contained"
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                收款登记
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        {/* 统计卡片 */}
        <StatCardGroup stats={statCards} columns={5} />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          searchable
          searchPlaceholder="搜索收款单号、客户..."
          filters={advancedFilters}
          filtersValue={{
            receipt_method: filterMethod,
            status: filterStatus,
          }}
          onFilterChange={(filters) => {
            if (filters.receipt_method !== undefined)
              setFilterMethod(filters.receipt_method as string);
            if (filters.status !== undefined)
              setFilterStatus(filters.status as string);
          }}
          onSearch={handleSearch}
          actions={[
            { label: "搜索", variant: "outlined", onClick: handleSearch },
            { label: "重置", variant: "outlined", onClick: handleReset },
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={rowActions}
        />
      </MuiBox>

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>收款登记</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              label="客户 *"
              fullWidth
              value={newReceipt.customer}
              onChange={(e) =>
                setNewReceipt({ ...newReceipt, customer: e.target.value })
              }
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>收款方式</InputLabel>
                <Select
                  value={newReceipt.receipt_method}
                  label="收款方式"
                  onChange={(e) =>
                    setNewReceipt({
                      ...newReceipt,
                      receipt_method: e.target.value,
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
                label="收款金额 *"
                type="number"
                fullWidth
                value={newReceipt.amount}
                onChange={(e) =>
                  setNewReceipt({
                    ...newReceipt,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Stack>
            <TextField
              label="银行账户"
              fullWidth
              value={newReceipt.bank_account}
              onChange={(e) =>
                setNewReceipt({ ...newReceipt, bank_account: e.target.value })
              }
              placeholder="请输入银行账户"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            登记
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Modal */}
      <Dialog
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认到账</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
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
                    收款单号
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 600, color: "success.main" }}
                  >
                    {selectedReceipt.receipt_number}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    收款日期
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedReceipt.receipt_date}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">
                  客户
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedReceipt.customer}
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
                    收款方式
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedReceipt.receipt_method}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    收款金额
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    ¥{selectedReceipt.amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">
                  银行账户
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedReceipt.bank_account}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmReceipt}>
            确认到账
          </Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinanceReceiptPage;
