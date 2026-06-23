import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from "@/api/shared/wms";
import { wmsApi } from "@/api/shared/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { Plus, Edit, Trash2 } from "lucide-react";
import { apiLogger } from "@/utils/logger";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      apiLogger.error("加载库存失败:", error);
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
      apiLogger.error("操作失败:", error);
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
      apiLogger.error("删除失败:", error);
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

  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      { id: "sku", label: "SKU", sortable: true },
      { id: "name", label: "名称", sortable: true },
      { id: "specification", label: "规格" },
      { id: "unit", label: "单位" },
      { id: "quantity", label: "数量", sortable: true },
      { id: "min_quantity", label: "最小数量" },
      { id: "max_quantity", label: "最大数量" },
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

  const rowActions: RowAction<InventoryItem>[] = useMemo(
    () => [
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
        confirmMessage: "确定要删除这个库存项吗?",
      },
    ],
    [],
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="库存管理"
        subtitle="管理库存信息,包括SKU、名称、规格、数量等"
        columns={columns}
        data={items}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: "新增库存",
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage="暂无库存数据"
        getRowId={(row) => row.id}
      />

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
    </>
  );
};

export default InventoryPage;
