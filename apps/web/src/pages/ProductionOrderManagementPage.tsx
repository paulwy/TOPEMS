import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  TablePagination,
  Box,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
} from "@/api/mes";
import { mesApi } from "@/api/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

const ProductionOrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateProductionOrderRequest>({
    order_number: "",
    product_name: "",
    quantity: 0,
    scheduled_start_date: "",
    scheduled_end_date: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrders();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await mesApi.orders.list(params);
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载生产订单列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载生产订单列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOrder) {
        await mesApi.orders.update(
          selectedOrder.id,
          formData as UpdateProductionOrderRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "生产订单信息已更新",
        });
      } else {
        await mesApi.orders.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新生产订单已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadOrders();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedOrder ? "更新生产订单失败" : "创建生产订单失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个生产订单吗?")) return;
    try {
      await mesApi.orders.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "生产订单已删除",
      });
      loadOrders();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除生产订单",
      });
    }
  };

  const handleEdit = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      product_name: order.product_name,
      quantity: order.quantity,
      scheduled_start_date: order.scheduled_start_date,
      scheduled_end_date: order.scheduled_end_date,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: "",
      product_name: "",
      quantity: 0,
      scheduled_start_date: "",
      scheduled_end_date: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      pending: { label: "待处理", variant: "outline" },
      in_progress: { label: "进行中", variant: "default" },
      completed: { label: "已完成", variant: "secondary" },
      cancelled: { label: "已取消", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Chip size="small" variant={s.variant === "outline" ? "outlined" : "filled"} label={s.label} />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>生产订单管理</Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理生产订单信息,包括订单号、产品名称、数量、计划时间等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 8, top: 12, width: 16, height: 16, color: 'text.secondary' }} />
                <TextField
                  placeholder="搜索订单号或产品名称..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="small"
                  sx={{ pl: 4, width: '100%' }}
                />
              </Box>
            </Box>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                label="状态筛选"
                onChange={(e) => {
                  setStatusFilter(e.target.value as string);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="pending">待处理</MenuItem>
                <MenuItem value="in_progress">进行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增订单
            </Button>
          </Box>

          {selectedIds.length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                已选择 {selectedIds.length} 个订单
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </Box>
          )}

          <Box sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }}>
                    <Checkbox
                      checked={
                        selectedIds.length === orders.length &&
                        orders.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>订单号</TableCell>
                  <TableCell>产品名称</TableCell>
                  <TableCell>数量</TableCell>
                  <TableCell>计划开始时间</TableCell>
                  <TableCell>计划结束时间</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center' }}>
                      <EmptyState
                        title="暂无生产订单数据"
                        description="点击上方按钮添加第一个生产订单"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        {new Date(
                          order.scheduled_start_date || "",
                        ).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          order.scheduled_end_date || "",
                        ).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Button
                          size="small"
                          onClick={() => handleViewDetail(order)}
                        >
                          <Eye style={{ width: 16, height: 16 }} />
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit style={{ width: 16, height: 16 }} />
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <TablePagination
              component="div"
              count={total}
              page={currentPage - 1}
              rowsPerPage={pageSize}
              onPageChange={(_, newPage) => setCurrentPage(newPage + 1)}
              rowsPerPageOptions={[]}
              sx={{ '.MuiTablePagination-toolbar': { minHeight: 0 } }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="md">
        <DialogTitle>
          {selectedOrder ? "编辑生产订单" : "新增生产订单"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {selectedOrder ? "修改生产订单信息" : "填写新生产订单信息"}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="order_number">订单号 *</InputLabel>
                <TextField
                  id="order_number"
                  required
                  size="small"
                  value={formData.order_number}
                  onChange={(e) =>
                    setFormData({ ...formData, order_number: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="product_name">产品名称 *</InputLabel>
                <TextField
                  id="product_name"
                  required
                  size="small"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="quantity">数量 *</InputLabel>
                <TextField
                  id="quantity"
                  type="number"
                  required
                  size="small"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="scheduled_start_date">计划开始时间 *</InputLabel>
                <TextField
                  id="scheduled_start_date"
                  type="datetime-local"
                  required
                  size="small"
                  value={formData.scheduled_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_start_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="scheduled_end_date">计划结束时间 *</InputLabel>
                <TextField
                  id="scheduled_end_date"
                  type="datetime-local"
                  required
                  size="small"
                  value={formData.scheduled_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_end_date: e.target.value,
                    })
                  }
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type="button"
                variant="outlined"
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button type="submit" variant="contained">
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md">
        <DialogTitle>生产订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单号</InputLabel>
                  <Typography sx={{ fontWeight: 500 }}>{selectedOrder.order_number}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Typography>{selectedOrder.product_name}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                  <Typography>{selectedOrder.quantity}</Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划开始时间</InputLabel>
                  <Typography>
                    {new Date(
                      selectedOrder.scheduled_start_date || "",
                    ).toLocaleString("zh-CN")}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>计划结束时间</InputLabel>
                  <Typography>
                    {new Date(
                      selectedOrder.scheduled_end_date || "",
                    ).toLocaleString("zh-CN")}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Typography>
                    {new Date(selectedOrder.created_at).toLocaleString("zh-CN")}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Typography>
                    {new Date(selectedOrder.updated_at).toLocaleString("zh-CN")}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProductionOrderManagementPage;
