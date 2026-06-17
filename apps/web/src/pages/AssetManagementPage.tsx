import React, { useState, useEffect, useMemo } from "react";
import {
  Box as LucideBox,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  User,
  Settings,
  RefreshCw,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetApi, type Asset } from "@/api/erp";
import { employeeApi, type Employee } from "@/api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

import {
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  TextField,
  InputAdornment,
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
  TableCell,
  tableCellClasses,
  styled,
  Box,
} from "@mui/material";
import { ModeToggle } from "@/components/ModeToggle";

interface AssetManagementPageProps {
  onNavigate?: (page: string) => void;
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.text.primary,
    fontWeight: 600,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const AssetManagementPage: React.FC<AssetManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>("");

  const handleBatchUpdateStatus = () => {
    setShowBatchStatusModal(true);
  };

  const confirmBatchUpdateStatus = async () => {
    if (selectedIds.length === 0 || !batchStatus) return;

    try {
      const promises = selectedIds.map((id) =>
        assetApi.update(id, { status: batchStatus }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: "批量更新成功",
        message: `成功更新 ${successCount} 条资产状态，失败 ${selectedIds.length - successCount} 条`,
        type: "success",
      });

      setSelectedIds([]);
      setShowBatchStatusModal(false);
      setBatchStatus("");
      loadData();
    } catch (err: any) {
      addNotification({
        title: "批量更新失败",
        message: err.message || "批量更新状态失败",
        type: "error",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => assetApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: "批量删除成功",
        message: `成功删除 ${successCount} 条资产，失败 ${selectedIds.length - successCount} 条`,
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

  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    asset_number: "",
    name: "",
    category: "",
    brand: "",
    model: "",
    purchase_date: "",
    purchase_amount: 0,
    location: "",
    responsible_id: "",
    status: "idle",
    serial_number: "",
    manufacturer: "",
    rated_power: 0,
    rated_voltage: 0,
    rated_current: 0,
    department: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, employeeRes] = await Promise.all([
        assetApi.list(),
        employeeApi.list(),
      ]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }

      if (employeeRes.success && employeeRes.data) {
        setEmployees(employeeRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await assetApi.create(newAsset);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "资产创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewAsset({
          asset_number: "",
          name: "",
          category: "",
          brand: "",
          model: "",
          purchase_date: "",
          purchase_amount: 0,
          location: "",
          responsible_id: "",
          status: "idle",
          serial_number: "",
          manufacturer: "",
          rated_power: 0,
          rated_voltage: 0,
          rated_current: 0,
          department: "",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建资产失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建资产失败",
        type: "error",
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("确定要删除这个资产吗？")) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "资产删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除资产失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除资产失败",
        type: "error",
      });
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await assetApi.update(selectedAsset.id, selectedAsset);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "资产信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新资产失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新资产失败",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "success" | "info" | "warning" | "error"> = {
      in_use: "success",
      idle: "info",
      maintenance: "warning",
      scrapped: "error",
    };
    const labels: Record<string, string> = {
      in_use: "使用中",
      idle: "闲置",
      maintenance: "维护中",
      scrapped: "报废",
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

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : "-";
  };

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: "asset_number",
        header: "资产编号",
        cell: ({ row }) => (
          <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
            {row.original.asset_number}
          </Typography>
        ),
      },
      {
        accessorKey: "name",
        header: "资产名称",
        cell: ({ row }) => (
          <Typography sx={{ color: "text.primary" }}>
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
        accessorKey: "brand",
        header: "品牌",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {row.original.brand || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "model",
        header: "型号",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {row.original.model || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "purchase_amount",
        header: "采购金额",
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
            {row.original.purchase_amount
              ? `¥${row.original.purchase_amount.toLocaleString()}`
              : "-"}
          </Box>
        ),
      },
      {
        accessorKey: "responsible_id",
        header: "负责人",
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
              <User size={12} style={{ color: "blue" }} />
            </span>
            {getEmployeeName(row.original.responsible_id || "")}
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
          const asset = row.original;
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
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={16} />
                </Button>
              </Tooltip>

              <Tooltip title="删除">
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteAsset(asset.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [employees],
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
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </Button>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  资产管理
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  管理企业资产、设备台账
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} sx={{ mr: 1 }} />
                新增资产
              </Button>
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
                    borderColor: "primary.main",
                    borderTopColor: "transparent",
                  }}
                />
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <LucideBox
                  size={48}
                  style={{ color: "red", margin: "0 auto 12px" }}
                />
                <Typography sx={{ color: "error.main" }}>{error}</Typography>
                <Button sx={{ mt: 2 }} onClick={loadData}>
                  重试
                </Button>
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
                          checked={selectedIds.length === assets.length}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                            checked: boolean,
                          ) => {
                            if (checked) {
                              setSelectedIds(assets.map((a) => a.id));
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
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleBatchUpdateStatus}
                      >
                        <Settings size={16} sx={{ mr: 0.5 }} />
                        批量更新状态
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 size={16} sx={{ mr: 0.5 }} />
                        批量删除
                      </Button>
                    </Box>
                  </Box>
                )}
                <EnhancedDataTable
                  columns={columns}
                  data={assets}
                  searchPlaceholder="搜索资产名称、编号、品牌、型号..."
                  searchKey="name"
                  loading={loading}
                  enableSelection={true}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  selectionKey="id"
                  enableAdvancedFilter={true}
                  advancedFilters={[
                    {
                      key: "status",
                      label: "状态",
                      type: "select",
                      options: [
                        { value: "", label: "全部" },
                        { value: "in_use", label: "使用中" },
                        { value: "idle", label: "闲置" },
                        { value: "maintenance", label: "维护中" },
                        { value: "scrapped", label: "报废" },
                      ],
                    },
                  ]}
                  exportFileName="asset-report"
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增资产</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box component="form" onSubmit={handleCreateAsset}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, md: 2 },
                  gap: 2,
                }}
              >
                <TextField
                  label="资产编号 *"
                  value={newAsset.asset_number || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, asset_number: e.target.value })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="资产名称 *"
                  value={newAsset.name || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, name: e.target.value })
                  }
                  fullWidth
                  required
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                  gap: 2,
                }}
              >
                <TextField
                  label="类别"
                  value={newAsset.category || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, category: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="品牌"
                  value={newAsset.brand || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, brand: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="型号"
                  value={newAsset.model || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, model: e.target.value })
                  }
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                  gap: 2,
                }}
              >
                <TextField
                  label="序列号"
                  value={newAsset.serial_number || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      serial_number: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="制造商"
                  value={newAsset.manufacturer || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, manufacturer: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  label="部门"
                  value={newAsset.department || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, department: e.target.value })
                  }
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                  gap: 2,
                }}
              >
                <TextField
                  label="额定功率 (kW)"
                  type="number"
                  slotProps={{ input: { inputProps: { step: "0.01" } } }}
                  value={newAsset.rated_power || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_power: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="额定电压 (V)"
                  type="number"
                  slotProps={{ input: { inputProps: { step: "0.01" } } }}
                  value={newAsset.rated_voltage || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_voltage: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="额定电流 (A)"
                  type="number"
                  slotProps={{ input: { inputProps: { step: "0.01" } } }}
                  value={newAsset.rated_current || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_current: Number(e.target.value),
                    })
                  }
                  fullWidth
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
                  label="采购日期"
                  type="date"
                  value={newAsset.purchase_date || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_date: e.target.value,
                    })
                  }
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="采购金额"
                  type="number"
                  slotProps={{
                    input: { inputProps: { min: 0, step: "0.01" } },
                  }}
                  value={newAsset.purchase_amount || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_amount: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Box>

              <TextField
                label="存放位置"
                value={newAsset.location || ""}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, location: e.target.value })
                }
                fullWidth
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: 1, md: 2 },
                  gap: 2,
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>负责人</InputLabel>
                  <Select
                    value={newAsset.responsible_id || ""}
                    label="负责人"
                    onChange={(e) =>
                      setNewAsset({
                        ...newAsset,
                        responsible_id: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="none">无</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={newAsset.status || "idle"}
                    label="状态"
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, status: e.target.value })
                    }
                  >
                    <MenuItem value="idle">闲置</MenuItem>
                    <MenuItem value="in_use">使用中</MenuItem>
                    <MenuItem value="maintenance">维护中</MenuItem>
                    <MenuItem value="scrapped">报废</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                创建
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑资产</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedAsset && (
            <Box component="form" onSubmit={handleEditAsset}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, md: 2 },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="资产编号 *"
                    value={selectedAsset.asset_number}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        asset_number: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label="资产名称 *"
                    value={selectedAsset.name}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        name: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="类别"
                    value={selectedAsset.category || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        category: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="品牌"
                    value={selectedAsset.brand || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        brand: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="型号"
                    value={selectedAsset.model || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        model: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="序列号"
                    value={selectedAsset.serial_number || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        serial_number: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="制造商"
                    value={selectedAsset.manufacturer || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        manufacturer: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="部门"
                    value={selectedAsset.department || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        department: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, sm: 2, md: 3 },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="额定功率 (kW)"
                    type="number"
                    slotProps={{ input: { inputProps: { step: "0.01" } } }}
                    value={selectedAsset.rated_power || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_power: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="额定电压 (V)"
                    type="number"
                    slotProps={{ input: { inputProps: { step: "0.01" } } }}
                    value={selectedAsset.rated_voltage || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_voltage: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="额定电流 (A)"
                    type="number"
                    slotProps={{ input: { inputProps: { step: "0.01" } } }}
                    value={selectedAsset.rated_current || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_current: Number(e.target.value),
                      })
                    }
                    fullWidth
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
                    label="采购日期"
                    type="date"
                    value={selectedAsset.purchase_date || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_date: e.target.value,
                      })
                    }
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="采购金额"
                    type="number"
                    slotProps={{
                      input: { inputProps: { min: 0, step: "0.01" } },
                    }}
                    value={selectedAsset.purchase_amount || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_amount: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Box>

                <TextField
                  label="存放位置"
                  value={selectedAsset.location || ""}
                  onChange={(e) =>
                    setSelectedAsset({
                      ...selectedAsset,
                      location: e.target.value,
                    })
                  }
                  fullWidth
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: 1, md: 2 },
                    gap: 2,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>负责人</InputLabel>
                    <Select
                      value={selectedAsset.responsible_id || ""}
                      label="负责人"
                      onChange={(e) =>
                        setSelectedAsset({
                          ...selectedAsset,
                          responsible_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="none">无</MenuItem>
                      {employees
                        .filter((e) => e.id !== selectedAsset.id)
                        .map((emp) => (
                          <MenuItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={selectedAsset.status}
                      label="状态"
                      onChange={(e) =>
                        setSelectedAsset({
                          ...selectedAsset,
                          status: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="idle">闲置</MenuItem>
                      <MenuItem value="in_use">使用中</MenuItem>
                      <MenuItem value="maintenance">维护中</MenuItem>
                      <MenuItem value="scrapped">报废</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                  }}
                >
                  取消
                </Button>
                <Button variant="contained" type="submit">
                  保存
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBatchStatusModal}
        onClose={() => setShowBatchStatusModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>批量更新状态</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>选择新状态</InputLabel>
              <Select
                value={batchStatus}
                label="选择新状态"
                onChange={(e) => setBatchStatus(e.target.value)}
              >
                <MenuItem value="idle">闲置</MenuItem>
                <MenuItem value="in_use">使用中</MenuItem>
                <MenuItem value="maintenance">维护中</MenuItem>
                <MenuItem value="scrapped">报废</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              将批量更新{" "}
              <Box component="span" sx={{ fontWeight: 600 }}>
                {selectedIds.length}
              </Box>{" "}
              条资产的状态
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setShowBatchStatusModal(false);
              setBatchStatus("");
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatus}
          >
            确认更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetManagementPage;
