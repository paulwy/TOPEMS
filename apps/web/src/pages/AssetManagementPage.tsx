import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
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
import { assetApi, type Asset } from "../api/erp";
import { employeeApi, type Employee } from "../api/hrm";
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
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.asset_number}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "资产名称",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
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
        accessorKey: "brand",
        header: "品牌",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.brand || "-"}
          </span>
        ),
      },
      {
        accessorKey: "model",
        header: "型号",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.model || "-"}
          </span>
        ),
      },
      {
        accessorKey: "purchase_amount",
        header: "采购金额",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <DollarSign className="w-3 h-3 mr-1 text-green-600" />
            {row.original.purchase_amount
              ? `¥${row.original.purchase_amount.toLocaleString()}`
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "responsible_id",
        header: "负责人",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <User className="w-3 h-3 mr-1 text-blue-600" />
            {getEmployeeName(row.original.responsible_id || "")}
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
          const asset = row.original;
          return (
            <div className="flex items-center justify-end space-x-2">
              <Tooltip title="编辑">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setShowEditModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip title="删除">
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteAsset(asset.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [employees],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Box className="w-7 h-7 mr-3 text-blue-600" />
                  资产管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理企业资产、设备台账
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button variant="contained" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                新增资产
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  加载中...
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button className="mt-4" onClick={loadData}>
                  重试
                </Button>
              </div>
            ) : (
              <>
                {selectedIds.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedIds.length === assets.length}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
                            if (checked) {
                              setSelectedIds(assets.map((a) => a.id));
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
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleBatchUpdateStatus}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        批量更新状态
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        批量删除
                      </Button>
                    </div>
                  </div>
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
      </div>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增资产</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <form onSubmit={handleCreateAsset}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <TextField
                  label="额定功率 (kW)"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
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
                  slotProps={{ htmlInput: { step: "0.01" } }}
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
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  value={newAsset.rated_current || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_current: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  value={newAsset.purchase_amount || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_amount: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <TextField
                label="存放位置"
                value={newAsset.location || ""}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, location: e.target.value })
                }
                fullWidth
              />

              <div className="grid grid-cols-2 gap-4">
                <FormControl fullWidth>
                  <InputLabel>负责人</InputLabel>
                  <Select
                    value={newAsset.responsible_id || ""}
                    label="负责人"
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, responsible_id: e.target.value })
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
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <Button
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                创建
              </Button>
            </div>
          </form>
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
            <form onSubmit={handleEditAsset}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <TextField
                    label="额定功率 (kW)"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.01" } }}
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
                    slotProps={{ htmlInput: { step: "0.01" } }}
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
                    slotProps={{ htmlInput: { step: "0.01" } }}
                    value={selectedAsset.rated_current || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_current: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                    value={selectedAsset.purchase_amount || ""}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_amount: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </div>

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

                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
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
              </div>
            </form>
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
          <div className="space-y-4">
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
            <p className="text-sm text-slate-500">
              将批量更新{" "}
              <span className="font-semibold">{selectedIds.length}</span>{" "}
              条资产的状态
            </p>
          </div>
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
    </div>
  );
};

export default AssetManagementPage;
