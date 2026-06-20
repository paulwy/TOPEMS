import {
  Box,
  Card,
  CardContent,
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
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, AlertCircle, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetApi, type Asset } from "@/api/erp";
import { employeeApi, type Employee } from "@/api/hrm";
import { mesEquipmentApi, type InspectionRecord } from "@/api/mesEquipment";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

const EquipmentInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedForInspection, setSelectedForInspection] =
    useState<Asset | null>(null);

  const [newInspection, setNewInspection] = useState<Partial<InspectionRecord>>(
    {
      inspector: "",
      inspection_date: new Date().toISOString().split("T")[0],
      status: "normal",
    },
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, employeeRes, inspectionRes] = await Promise.all([
        assetApi.list(),
        employeeApi.list(),
        mesEquipmentApi.listInspections(),
      ]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }

      if (employeeRes.success && employeeRes.data) {
        setEmployees(employeeRes.data.items || []);
      }

      if (inspectionRes.success && inspectionRes.data) {
        setInspections(inspectionRes.data.items || []);
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

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <Box
        sx={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="text" onClick={() => navigate("/equipment")}>
                <ChevronLeft sx={{ width: 20, height: 20, marginRight: 1 }} />
                返回设备台账
              </Button>
              <Box sx={{ ml: 2 }}>
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ClipboardCheck
                    sx={{
                      width: 28,
                      height: 28,
                      marginRight: 3,
                      color: "#2563eb",
                    }}
                  />
                  设备点检记录
                </Typography>
                <Typography
                  sx={{ mt: 0.5, fontSize: "0.875rem", color: "#64748b" }}
                >
                  设备点检记录管理
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                setSelectedForInspection(assets[0] || null);
                setShowInspectionModal(true);
              }}
            >
              <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
              新增点检
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 4 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    width: 32,
                    height: 32,
                    border: "4px solid #2563eb",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <Typography sx={{ mt: 2, color: "#64748b" }}>
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AlertCircle
                  sx={{
                    width: 48,
                    height: 48,
                    color: "#ef4444",
                    mx: "auto",
                    mb: 2,
                  }}
                />
                <Typography sx={{ color: "#dc2626" }}>{error}</Typography>
                <Button sx={{ mt: 2 }} onClick={loadData}>
                  重试
                </Button>
              </Box>
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
      </Box>

      <Dialog
        open={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>设备点检记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateInspection}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ backgroundColor: "#f8fafc", p: 2, borderRadius: 2 }}>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#475569",
                  }}
                >
                  设备: {selectedForInspection?.name} (
                  {selectedForInspection?.asset_number})
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
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
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
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
              </Box>

              <FormControl fullWidth>
                <InputLabel>点检状态</InputLabel>
                <Select
                  value={newInspection.status || "normal"}
                  label="点检状态"
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      status: e.target.value,
                    })
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
                onClick={() => setShowInspectionModal(false)}
              >
                取消
              </Button>
              <Button variant="contained" type="submit">
                提交
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EquipmentInspectionPage;
