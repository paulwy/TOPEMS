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
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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
    const severityMap: Record<string, { bg: string; color: string; label: string }> = {
      fatal: { bg: '#fee2e2', color: '#dc2626', label: "致命" },
      serious: { bg: '#fed7aa', color: '#ea580c', label: "严重" },
      minor: { bg: '#fef9c3', color: '#ca8a04', label: "轻微" },
      near_miss: { bg: '#dbeafe', color: '#2563eb', label: "未遂" },
    };
    const item = severityMap[severity] || {
      bg: '#f3f4f6',
      color: '#4b5563',
      label: severity,
    };
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.bg, color: item.color }} />;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef9c3', color: '#ca8a04', label: "待处理" },
      待处理: { bg: '#fef9c3', color: '#ca8a04', label: "待处理" },
      investigating: { bg: '#dbeafe', color: '#2563eb', label: "调查中" },
      调查中: { bg: '#dbeafe', color: '#2563eb', label: "调查中" },
      resolved: { bg: '#dcfce7', color: '#16a34a', label: "已解决" },
      已解决: { bg: '#dcfce7', color: '#16a34a', label: "已解决" },
      closed: { bg: '#f3f4f6', color: '#4b5563', label: "已关闭" },
      已关闭: { bg: '#f3f4f6', color: '#4b5563', label: "已关闭" },
    };
    const item = statusMap[status] || {
      bg: '#f3f4f6',
      color: '#4b5563',
      label: status,
    };
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.bg, color: item.color }} />;
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
        <Chip label={getTypeLabel(row.original.incident_type)} size="small" sx={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }} />
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => handleSelectIncident(row.original)}
            startIcon={<Box component={Eye} sx={{ fontSize: 16 }} />}
          >
            查看
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => handleDeleteIncident(row.original.id)}
            sx={{ color: '#dc2626', '&:hover': { backgroundColor: '#fef2f2' } }}
            startIcon={<Box component={Trash2} sx={{ fontSize: 16 }} />}
          />
        </Box>
      ),
    },
  ];

  const actionColumns: ColumnDef<IncidentAction>[] = [
    {
      accessorKey: "action_type",
      header: "行动类型",
      cell: ({ row }) => (
        <Chip 
          size="small" 
          sx={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
          label={
            row.original.action_type === "investigation"
              ? "调查"
              : row.original.action_type === "correction"
                ? "纠正"
                : row.original.action_type === "prevention"
                  ? "预防"
                  : row.original.action_type
          }
        />
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
                variant="text"
                onClick={() => navigate("/ehs")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
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
          <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component={FileText} sx={{ fontSize: 20, color: '#ea580c' }} />
              事件列表
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              共 {incidents.length} 条记录
            </Typography>
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
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => setShowAddModal(true)}
                  startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                >
                  上报第一个事件
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>上报事件</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>事件标题 *</Typography>
              <TextField
                size="small"
                fullWidth
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入事件标题"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>事件类型</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>事件类型</InputLabel>
                  <Select
                    value={formData.incident_type}
                    label="事件类型"
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
                  >
                    <MenuItem value="near_miss">未遂事件</MenuItem>
                    <MenuItem value="accident">事故</MenuItem>
                    <MenuItem value="injury">人员伤害</MenuItem>
                    <MenuItem value="environmental">环境事件</MenuItem>
                    <MenuItem value="equipment">设备故障</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>严重程度</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>严重程度</InputLabel>
                  <Select
                    value={formData.severity}
                    label="严重程度"
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
                  >
                    <MenuItem value="near_miss">未遂</MenuItem>
                    <MenuItem value="minor">轻微</MenuItem>
                    <MenuItem value="serious">严重</MenuItem>
                    <MenuItem value="fatal">致命</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>发生位置</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="请输入位置"
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>报告人</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.reported_by}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      reported_by: e.target.value,
                    }))
                  }
                  placeholder="请输入报告人"
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>报告日期</Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={formData.reported_at}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    reported_at: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>事件描述 *</Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请详细描述事件经过..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowAddModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateIncident} sx={{ backgroundColor: '#ea580c', '&:hover': { backgroundColor: '#c2410c' } }}>提交报告</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component={AlertCircle} sx={{ fontSize: 20, color: '#ea580c' }} />
          {selectedIncident?.title}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#c2410c' }}>事件类型</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#7c2d12', mt: 0.5 }}>
                    {getTypeLabel(selectedIncident.incident_type)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#dc2626' }}>严重程度</Typography>
                  <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedIncident.severity)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fefce8', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#ca8a04' }}>状态</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedIncident.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#2563eb' }}>报告人</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={Users} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e40af' }}>
                      {selectedIncident.reported_by || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>发生位置</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={MapPin} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {selectedIncident.location || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>报告时间</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {selectedIncident.reported_at
                        ? new Date(selectedIncident.reported_at).toLocaleString("zh-CN")
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>事件描述</Typography>
                <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                  {selectedIncident.description || "暂无描述"}
                </Typography>
              </Box>

              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box component={FileCheck} sx={{ fontSize: 20, color: '#ea580c' }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    处理措施 ({actions.length})
                  </Typography>
                </Box>
                <DataTable
                  columns={actionColumns}
                  data={actions}
                  enablePagination={false}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EhsIncidentReportPage;
