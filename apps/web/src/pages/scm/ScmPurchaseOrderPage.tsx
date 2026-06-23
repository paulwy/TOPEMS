import { TextField, Dialog, DialogTitle, DialogContent, DialogActions, Box, Chip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import type { PurchaseOrder, CreatePurchaseOrderRequest } from "@/api/scm";
import { scmApi } from "@/api/scm";
import { useAppStore } from "@/store";
import { Plus } from "lucide-react";
import { apiLogger } from "@/utils/logger";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";

const ScmPurchaseOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseOrderRequest>({
    order_number: "",
    supplier_id: "",
    order_date: "",
    delivery_date: "",
    total_amount: 0,
    remarks: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseOrders.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setOrders(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载采购订单失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载采购订单",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scmApi.purchaseOrders.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新采购订单已创建",
      });
      setShowDialog(false);
      setFormData({
        order_number: "",
        supplier_id: "",
        order_date: "",
        delivery_date: "",
        total_amount: 0,
        remarks: "",
      });
      loadOrders();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建采购订单失败",
      });
    }
  };

  // 表格列定义
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      id: "order_number",
      label: "订单号",
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.order_number}</Box>,
    },
    {
      id: "supplier_id",
      label: "供应商",
    },
    {
      id: "order_date",
      label: "订单日期",
      render: (row) => (
        <Box sx={{ fontSize: "0.875rem" }}>
          {new Date(row.order_date).toLocaleDateString("zh-CN")}
        </Box>
      ),
    },
    {
      id: "delivery_date",
      label: "交付日期",
      render: (row) => (
        <Box sx={{ fontSize: "0.875rem" }}>
          {row.delivery_date
            ? new Date(row.delivery_date).toLocaleDateString("zh-CN")
            : "-"}
        </Box>
      ),
    },
    {
      id: "total_amount",
      label: "总金额",
      render: (row) => <Box>{row.total_amount || 0}</Box>,
    },
    {
      id: "status",
      label: "状态",
      render: (row) => (
        <Chip size="small" label={row.status} variant="outlined" />
      ),
    },
    {
      id: "remarks",
      label: "备注",
      render: (row) => (
        <Box sx={{ fontSize: "0.875rem" }}>{row.remarks || "-"}</Box>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate
        title="采购订单管理"
        subtitle="管理采购订单,包括订单号、供应商、订单日期、交付日期等"
        columns={columns}
        data={orders}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        actions={[
          {
            label: "新增采购订单",
            icon: <Plus size={16} />,
            onClick: () => setShowDialog(true),
            variant: "contained",
          },
        ]}
        onRefresh={loadOrders}
        emptyMessage="暂无采购订单数据"
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增采购订单</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label="订单号 *"
                value={formData.order_number}
                onChange={(e) =>
                  setFormData({ ...formData, order_number: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="供应商ID"
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                size="small"
              />
              <TextField
                label="订单日期 *"
                type="date"
                value={formData.order_date}
                onChange={(e) =>
                  setFormData({ ...formData, order_date: e.target.value })
                }
                size="small"
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="交付日期"
                type="date"
                value={formData.delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_date: e.target.value })
                }
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="总金额"
                type="number"
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_amount: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
            </Box>
            <TextField
              label="备注"
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              fullWidth
              size="small"
              sx={{ mt: 2 }}
            />
            <DialogActions sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type="submit" variant="contained">
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScmPurchaseOrderPage;
