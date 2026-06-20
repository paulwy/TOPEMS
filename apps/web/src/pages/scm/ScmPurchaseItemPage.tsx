import {
  Button,
  Card,
  CardContent,
  CardHeader,
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
import type { PurchaseItem, CreatePurchaseItemRequest } from "@/api/scm";
import { scmApi } from "@/api/scm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const ScmPurchaseItemPage: React.FC = () => {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseItemRequest>({
    order_id: "",
    product_code: "",
    product_name: "",
    specification: "",
    unit: "",
    quantity: 0,
    unit_price: 0,
    amount: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseItems.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setItems(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载采购明细失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载采购明细",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scmApi.purchaseItems.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新采购明细已创建",
      });
      setShowDialog(false);
      setFormData({
        order_id: "",
        product_code: "",
        product_name: "",
        specification: "",
        unit: "",
        quantity: 0,
        unit_price: 0,
        amount: 0,
      });
      loadItems();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建采购明细失败",
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            采购明细管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理采购订单明细,包括产品编码、名称、规格、数量等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button variant="contained" onClick={() => setShowDialog(true)}>
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增采购明细
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单ID</TableCell>
                <TableCell>产品编码</TableCell>
                <TableCell>产品名称</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>单价</TableCell>
                <TableCell>金额</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无采购明细数据"
                      description="点击上方按钮添加第一个采购明细"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.order_id}</TableCell>
                    <TableCell>{item.product_code || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {item.product_name}
                    </TableCell>
                    <TableCell>{item.specification || "-"}</TableCell>
                    <TableCell>{item.unit || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit_price || 0}</TableCell>
                    <TableCell>{item.amount || 0}</TableCell>
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
        <DialogTitle>新增采购明细</DialogTitle>
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
                label="订单ID *"
                value={formData.order_id}
                onChange={(e) =>
                  setFormData({ ...formData, order_id: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="产品编码"
                value={formData.product_code}
                onChange={(e) =>
                  setFormData({ ...formData, product_code: e.target.value })
                }
                size="small"
              />
              <TextField
                label="产品名称 *"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="规格"
                value={formData.specification}
                onChange={(e) =>
                  setFormData({ ...formData, specification: e.target.value })
                }
                size="small"
              />
              <TextField
                label="单位"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                size="small"
              />
              <TextField
                label="数量 *"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseFloat(e.target.value),
                  })
                }
                size="small"
                required
              />
              <TextField
                label="单价"
                type="number"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit_price: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="金额"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
            </Box>
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

export default ScmPurchaseItemPage;
