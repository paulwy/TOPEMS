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
  Box,
  TablePagination,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from "@/api/shared/wms";
import { wmsApi } from "@/api/shared/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit, Trash2 } from "lucide-react";

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<CreateInventoryItemRequest>({
    sku: "",
    name: "",
    specification: "",
    unit: "",
    quantity: 0,
    location_id: "",
    warehouse_id: "",
    min_quantity: 0,
    max_quantity: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadItems();
  }, [currentPage]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await wmsApi.inventory.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setItems(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载库存失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载库存数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await wmsApi.inventory.update(
          selectedItem.id,
          formData as UpdateInventoryItemRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "库存信息已更新",
        });
      } else {
        await wmsApi.inventory.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新库存项已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadItems();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedItem ? "更新库存失败" : "创建库存失败",
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      specification: item.specification || "",
      unit: item.unit || "",
      quantity: item.quantity,
      location_id: item.location_id || "",
      warehouse_id: item.warehouse_id || "",
      min_quantity: item.min_quantity || 0,
      max_quantity: item.max_quantity || 0,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个库存项吗?")) return;
    try {
      await wmsApi.inventory.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "库存项已删除",
      });
      loadItems();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除库存项",
      });
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      sku: "",
      name: "",
      specification: "",
      unit: "",
      quantity: 0,
      location_id: "",
      warehouse_id: "",
      min_quantity: 0,
      max_quantity: 0,
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            库存管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理库存信息,包括SKU、名称、规格、数量等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增库存
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>最小数量</TableCell>
                <TableCell>最大数量</TableCell>
                <TableCell>状态</TableCell>
                <TableCell sx={{ textAlign: "right" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无库存数据"
                      description="点击上方按钮添加第一个库存项"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.specification || "-"}</TableCell>
                    <TableCell>{item.unit || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.min_quantity || "-"}</TableCell>
                    <TableCell>{item.max_quantity || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.status}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Button size="small" onClick={() => handleEdit(item)}>
                        <Edit style={{ width: 16, height: 16 }} />
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </Button>
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
        <DialogTitle>{selectedItem ? "编辑库存" : "新增库存"}</DialogTitle>
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
                label="SKU *"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="名称 *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
                label="最小数量"
                type="number"
                value={formData.min_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_quantity: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="最大数量"
                type="number"
                value={formData.max_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_quantity: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="仓库ID"
                value={formData.warehouse_id}
                onChange={(e) =>
                  setFormData({ ...formData, warehouse_id: e.target.value })
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

export default InventoryPage;
