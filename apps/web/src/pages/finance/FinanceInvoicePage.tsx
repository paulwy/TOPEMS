import React, { useState, useMemo } from "react";
import {
  Box,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
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

const FinanceInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [invoiceData, setInvoiceData] = useState<Invoice[]>(mockInvoiceData);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredData = useMemo(() => {
    return invoiceData.filter((invoice) => {
      if (filterType && invoice.invoice_type !== filterType) return false;
      if (filterStatus && invoice.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!invoice.invoice_number.toLowerCase().includes(query) && 
            !invoice.buyer.toLowerCase().includes(query) &&
            !invoice.seller.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [invoiceData, filterType, filterStatus, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
      "已认证": { color: "success", icon: <CheckCircle size={12} /> },
      "待认证": { color: "warning", icon: <Clock size={12} /> },
      "已作废": { color: "error", icon: <XCircle size={12} /> },
    };
    return configs[status] || { color: "default", icon: null };
  };

  const handleCreate = () => {
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
  };

  const handleVerify = (invoice: Invoice) => {
    setInvoiceData(invoiceData.map(i => i.id === invoice.id ? { ...i, status: "已认证" } : i));
    addNotification({ title: "成功", message: "发票认证成功", type: "success" });
  };

  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除该发票吗？")) return;
    setInvoiceData(invoiceData.filter(i => i.id !== id));
    addNotification({ title: "成功", message: "发票删除成功", type: "success" });
  };

  const handleExport = () => {
    addNotification({ title: "导出成功", message: "发票数据已导出", type: "success" });
  };

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: "发票号码",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 600, color: "success.main" }}>
            {row.original.invoice_number}
          </MuiBox>
        ),
      },
      {
        accessorKey: "invoice_date",
        header: "开票日期",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {row.original.invoice_date}
          </MuiBox>
        ),
      },
      {
        accessorKey: "buyer",
        header: "购买方",
        cell: ({ row }) => <MuiBox sx={{ fontWeight: 500 }}>{row.original.buyer}</MuiBox>,
      },
      {
        accessorKey: "seller",
        header: "销售方",
        cell: ({ row }) => <MuiBox sx={{ color: "text.secondary" }}>{row.original.seller}</MuiBox>,
      },
      {
        accessorKey: "amount",
        header: "金额",
        cell: ({ row }) => (
          <MuiBox sx={{ fontFamily: "monospace", fontWeight: 600 }}>
            ¥{row.original.amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        accessorKey: "tax_rate",
        header: "税率",
        cell: ({ row }) => (
          <Chip label={`${row.original.tax_rate}%`} size="small" />
        ),
      },
      {
        accessorKey: "tax_amount",
        header: "税额",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "warning.main", fontFamily: "monospace" }}>
            ¥{row.original.tax_amount.toLocaleString()}
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
            <Tooltip title="查看详情">
              <IconButton size="small" onClick={() => handleViewDetail(row.original)}>
                <Eye sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
            {row.original.status === "待认证" && (
              <Tooltip title="认证抵扣">
                <IconButton size="small" color="success" onClick={() => handleVerify(row.original)}>
                  <CheckCircle sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
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
        label: "发票类型",
        key: "invoice_type",
        type: "select" as const,
        options: [
          { value: "增值税专用发票", label: "增值税专用发票" },
          { value: "增值税普通发票", label: "增值税普通发票" },
        ],
        value: filterType,
        onChange: setFilterType,
      },
      {
        label: "状态",
        key: "status",
        type: "select" as const,
        options: [
          { value: "已认证", label: "已认证" },
          { value: "待认证", label: "待认证" },
          { value: "已作废", label: "已作废" },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterType, filterStatus],
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
                  <Box component="span" sx={{ width: 28, height: 28, mr: 1.5, color: "success.main", display: "flex", alignItems: "center" }}>
                    <FileText size={28} />
                  </Box>
                  发票管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理增值税发票，认证抵扣和查验
                </Typography>
              </MuiBox>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Download sx={{ width: 20, height: 20 }} />} onClick={handleExport}>
                导出
              </Button>
              <Button variant="contained" startIcon={<Plus sx={{ width: 20, height: 20 }} />} onClick={() => setShowCreateModal(true)}>
                开具发票
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
              placeholder="搜索发票号码、购买方、销售方..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ width: 16, height: 16, color: "text.secondary" }} /></InputAdornment> }}
              sx={{ width: 320 }}
            />
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="搜索发票..."
              searchKey="invoice_number"
              enableAdvancedFilter={true}
              advancedFilters={advancedFilters}
              exportFileName="finance-invoices"
            />
          </CardContent>
        </Card>
      </MuiBox>

      {/* Create Modal */}
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
          <Button variant="contained" onClick={handleCreate}>开具</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>发票详情</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">发票号码</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>{selectedInvoice.invoice_number}</Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">开票日期</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.invoice_date}</Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">购买方</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.buyer}</Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">销售方</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedInvoice.seller}</Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">金额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>¥{selectedInvoice.amount.toLocaleString()}</Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税率</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedInvoice.tax_rate}%</Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>¥{selectedInvoice.tax_amount.toLocaleString()}</Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography variant="body2" color="text.secondary">状态</Typography>
                <Chip label={selectedInvoice.status} size="small" color={getStatusConfig(selectedInvoice.status).color} sx={{ mt: 0.5 }} />
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinanceInvoicePage;