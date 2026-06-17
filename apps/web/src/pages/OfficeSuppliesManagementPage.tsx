import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
} from "@mui/material";
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
import { officeSupplyApi, type OfficeSupply } from "@/api/erp";
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
          <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
            {row.original.name}
          </Typography>
        ),
      },
      {
        accessorKey: "category",
        header: "类别",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {row.original.category || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "quantity",
        header: "数量",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "text.primary" }}>
            {row.original.quantity} {row.original.unit || ""}
          </Typography>
        ),
      },
      {
        accessorKey: "price",
        header: "单价",
        cell: ({ row }) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              color: "text.primary",
            }}
          >
            <span style={{ marginRight: 4 }}>
              <DollarSign size={12} style={{ color: "green" }} />
            </span>
            {row.original.price ? `¥${row.original.price.toFixed(2)}` : "-"}
          </Box>
        ),
      },
      {
        accessorKey: "location",
        header: "存放位置",
        cell: ({ row }) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              color: "text.secondary",
            }}
          >
            <span style={{ marginRight: 4 }}>
              <MapPin size={12} style={{ color: "blue" }} />
            </span>
            {row.original.location || "-"}
          </Box>
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Tooltip title="编辑">
                <MuiButton
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedSupply(supply);
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={16} />
                </MuiButton>
              </Tooltip>

              <Tooltip title="删除">
                <MuiButton
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteSupply(supply.id)}
                >
                  <Trash2 size={16} />
                </MuiButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <MuiButton variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </MuiButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  办公用品管理
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  管理办公用品的库存、领用、归还等
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <MuiButton
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} sx={{ mr: 1 }} />
                新增物品
              </MuiButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    animation: "spin 1s linear infinite",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    border: 4,
                    borderColor: "success.main",
                    borderTopColor: "transparent",
                  }}
                />
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AlertCircle
                  size={48}
                  style={{ color: "red", margin: "0 auto 12px" }}
                />
                <Typography sx={{ color: "error.main" }}>{error}</Typography>
                <MuiButton sx={{ mt: 2 }} onClick={loadData}>
                  重试
                </MuiButton>
              </Box>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <Box
                    sx={{
                      bgcolor: "grey.100",
                      borderBottom: 1,
                      borderColor: "divider",
                      px: 3,
                      py: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Checkbox
                          checked={selectedIds.length === supplies.length}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                            checked: boolean,
                          ) => {
                            if (checked) {
                              setSelectedIds(supplies.map((s) => s.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                        <Typography
                          sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                        >
                          已选择 {selectedIds.length} 项
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <MuiButton
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 size={16} sx={{ mr: 0.5 }} />
                        批量删除
                      </MuiButton>
                    </Box>
                  </Box>
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
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新增办公用品</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box component="form" onSubmit={handleCreateSupply}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="物品名称 *"
                value={newSupply.name || ""}
                onChange={(e) =>
                  setNewSupply({ ...newSupply, name: e.target.value })
                }
                fullWidth
                required
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                  gap: 2,
                }}
              >
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
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, md: 2 },
                  gap: 2,
                }}
              >
                <TextField
                  label="单价"
                  type="number"
                  slotProps={{
                    input: { inputProps: { min: 0, step: "0.01" } },
                  }}
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
              </Box>

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
            </Box>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <MuiButton
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </MuiButton>
              <MuiButton variant="contained" type="submit">
                创建
              </MuiButton>
            </Box>
          </Box>
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
            <Box component="form" onSubmit={handleEditSupply}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                    gap: 2,
                  }}
                >
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
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, md: 2 },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="单价"
                    type="number"
                    slotProps={{
                      input: { inputProps: { min: 0, step: "0.01" } },
                    }}
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
                </Box>

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
              </Box>

              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
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
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OfficeSuppliesManagementPage;
