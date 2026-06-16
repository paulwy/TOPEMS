import {
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Calendar,
  User,
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
          <Typography sx={{ fontWeight: "medium", color: "slate.900" }}>
            {row.original.plate_number}
          </Typography>
        ),
      },
      {
        accessorKey: "brand",
        header: "品牌",
        cell: ({ row }) => (
          <Typography sx={{ color: "slate.900" }}>
            {row.original.brand || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "model",
        header: "型号",
        cell: ({ row }) => (
          <Typography sx={{ color: "slate.900" }}>
            {row.original.model || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "vehicle_type",
        header: "车辆类型",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "slate.500" }}>
            {row.original.vehicle_type || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "driver",
        header: "司机",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "slate.900" }}>
            <User sx={{ width: 12, height: 12, mr: 0.5, color: "blue.600" }} />
            {row.original.driver || "-"}
          </Box>
        ),
      },
      {
        accessorKey: "fuel_type",
        header: "燃料类型",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "slate.500" }}>
            {row.original.fuel_type || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "mileage",
        header: "里程(km)",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "slate.500" }}>
            {row.original.mileage ? row.original.mileage.toLocaleString() : "-"}
          </Typography>
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
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
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
                  <Edit sx={{ width: 16, height: 16 }} />
                </MuiButton>
              </Tooltip>
              <Tooltip title="删除">
                <MuiButton
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </MuiButton>
              </Tooltip>
            </Box>
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
          <Typography sx={{ fontWeight: "medium", color: "slate.900" }}>
            {row.original.vehicle_plate}
          </Typography>
        ),
      },
      {
        accessorKey: "requester",
        header: "申请人",
        cell: ({ row }) => (
          <Typography sx={{ color: "slate.900" }}>
            {row.original.requester}
          </Typography>
        ),
      },
      {
        accessorKey: "purpose",
        header: "用途",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "slate.500" }}>
            {row.original.purpose || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "start_time",
        header: "开始时间",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "slate.900" }}>
            <Calendar sx={{ width: 12, height: 12, mr: 0.5, color: "blue.600" }} />
            {row.original.start_time
              ? new Date(row.original.start_time).toLocaleString()
              : "-"}
          </Box>
        ),
      },
      {
        accessorKey: "end_time",
        header: "结束时间",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "slate.900" }}>
            <Calendar sx={{ width: 12, height: 12, mr: 0.5, color: "blue.600" }} />
            {row.original.end_time
              ? new Date(row.original.end_time).toLocaleString()
              : "-"}
          </Box>
        ),
      },
      {
        accessorKey: "driver_required",
        header: "需要司机",
        cell: ({ row }) => (
          <Typography sx={{ fontSize: "0.875rem", color: "slate.500" }}>
            {row.original.driver_required ? "是" : "否"}
          </Typography>
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
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
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
            </Box>
          );
        },
      },
    ],
    [requests],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "slate.50" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: "xl", mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <MuiButton variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </MuiButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
                >
                  <Car sx={{ width: 28, height: 28, mr: 1, color: "blue.600" }} />
                  车辆管理
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  管理企业车辆和用车申请
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <MuiButton
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 20, height: 20, mr: 1 }} />
                添加车辆
              </MuiButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: "xl", mx: "auto", px: 3, py: 4 }}>
        <Tabs value="vehicles" sx={{ mb: 3 }}>
          <Tab label="车辆列表" value="vehicles" />
          <Tab label="用车申请" value="requests" />
        </Tabs>

        {true && (
          <Card>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      width: 32,
                      height: 32,
                      border: 4,
                      borderColor: "primary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    加载中...
                  </Typography>
                </Box>
              ) : error ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <AlertCircle sx={{ width: 48, height: 48, color: "error.main", mb: 1.5 }} />
                  <Typography color="error">{error}</Typography>
                  <MuiButton onClick={loadData} sx={{ mt: 2 }}>
                    重试
                  </MuiButton>
                </Box>
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
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>添加车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box component="form" onSubmit={handleCreateVehicle} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
            </Box>

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

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
              <MuiButton
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </MuiButton>
              <MuiButton variant="contained" type="submit">
                添加
              </MuiButton>
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
        <DialogTitle>编辑车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedVehicle && (
            <Box component="form" onSubmit={handleEditVehicle} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
              </Box>

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

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
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
              </Box>
            </Box>
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
          <Box component="form" onSubmit={handleCreateRequest} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
            </Box>

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

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
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
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VehicleManagementPage;
