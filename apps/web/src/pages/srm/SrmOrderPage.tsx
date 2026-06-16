import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import {
  Plus,
  ClipboardList,
  Search,
  ShoppingCart,
} from "lucide-react";
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { srmApi } from "../../api/srm";
import type { PurchaseOrder } from "../../api/srm";
import { toast } from "react-toastify";

const SrmOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    order_no: "",
    supplier_id: "",
    supplier_name: "",
    items: "",
    total_amount: "",
    status: "pending",
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listPurchaseOrders();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.orders || [];
        const adapted = items.map((item: any) => ({
          ...item,
          total_amount: item.total_amount || item.amount || 0,
          status: item.status === "pending" ? "待处理" : 
                  item.status === "processing" ? "处理中" : 
                  item.status === "delivered" ? "已交付" : 
                  item.status === "completed" ? "已完成" : 
                  item.status === "cancelled" ? "已取消" : item.status,
          order_date: item.order_date || item.created_at,
        }));
        setOrders(adapted);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("加载订单数据失败:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      "待处理": { bg: "#fef3c7", color: "#b45309" },
      "处理中": { bg: "#dbeafe", color: "#2563eb" },
      "已交付": { bg: "#dcfce7", color: "#15803d" },
      "已完成": { bg: "#e0e7ff", color: "#6366f1" },
      "已取消": { bg: "#fee2e2", color: "#b91c1c" },
    };
    const colors = statusMap[status] || { bg: "#f1f5f9", color: "#475569" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<PurchaseOrder>[] = [
    { accessorKey: "po_no", header: "订单编号" },
    { accessorKey: "supplier_id", header: "供应商ID" },
    {
      accessorKey: "total_amount",
      header: "订单金额",
      cell: ({ row }) => (
        <Typography sx={{ fontWeight: 600, color: "#1f2937" }}>
          ¥{(row.original.total_amount || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "order_date",
      header: "下单日期",
      cell: ({ row }) => {
        const date = row.original.order_date;
        return date ? new Date(date).toLocaleDateString("zh-CN") : "";
      },
    },
  ];

  const filteredOrders = orders.filter((o) => {
    return (
      o.po_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreate = () => {
    setFormData({
      order_no: "",
      supplier_id: "",
      supplier_name: "",
      items: "",
      total_amount: "",
      status: "pending",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createPurchaseOrder({
        po_no: formData.order_no,
        supplier_id: formData.supplier_id,
        total_amount: parseFloat(formData.total_amount),
        status: formData.status,
        currency: "CNY",
      });
      toast.success("订单创建成功");
      setShowCreateModal(false);
      loadOrders();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建订单失败:", err);
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#3b82f6",
              borderTopColor: "#1d4ed8",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingCart sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "slate.900",
                    fontSize: "1.25rem",
                  }}
                >
                  采购订单
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Purchase Orders
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              新增订单
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 2, lg: 5 },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: "#dbeafe" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#bfdbfe",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList sx={{ width: 20, height: 20, color: "#1d4ed8" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    订单总数
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#fef3c7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList sx={{ width: 20, height: 20, color: "#d97706" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    待处理
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.pending}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dbeafe",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList sx={{ width: 20, height: 20, color: "#2563eb" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    处理中
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.processing}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已完成
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.completed}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#e0e7ff",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShoppingCart sx={{ width: 20, height: 20, color: "#6366f1" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    订单总额
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    ¥{stats.totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ClipboardList
                style={{ width: 20, height: 20, color: "#3b82f6" }}
              />
              订单列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索订单编号或供应商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        style={{ width: 18, height: 18, marginRight: 8 }}
                      />
                    ),
                  },
                }}
              />
            </Box>
            <DataTable
              columns={columns}
              data={filteredOrders}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                fullWidth
                label="订单编号 *"
                value={formData.order_no}
                onChange={(e) =>
                  setFormData({ ...formData, order_no: e.target.value })
                }
                placeholder="请输入订单编号"
              />
              <TextField
                fullWidth
                label="供应商名称"
                value={formData.supplier_name}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
                placeholder="请输入供应商名称"
              />
              <TextField
                fullWidth
                label="供应商ID"
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                placeholder="请输入供应商ID"
              />
              <TextField
                fullWidth
                label="订单金额"
                type="number"
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({ ...formData, total_amount: e.target.value })
                }
                placeholder="请输入订单金额"
              />
            </Box>
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="delivered">已交付</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </TextField>
            <TextField
              fullWidth
              label="订单明细(JSON)"
              value={formData.items}
              onChange={(e) =>
                setFormData({ ...formData, items: e.target.value })
              }
              placeholder='[{"product_name": "物料A", "quantity": 100, "price": 10}]'
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: "#3b82f6" }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SrmOrderPage;