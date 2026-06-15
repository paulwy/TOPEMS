import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wrench,
  Calendar,
  User,
  DollarSign,
  FileText,
  Clock,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { limsApi } from "../../api/lims";
import type { Instrument, MaintenanceRecord } from "../../api/lims";

const LimsInstrumentMaintenancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(
    null,
  );
  const [formData, setFormData] = useState({
    maintenance_type: "",
    description: "",
    performed_by: "",
    performed_at: new Date().toISOString().split("T")[0],
    next_maintenance_date: "",
    cost: "",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      loadInstrumentDetail(id);
    }
  }, [id]);

  const loadInstrumentDetail = async (instrumentId: string) => {
    try {
      setLoading(true);
      const [instrumentRes, maintenanceRes] = await Promise.all([
        limsApi.getInstrument(instrumentId),
        limsApi.listMaintenanceByInstrument(instrumentId),
      ]);

      if (instrumentRes.success && instrumentRes.data) {
        setInstrument(instrumentRes.data as Instrument);
      }

      if (maintenanceRes.success && maintenanceRes.data) {
        const maintenanceData = maintenanceRes.data as any;
        const recordsArray = Array.isArray(maintenanceData)
          ? maintenanceData
          : maintenanceData.items || [];
        setMaintenanceRecords(recordsArray);
      }
    } catch (error) {
      console.error("加载仪器详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      normal: { bg: "#dcfce7", color: "#16a34a", label: "正常" },
      正常: { bg: "#dcfce7", color: "#16a34a", label: "正常" },
      calibration: { bg: "#fef9c3", color: "#ca8a04", label: "校准中" },
      校准中: { bg: "#fef9c3", color: "#ca8a04", label: "校准中" },
      maintenance: { bg: "#fee2e2", color: "#dc2626", label: "维修中" },
      维修中: { bg: "#fee2e2", color: "#dc2626", label: "维修中" },
      disabled: { bg: "#f3f4f6", color: "#4b5563", label: "停用" },
      停用: { bg: "#f3f4f6", color: "#4b5563", label: "停用" },
    };
    const item = statusMap[status] || {
      bg: "#f3f4f6",
      color: "#4b5563",
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const handleCreateMaintenance = async () => {
    if (!instrument) return;
    try {
      const response = await limsApi.createMaintenance({
        instrument_id: instrument.id,
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        performed_by: formData.performed_by,
        performed_at: formData.performed_at,
        next_maintenance_date: formData.next_maintenance_date,
        cost: parseFloat(formData.cost) || 0,
        notes: formData.notes,
      });
      if (response.success) {
        setShowAddModal(false);
        loadInstrumentDetail(instrument.id);
        resetForm();
      }
    } catch (error) {
      console.error("创建维护记录失败:", error);
    }
  };

  const handleUpdateMaintenance = async () => {
    if (!editingRecord || !instrument) return;
    try {
      const response = await limsApi.updateMaintenance(editingRecord.id, {
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        performed_by: formData.performed_by,
        performed_at: formData.performed_at,
        next_maintenance_date: formData.next_maintenance_date,
        cost: parseFloat(formData.cost) || 0,
        notes: formData.notes,
      });
      if (response.success) {
        setShowEditModal(false);
        loadInstrumentDetail(instrument.id);
        resetForm();
        setEditingRecord(null);
      }
    } catch (error) {
      console.error("更新维护记录失败:", error);
    }
  };

  const handleDeleteMaintenance = async (recordId: string) => {
    if (!confirm("确定要删除这条维护记录吗？")) return;
    try {
      const response = await limsApi.deleteMaintenance(recordId);
      if (response.success && instrument) {
        loadInstrumentDetail(instrument.id);
      }
    } catch (error) {
      console.error("删除维护记录失败:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      maintenance_type: "",
      description: "",
      performed_by: "",
      performed_at: new Date().toISOString().split("T")[0],
      next_maintenance_date: "",
      cost: "",
      notes: "",
    });
  };

  const openEditModal = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      maintenance_type: record.maintenance_type || "",
      description: record.description || "",
      performed_by: record.performed_by || "",
      performed_at: record.performed_at
        ? new Date(record.performed_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      next_maintenance_date: record.next_maintenance_date
        ? new Date(record.next_maintenance_date).toISOString().split("T")[0]
        : "",
      cost: record.cost?.toString() || "",
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  const maintenanceColumns: ColumnDef<MaintenanceRecord>[] = [
    {
      accessorKey: "maintenance_type",
      header: "维护类型",
      cell: ({ row }) => (
        <Chip
          label={row.original.maintenance_type || "-"}
          size="small"
          sx={{ backgroundColor: "#dbeafe", color: "#2563eb" }}
        />
      ),
    },
    { accessorKey: "performed_by", header: "维护人员" },
    {
      accessorKey: "performed_at",
      header: "维护日期",
      cell: ({ row }) => (
        <span>
          {row.original.performed_at
            ? new Date(row.original.performed_at).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "cost",
      header: "费用 (元)",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">
          {row.original.cost?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => openEditModal(row.original)}
            startIcon={<Box component={Edit3} sx={{ fontSize: 16 }} />}
          />
          <Button
            variant="text"
            size="small"
            sx={{ color: "#dc2626", "&:hover": { backgroundColor: "#fef2f2" } }}
            onClick={() => handleDeleteMaintenance(row.original.id)}
            startIcon={<Box component={Trash2} sx={{ fontSize: 16 }} />}
          />
        </Box>
      ),
    },
  ];

  const totalMaintenanceCost = maintenanceRecords.reduce(
    (sum, record) => sum + (record.cost || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">仪器不存在或已被删除</p>
          <Button onClick={() => navigate("/lims")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="text"
                onClick={() => navigate("/lims")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  仪器维护记录
                </h1>
                <p className="text-xs text-slate-500">Instrument Maintenance</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加维护记录
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={Wrench}
                    sx={{ fontSize: 20, color: "#14b8a6" }}
                  />
                  仪器信息
                </Typography>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">仪器编号</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {instrument.code || instrument.id}
                    </p>
                  </div>
                  {getStatusBadge(instrument.status)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">仪器名称</p>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {instrument.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">型号</p>
                    <p className="text-slate-900 mt-1">
                      {instrument.model || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">分类</p>
                    <p className="text-slate-900 mt-1">
                      {instrument.category || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">位置</p>
                    <p className="text-slate-900 mt-1">
                      {instrument.location || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">负责人</p>
                    <p className="text-slate-900 mt-1">
                      {instrument.responsible_person || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      采购日期
                    </p>
                    <p className="text-slate-900 mt-1">
                      {instrument.purchase_date
                        ? new Date(instrument.purchase_date).toLocaleDateString(
                            "zh-CN",
                          )
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      下次校准
                    </p>
                    <p className="text-slate-900 mt-1">
                      {instrument.next_calibration_date
                        ? new Date(
                            instrument.next_calibration_date,
                          ).toLocaleDateString("zh-CN")
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={DollarSign}
                    sx={{ fontSize: 20, color: "#16a34a" }}
                  />
                  维护统计
                </Typography>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">维护次数</p>
                    <p className="text-2xl font-bold text-green-700">
                      {maintenanceRecords.length}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">累计费用</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ¥{totalMaintenanceCost.toFixed(2)}
                    </p>
                  </div>
                </div>
                {maintenanceRecords.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">最近维护</p>
                    <p className="text-slate-900 mt-1">
                      {new Date(
                        maintenanceRecords[0].performed_at || Date.now(),
                      ).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    component={FileText}
                    sx={{ fontSize: 20, color: "#2563eb" }}
                  />
                  维护记录列表
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  共 {maintenanceRecords.length} 条记录
                </Typography>
              </CardHeader>
              <CardContent>
                {maintenanceRecords.length > 0 ? (
                  <DataTable
                    columns={maintenanceColumns}
                    data={maintenanceRecords}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无维护记录</p>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowAddModal(true)}
                      startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                    >
                      添加第一条记录
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>添加维护记录</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护类型 *
                </Box>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenance_type: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <option value="">请选择类型</option>
                  <option value="定期维护">定期维护</option>
                  <option value="故障维修">故障维修</option>
                  <option value="校准">校准</option>
                  <option value="升级改造">升级改造</option>
                </select>
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护人员 *
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.performed_by}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_by: e.target.value,
                    }))
                  }
                  placeholder="请输入维护人员"
                />
              </Box>
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护日期 *
                </Box>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.performed_at}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_at: e.target.value,
                    }))
                  }
                />
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  下次维护日期
                </Box>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.next_maintenance_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      next_maintenance_date: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                费用 (元)
              </Box>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                维护描述
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述维护内容..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                备注
              </Box>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="其他备注信息..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "64px",
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowAddModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleCreateMaintenance}>
            保存记录
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑维护记录</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护类型 *
                </Box>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenance_type: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <option value="">请选择类型</option>
                  <option value="定期维护">定期维护</option>
                  <option value="故障维修">故障维修</option>
                  <option value="校准">校准</option>
                  <option value="升级改造">升级改造</option>
                </select>
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护人员 *
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.performed_by}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_by: e.target.value,
                    }))
                  }
                  placeholder="请输入维护人员"
                />
              </Box>
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  维护日期 *
                </Box>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.performed_at}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_at: e.target.value,
                    }))
                  }
                />
              </Box>
              <Box>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  下次维护日期
                </Box>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.next_maintenance_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      next_maintenance_date: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                费用 (元)
              </Box>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                维护描述
              </Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述维护内容..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "96px",
                }}
              />
            </Box>
            <Box>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                备注
              </Box>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="其他备注信息..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  resize: "none",
                  height: "64px",
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleUpdateMaintenance}>
            保存更改
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LimsInstrumentMaintenancePage;
