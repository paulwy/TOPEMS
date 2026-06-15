/**
 * FinanceReceiptPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Download,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  Check,
  Clock,
} from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Stack,
} from "@mui/material";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
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

// ============ Mock 数据 ============
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

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
    "已到账": { color: "success", icon: <CheckCircle size={12} /> },
    "已核销": { color: "success", icon: <Check size={12} /> },
    "待核销": { color: "warning", icon: <Clock size={12} /> },
    "待到账": { color: "default", icon: <Clock size={12} /> },
  };
  return configs[status] || { color: "default", icon: null };
};

// ============ 列定义 ============
const getReceiptColumns = (
  onConfirm: (receipt: Receipt) => void,
  onVerify: (receipt: Receipt) => void,
  onView: (receipt: Receipt) => void,
  onDelete: (id: string) => void,
): ColumnDef<Receipt>[] => [
  {
    id: "receipt_number",
    header: "收款单号",
    accessor: "receipt_number",
    render: (value) => (
      <Box sx={{ fontWeight: 600, color: "success.main" }}>{value}</Box>
    ),
  },
  {
    id: "receipt_date",
    header: "收款日期",
    accessor: "receipt_date",
    render: (value) => (
      <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>{value}</Box>
    ),
  },
  {
    id: "customer",
    header: "客户",
    accessor: "customer",
    render: (value) => <Box sx={{ fontWeight: 500 }}>{value}</Box>,
  },
  {
    id: "receipt_method",
    header: "收款方式",
    accessor: "receipt_method",
    render: (value) => <Chip label={value} size="small" />,
  },
  {
    id: "amount",
    header: "收款金额",
    accessor: "amount",
    render: (value) => (
      <Box sx={{ fontWeight: 700, color: "success.main", fontFamily: "monospace" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "bank_account",
    header: "银行账户",
    accessor: "bank_account",
    render: (value) => (
      <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>{value}</Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const config = getStatusConfig(value);
      return (
        <Chip 
          label={value} 
          size="small" 
          color={config.color}
          icon={config.icon as React.ReactElement}
        />
      );
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onConfirm: (receipt: Receipt) => void,
  onVerify: (receipt: Receipt) => void,
  onView: (receipt: Receipt) => void,
  onDelete: (id: string) => void,
): RowAction<Receipt>[] => [
  {
    label: "确认到账",
    icon: <CheckCircle style={{ width: 16, height: 16 }} />,
    onClick: onConfirm,
    color: "success",
  },
  {
    label: "核销",
    icon: <Check style={{ width: 16, height: 16 }} />,
    onClick: onVerify,
    color: "success",
  },
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (receipt) => onDelete(receipt.id),
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索收款单号、客户...",
  },
  {
    id: "receipt_method",
    label: "收款方式",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "银行转账", label: "银行转账" },
      { value: "银行承兑汇票", label: "银行承兑汇票" },
      { value: "商业承兑汇票", label: "商业承兑汇票" },
      { value: "现金", label: "现金" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "已到账", label: "已到账" },
      { value: "已核销", label: "已核销" },
      { value: "待核销", label: "待核销" },
      { value: "待到账", label: "待到账" },
    ],
  },
];

// ============ 组件 ============
const FinanceReceiptPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [receiptData, setReceiptData] = useState<Receipt[]>(mockReceiptData);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const [newReceipt, setNewReceipt] = useState({
    customer: "",
    receipt_method: "银行转账",
    amount: 0,
    bank_account: "",
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return receiptData.filter((receipt) => {
      const matchesSearch =
        !searchText ||
        receipt.receipt_number.toLowerCase().includes(searchText.toLowerCase()) ||
        receipt.customer.toLowerCase().includes(searchText.toLowerCase());
      const matchesMethod = !filterMethod || receipt.receipt_method === filterMethod;
      const matchesStatus = !filterStatus || receipt.status === filterStatus;
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [receiptData, searchText, filterMethod, filterStatus]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "receipt_method") setFilterMethod(value);
      if (filterId === "status") setFilterStatus(value);
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(() => {
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
  }, [receiptData, newReceipt, addNotification]);

  // 处理确认到账
  const handleConfirm = useCallback((receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowConfirmModal(true);
  }, []);

  // 确认收款
  const confirmReceipt = useCallback(() => {
    if (!selectedReceipt) return;
    setReceiptData(receiptData.map(r => r.id === selectedReceipt.id ? { ...r, status: "已到账" } : r));
    addNotification({ title: "成功", message: "收款已确认到账", type: "success" });
    setShowConfirmModal(false);
  }, [receiptData, selectedReceipt, addNotification]);

  // 处理核销
  const handleVerify = useCallback((receipt: Receipt) => {
    setReceiptData(receiptData.map(r => r.id === receipt.id ? { ...r, status: "已核销" } : r));
    addNotification({ title: "成功", message: "收款已核销", type: "success" });
  }, [receiptData, addNotification]);

  // 处理查看
  const handleView = useCallback((receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowConfirmModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    if (!confirm("确定要删除该收款记录吗？")) return;
    setReceiptData(receiptData.filter(r => r.id !== id));
    addNotification({ title: "成功", message: "收款记录已删除", type: "success" });
  }, [receiptData, addNotification]);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "收款数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="收款管理"
        subtitle="管理客户收款登记，确认到账和核销"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={handleExport}
              sx={{ borderColor: "#22c55e", color: "#22c55e" }}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
              sx={{ backgroundColor: "#22c55e" }}
            >
              收款登记
            </Button>
          </Box>
        }
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <ListPageTemplate
          columns={getReceiptColumns(handleConfirm, handleVerify, handleView, handleDelete)}
          data={filteredData}
          rowActions={getRowActions(handleConfirm, handleVerify, handleView, handleDelete)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchPlaceholder="搜索收款单号、客户..."
          emptyMessage="暂无收款数据"
        />
      </Box>

      {/* 新增对话框 */}
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
          <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor: "#22c55e" }}>登记</Button>
        </DialogActions>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认到账</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">收款单号</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>{selectedReceipt.receipt_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">收款日期</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.receipt_date}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">客户</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.customer}</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">收款方式</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.receipt_method}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">收款金额</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>{formatCurrency(selectedReceipt.amount)}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">银行账户</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedReceipt.bank_account}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmReceipt}>确认到账</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceReceiptPageRefactored;
