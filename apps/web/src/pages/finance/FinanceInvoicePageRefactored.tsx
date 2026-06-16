/**
 * FinanceInvoicePage 重构版本
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
interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  buyer: string;
  seller: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  status: string;
  invoice_type: string;
}

// ============ Mock 数据 ============
const mockInvoiceData: Invoice[] = [
  { id: "1", invoice_number: "FP202401001", invoice_date: "2024-01-15", buyer: "深圳市科技有限公司", seller: "广州电子有限公司", amount: 100000, tax_rate: 13, tax_amount: 13000, status: "已认证", invoice_type: "增值税专用发票" },
  { id: "2", invoice_number: "FP202401002", invoice_date: "2024-01-18", buyer: "深圳市科技有限公司", seller: "东莞制造有限公司", amount: 50000, tax_rate: 13, tax_amount: 6500, status: "待认证", invoice_type: "增值税专用发票" },
  { id: "3", invoice_number: "FP202401003", invoice_date: "2024-01-20", buyer: "广州贸易公司", seller: "深圳市科技有限公司", amount: 80000, tax_rate: 13, tax_amount: 10400, status: "已认证", invoice_type: "增值税专用发票" },
  { id: "4", invoice_number: "FP202401004", invoice_date: "2024-01-22", buyer: "佛山实业公司", seller: "广州电子有限公司", amount: 30000, tax_rate: 13, tax_amount: 3900, status: "已作废", invoice_type: "增值税专用发票" },
  { id: "5", invoice_number: "FP202401005", invoice_date: "2024-01-25", buyer: "深圳市科技有限公司", seller: "惠州材料有限公司", amount: 200000, tax_rate: 13, tax_amount: 26000, status: "已认证", invoice_type: "增值税专用发票" },
  { id: "6", invoice_number: "FP202402001", invoice_date: "2024-02-05", buyer: "广州贸易公司", seller: "深圳贸易公司", amount: 150000, tax_rate: 13, tax_amount: 19500, status: "待认证", invoice_type: "增值税专用发票" },
  { id: "7", invoice_number: "FP202402002", invoice_date: "2024-02-10", buyer: "东莞市公司", seller: "深圳市科技有限公司", amount: 60000, tax_rate: 13, tax_amount: 7800, status: "已认证", invoice_type: "增值税专用发票" },
  { id: "8", invoice_number: "FP202402003", invoice_date: "2024-02-15", buyer: "深圳市科技有限公司", seller: "广州物流有限公司", amount: 25000, tax_rate: 6, tax_amount: 1500, status: "已认证", invoice_type: "增值税普通发票" },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
    "已认证": { color: "success", icon: <CheckCircle size={12} /> },
    "待认证": { color: "warning", icon: <Clock size={12} /> },
    "已作废": { color: "error", icon: <XCircle size={12} /> },
  };
  return configs[status] || { color: "default", icon: null };
};

// ============ 列定义 ============
const getInvoiceColumns = (
  onView: (invoice: Invoice) => void,
  onVerify: (invoice: Invoice) => void,
  onDelete: (id: string) => void,
): ColumnDef<Invoice>[] => [
  {
    id: "invoice_number",
    label: "发票号码",
    render: (row) => (
      <Box sx={{ fontWeight: 600, color: "success.main" }}>{row.invoice_number}</Box>
    ),
  },
  {
    id: "invoice_date",
    label: "开票日期",
    render: (row) => (
      <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>{row.invoice_date}</Box>
    ),
  },
  {
    id: "buyer",
    label: "购买方",
    render: (row) => <Box sx={{ fontWeight: 500 }}>{row.buyer}</Box>,
  },
  {
    id: "seller",
    label: "销售方",
    render: (row) => <Box sx={{ color: "text.secondary" }}>{row.seller}</Box>,
  },
  {
    id: "amount",
    label: "金额",
    render: (row) => (
      <Box sx={{ fontFamily: "monospace", fontWeight: 600 }}>
        {formatCurrency(row.amount)}
      </Box>
    ),
  },
  {
    id: "tax_rate",
    label: "税率",
    render: (row) => <Chip label={`${row.tax_rate}%`} size="small" />,
  },
  {
    id: "tax_amount",
    label: "税额",
    render: (row) => (
      <Box sx={{ color: "warning.main", fontFamily: "monospace" }}>
        {formatCurrency(row.tax_amount)}
      </Box>
    ),
  },
  {
    id: "status",
    label: "状态",
    render: (row) => {
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
];

// ============ 行操作 ============
const getRowActions = (
  onView: (invoice: Invoice) => void,
  onVerify: (invoice: Invoice) => void,
  onDelete: (id: string) => void,
): RowAction<Invoice>[] => [
  {
    label: "查看详情",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "认证抵扣",
    icon: <CheckCircle style={{ width: 16, height: 16 }} />,
    onClick: onVerify,
    color: "success",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (invoice) => onDelete(invoice.id),
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "invoice_type",
    label: "发票类型",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "增值税专用发票", label: "增值税专用发票" },
      { value: "增值税普通发票", label: "增值税普通发票" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "已认证", label: "已认证" },
      { value: "待认证", label: "待认证" },
      { value: "已作废", label: "已作废" },
    ],
  },
];

// ============ 组件 ============
const FinanceInvoicePageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [invoiceData, setInvoiceData] = useState<Invoice[]>(mockInvoiceData);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [newInvoice, setNewInvoice] = useState({
    invoice_number: "",
    buyer: "",
    seller: "",
    amount: 0,
    tax_rate: 13,
    invoice_type: "增值税专用发票",
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return invoiceData.filter((invoice) => {
      const matchesSearch =
        !searchText ||
        invoice.invoice_number.toLowerCase().includes(searchText.toLowerCase()) ||
        invoice.buyer.toLowerCase().includes(searchText.toLowerCase()) ||
        invoice.seller.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = !filterType || invoice.invoice_type === filterType;
      const matchesStatus = !filterStatus || invoice.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [invoiceData, searchText, filterType, filterStatus]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.invoice_type !== undefined) setFilterType(filters.invoice_type);
      if (filters.status !== undefined) setFilterStatus(filters.status);
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(() => {
    const tax_amount = newInvoice.amount * (newInvoice.tax_rate / 100);
    const newEntry: Invoice = {
      id: String(invoiceData.length + 1),
      invoice_number: newInvoice.invoice_number || `FP${Date.now()}`,
      invoice_date: new Date().toISOString().split("T")[0],
      buyer: newInvoice.buyer,
      seller: newInvoice.seller,
      amount: newInvoice.amount,
      tax_rate: newInvoice.tax_rate,
      tax_amount,
      status: "待认证",
      invoice_type: newInvoice.invoice_type,
    };
    setInvoiceData([...invoiceData, newEntry]);
    addNotification({ title: "成功", message: "发票开具成功", type: "success" });
    setShowCreateModal(false);
    setNewInvoice({ invoice_number: "", buyer: "", seller: "", amount: 0, tax_rate: 13, invoice_type: "增值税专用发票" });
  }, [invoiceData, newInvoice, addNotification]);

  // 处理认证
  const handleVerify = useCallback((invoice: Invoice) => {
    setInvoiceData(invoiceData.map(i => i.id === invoice.id ? { ...i, status: "已认证" } : i));
    addNotification({ title: "成功", message: "发票认证成功", type: "success" });
  }, [invoiceData, addNotification]);

  // 处理查看
  const handleView = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    if (!confirm("确定要删除该发票吗？")) return;
    setInvoiceData(invoiceData.filter(i => i.id !== id));
    addNotification({ title: "成功", message: "发票删除成功", type: "success" });
  }, [invoiceData, addNotification]);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "发票数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="发票管理"
        subtitle="管理增值税发票，认证抵扣和查验"
        backButton={{ onClick: () => navigate(-1) }}
        actions={[
          {
            label: "导出",
            icon: <Download style={{ width: 18, height: 18 }} />,
            onClick: handleExport,
            variant: "outlined",
            color: "success",
          },
          {
            label: "开具发票",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: () => setShowCreateModal(true),
            variant: "contained",
            color: "success",
          },
        ]}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <ListPageTemplate
          title="发票列表"
          columns={getInvoiceColumns(handleView, handleVerify, handleDelete)}
          data={filteredData}
          rowActions={getRowActions(handleView, handleVerify, handleDelete)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchValue={searchText}
          onSearch={setSearchText}
          searchPlaceholder="搜索发票号码、购买方、销售方..."
          emptyMessage="暂无发票数据"
        />
      </Box>

      {/* 新增对话框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>开具发票</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField label="发票号码" fullWidth value={newInvoice.invoice_number} onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })} placeholder="系统自动生成" />
            <Stack direction="row" spacing={2}>
              <TextField label="购买方 *" fullWidth value={newInvoice.buyer} onChange={(e) => setNewInvoice({ ...newInvoice, buyer: e.target.value })} />
              <TextField label="销售方 *" fullWidth value={newInvoice.seller} onChange={(e) => setNewInvoice({ ...newInvoice, seller: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="金额 *" type="number" fullWidth value={newInvoice.amount} onChange={(e) => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) || 0 })} />
              <FormControl fullWidth>
                <InputLabel>税率</InputLabel>
                <Select value={newInvoice.tax_rate} label="税率" onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: e.target.value as number })}>
                  <MenuItem value={13}>13%</MenuItem>
                  <MenuItem value={9}>9%</MenuItem>
                  <MenuItem value={6}>6%</MenuItem>
                  <MenuItem value={3}>3%</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>发票类型</InputLabel>
              <Select value={newInvoice.invoice_type} label="发票类型" onChange={(e) => setNewInvoice({ ...newInvoice, invoice_type: e.target.value })}>
                <MenuItem value="增值税专用发票">增值税专用发票</MenuItem>
                <MenuItem value="增值税普通发票">增值税普通发票</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor: "#22c55e" }}>开具</Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>发票详情</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">发票号码</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>{selectedInvoice.invoice_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">开票日期</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.invoice_date}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">购买方</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.buyer}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">销售方</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.seller}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">金额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedInvoice.amount)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税率</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedInvoice.tax_rate}%</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>{formatCurrency(selectedInvoice.tax_amount)}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">状态</Typography>
                <Chip label={selectedInvoice.status} size="small" color={getStatusConfig(selectedInvoice.status).color} sx={{ mt: 0.5 }} />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceInvoicePageRefactored;
