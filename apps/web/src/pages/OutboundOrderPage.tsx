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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  TablePagination,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type { OutboundOrder, CreateOutboundOrderRequest } from "@/api/wms";
import { wmsApi } from "@/api/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";

const OutboundOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreateOutboundOrderRequest>({
    order_number: "",
    warehouse_id: "",
    customer_id: "",
    order_date: "",
    expected_delivery: "",
    total_amount: 0,
    remarks: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await wmsApi.outboundOrders.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setOrders(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载出库订单失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载出库订单",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await wmsApi.outboundOrders.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新出库订单已创建",
      });
      setShowDialog(false);
      setFormData({
        order_number: "",
        warehouse_id: "",
        customer_id: "",
        order_date: "",
        expected_delivery: "",
        total_amount: 0,
        remarks: "",
      });
      loadOrders();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建出库订单失败",
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            出库订单管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理出库订单,包括订单号、仓库、客户、订单日期等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button variant="contained" onClick={() => setShowDialog(true)}>
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增出库订单
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>订单日期</TableCell>
                <TableCell>预计发货</TableCell>
                <TableCell>总金额</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无出库订单数据"
                      description="点击上方按钮添加第一个出库订单"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {order.order_number}
                    </TableCell>
                    <TableCell>{order.warehouse_id || "-"}</TableCell>
                    <TableCell>{order.customer_id || "-"}</TableCell>
                    <TableCell>
                      {new Date(order.order_date).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery
                        ? new Date(order.expected_delivery).toLocaleDateString(
                            "zh-CN",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>{order.total_amount || 0}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={order.status}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增出库订单</DialogTitle>
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
                label="客户ID"
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value })
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
                label="预计发货"
                type="date"
                value={formData.expected_delivery}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expected_delivery: e.target.value,
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
    </Box>
  );
};

export default OutboundOrderPage;
