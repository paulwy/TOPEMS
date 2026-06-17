import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
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
  Tooltip,
  Box,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  Activity,
  ClipboardCheck,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetApi, type Asset } from "@/api/erp";
import { employeeApi, type Employee } from "@/api/hrm";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

const EquipmentManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

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

  const assetColumns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: "asset_number",
        header: "设备编号",
        cell: ({ row }) => (
          <div style={{ fontWeight: 500, color: "#0f172a" }}>
            {row.original.asset_number}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "设备名称",
        cell: ({ row }) => (
          <div style={{ color: "#0f172a" }}>
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "类别",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.original.category || "-"}
          </span>
        ),
      },
      {
        accessorKey: "brand",
        header: "品牌",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.original.brand || "-"}
          </span>
        ),
      },
      {
        accessorKey: "department",
        header: "部门",
        cell: ({ row }) => (
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
            {row.original.department || "-"}
          </span>
        ),
      },
      {
        accessorKey: "purchase_amount",
        header: "采购金额",
        cell: ({ row }) => (
          <div style={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "#0f172a" }}>
            <DollarSign sx={{ width: 12, height: 12, marginRight: 4, color: "#16a34a" }} />
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <Tooltip title="编辑">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setShowEditModal(true);
                  }}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </Button>
              </Tooltip>

              <Tooltip title="删除">
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => handleDeleteAsset(asset.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
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
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "24px 0" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20, marginRight: 4 }} />
                返回
              </Button>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", marginLeft: 16 }}>
                  <Activity sx={{ width: 28, height: 28, marginRight: 12, color: "#2563eb" }} />
                  设备管理
                </h1>
                <p style={{ marginTop: 4, fontSize: "0.875rem", color: "#64748b" }}>
                  设备台账管理
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/equipment/inspections")}
              >
                <ClipboardCheck sx={{ width: 16, height: 16, marginRight: 8 }} />
                点检记录
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/equipment/maintenances")}
              >
                <Wrench sx={{ width: 16, height: 16, marginRight: 8 }} />
                维护维修
              </Button>
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
                新增设备
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div style={{ display: "inline-block", width: 32, height: 32, borderRadius: "50%", border: "4px solid #2563eb", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: 8, color: "#64748b" }}>
                  加载中...
                </p>
              </div>
            ) : error ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <AlertCircle sx={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto 12px" }} />
                <p style={{ color: "#dc2626" }}>{error}</p>
                <Button sx={{ marginTop: 16 }} onClick={loadData}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
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
    </div>
  );
};

export default EquipmentManagementPage;
