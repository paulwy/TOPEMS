import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Calendar,
  User,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  vehicleApi,
  vehicleRequestApi,
  type Vehicle,
  type VehicleRequest,
} from "../api/erp";
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
  Tabs,
  Tab,
  Tooltip,
  Checkbox,
} from "@mui/material";
import { ModeToggle } from "@/components/ModeToggle";

interface VehicleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const VehicleManagementPage: React.FC<VehicleManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    plate_number: "",
    brand: "",
    model: "",
    vehicle_type: "",
    status: "available",
    driver: "",
    fuel_type: "",
  });

  const [newRequest, setNewRequest] = useState<Partial<VehicleRequest>>({
    vehicle_id: "",
    vehicle_plate: "",
    requester: "",
    purpose: "",
    start_time: "",
    end_time: "",
    driver_required: false,
    status: "pending",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleRes, requestRes] = await Promise.all([
        vehicleApi.list(),
        vehicleRequestApi.list(),
      ]);

      if (vehicleRes.success && vehicleRes.data) {
        setVehicles(vehicleRes.data.items || []);
      }

      if (requestRes.success && requestRes.data) {
        setRequests(requestRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
      setVehicles([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehicleApi.create(newVehicle);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "车辆创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewVehicle({
          plate_number: "",
          brand: "",
          model: "",
          vehicle_type: "",
          status: "available",
          driver: "",
          fuel_type: "",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建车辆失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建车辆失败",
        type: "error",
      });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("确定要删除这辆车吗？")) return;
    try {
      const res = await vehicleApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "车辆删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除车辆失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除车辆失败",
        type: "error",
      });
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const res = await vehicleApi.update(selectedVehicle.id, selectedVehicle);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "车辆信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedVehicle(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新车辆失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新车辆失败",
        type: "error",
      });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehicleRequestApi.create(newRequest);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "用车申请创建成功",
          type: "success",
        });
        setShowRequestModal(false);
        setNewRequest({
          vehicle_id: "",
          vehicle_plate: "",
          requester: "",
          purpose: "",
          start_time: "",
          end_time: "",
          driver_required: false,
          status: "pending",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建用车申请失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建用车申请失败",
        type: "error",
      });
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    try {
      const request = requests.find((r) => r.id === id);
      if (!request) return;

      const res = await vehicleRequestApi.update(id, { ...request, status });
      if (res.success) {
        addNotification({
          title: "成功",
          message: "申请状态更新成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新申请状态失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新申请状态失败",
        type: "error",
      });
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    const colors: Record<string, "success" | "info" | "warning" | "error"> = {
      available: "success",
      in_use: "info",
      maintenance: "warning",
      out_of_service: "error",
    };
    const labels: Record<string, string> = {
      available: "可用",
      in_use: "使用中",
      maintenance: "维护中",
      out_of_service: "停用",
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

  const getRequestStatusBadge = (status: string) => {
    const colors: Record<string, "default" | "success" | "error" | "info"> = {
      pending: "default",
      approved: "success",
      rejected: "error",
      completed: "info",
    };
    const labels: Record<string, string> = {
      pending: "待审批",
      approved: "已批准",
      rejected: "已拒绝",
      completed: "已完成",
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

  const vehicleColumns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        accessorKey: "plate_number",
        header: "车牌号",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.plate_number}
          </div>
        ),
      },
      {
        accessorKey: "brand",
        header: "品牌",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
            {row.original.brand || "-"}
          </div>
        ),
      },
      {
        accessorKey: "model",
        header: "型号",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
            {row.original.model || "-"}
          </div>
        ),
      },
      {
        accessorKey: "vehicle_type",
        header: "车辆类型",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.vehicle_type || "-"}
          </span>
        ),
      },
      {
        accessorKey: "driver",
        header: "司机",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <User className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.driver || "-"}
          </div>
        ),
      },
      {
        accessorKey: "fuel_type",
        header: "燃料类型",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.fuel_type || "-"}
          </span>
        ),
      },
      {
        accessorKey: "mileage",
        header: "里程(km)",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.mileage ? row.original.mileage.toLocaleString() : "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getVehicleStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const vehicle = row.original;
          return (
            <div className="flex items-center justify-end space-x-2">
              <Tooltip title="申请用车">
                <MuiButton
                  variant="text"
                  size="small"
                  onClick={() => {
                    setNewRequest({
                      ...newRequest,
                      vehicle_id: vehicle.id,
                      vehicle_plate: vehicle.plate_number,
                    });
                    setShowRequestModal(true);
                  }}
                >
                  用车
                </MuiButton>
              </Tooltip>
              <Tooltip title="编辑">
                <MuiButton
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedVehicle(vehicle);
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
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </MuiButton>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [vehicles],
  );

  const requestColumns = useMemo<ColumnDef<VehicleRequest>[]>(
    () => [
      {
        accessorKey: "vehicle_plate",
        header: "车牌号",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.vehicle_plate}
          </div>
        ),
      },
      {
        accessorKey: "requester",
        header: "申请人",
        cell: ({ row }) => (
          <div className="text-slate-900 dark:text-slate-100">
            {row.original.requester}
          </div>
        ),
      },
      {
        accessorKey: "purpose",
        header: "用途",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.purpose || "-"}
          </span>
        ),
      },
      {
        accessorKey: "start_time",
        header: "开始时间",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <Calendar className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.start_time
              ? new Date(row.original.start_time).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "end_time",
        header: "结束时间",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <Calendar className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.end_time
              ? new Date(row.original.end_time).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "driver_required",
        header: "需要司机",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.driver_required ? "是" : "否"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getRequestStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const request = row.original;
          return (
            <div className="flex items-center justify-end space-x-2">
              {request.status === "pending" && (
                <>
                  <Tooltip title="批准申请">
                    <MuiButton
                      variant="text"
                      size="small"
                      color="success"
                      onClick={() =>
                        handleUpdateRequestStatus(request.id, "approved")
                      }
                    >
                      批准
                    </MuiButton>
                  </Tooltip>
                  <Tooltip title="拒绝申请">
                    <MuiButton
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() =>
                        handleUpdateRequestStatus(request.id, "rejected")
                      }
                    >
                      拒绝
                    </MuiButton>
                  </Tooltip>
                </>
              )}
              {request.status === "approved" && (
                <Tooltip title="标记完成">
                  <MuiButton
                    variant="text"
                    size="small"
                    color="info"
                    onClick={() =>
                      handleUpdateRequestStatus(request.id, "completed")
                    }
                  >
                    完成
                  </MuiButton>
                </Tooltip>
              )}
            </div>
          );
        },
      },
    ],
    [requests],
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
                  <Car className="w-7 h-7 mr-3 text-blue-600" />
                  车辆管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理企业车辆和用车申请
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <MuiButton
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                添加车辆
              </MuiButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value="vehicles" sx={{ mb: 3 }}>
          <Tab label="车辆列表" value="vehicles" />
          <Tab label="用车申请" value="requests" />
        </Tabs>

        {true && (
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
                  <MuiButton className="mt-4" onClick={loadData}>
                    重试
                  </MuiButton>
                </div>
              ) : (
                <EnhancedDataTable
                  columns={vehicleColumns}
                  data={vehicles}
                  searchPlaceholder="搜索车牌号、品牌、型号..."
                  searchKey="plate_number"
                  loading={loading}
                  exportFileName="vehicle-report"
                  onRefresh={loadData}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>添加车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <form onSubmit={handleCreateVehicle}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="车牌号 *"
                  value={newVehicle.plate_number || ""}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      plate_number: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="品牌"
                  value={newVehicle.brand || ""}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, brand: e.target.value })
                  }
                  fullWidth
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="型号"
                  value={newVehicle.model || ""}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, model: e.target.value })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>车辆类型</InputLabel>
                  <Select
                    value={newVehicle.vehicle_type || ""}
                    label="车辆类型"
                    onChange={(e) =>
                      setNewVehicle({
                        ...newVehicle,
                        vehicle_type: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="sedan">轿车</MenuItem>
                    <MenuItem value="suv">SUV</MenuItem>
                    <MenuItem value="van">面包车</MenuItem>
                    <MenuItem value="truck">货车</MenuItem>
                    <MenuItem value="bus">客车</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="司机"
                  value={newVehicle.driver || ""}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, driver: e.target.value })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>燃料类型</InputLabel>
                  <Select
                    value={newVehicle.fuel_type || ""}
                    label="燃料类型"
                    onChange={(e) =>
                      setNewVehicle({
                        ...newVehicle,
                        fuel_type: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="gasoline">汽油</MenuItem>
                    <MenuItem value="diesel">柴油</MenuItem>
                    <MenuItem value="electric">电动</MenuItem>
                    <MenuItem value="hybrid">混动</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="里程(km)"
                  type="number"
                  value={newVehicle.mileage || ""}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      mileage: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={newVehicle.status || "available"}
                    label="状态"
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, status: e.target.value })
                    }
                  >
                    <MenuItem value="available">可用</MenuItem>
                    <MenuItem value="in_use">使用中</MenuItem>
                    <MenuItem value="maintenance">维护中</MenuItem>
                    <MenuItem value="out_of_service">停用</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <TextField
                label="上次保养时间"
                type="date"
                value={newVehicle.last_service || ""}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    last_service: e.target.value,
                  })
                }
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <MuiButton
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </MuiButton>
              <MuiButton variant="contained" type="submit">
                添加
              </MuiButton>
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
        <DialogTitle>编辑车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedVehicle && (
            <form onSubmit={handleEditVehicle}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="车牌号 *"
                    value={selectedVehicle.plate_number}
                    onChange={(e) =>
                      setSelectedVehicle({
                        ...selectedVehicle,
                        plate_number: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label="品牌"
                    value={selectedVehicle.brand || ""}
                    onChange={(e) =>
                      setSelectedVehicle({
                        ...selectedVehicle,
                        brand: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="型号"
                    value={selectedVehicle.model || ""}
                    onChange={(e) =>
                      setSelectedVehicle({
                        ...selectedVehicle,
                        model: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>车辆类型</InputLabel>
                    <Select
                      value={selectedVehicle.vehicle_type || ""}
                      label="车辆类型"
                      onChange={(e) =>
                        setSelectedVehicle({
                          ...selectedVehicle,
                          vehicle_type: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="sedan">轿车</MenuItem>
                      <MenuItem value="suv">SUV</MenuItem>
                      <MenuItem value="van">面包车</MenuItem>
                      <MenuItem value="truck">货车</MenuItem>
                      <MenuItem value="bus">客车</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="司机"
                    value={selectedVehicle.driver || ""}
                    onChange={(e) =>
                      setSelectedVehicle({
                        ...selectedVehicle,
                        driver: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>燃料类型</InputLabel>
                    <Select
                      value={selectedVehicle.fuel_type || ""}
                      label="燃料类型"
                      onChange={(e) =>
                        setSelectedVehicle({
                          ...selectedVehicle,
                          fuel_type: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="gasoline">汽油</MenuItem>
                      <MenuItem value="diesel">柴油</MenuItem>
                      <MenuItem value="electric">电动</MenuItem>
                      <MenuItem value="hybrid">混动</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="里程(km)"
                    type="number"
                    value={selectedVehicle.mileage || ""}
                    onChange={(e) =>
                      setSelectedVehicle({
                        ...selectedVehicle,
                        mileage: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={selectedVehicle.status}
                      label="状态"
                      onChange={(e) =>
                        setSelectedVehicle({
                          ...selectedVehicle,
                          status: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="available">可用</MenuItem>
                      <MenuItem value="in_use">使用中</MenuItem>
                      <MenuItem value="maintenance">维护中</MenuItem>
                      <MenuItem value="out_of_service">停用</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <TextField
                  label="上次保养时间"
                  type="date"
                  value={selectedVehicle.last_service || ""}
                  onChange={(e) =>
                    setSelectedVehicle({
                      ...selectedVehicle,
                      last_service: e.target.value,
                    })
                  }
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <MuiButton
                  variant="outlined"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVehicle(null);
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

      <Dialog
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>申请用车</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateRequest}>
            <div className="space-y-4">
              <FormControl fullWidth>
                <InputLabel>选择车辆</InputLabel>
                <Select
                  value={newRequest.vehicle_id || ""}
                  label="选择车辆"
                  onChange={(e) => {
                    const vehicle = vehicles.find(
                      (v) => v.id === e.target.value,
                    );
                    setNewRequest({
                      ...newRequest,
                      vehicle_id: e.target.value,
                      vehicle_plate: vehicle?.plate_number || "",
                    });
                  }}
                >
                  {vehicles
                    .filter((v) => v.status === "available")
                    .map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                label="申请人 *"
                value={newRequest.requester || ""}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, requester: e.target.value })
                }
                fullWidth
                required
              />

              <TextField
                label="用途"
                value={newRequest.purpose || ""}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, purpose: e.target.value })
                }
                fullWidth
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="开始时间 *"
                  type="datetime-local"
                  value={newRequest.start_time || ""}
                  onChange={(e) =>
                    setNewRequest({
                      ...newRequest,
                      start_time: e.target.value,
                    })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="结束时间 *"
                  type="datetime-local"
                  value={newRequest.end_time || ""}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, end_time: e.target.value })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </div>

              <FormControl fullWidth>
                <InputLabel>需要司机</InputLabel>
                <Select
                  value={newRequest.driver_required ? "true" : "false"}
                  label="需要司机"
                  onChange={(e) =>
                    setNewRequest({
                      ...newRequest,
                      driver_required: e.target.value === "true",
                    })
                  }
                >
                  <MenuItem value="true">是</MenuItem>
                  <MenuItem value="false">否</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <MuiButton
                variant="outlined"
                onClick={() => {
                  setShowRequestModal(false);
                  setNewRequest({
                    vehicle_id: "",
                    vehicle_plate: "",
                    requester: "",
                    purpose: "",
                    start_time: "",
                    end_time: "",
                    driver_required: false,
                    status: "pending",
                  });
                }}
              >
                取消
              </MuiButton>
              <MuiButton variant="contained" type="submit">
                提交申请
              </MuiButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleManagementPage;
