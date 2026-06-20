import React, { useState, useEffect } from "react";
import { apiLogger } from "@/utils/logger";
import { logger } from "@/utils/logger";
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
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { ehsApi } from "@/api/ehs";
import type { Incident, IncidentAction } from "@/api/ehs";
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
      apiLogger.error("加载事件报告失败:", error);
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
      apiLogger.error("加载事件详情失败:", error);
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
      apiLogger.error("创建事件报告失败:", error);
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
      apiLogger.error("删除事件报告失败:", error);
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
    const severityMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      fatal: { bg: "#fee2e2", color: "#dc2626", label: "致命" },
      serious: { bg: "#fed7aa", color: "#ea580c", label: "严重" },
      minor: { bg: "#fef9c3", color: "#ca8a04", label: "轻微" },
      near_miss: { bg: "#dbeafe", color: "#2563eb", label: "未遂" },
    };
    const item = severityMap[severity] || {
      bg: "#f3f4f6",
      color: "#4b5563",
      label: severity,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      pending: { bg: "#fef9c3", color: "#ca8a04", label: "待处理" },
      待处理: { bg: "#fef9c3", color: "#ca8a04", label: "待处理" },
      investigating: { bg: "#dbeafe", color: "#2563eb", label: "调查中" },
      调查中: { bg: "#dbeafe", color: "#2563eb", label: "调查中" },
      resolved: { bg: "#dcfce7", color: "#16a34a", label: "已解决" },
      已解决: { bg: "#dcfce7", color: "#16a34a", label: "已解决" },
      closed: { bg: "#f3f4f6", color: "#4b5563", label: "已关闭" },
      已关闭: { bg: "#f3f4f6", color: "#4b5563", label: "已关闭" },
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
        <Typography sx={{ fontWeight: 500, color: "slate.900" }}>
          {row.original.title}
        </Typography>
      ),
    },
    {
      accessorKey: "incident_type",
      header: "类型",
      cell: ({ row }) => (
        <Chip
          label={getTypeLabel(row.original.incident_type)}
          size="small"
          sx={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
        />
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
        <Box sx={{ display: "flex", gap: 1 }}>
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
            sx={{ color: "#dc2626", "&:hover": { backgroundColor: "#fef2f2" } }}
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
          sx={{ backgroundColor: "#dbeafe", color: "#2563eb" }}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box component={Users} sx={{ fontSize: 16 }} />
          <span>{row.original.responsible || "-"}</span>
        </Box>
      ),
    },
    {
      accessorKey: "due_date",
      header: "截止日期",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box component={Calendar} sx={{ fontSize: 16 }} />
          {row.original.due_date
            ? new Date(row.original.due_date).toLocaleDateString("zh-CN")
            : "-"}
        </Box>
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
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#fed7aa",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Button
                variant="text"
                onClick={() => navigate("/ehs")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
              </Button>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "slate.900" }}
                >
                  事件报告
                </Typography>
                <Typography variant="caption" sx={{ color: "slate.500" }}>
                  Incident Reporting
                </Typography>
              </Box>
            </Box>
            <Button
              onClick={() => setShowAddModal(true)}
              sx={{
                backgroundColor: "#ea580c",
                color: "white",
                "&:hover": { backgroundColor: "#c2410c" },
              }}
            >
              <Plus sx={{ fontSize: 16, mr: 1 }} />
              上报事件
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(4, 1fr)" },
            gap: 3,
            mb: 4,
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(to bottom right, #f97316, #ef4444)",
              color: "white",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#fed7aa", fontSize: 14 }}>
                    事件总数
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box
                  component={AlertCircle}
                  sx={{ fontSize: 48, color: "#fed7aa" }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(to bottom right, #eab308, #f97316)",
              color: "white",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#fef9c3", fontSize: 14 }}>
                    待处理
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {stats.pending}
                  </Typography>
                </Box>
                <Box
                  component={Clock}
                  sx={{ fontSize: 48, color: "#fef9c3" }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(to bottom right, #22c55e, #10b981)",
              color: "white",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#dcfce7", fontSize: 14 }}>
                    已解决
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {stats.resolved}
                  </Typography>
                </Box>
                <Box
                  component={CheckCircle}
                  sx={{ fontSize: 48, color: "#dcfce7" }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(to bottom right, #ef4444, #ec4899)",
              color: "white",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#fee2e2", fontSize: 14 }}>
                    严重事件
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {stats.serious}
                  </Typography>
                </Box>
                <Box
                  component={AlertTriangle}
                  sx={{ fontSize: 48, color: "#fee2e2" }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Box
                component={FileText}
                sx={{ fontSize: 20, color: "#ea580c" }}
              />
              事件列表
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
              <Box sx={{ textAlign: "center", py: 6, color: "slate.500" }}>
                <Box
                  component={FileText}
                  sx={{ fontSize: 64, color: "slate.400", mx: "auto", mb: 2 }}
                />
                <Typography>暂无事件报告</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => setShowAddModal(true)}
                  startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                >
                  上报第一个事件
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>上报事件</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                事件标题 *
              </Typography>
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
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  事件类型
                </Typography>
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
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  严重程度
                </Typography>
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
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  发生位置
                </Typography>
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
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  报告人
                </Typography>
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
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                报告日期
              </Typography>
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
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                事件描述 *
              </Typography>
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
          <Button variant="outlined" onClick={() => setShowAddModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateIncident}
            sx={{
              backgroundColor: "#ea580c",
              "&:hover": { backgroundColor: "#c2410c" },
            }}
          >
            提交报告
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component={AlertCircle}
            sx={{ fontSize: 20, color: "#ea580c" }}
          />
          {selectedIncident?.title}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "#fff7ed", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#c2410c" }}>
                    事件类型
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, color: "#7c2d12", mt: 0.5 }}
                  >
                    {getTypeLabel(selectedIncident.incident_type)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "#fef2f2", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#dc2626" }}>
                    严重程度
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getSeverityBadge(selectedIncident.severity)}
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "#fefce8", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#ca8a04" }}>
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusBadge(selectedIncident.status)}
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "#eff6ff", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#2563eb" }}>
                    报告人
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={Users} sx={{ fontSize: 16 }} />
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, color: "#1e40af" }}
                    >
                      {selectedIncident.reported_by || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    发生位置
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={MapPin} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                      {selectedIncident.location || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    报告时间
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                      {selectedIncident.reported_at
                        ? new Date(selectedIncident.reported_at).toLocaleString(
                            "zh-CN",
                          )
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  事件描述
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mt: 1, whiteSpace: "pre-wrap", color: "text.primary" }}
                >
                  {selectedIncident.description || "暂无描述"}
                </Typography>
              </Box>

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 3 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Box
                    component={FileCheck}
                    sx={{ fontSize: 20, color: "#ea580c" }}
                  />
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
          <Button variant="outlined" onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EhsIncidentReportPage;
