import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  Users,
  MapPin,
  FileText,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Trash2,
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
import { ehsApi } from "../../api/ehs";
import type { Incident, IncidentAction } from "../../api/ehs";
import { toast } from "react-toastify";

const EhsIncidentReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [actions, setActions] = useState<IncidentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incident_type: "near_miss" as
      | "near_miss"
      | "accident"
      | "injury"
      | "environmental"
      | "equipment",
    severity: "minor" as "near_miss" | "minor" | "serious" | "fatal",
    location: "",
    reported_by: "",
    reported_at: new Date().toISOString().split("T")[0],
    status: "pending" as "pending" | "investigating" | "resolved" | "closed",
  });

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listIncidents();
      if (response.success && response.data) {
        const incidentsData = response.data as any;
        const incidentsArray = Array.isArray(incidentsData)
          ? incidentsData
          : incidentsData.data || incidentsData.incidents || [];
        setIncidents(incidentsArray);
      }
    } catch (error) {
      console.error("加载事件报告失败:", error);
      toast.error("加载事件报告失败");
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetail = async (incidentId: string) => {
    try {
      const response = await ehsApi.getIncident(incidentId);
      if (response.success && response.data) {
        setSelectedIncident(response.data as Incident);
      }

      const actionsRes = await ehsApi.listIncidentActions(incidentId);
      if (actionsRes.success && actionsRes.data) {
        const actionsData = actionsRes.data as any;
        const actionsArray = Array.isArray(actionsData)
          ? actionsData
          : actionsData.data || [];
        setActions(actionsArray);
      }
    } catch (error) {
      console.error("加载事件详情失败:", error);
      toast.error("加载事件详情失败");
    }
  };

  const handleSelectIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    await loadIncidentDetail(incident.id);
    setShowDetailModal(true);
  };

  const handleCreateIncident = async () => {
    if (!formData.title.trim()) {
      toast.error("请输入事件标题");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("请输入事件描述");
      return;
    }
    try {
      const response = await ehsApi.createIncident(formData);
      if (response.success) {
        toast.success("事件报告创建成功");
        setShowAddModal(false);
        loadIncidents();
        resetForm();
      } else {
        toast.error("创建失败，请稍后重试");
      }
    } catch (error) {
      console.error("创建事件报告失败:", error);
      toast.error("创建失败，请稍后重试");
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm("确定要删除此事件报告吗？")) return;
    try {
      const response = await ehsApi.deleteIncident(incidentId);
      if (response.success) {
        toast.success("事件报告删除成功");
        loadIncidents();
      } else {
        toast.error("删除失败，请稍后重试");
      }
    } catch (error) {
      console.error("删除事件报告失败:", error);
      toast.error("删除失败，请稍后重试");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      incident_type: "near_miss",
      severity: "minor",
      location: "",
      reported_by: "",
      reported_at: new Date().toISOString().split("T")[0],
      status: "pending",
    });
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { color: string; label: string }> = {
      fatal: { color: "bg-red-100 text-red-700", label: "致命" },
      serious: { color: "bg-orange-100 text-orange-700", label: "严重" },
      minor: { color: "bg-yellow-100 text-yellow-700", label: "轻微" },
      near_miss: { color: "bg-blue-100 text-blue-700", label: "未遂" },
    };
    const item = severityMap[severity] || {
      color: "bg-gray-100 text-gray-700",
      label: severity,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-700", label: "待处理" },
      待处理: { color: "bg-yellow-100 text-yellow-700", label: "待处理" },
      investigating: { color: "bg-blue-100 text-blue-700", label: "调查中" },
      调查中: { color: "bg-blue-100 text-blue-700", label: "调查中" },
      resolved: { color: "bg-green-100 text-green-700", label: "已解决" },
      已解决: { color: "bg-green-100 text-green-700", label: "已解决" },
      closed: { color: "bg-gray-100 text-gray-700", label: "已关闭" },
      已关闭: { color: "bg-gray-100 text-gray-700", label: "已关闭" },
    };
    const item = statusMap[status] || {
      color: "bg-gray-100 text-gray-700",
      label: status,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      near_miss: "未遂事件",
      accident: "事故",
      injury: "人员伤害",
      environmental: "环境事件",
      equipment: "设备故障",
    };
    return typeMap[type] || type;
  };

  const incidentColumns: ColumnDef<Incident>[] = [
    {
      accessorKey: "title",
      header: "事件标题",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "incident_type",
      header: "类型",
      cell: ({ row }) => (
        <Badge className="bg-purple-100 text-purple-700">
          {getTypeLabel(row.original.incident_type)}
        </Badge>
      ),
    },
    {
      accessorKey: "severity",
      header: "严重程度",
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "reported_at",
      header: "报告时间",
      cell: ({ row }) => (
        <span>
          {row.original.reported_at
            ? new Date(row.original.reported_at).toLocaleString("zh-CN")
            : "-"}
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
            size="sm"
            onClick={() => handleSelectIncident(row.original)}
          >
            <Eye className="w-4 h-4 mr-1" />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteIncident(row.original.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const actionColumns: ColumnDef<IncidentAction>[] = [
    {
      accessorKey: "action_type",
      header: "行动类型",
      cell: ({ row }) => (
        <Badge className="bg-blue-100 text-blue-700">
          {row.original.action_type === "investigation"
            ? "调查"
            : row.original.action_type === "correction"
              ? "纠正"
              : row.original.action_type === "prevention"
                ? "预防"
                : row.original.action_type}
        </Badge>
      ),
    },
    { accessorKey: "description", header: "行动描述" },
    {
      accessorKey: "responsible",
      header: "负责人",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{row.original.responsible || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "due_date",
      header: "截止日期",
      cell: ({ row }) => (
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {row.original.due_date
            ? new Date(row.original.due_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
  ];

  const stats = {
    total: incidents.length,
    pending: incidents.filter((i) => i.status === "pending").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    serious: incidents.filter(
      (i) => i.severity === "fatal" || i.severity === "serious",
    ).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
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
                onClick={() => navigate("/ehs")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">事件报告</h1>
                <p className="text-xs text-slate-500">Incident Reporting</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              上报事件
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">事件总数</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">待处理</p>
                  <p className="text-3xl font-bold mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">已解决</p>
                  <p className="text-3xl font-bold mt-1">{stats.resolved}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">严重事件</p>
                  <p className="text-3xl font-bold mt-1">{stats.serious}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              事件列表
            </CardTitle>
            <span className="text-sm text-slate-500">
              共 {incidents.length} 条记录
            </span>
          </CardHeader>
          <CardContent>
            {incidents.length > 0 ? (
              <DataTable
                columns={incidentColumns}
                data={incidents}
                enablePagination={false}
              />
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无事件报告</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  上报第一个事件
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上报事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>事件标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入事件标题"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>事件类型</Label>
                <select
                  value={formData.incident_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      incident_type: e.target.value as
                        | "near_miss"
                        | "accident"
                        | "injury"
                        | "environmental"
                        | "equipment",
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="near_miss">未遂事件</option>
                  <option value="accident">事故</option>
                  <option value="injury">人员伤害</option>
                  <option value="environmental">环境事件</option>
                  <option value="equipment">设备故障</option>
                </select>
              </div>
              <div>
                <Label>严重程度</Label>
                <select
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      severity: e.target.value as
                        | "near_miss"
                        | "minor"
                        | "serious"
                        | "fatal",
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="near_miss">未遂</option>
                  <option value="minor">轻微</option>
                  <option value="serious">严重</option>
                  <option value="fatal">致命</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>发生位置</Label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="请输入位置"
                />
              </div>
              <div>
                <Label>报告人</Label>
                <Input
                  value={formData.reported_by}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reported_by: e.target.value,
                    }))
                  }
                  placeholder="请输入报告人"
                />
              </div>
            </div>
            <div>
              <Label>报告日期</Label>
              <Input
                type="date"
                value={formData.reported_at}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reported_at: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>事件描述 *</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请详细描述事件经过..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateIncident}
              className="bg-orange-600 hover:bg-orange-700"
            >
              提交报告
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              {selectedIncident?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600">事件类型</p>
                  <p className="font-medium text-orange-900 mt-1">
                    {getTypeLabel(selectedIncident.incident_type)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">严重程度</p>
                  <p className="font-medium text-red-900 mt-1">
                    {getSeverityBadge(selectedIncident.severity)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">状态</p>
                  <p className="font-medium text-yellow-900 mt-1">
                    {getStatusBadge(selectedIncident.status)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">报告人</p>
                  <p className="font-medium text-blue-900 mt-1 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedIncident.reported_by || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">发生位置</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedIncident.location || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">报告时间</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedIncident.reported_at
                      ? new Date(selectedIncident.reported_at).toLocaleString(
                          "zh-CN",
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">事件描述</p>
                <p className="text-slate-900 mt-1 whitespace-pre-wrap">
                  {selectedIncident.description || "暂无描述"}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  处理措施 ({actions.length})
                </h3>
                <DataTable
                  columns={actionColumns}
                  data={actions}
                  enablePagination={false}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDetailModal(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EhsIncidentReportPage;
