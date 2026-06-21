import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";
import { apiLogger } from "@/utils/logger";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      apiLogger.error("加载生产订单列表失败:", error);
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
      apiLogger.error("操作失败:", error);
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
      apiLogger.error("删除失败:", error);
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
    return (
      <Chip
        size="small"
        variant={s.variant === "outline" ? "outlined" : "filled"}
        label={s.label}
      />
    );
  };

  const columns: ColumnDef<ProductionOrder>[] = useMemo(
    () => [
      { id: "order_number", label: "订单号", sortable: true },
      { id: "product_name", label: "产品名称", sortable: true },
      { id: "quantity", label: "数量", sortable: true },
      {
        id: "scheduled_start_date",
        label: "计划开始时间",
        render: (row) =>
          row.scheduled_start_date
            ? new Date(row.scheduled_start_date).toLocaleDateString("zh-CN")
            : "-",
      },
      {
        id: "scheduled_end_date",
        label: "计划结束时间",
        render: (row) =>
          row.scheduled_end_date
            ? new Date(row.scheduled_end_date).toLocaleDateString("zh-CN")
            : "-",
      },
      {
        id: "status",
        label: "状态",
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [],
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: "status",
        label: "状态",
        type: "select",
        options: [
          { label: "全部状态", value: "all" },
          { label: "待处理", value: "pending" },
          { label: "进行中", value: "in_progress" },
          { label: "已完成", value: "completed" },
          { label: "已取消", value: "cancelled" },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter],
  );

  const rowActions: RowAction<ProductionOrder>[] = useMemo(
    () => [
      {
        label: "查看详情",
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: "删除",
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: "确定要删除这个生产订单吗?",
      },
    ],
    [],
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="生产订单管理"
        subtitle="管理生产订单信息,包括订单号、产品名称、数量、计划时间等"
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder="搜索订单号或产品名称..."
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={[
          {
            label: "新增订单",
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage="暂无生产订单数据"
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
      >
        <DialogTitle>
          {selectedOrder ? "编辑生产订单" : "新增生产订单"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="span"
            sx={{
              display: "block",
              color: "text.secondary",
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedOrder ? "修改生产订单信息" : "填写新生产订单信息"}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <InputLabel htmlFor="scheduled_start_date">
                  计划开始时间 *
                </InputLabel>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <InputLabel htmlFor="scheduled_end_date">
                  计划结束时间 *
                </InputLabel>
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
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
      >
        <DialogTitle>生产订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    订单号
                  </InputLabel>
                  <Box component="span" sx={{ fontWeight: 500 }}>
                    {selectedOrder.order_number}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    产品名称
                  </InputLabel>
                  <Box component="span">{selectedOrder.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    数量
                  </InputLabel>
                  <Box component="span">{selectedOrder.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    状态
                  </InputLabel>
                  <Box>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    计划开始时间
                  </InputLabel>
                  <Box component="span">
                    {selectedOrder.scheduled_start_date
                      ? new Date(
                          selectedOrder.scheduled_start_date,
                        ).toLocaleString("zh-CN")
                      : "-"}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    计划结束时间
                  </InputLabel>
                  <Box component="span">
                    {selectedOrder.scheduled_end_date
                      ? new Date(
                          selectedOrder.scheduled_end_date,
                        ).toLocaleString("zh-CN")
                      : "-"}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    创建时间
                  </InputLabel>
                  <Box component="span">
                    {new Date(selectedOrder.created_at).toLocaleString("zh-CN")}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: "text.secondary", fontSize: 12 }}>
                    更新时间
                  </InputLabel>
                  <Box component="span">
                    {new Date(selectedOrder.updated_at).toLocaleString("zh-CN")}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductionOrderManagementPage;
