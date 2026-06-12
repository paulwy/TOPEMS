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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const statusMap: Record<string, { color: string; label: string }> = {
      normal: { color: "bg-green-100 text-green-700", label: "正常" },
      正常: { color: "bg-green-100 text-green-700", label: "正常" },
      calibration: { color: "bg-yellow-100 text-yellow-700", label: "校准中" },
      校准中: { color: "bg-yellow-100 text-yellow-700", label: "校准中" },
      maintenance: { color: "bg-red-100 text-red-700", label: "维修中" },
      维修中: { color: "bg-red-100 text-red-700", label: "维修中" },
      disabled: { color: "bg-gray-100 text-gray-700", label: "停用" },
      停用: { color: "bg-gray-100 text-gray-700", label: "停用" },
    };
    const item = statusMap[status] || {
      color: "bg-gray-100 text-gray-700",
      label: status,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
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
        <Badge className="bg-blue-100 text-blue-700">
          {row.original.maintenance_type || "-"}
        </Badge>
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditModal(row.original)}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => handleDeleteMaintenance(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
                variant="ghost"
                size="icon"
                onClick={() => navigate("/lims")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-teal-600" />
                  仪器信息
                </CardTitle>
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  维护统计
                </CardTitle>
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  维护记录列表
                </CardTitle>
                <span className="text-sm text-slate-500">
                  共 {maintenanceRecords.length} 条记录
                </span>
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
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加第一条记录
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加维护记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>维护类型 *</Label>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenance_type: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">请选择类型</option>
                  <option value="定期维护">定期维护</option>
                  <option value="故障维修">故障维修</option>
                  <option value="校准">校准</option>
                  <option value="升级改造">升级改造</option>
                </select>
              </div>
              <div>
                <Label>维护人员 *</Label>
                <Input
                  value={formData.performed_by}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_by: e.target.value,
                    }))
                  }
                  placeholder="请输入维护人员"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>维护日期 *</Label>
                <Input
                  type="date"
                  value={formData.performed_at}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_at: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>下次维护日期</Label>
                <Input
                  type="date"
                  value={formData.next_maintenance_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      next_maintenance_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>费用 (元)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>维护描述</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述维护内容..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24"
              />
            </div>
            <div>
              <Label>备注</Label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="其他备注信息..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreateMaintenance}>保存记录</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑维护记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>维护类型 *</Label>
                <select
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenance_type: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">请选择类型</option>
                  <option value="定期维护">定期维护</option>
                  <option value="故障维修">故障维修</option>
                  <option value="校准">校准</option>
                  <option value="升级改造">升级改造</option>
                </select>
              </div>
              <div>
                <Label>维护人员 *</Label>
                <Input
                  value={formData.performed_by}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_by: e.target.value,
                    }))
                  }
                  placeholder="请输入维护人员"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>维护日期 *</Label>
                <Input
                  type="date"
                  value={formData.performed_at}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      performed_at: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>下次维护日期</Label>
                <Input
                  type="date"
                  value={formData.next_maintenance_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      next_maintenance_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>费用 (元)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>维护描述</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述维护内容..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24"
              />
            </div>
            <div>
              <Label>备注</Label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="其他备注信息..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateMaintenance}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LimsInstrumentMaintenancePage;
