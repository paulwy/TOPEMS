/**
 * FinancePaymentPage 重构版本
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
  CreditCard,
  Download,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
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

// ============ Mock 数据 ============
const mockPaymentData: Payment[] = [
  { id: "1", payment_number: "FK202401001", payment_date: "2024-01-15", supplier: "广州电子有限公司", payment_method: "银行转账", amount: 113000, bank_account: "招商银行 ****1234", status: "已付款" },
  { id: "2", payment_number: "FK202401002", payment_date: "2024-01-18", supplier: "东莞制造有限公司", payment_method: "银行承兑汇票", amount: 56500, bank_account: "工商银行 ****5678", status: "审批中" },
  { id: "3", payment_number: "FK202401003", payment_date: "2024-01-20", supplier: "惠州材料有限公司", payment_method: "银行转账", amount: 226000, bank_account: "建设银行 ****9012", status: "已付款" },
  { id: "4", payment_number: "FK202401004", payment_date: "2024-01-22", supplier: "深圳物流公司", payment_method: "现金", amount: 5000, bank_account: "库存现金", status: "已付款" },
  { id: "5", payment_number: "FK202401005", payment_date: "2024-01-25", supplier: "广州电子有限公司", payment_method: "银行转账", amount: 50000, bank_account: "招商银行 ****1234", status: "待审批" },
  { id: "6", payment_number: "FK202402001", payment_date: "2024-02-05", supplier: "佛山配件厂", payment_method: "银行转账", amount: 85000, bank_account: "农业银行 ****3456", status: "已付款" },
  { id: "7", payment_number: "FK202402002", payment_date: "2024-02-10", supplier: "东莞制造有限公司", payment_method: "商业承兑汇票", amount: 100000, bank_account: "中国银行 ****7890", status: "审批中" },
  { id: "8", payment_number: "FK202402003", payment_date: "2024-02-15", supplier: "广州电子有限公司", payment_method: "银行转账", amount: 30000, bank_account: "招商银行 ****1234", status: "已付款" },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
    "已付款": { color: "success", icon: <CheckCircle size={12} /> },
    "审批中": { color: "warning", icon: <Clock size={12} /> },
    "待审批": { color: "default", icon: <Clock size={12} /> },
    "已拒绝": { color: "error", icon: <XCircle size={12} /> },
  };
  return configs[status] || { color: "default", icon: null };
};

// ============ 列定义 ============
const getPaymentColumns = (
  onApprove: (payment: Payment) => void,
  onReject: (payment: Payment) => void,
  onView: (payment: Payment) => void,
  onDelete: (id: string) => void,
): ColumnDef<Payment>[] => [
  {
    id: "payment_number",
    header: "付款单号",
    accessor: "payment_number",
    render: (value) => (
      <Box sx={{ fontWeight: 600, color: "success.main" }}>{value}</Box>
    ),
  },
  {
    id: "payment_date",
    header: "付款日期",
    accessor: "payment_date",
    render: (value) => (
      <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>{value}</Box>
    ),
  },
  {
    id: "supplier",
    header: "供应商",
    accessor: "supplier",
    render: (value) => <Box sx={{ fontWeight: 500 }}>{value}</Box>,
  },
  {
    id: "payment_method",
    header: "付款方式",
    accessor: "payment_method",
    render: (value) => <Chip label={value} size="small" />,
  },
  {
    id: "amount",
    header: "付款金额",
    accessor: "amount",
    render: (value) => (
      <Box sx={{ fontWeight: 700, color: "error.main", fontFamily: "monospace" }}>
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
  onApprove: (payment: Payment) => void,
  onReject: (payment: Payment) => void,
  onView: (payment: Payment) => void,
  onDelete: (id: string) => void,
): RowAction<Payment>[] => [
  {
    label: "审批",
    icon: <CheckCircle style={{ width: 16, height: 16 }} />,
    onClick: onApprove,
    color: "success",
  },
  {
    label: "拒绝",
    icon: <XCircle style={{ width: 16, height: 16 }} />,
    onClick: onReject,
    color: "error",
  },
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (payment) => onDelete(payment.id),
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索付款单号、供应商...",
  },
  {
    id: "payment_method",
    label: "付款方式",
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
      { value: "已付款", label: "已付款" },
      { value: "审批中", label: "审批中" },
      { value: "待审批", label: "待审批" },
      { value: "已拒绝", label: "已拒绝" },
    ],
  },
];

// ============ 组件 ============
const FinancePaymentPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [paymentData, setPaymentData] = useState<Payment[]>(mockPaymentData);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [newPayment, setNewPayment] = useState({
    supplier: "",
    payment_method: "银行转账",
    amount: 0,
    bank_account: "",
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return paymentData.filter((payment) => {
      const matchesSearch =
        !searchText ||
        payment.payment_number.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.supplier.toLowerCase().includes(searchText.toLowerCase());
      const matchesMethod = !filterMethod || payment.payment_method === filterMethod;
      const matchesStatus = !filterStatus || payment.status === filterStatus;
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [paymentData, searchText, filterMethod, filterStatus]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "payment_method") setFilterMethod(value);
      if (filterId === "status") setFilterStatus(value);
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(() => {
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
    addNotification({ title: "成功", message: "付款申请已提交", type: "success" });
    setShowCreateModal(false);
    setNewPayment({ supplier: "", payment_method: "银行转账", amount: 0, bank_account: "" });
  }, [paymentData, newPayment, addNotification]);

  // 处理审批
  const handleApprove = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setShowApproveModal(true);
  }, []);

  // 确认审批
  const confirmApprove = useCallback(() => {
    if (!selectedPayment) return;
    setPaymentData(paymentData.map(p => p.id === selectedPayment.id ? { ...p, status: "已付款" } : p));
    addNotification({ title: "成功", message: "付款已确认", type: "success" });
    setShowApproveModal(false);
  }, [paymentData, selectedPayment, addNotification]);

  // 处理拒绝
  const handleReject = useCallback((payment: Payment) => {
    if (!confirm("确定要拒绝该付款申请吗？")) return;
    setPaymentData(paymentData.map(p => p.id === payment.id ? { ...p, status: "已拒绝" } : p));
    addNotification({ title: "已拒绝", message: "付款申请已拒绝", type: "warning" });
  }, [paymentData, addNotification]);

  // 处理查看
  const handleView = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setShowApproveModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    if (!confirm("确定要删除该付款记录吗？")) return;
    setPaymentData(paymentData.filter(p => p.id !== id));
    addNotification({ title: "成功", message: "付款记录已删除", type: "success" });
  }, [paymentData, addNotification]);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "付款数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="付款管理"
        subtitle="管理供应商付款申请，审批和确认付款"
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
              付款申请
            </Button>
          </Box>
        }
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <ListPageTemplate
          columns={getPaymentColumns(handleApprove, handleReject, handleView, handleDelete)}
          data={filteredData}
          rowActions={getRowActions(handleApprove, handleReject, handleView, handleDelete)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchPlaceholder="搜索付款单号、供应商..."
          emptyMessage="暂无付款数据"
        />
      </Box>

      {/* 新增对话框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>付款申请</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField label="供应商 *" fullWidth value={newPayment.supplier} onChange={(e) => setNewPayment({ ...newPayment, supplier: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>付款方式</InputLabel>
                <Select value={newPayment.payment_method} label="付款方式" onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}>
                  <MenuItem value="银行转账">银行转账</MenuItem>
                  <MenuItem value="银行承兑汇票">银行承兑汇票</MenuItem>
                  <MenuItem value="商业承兑汇票">商业承兑汇票</MenuItem>
                  <MenuItem value="现金">现金</MenuItem>
                </Select>
              </FormControl>
              <TextField label="付款金额 *" type="number" fullWidth value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })} />
            </Stack>
            <TextField label="银行账户" fullWidth value={newPayment.bank_account} onChange={(e) => setNewPayment({ ...newPayment, bank_account: e.target.value })} placeholder="请输入银行账户" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor: "#22c55e" }}>提交申请</Button>
        </DialogActions>
      </Dialog>

      {/* 审批对话框 */}
      <Dialog open={showApproveModal} onClose={() => setShowApproveModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认付款</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">付款单号</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>{selectedPayment.payment_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">付款日期</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedPayment.payment_date}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">供应商</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedPayment.supplier}</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">付款方式</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedPayment.payment_method}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">付款金额</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>{formatCurrency(selectedPayment.amount)}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">银行账户</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedPayment.bank_account}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmApprove}>确认付款</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinancePaymentPageRefactored;
