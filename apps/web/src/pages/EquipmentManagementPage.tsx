import { Box, Card, CardContent, CardHeader, Chip, Typography } from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Activity,
  ClipboardCheck,
  Wrench,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetApi, type Asset } from "../api/erp";
import { employeeApi, type Employee } from "../api/hrm";
import {
  mesEquipmentApi,
  type InspectionRecord,
  type MaintenanceRecord,
} from "../api/mesEquipment";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  Checkbox,
} from "@mui/material";
import { ModeToggle } from "@/components/ModeToggle";

interface EquipmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const EquipmentManagementPage: React.FC<EquipmentManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("assets");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedForInspection, setSelectedForInspection] =
    useState<Asset | null>(null);
  const [selectedForMaintenance, setSelectedForMaintenance] =
    useState<Asset | null>(null);

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
  });

  const [newInspection, setNewInspection] = useState<Partial<InspectionRecord>>(
    {
      inspector: "",
      inspection_date: new Date().toISOString().split("T")[0],
      status: "normal",
    },
  );

  const [newMaintenance, setNewMaintenance] = useState<
    Partial<MaintenanceRecord>
  >({
    maintenance_type: "",
    description: "",
    maintainer: "",
    start_time: new Date().toISOString(),
    status: "pending",
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

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

      if (activeTab === "inspections") {
        const inspectionRes = await mesEquipmentApi.listInspections();
        if (inspectionRes.success && inspectionRes.data) {
          setInspections(inspectionRes.data.items || []);
        }
      }

      if (activeTab === "maintenances") {
        const maintenanceRes = await mesEquipmentApi.listMaintenances();
        if (maintenanceRes.success && maintenanceRes.data) {
          setMaintenances(maintenanceRes.data.items || []);
        }
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
          message: "设备创建成功",
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
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建设备失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建设备失败",
        type: "error",
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("确定要删除这个设备吗？")) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "设备删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除设备失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除设备失败",
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
          message: "设备信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新设备失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新设备失败",
        type: "error",
      });
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForInspection) return;
    try {
      const data: any = {
        equipment_id: selectedForInspection.id,
        inspector: newInspection.inspector,
        inspection_date: newInspection.inspection_date,
        status: newInspection.status,
        location: newInspection.location,
        temperature: newInspection.temperature,
        vibration: newInspection.vibration,
        noise_level: newInspection.noise_level,
        abnormalities: newInspection.abnormalities,
        remarks: newInspection.remarks,
      };
      const res = await mesEquipmentApi.createInspection(data);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "点检记录创建成功",
          type: "success",
        });
        setShowInspectionModal(false);
        setSelectedForInspection(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建点检记录失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建点检记录失败",
        type: "error",
      });
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForMaintenance) return;
    try {
      const data: any = {
        equipment_id: selectedForMaintenance.id,
        maintenance_type: newMaintenance.maintenance_type,
        description: newMaintenance.description,
        maintainer: newMaintenance.maintainer,
        start_time: newMaintenance.start_time,
        end_time: newMaintenance.end_time,
        cost: newMaintenance.cost,
        status: newMaintenance.status,
        remarks: newMaintenance.remarks,
      };
      const res = await mesEquipmentApi.createMaintenance(data);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "维护记录创建成功",
          type: "success",
        });
        setShowMaintenanceModal(false);
        setSelectedForMaintenance(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建维护记录失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建维护记录失败",
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

  const assetColumns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: "asset_number",
        header: "设备编号",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.asset_number}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "设备名称",
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
        accessorKey: "department",
        header: "部门",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.department || "-"}
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

              <Tooltip title="点检">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedForInspection(asset);
                    setShowInspectionModal(true);
                  }}
                >
                  <ClipboardCheck className="w-4 h-4 text-blue-500" />
                </Button>
              </Tooltip>

              <Tooltip title="维护">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedForMaintenance(asset);
                    setShowMaintenanceModal(true);
                  }}
                >
                  <Wrench className="w-4 h-4 text-orange-500" />
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

  const inspectionColumns = useMemo<ColumnDef<InspectionRecord>[]>(
    () => [
      {
        accessorKey: "equipment_code",
        header: "设备编号",
        cell: ({ row }) => row.original.equipment_code,
      },
      {
        accessorKey: "equipment_name",
        header: "设备名称",
        cell: ({ row }) => row.original.equipment_name,
      },
      {
        accessorKey: "inspector",
        header: "点检人",
        cell: ({ row }) => row.original.inspector,
      },
      {
        accessorKey: "inspection_date",
        header: "点检日期",
        cell: ({ row }) => row.original.inspection_date,
      },
      {
        accessorKey: "temperature",
        header: "温度(°C)",
        cell: ({ row }) => row.original.temperature || "-",
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <Chip
            size="small"
            color={row.original.status === "normal" ? "success" : "error"}
            label={row.original.status === "normal" ? "正常" : "异常"}
          />
        ),
      },
      {
        accessorKey: "abnormalities",
        header: "异常情况",
        cell: ({ row }) => row.original.abnormalities || "-",
      },
    ],
    [],
  );

  const maintenanceColumns = useMemo<ColumnDef<MaintenanceRecord>[]>(
    () => [
      {
        accessorKey: "equipment_code",
        header: "设备编号",
        cell: ({ row }) => row.original.equipment_code,
      },
      {
        accessorKey: "equipment_name",
        header: "设备名称",
        cell: ({ row }) => row.original.equipment_name,
      },
      {
        accessorKey: "maintenance_type",
        header: "维护类型",
        cell: ({ row }) => row.original.maintenance_type,
      },
      {
        accessorKey: "description",
        header: "维护描述",
        cell: ({ row }) => row.original.description,
      },
      {
        accessorKey: "maintainer",
        header: "维护人员",
        cell: ({ row }) => row.original.maintainer,
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <Chip
            size="small"
            color={
              row.original.status === "completed"
                ? "success"
                : row.original.status === "in_progress"
                  ? "warning"
                  : "default"
            }
            label={
              row.original.status === "pending"
                ? "待处理"
                : row.original.status === "in_progress"
                  ? "进行中"
                  : "完成"
            }
          />
        ),
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
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5 mr-1" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center ml-4">
                  <Activity className="w-7 h-7 mr-3 text-blue-600" />
                  设备管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理设备台账、点巡检、维护维修
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              {activeTab === "assets" && (
                <Button variant="contained" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增设备
                </Button>
              )}
              {activeTab === "inspections" && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedForInspection(assets[0] || null);
                    setShowInspectionModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增点检
                </Button>
              )}
              {activeTab === "maintenances" && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedForMaintenance(assets[0] || null);
                    setShowMaintenanceModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增维护
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          value={activeTab}
          onChange={(_: React.SyntheticEvent, newValue: string) => setActiveTab(newValue)}
        >
          <Tab
            value="assets"
            label={
              <span className="flex items-center">
                <Box className="w-4 h-4 mr-2" />
                设备台账
              </span>
            }
          />
          <Tab
            value="inspections"
            label={
              <span className="flex items-center">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                点检记录
              </span>
            }
          />
          <Tab
            value="maintenances"
            label={
              <span className="flex items-center">
                <Wrench className="w-4 h-4 mr-2" />
                维护维修
              </span>
            }
          />
        </Tabs>

        {activeTab === "assets" && (
          <Card sx={{ mt: 3 }}>
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
                <DataTable
                  columns={assetColumns}
                  data={assets}
                  searchPlaceholder="搜索设备名称、编号、品牌、型号..."
                  searchKey="name"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "inspections" && (
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                  <p className="mt-2 text-slate-500 dark:text-slate-400">
                    加载中...
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={inspectionColumns}
                  data={inspections}
                  searchPlaceholder="搜索点检记录..."
                  searchKey="equipment_name"
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "maintenances" && (
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                  <p className="mt-2 text-slate-500 dark:text-slate-400">
                    加载中...
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={maintenanceColumns}
                  data={maintenances}
                  searchPlaceholder="搜索维护记录..."
                  searchKey="description"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>新增设备</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <form onSubmit={handleCreateAsset}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="设备编号 *"
                  value={newAsset.asset_number || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, asset_number: e.target.value })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="设备名称 *"
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

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="存放位置"
                  value={newAsset.location || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, location: e.target.value })
                  }
                  fullWidth
                />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <TextField
                  label="图片URL"
                  value={newAsset.image_url || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, image_url: e.target.value })
                  }
                  fullWidth
                />
              </div>

              <TextField
                label="技术规格"
                multiline
                rows={3}
                value={newAsset.specifications || ""}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, specifications: e.target.value })
                }
                fullWidth
              />
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
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>编辑设备</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedAsset && (
            <form onSubmit={handleEditAsset}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="设备编号 *"
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
                    label="设备名称 *"
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
        open={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>设备点检记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateInspection}>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">
                  设备: {selectedForInspection?.name} (
                  {selectedForInspection?.asset_number})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="点检人 *"
                  value={newInspection.inspector || ""}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      inspector: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="点检日期 *"
                  type="date"
                  value={newInspection.inspection_date || ""}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      inspection_date: e.target.value,
                    })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <TextField
                  label="温度 (°C)"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={newInspection.temperature || ""}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      temperature: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="振动"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  value={newInspection.vibration || ""}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      vibration: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="噪音 (dB)"
                  type="number"
                  slotProps={{ htmlInput: { step: "0.1" } }}
                  value={newInspection.noise_level || ""}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      noise_level: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <FormControl fullWidth>
                <InputLabel>点检状态</InputLabel>
                <Select
                  value={newInspection.status || "normal"}
                  label="点检状态"
                  onChange={(e) =>
                    setNewInspection({ ...newInspection, status: e.target.value })
                  }
                >
                  <MenuItem value="normal">正常</MenuItem>
                  <MenuItem value="abnormal">异常</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="异常情况"
                multiline
                rows={3}
                value={newInspection.abnormalities || ""}
                onChange={(e) =>
                  setNewInspection({
                    ...newInspection,
                    abnormalities: e.target.value,
                  })
                }
                fullWidth
              />

              <TextField
                label="备注"
                multiline
                rows={2}
                value={newInspection.remarks || ""}
                onChange={(e) =>
                  setNewInspection({
                    ...newInspection,
                    remarks: e.target.value,
                  })
                }
                fullWidth
              />
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <Button
                variant="outlined"
                onClick={() => setShowInspectionModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                提交
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>设备维护记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateMaintenance}>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">
                  设备: {selectedForMaintenance?.name} (
                  {selectedForMaintenance?.asset_number})
                </p>
              </div>

              <FormControl fullWidth>
                <InputLabel>维护类型 *</InputLabel>
                <Select
                  value={newMaintenance.maintenance_type || ""}
                  label="维护类型 *"
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      maintenance_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value="定期维护">定期维护</MenuItem>
                  <MenuItem value="故障维修">故障维修</MenuItem>
                  <MenuItem value="预防性维护">预防性维护</MenuItem>
                  <MenuItem value="大修">大修</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="维护描述 *"
                multiline
                rows={3}
                value={newMaintenance.description || ""}
                onChange={(e) =>
                  setNewMaintenance({
                    ...newMaintenance,
                    description: e.target.value,
                  })
                }
                fullWidth
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="维护人员 *"
                  value={newMaintenance.maintainer || ""}
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      maintainer: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="开始时间 *"
                  type="datetime-local"
                  value={
                    newMaintenance.start_time
                      ? newMaintenance.start_time.substring(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      start_time: new Date(e.target.value).toISOString(),
                    })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="结束时间"
                  type="datetime-local"
                  value={
                    newMaintenance.end_time
                      ? newMaintenance.end_time.substring(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      end_time: new Date(e.target.value).toISOString(),
                    })
                  }
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="费用 (元)"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  value={newMaintenance.cost || ""}
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      cost: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <FormControl fullWidth>
                <InputLabel>维护状态</InputLabel>
                <Select
                  value={newMaintenance.status || "pending"}
                  label="维护状态"
                  onChange={(e) =>
                    setNewMaintenance({ ...newMaintenance, status: e.target.value })
                  }
                >
                  <MenuItem value="pending">待处理</MenuItem>
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="备注"
                multiline
                rows={2}
                value={newMaintenance.remarks || ""}
                onChange={(e) =>
                  setNewMaintenance({
                    ...newMaintenance,
                    remarks: e.target.value,
                  })
                }
                fullWidth
              />
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <Button
                variant="outlined"
                onClick={() => setShowMaintenanceModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                提交
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentManagementPage;
