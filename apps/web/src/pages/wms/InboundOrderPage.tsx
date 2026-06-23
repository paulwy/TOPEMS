import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import type { InboundOrder, CreateInboundOrderRequest } from "@/api/shared/wms";
import { wmsApi } from "@/api/shared/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";
import { Plus } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const InboundOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreateInboundOrderRequest>({
    order_number: "",
    warehouse_id: "",
    supplier_id: "",
    order_date: "",
    expected_arrival: "",
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
      const response = await wmsApi.inboundOrders.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setOrders(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载入库订单失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载入库订单",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await wmsApi.inboundOrders.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新入库订单已创建",
      });
      setShowDialog(false);
      setFormData({
        order_number: "",
        warehouse_id: "",
        supplier_id: "",
        order_date: "",
        expected_arrival: "",
        total_amount: 0,
        remarks: "",
      });
      loadOrders();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建入库订单失败",
      });
    }
  };

  const columns: ColumnDef<InboundOrder>[] = useMemo(
    () => [
      { id: "order_number", label: "订单号", sortable: true },
      { id: "warehouse_id", label: "仓库" },
      { id: "supplier_id", label: "供应商" },
      {
        id: "order_date",
        label: "订单日期",
        render: (row) => new Date(row.order_date).toLocaleDateString("zh-CN"),
      },
      {
        id: "expected_arrival",
        label: "预计到货",
        render: (row) =>
          row.expected_arrival
            ? new Date(row.expected_arrival).toLocaleDateString("zh-CN")
            : "-",
      },
      { id: "total_amount", label: "总金额" },
      {
        id: "status",
        label: "状态",
        render: (row) => (
          <Chip size="small" label={row.status} variant="outlined" />
        ),
      },
    ],
    [],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="入库订单管理"
        subtitle="管理入库订单,包括订单号、仓库、供应商、订单日期等"
        columns={columns}
        data={orders}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: "新增入库订单",
            icon: <Plus size={16} />,
            onClick: () => setShowDialog(true),
          },
        ]}
        emptyMessage="暂无入库订单数据"
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增入库订单</DialogTitle>
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
                label="仓库ID"
                value={formData.warehouse_id}
                onChange={(e) =>
                  setFormData({ ...formData, warehouse_id: e.target.value })
                }
                size="small"
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
                label="预计到货"
                type="date"
                value={formData.expected_arrival}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expected_arrival: e.target.value,
                  })
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

export default InboundOrderPage;
