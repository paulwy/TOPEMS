import { Chip, Typography, Box, TextField, Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import { Car, Plus, Edit, Trash2, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  vehicleApi,
  vehicleRequestApi,
  type Vehicle,
  type VehicleRequest,
} from "@/api/erp";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalVehicles, setTotalVehicles] = useState(0);
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

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }

      const [vehicleRes, requestRes] = await Promise.all([
        vehicleApi.list(params),
        vehicleRequestApi.list(),
      ]);

      if (vehicleRes.success && vehicleRes.data) {
        setVehicles(vehicleRes.data.items || []);
        setTotalVehicles(vehicleRes.data.total || 0);
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

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: "status",
        label: "状态",
        type: "select",
        options: [
          { value: "all", label: "全部状态" },
          { value: "available", label: "可用" },
          { value: "in_use", label: "使用中" },
          { value: "maintenance", label: "维护中" },
          { value: "out_of_service", label: "停用" },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleFilterChange = (filters: Record<string, any>) => {
    if (filters.status !== undefined) {
      setFilterStatus(filters.status);
      setCurrentPage(1);
    }
  };

  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        id: "plate_number",
        label: "车牌号",
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: "#0f172a" }}>
            {row.plate_number}
          </Typography>
        ),
      },
      {
        id: "brand",
        label: "品牌",
        render: (row) => (
          <Typography sx={{ color: "#0f172a" }}>{row.brand || "-"}</Typography>
        ),
      },
      {
        id: "model",
        label: "型号",
        render: (row) => (
          <Typography sx={{ color: "#0f172a" }}>{row.model || "-"}</Typography>
        ),
      },
      {
        id: "vehicle_type",
        label: "车辆类型",
        render: (row) => (
          <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.vehicle_type || "-"}
          </Typography>
        ),
      },
      {
        id: "driver",
        label: "司机",
        render: (row) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              color: "#0f172a",
            }}
          >
            <User
              sx={{ width: 12, height: 12, marginRight: 4, color: "#2563eb" }}
            />
            {row.driver || "-"}
          </Box>
        ),
      },
      {
        id: "fuel_type",
        label: "燃料类型",
        render: (row) => (
          <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.fuel_type || "-"}
          </Typography>
        ),
      },
      {
        id: "mileage",
        label: "里程(km)",
        render: (row) => (
          <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.mileage ? row.mileage.toLocaleString() : "-"}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row) => getVehicleStatusBadge(row.status),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles],
  );

  const rowActions = useMemo<RowAction<Vehicle>[]>(
    () => [
      {
        label: "申请用车",
        icon: <Calendar sx={{ width: 16, height: 16 }} />,
        onClick: (row) => {
          setNewRequest({
            ...newRequest,
            vehicle_id: row.id,
            vehicle_plate: row.plate_number,
          });
          setShowRequestModal(true);
        },
      },
      {
        label: "编辑",
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row) => {
          setSelectedVehicle(row);
          setShowEditModal(true);
        },
      },
      {
        label: "删除",
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: "error",
        onClick: (row) => handleDeleteVehicle(row.id),
        confirm: true,
        confirmMessage: "确定要删除这辆车吗？",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <ListPageTemplate
        title="车辆管理"
        subtitle="管理企业车辆和用车申请"
        backButton={{
          onClick: () => navigate("/dashboard"),
        }}
        columns={columns}
        data={vehicles}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder="搜索车牌号、品牌、型号..."
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: filterStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: totalVehicles,
          onPageChange: setCurrentPage,
        }}
        rowActions={rowActions}
        onRefresh={loadData}
        actions={[
          {
            label: "添加车辆",
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => setShowCreateModal(true),
            variant: "contained",
          },
        ]}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>添加车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Box
            component="form"
            onSubmit={handleCreateVehicle}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="车牌号 *"
                value={newVehicle.plate_number || ""}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, plate_number: e.target.value })
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

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
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

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
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
                    setNewVehicle({ ...newVehicle, fuel_type: e.target.value })
                  }
                >
                  <MenuItem value="gasoline">汽油</MenuItem>
                  <MenuItem value="diesel">柴油</MenuItem>
                  <MenuItem value="electric">电动</MenuItem>
                  <MenuItem value="hybrid">混动</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
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
                setNewVehicle({ ...newVehicle, last_service: e.target.value })
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                添加
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
        <DialogTitle>编辑车辆</DialogTitle>
        <DialogContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {selectedVehicle && (
            <Box
              component="form"
              onSubmit={handleEditVehicle}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
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

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
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

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
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

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
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

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                  mt: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVehicle(null);
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
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>申请用车</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleCreateRequest}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <FormControl fullWidth>
              <InputLabel>选择车辆</InputLabel>
              <Select
                value={newRequest.vehicle_id || ""}
                label="选择车辆"
                onChange={(e) => {
                  const vehicle = vehicles.find((v) => v.id === e.target.value);
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

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="开始时间 *"
                type="datetime-local"
                value={newRequest.start_time || ""}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, start_time: e.target.value })
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

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 2,
              }}
            >
              <Button
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
              </Button>
              <Button variant="contained" type="submit">
                提交申请
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VehicleManagementPage;
