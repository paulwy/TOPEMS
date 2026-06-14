import { Button, Card, CardContent, CardHeader, Chip, Typography } from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  MapPin,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { officeSupplyApi, type OfficeSupply } from "../api/erp";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

import {
  Button as MuiButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Checkbox,
} from "@mui/material";
import { ModeToggle } from "@/components/ModeToggle";

interface OfficeSuppliesManagementPageProps {
  onNavigate?: (page: string) => void;
}

const OfficeSuppliesManagementPage: React.FC<
  OfficeSuppliesManagementPageProps
> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [supplies, setSupplies] = useState<OfficeSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<OfficeSupply | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => officeSupplyApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: "批量删除成功",
        message: `成功删除 ${successCount} 条记录，失败 ${selectedIds.length - successCount} 条`,
        type: "success",
      });

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "批量删除失败",
        message: err.message || "批量删除失败",
        type: "error",
      });
    }
  };

  const [newSupply, setNewSupply] = useState<Partial<OfficeSupply>>({
    name: "",
    category: "",
    quantity: 0,
    unit: "",
    price: 0,
    location: "",
    status: "active",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await officeSupplyApi.list();
      if (res.success && res.data) {
        setSupplies(res.data.items || []);
      } else {
        setSupplies([]);
      }
    } catch (err: any) {
      setError(err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await officeSupplyApi.create(newSupply);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "办公用品创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewSupply({
          name: "",
          category: "",
          quantity: 0,
          unit: "",
          price: 0,
          location: "",
          status: "active",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建办公用品失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建办公用品失败",
        type: "error",
      });
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm("确定要删除这个办公用品吗？")) return;
    try {
      const res = await officeSupplyApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "办公用品删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除办公用品失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除办公用品失败",
        type: "error",
      });
    }
  };

  const handleEditSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupply) return;
    try {
      const res = await officeSupplyApi.update(
        selectedSupply.id,
        selectedSupply,
      );
      if (res.success) {
        addNotification({
          title: "成功",
          message: "办公用品信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedSupply(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新办公用品失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新办公用品失败",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "success" | "info" | "warning" | "error"> = {
      active: "success",
      inactive: "info",
      low_stock: "warning",
      out_of_stock: "error",
    };
    const labels: Record<string, string> = {
      active: "正常",
      inactive: "停用",
      low_stock: "库存不足",
      out_of_stock: "缺货",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
        variant="outlined"
      />
    );
  };

  const columns = useMemo<ColumnDef<OfficeSupply>[]>(
    () => [
      {
        accessorKey: "name",
        header: "物品名称",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "类别",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.category || "-"}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "数量",
        cell: ({ row }) => (
          <span className="text-sm text-slate-900 dark:text-slate-100">
            {row.original.quantity} {row.original.unit || ""}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "单价",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <DollarSign className="w-3 h-3 mr-1 text-green-600" />
            {row.original.price ? `¥${row.original.price.toFixed(2)}` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "存放位置",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.location || "-"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const supply = row.original;
          return (
            <div className="flex items-center justify-end space-x-2">
              <Tooltip title="编辑">
                <MuiButton
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedSupply(supply);
                    setShowEditModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </MuiButton>
              </Tooltip>

              <Tooltip title="删除">
                <MuiButton
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteSupply(supply.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </MuiButton>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <MuiButton variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </MuiButton>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Package className="w-7 h-7 mr-3 text-green-600" />
                  办公用品管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理办公用品的库存、领用、归还等
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <MuiButton variant="contained" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                新增物品
              </MuiButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  加载中...
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <MuiButton className="mt-4" onClick={loadData}>
                  重试
                </MuiButton>
              </div>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedIds.length === supplies.length}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
                            if (checked) {
                              setSelectedIds(supplies.map((s) => s.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                        <span className="text-sm text-slate-600">
                          已选择 {selectedIds.length} 项
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MuiButton
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        批量删除
                      </MuiButton>
                    </div>
                  </div>
                )}
                <EnhancedDataTable
                  columns={columns}
                  data={supplies}
                  searchPlaceholder="搜索物品名称、类别、存放位置..."
                  searchKey="name"
                  loading={loading}
                  enableSelection={true}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  selectionKey="id"
                  enableAdvancedFilter={true}
                  advancedFilters={[
                    {
                      key: "category",
                      label: "类别",
                      type: "select",
                      options: [
                        { value: "", label: "全部" },
                        { value: "stationery", label: "文具" },
                        { value: "electronics", label: "电子设备" },
                        { value: "furniture", label: "家具" },
                        { value: "cleaning", label: "清洁用品" },
                        { value: "other", label: "其他" },
                      ],
                    },
                    {
                      key: "status",
                      label: "状态",
                      type: "select",
                      options: [
                        { value: "", label: "全部" },
                        { value: "active", label: "可用" },
                        { value: "low_stock", label: "低库存" },
                        { value: "out_of_stock", label: "缺货" },
                      ],
                    },
                  ]}
                  exportFileName="office-supplies-report"
                  onRefresh={loadData}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新增办公用品</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <form onSubmit={handleCreateSupply}>
            <div className="space-y-4">
              <TextField
                label="物品名称 *"
                value={newSupply.name || ""}
                onChange={(e) =>
                  setNewSupply({ ...newSupply, name: e.target.value })
                }
                fullWidth
                required
              />

              <div className="grid grid-cols-3 gap-4">
                <TextField
                  label="类别"
                  value={newSupply.category || ""}
                  onChange={(e) =>
                    setNewSupply({ ...newSupply, category: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="单位"
                  value={newSupply.unit || ""}
                  onChange={(e) =>
                    setNewSupply({ ...newSupply, unit: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="数量 *"
                  type="number"
                  value={newSupply.quantity || ""}
                  onChange={(e) =>
                    setNewSupply({
                      ...newSupply,
                      quantity: Number(e.target.value),
                    })
                  }
                  fullWidth
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="单价"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  value={newSupply.price || ""}
                  onChange={(e) =>
                    setNewSupply({
                      ...newSupply,
                      price: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="存放位置"
                  value={newSupply.location || ""}
                  onChange={(e) =>
                    setNewSupply({ ...newSupply, location: e.target.value })
                  }
                  fullWidth
                />
              </div>

              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={newSupply.status || "active"}
                  label="状态"
                  onChange={(e) =>
                    setNewSupply({ ...newSupply, status: e.target.value })
                  }
                >
                  <MenuItem value="active">正常</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                  <MenuItem value="low_stock">库存不足</MenuItem>
                  <MenuItem value="out_of_stock">缺货</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <MuiButton
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </MuiButton>
              <MuiButton variant="contained" type="submit">
                创建
              </MuiButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑办公用品</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedSupply && (
            <form onSubmit={handleEditSupply}>
              <div className="space-y-4">
                <TextField
                  label="物品名称 *"
                  value={selectedSupply.name}
                  onChange={(e) =>
                    setSelectedSupply({
                      ...selectedSupply,
                      name: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />

                <div className="grid grid-cols-3 gap-4">
                  <TextField
                    label="类别"
                    value={selectedSupply.category || ""}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        category: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="单位"
                    value={selectedSupply.unit || ""}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        unit: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="数量 *"
                    type="number"
                    value={selectedSupply.quantity}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        quantity: Number(e.target.value),
                      })
                    }
                    fullWidth
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="单价"
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                    value={selectedSupply.price || ""}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        price: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="存放位置"
                    value={selectedSupply.location || ""}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        location: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </div>

                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedSupply.status}
                    label="状态"
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="active">正常</MenuItem>
                    <MenuItem value="inactive">停用</MenuItem>
                    <MenuItem value="low_stock">库存不足</MenuItem>
                    <MenuItem value="out_of_stock">缺货</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <MuiButton
                  variant="outlined"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSupply(null);
                  }}
                >
                  取消
                </MuiButton>
                <MuiButton variant="contained" type="submit">
                  保存
                </MuiButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeSuppliesManagementPage;
