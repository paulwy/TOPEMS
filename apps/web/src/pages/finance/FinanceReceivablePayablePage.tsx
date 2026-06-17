import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
} from "@mui/material";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Users,
  CreditCard,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  receivableApi,
  payableApi,
  type Receivable,
  type Payable,
} from "@/api/erp";
import { useAppStore } from "../../store";

const FinanceReceivablePayablePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>("receivable");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Receivable | Payable | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Receivable | Payable | null>(
    null,
  );

  const [formData, setFormData] = useState({
    invoice_number: "",
    customer_name: "",
    supplier_name: "",
    project_name: "",
    category: "",
    amount: "",
    invoice_date: "",
    due_date: "",
    status: "pending",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [receivableRes, payableRes] = await Promise.all([
        receivableApi.list(),
        payableApi.list(),
      ]);
      if (receivableRes.success && receivableRes.data) {
        setReceivables(receivableRes.data.items || []);
      }
      if (payableRes.success && payableRes.data) {
        setPayables(payableRes.data.items || []);
      }
    } catch (err) {
      console.error("加载数据失败:", err);
      addNotification({
        title: "错误",
        message: "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceivable = async () => {
    try {
      const data = {
        invoice_number: formData.invoice_number,
        customer_name: formData.customer_name,
        project_name: formData.project_name,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await receivableApi.create(data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应收账款创建成功",
          type: "success",
        });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error("创建应收账款失败:", err);
      addNotification({
        title: "错误",
        message: "创建应收账款失败",
        type: "error",
      });
    }
  };

  const handleCreatePayable = async () => {
    try {
      const data = {
        invoice_number: formData.invoice_number,
        supplier_name: formData.supplier_name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await payableApi.create(data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应付账款创建成功",
          type: "success",
        });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error("创建应付账款失败:", err);
      addNotification({
        title: "错误",
        message: "创建应付账款失败",
        type: "error",
      });
    }
  };

  const handleUpdateReceivable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_number: formData.invoice_number,
        customer_name: formData.customer_name,
        project_name: formData.project_name,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await receivableApi.update(editingItem.id, data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应收账款更新成功",
          type: "success",
        });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error("更新应收账款失败:", err);
      addNotification({
        title: "错误",
        message: "更新应收账款失败",
        type: "error",
      });
    }
  };

  const handleUpdatePayable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_number: formData.invoice_number,
        supplier_name: formData.supplier_name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await payableApi.update(editingItem.id, data);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应付账款更新成功",
          type: "success",
        });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error("更新应付账款失败:", err);
      addNotification({
        title: "错误",
        message: "更新应付账款失败",
        type: "error",
      });
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!window.confirm("确定要删除此应收账款吗？")) return;
    try {
      const response = await receivableApi.delete(id);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应收账款删除成功",
          type: "success",
        });
        loadData();
      }
    } catch (err) {
      console.error("删除应收账款失败:", err);
      addNotification({
        title: "错误",
        message: "删除应收账款失败",
        type: "error",
      });
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!window.confirm("确定要删除此应付账款吗？")) return;
    try {
      const response = await payableApi.delete(id);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "应付账款删除成功",
          type: "success",
        });
        loadData();
      }
    } catch (err) {
      console.error("删除应付账款失败:", err);
      addNotification({
        title: "错误",
        message: "删除应付账款失败",
        type: "error",
      });
    }
  };

  const openEditDialog = (item: Receivable | Payable) => {
    setEditingItem(item);
    if ("customer_name" in item) {
      setFormData({
        invoice_number: item.invoice_number,
        customer_name: item.customer_name || "",
        supplier_name: "",
        project_name: item.project_name || "",
        category: "",
        amount: item.amount.toString(),
        invoice_date: item.invoice_date || "",
        due_date: item.due_date || "",
        status: item.status,
      });
    } else {
      setFormData({
        invoice_number: item.invoice_number,
        customer_name: "",
        supplier_name: item.supplier_name || "",
        project_name: "",
        category: item.category || "",
        amount: item.amount.toString(),
        invoice_date: item.invoice_date || "",
        due_date: item.due_date || "",
        status: item.status,
      });
    }
    setShowCreateDialog(true);
  };

  const openDetailDialog = (item: Receivable | Payable) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      customer_name: "",
      supplier_name: "",
      project_name: "",
      category: "",
      amount: "",
      invoice_date: "",
      due_date: "",
      status: "pending",
    });
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const colorMap: Record<
      string,
      | "default"
      | "primary"
      | "secondary"
      | "success"
      | "error"
      | "info"
      | "warning"
    > = {
      pending: "warning",
      partial: "warning",
      paid: "success",
      overdue: "error",
      cancelled: "default",
    };
    const labelMap: Record<string, string> = {
      pending: "待收/待付",
      partial: "部分收/付",
      paid: "已结清",
      overdue: "已逾期",
      cancelled: "已取消",
    };
    return (
      <Chip
        size="small"
        color={colorMap[status] || "default"}
        label={labelMap[status] || status}
      />
    );
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalReceivable = receivables.reduce((sum, r) => sum + r.amount, 0);
  const receivedAmount = receivables.reduce(
    (sum, r) => sum + (r.received_amount || 0),
    0,
  );
  const pendingReceivable = receivables
    .filter((r) => r.status !== "paid")
    .reduce((sum, r) => sum + (r.amount - (r.received_amount || 0)), 0);
  const overdueReceivable = receivables
    .filter((r) => isOverdue(r.due_date) && r.status !== "paid")
    .reduce((sum, r) => sum + (r.amount - (r.received_amount || 0)), 0);

  const totalPayable = payables.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payables.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const pendingPayable = payables
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + (p.amount - (p.paid_amount || 0)), 0);
  const overduePayable = payables
    .filter((p) => isOverdue(p.due_date) && p.status !== "paid")
    .reduce((sum, p) => sum + (p.amount - (p.paid_amount || 0)), 0);

  const filteredReceivables = receivables.filter((r) => {
    const matchesSearch =
      r.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPayables = payables.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            应收应付管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理企业应收账款和应付账款
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setShowCreateDialog(true)}>
          <Plus sx={{ width: 16, height: 16, mr: 1 }} />
          <span>新增{activeTab === "receivable" ? "应收" : "应付"}</span>
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <Card
          sx={{
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  应收总额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {formatCurrency(totalReceivable)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <ArrowUpRight sx={{ width: 24, height: 24 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  应付总额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {formatCurrency(totalPayable)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <ArrowDownRight sx={{ width: 24, height: 24 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  待收金额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {formatCurrency(pendingReceivable)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <CreditCard sx={{ width: 24, height: 24 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  待付金额
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                  {formatCurrency(pendingPayable)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                }}
              >
                <CreditCard sx={{ width: 24, height: 24 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab
              value="receivable"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ArrowUpRight sx={{ width: 16, height: 16 }} />
                  <span>应收账款</span>
                </Box>
              }
            />
            <Tab
              value="payable"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ArrowDownRight sx={{ width: 16, height: 16 }} />
                  <span>应付账款</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        <Box
          sx={{ p: 3, display: activeTab === "receivable" ? "block" : "none" }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ position: "relative", flex: 1 }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 3,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <Search sx={{ width: 16, height: 16, color: "grey.400" }} />
              </Box>
              <TextField
                size="small"
                placeholder="搜索单据编号、客户名称或项目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ pl: 5, width: "100%" }}
              />
            </Box>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待收</MenuItem>
                <MenuItem value="partial">部分收</MenuItem>
                <MenuItem value="paid">已结清</MenuItem>
                <MenuItem value="overdue">已逾期</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={loadData}>
              <RefreshCw sx={{ width: 16, height: 16, mr: 1 }} />
              刷新
            </Button>
          </Box>

          <Card>
            <CardHeader>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Users
                    sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    应收账款列表
                  </Typography>
                </Box>
                {overdueReceivable > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`逾期 ${formatCurrency(overdueReceivable)}`}
                  />
                )}
              </Box>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Box sx={{ p: 8, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      width: 32,
                      height: 32,
                      border: 4,
                      borderColor: "primary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    加载中...
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>单据编号</TableCell>
                      <TableCell>客户名称</TableCell>
                      <TableCell>项目名称</TableCell>
                      <TableCell align="right">金额</TableCell>
                      <TableCell align="right">已收</TableCell>
                      <TableCell align="right">待收</TableCell>
                      <TableCell>到期日期</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReceivables.length > 0 ? (
                      filteredReceivables.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontWeight: "medium" }}>
                            {item.invoice_number}
                          </TableCell>
                          <TableCell>{item.customer_name || "-"}</TableCell>
                          <TableCell>{item.project_name || "-"}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.received_amount || 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: "medium",
                              color:
                                isOverdue(item.due_date) &&
                                item.status !== "paid"
                                  ? "error.main"
                                  : "warning.main",
                            }}
                          >
                            {formatCurrency(
                              item.amount - (item.received_amount || 0),
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              color:
                                isOverdue(item.due_date) &&
                                item.status !== "paid"
                                  ? "error.main"
                                  : "text.primary",
                            }}
                          >
                            {item.due_date
                              ? new Date(item.due_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openDetailDialog(item)}
                              >
                                <Eye sx={{ width: 16, height: 16 }} />
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit2 sx={{ width: 16, height: 16 }} />
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                color="error"
                                onClick={() => handleDeleteReceivable(item.id)}
                              >
                                <Trash2 sx={{ width: 16, height: 16 }} />
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                          <AlertCircle
                            sx={{
                              width: 48,
                              height: 48,
                              mx: "auto",
                              color: "grey.300",
                              mb: 1,
                            }}
                          />
                          <Typography color="text.secondary">
                            暂无应收账款数据
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ p: 3, display: activeTab === "payable" ? "block" : "none" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ position: "relative", flex: 1 }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 3,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <Search sx={{ width: 16, height: 16, color: "grey.400" }} />
              </Box>
              <TextField
                size="small"
                placeholder="搜索单据编号、供应商或类别..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ pl: 5, width: "100%" }}
              />
            </Box>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待付</MenuItem>
                <MenuItem value="partial">部分付</MenuItem>
                <MenuItem value="paid">已结清</MenuItem>
                <MenuItem value="overdue">已逾期</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={loadData}>
              <RefreshCw sx={{ width: 16, height: 16, mr: 1 }} />
              刷新
            </Button>
          </Box>

          <Card>
            <CardHeader>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CreditCard
                    sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    应付账款列表
                  </Typography>
                </Box>
                {overduePayable > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`逾期 ${formatCurrency(overduePayable)}`}
                  />
                )}
              </Box>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Box sx={{ p: 8, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      width: 32,
                      height: 32,
                      border: 4,
                      borderColor: "primary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    加载中...
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>单据编号</TableCell>
                      <TableCell>供应商</TableCell>
                      <TableCell>费用类别</TableCell>
                      <TableCell align="right">金额</TableCell>
                      <TableCell align="right">已付</TableCell>
                      <TableCell align="right">待付</TableCell>
                      <TableCell>到期日期</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayables.length > 0 ? (
                      filteredPayables.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontWeight: "medium" }}>
                            {item.invoice_number}
                          </TableCell>
                          <TableCell>{item.supplier_name || "-"}</TableCell>
                          <TableCell>{item.category || "-"}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.paid_amount || 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: "medium",
                              color:
                                isOverdue(item.due_date) &&
                                item.status !== "paid"
                                  ? "error.main"
                                  : "warning.main",
                            }}
                          >
                            {formatCurrency(
                              item.amount - (item.paid_amount || 0),
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              color:
                                isOverdue(item.due_date) &&
                                item.status !== "paid"
                                  ? "error.main"
                                  : "text.primary",
                            }}
                          >
                            {item.due_date
                              ? new Date(item.due_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openDetailDialog(item)}
                              >
                                <Eye sx={{ width: 16, height: 16 }} />
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit2 sx={{ width: 16, height: 16 }} />
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                color="error"
                                onClick={() => handleDeletePayable(item.id)}
                              >
                                <Trash2 sx={{ width: 16, height: 16 }} />
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                          <AlertCircle
                            sx={{
                              width: 48,
                              height: 48,
                              mx: "auto",
                              color: "grey.300",
                              mb: 1,
                            }}
                          />
                          <Typography color="text.secondary">
                            暂无应付账款数据
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingItem(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? "编辑" : "新增"}
          {activeTab === "receivable" ? "应收账款" : "应付账款"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="单据编号"
              value={formData.invoice_number}
              onChange={(e) =>
                setFormData({ ...formData, invoice_number: e.target.value })
              }
              placeholder="请输入单据编号"
              fullWidth
              size="small"
            />
            {activeTab === "receivable" ? (
              <>
                <TextField
                  label="客户名称"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customer_name: e.target.value,
                    })
                  }
                  placeholder="请输入客户名称"
                  fullWidth
                  size="small"
                />
                <TextField
                  label="项目名称"
                  value={formData.project_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_name: e.target.value,
                    })
                  }
                  placeholder="请输入项目名称"
                  fullWidth
                  size="small"
                />
              </>
            ) : (
              <>
                <TextField
                  label="供应商名称"
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_name: e.target.value,
                    })
                  }
                  placeholder="请输入供应商名称"
                  fullWidth
                  size="small"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>费用类别</InputLabel>
                  <Select
                    value={formData.category}
                    label="费用类别"
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <MenuItem value="materials">材料采购</MenuItem>
                    <MenuItem value="services">服务费用</MenuItem>
                    <MenuItem value="salary">薪资福利</MenuItem>
                    <MenuItem value="utilities">水电费用</MenuItem>
                    <MenuItem value="other">其他</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            <TextField
              label="金额"
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="请输入金额"
              fullWidth
              size="small"
            />
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="开票日期"
                type="date"
                value={formData.invoice_date}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="到期日期"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label="状态"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="pending">待收/待付</MenuItem>
                <MenuItem value="partial">部分收/付</MenuItem>
                <MenuItem value="paid">已结清</MenuItem>
                <MenuItem value="overdue">已逾期</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setShowCreateDialog(false);
              setEditingItem(null);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={
              editingItem
                ? activeTab === "receivable"
                  ? handleUpdateReceivable
                  : handleUpdatePayable
                : activeTab === "receivable"
                  ? handleCreateReceivable
                  : handleCreatePayable
            }
          >
            {editingItem ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          {selectedItem && "customer_name" in selectedItem ? (
            <ArrowUpRight
              sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
            />
          ) : (
            <ArrowDownRight
              sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
            />
          )}
          {selectedItem && "customer_name" in selectedItem
            ? "应收账款"
            : "应付账款"}
          详情
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    单据编号
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedItem.invoice_number}
                  </Typography>
                </Box>
                {"customer_name" in selectedItem ? (
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      客户名称
                    </Typography>
                    <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                      {selectedItem.customer_name || "-"}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      供应商
                    </Typography>
                    <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                      {selectedItem.supplier_name || "-"}
                    </Typography>
                  </Box>
                )}
              </Box>

              {"project_name" in selectedItem && selectedItem.project_name && (
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    项目名称
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedItem.project_name}
                  </Typography>
                </Box>
              )}

              {"category" in selectedItem && selectedItem.category && (
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    费用类别
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedItem.category}
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  p: 3,
                  bgcolor: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    总金额
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                  >
                    {formatCurrency(selectedItem.amount)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {"received_amount" in selectedItem ? "已收" : "已付"}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", color: "success.main" }}
                    >
                      {formatCurrency(
                        ("received_amount" in selectedItem
                          ? selectedItem.received_amount
                          : selectedItem.paid_amount) || 0,
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {"received_amount" in selectedItem ? "待收" : "待付"}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: "bold",
                        color:
                          isOverdue(selectedItem.due_date) &&
                          selectedItem.status !== "paid"
                            ? "error.main"
                            : "warning.main",
                      }}
                    >
                      {formatCurrency(
                        selectedItem.amount -
                          (("received_amount" in selectedItem
                            ? selectedItem.received_amount
                            : selectedItem.paid_amount) || 0),
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    开票日期
                  </Typography>
                  <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                    {selectedItem.invoice_date
                      ? new Date(selectedItem.invoice_date).toLocaleDateString()
                      : "-"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor:
                      isOverdue(selectedItem.due_date) &&
                      selectedItem.status !== "paid"
                        ? "error.50"
                        : "grey.50",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    到期日期
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: "medium",
                      mt: 0.5,
                      color:
                        isOverdue(selectedItem.due_date) &&
                        selectedItem.status !== "paid"
                          ? "error.main"
                          : "text.primary",
                    }}
                  >
                    {selectedItem.due_date
                      ? new Date(selectedItem.due_date).toLocaleDateString()
                      : "-"}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  状态
                </Typography>
                {getStatusBadge(selectedItem.status)}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  typography: "body2",
                  color: "text.secondary",
                }}
              >
                <span>
                  创建时间: {new Date(selectedItem.created_at).toLocaleString()}
                </span>
                <span>
                  更新时间: {new Date(selectedItem.updated_at).toLocaleString()}
                </span>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FinanceReceivablePayablePage;
