import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Users,
  Shield,
  Clock,
  Edit3,
  Plus,
  AlertCircle,
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
import type { Hazard, RiskAssessment, ControlMeasure } from "../../api/ehs";
import {
  EHSStatusBadge,
  EHSMeasureTypeBadge,
  calculateRiskLevel,
} from "../../components/ehs";
import { toast } from "react-toastify";

interface ControlFormData {
  measure_type: "engineering" | "administrative" | "ppe";
  description: string;
  responsible: string;
  deadline: string;
}

const EhsHazardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hazard, setHazard] = useState<Hazard | null>(null);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [controls, setControls] = useState<ControlMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    severity: "medium" as "high" | "medium" | "low",
    exposure: "medium" as "high" | "medium" | "low",
    likelihood: "medium" as "high" | "medium" | "low",
    status: "active" as "active" | "controlled" | "eliminated" | "archived",
  });
  const [controlFormData, setControlFormData] = useState<ControlFormData>({
    measure_type: "engineering",
    description: "",
    responsible: "",
    deadline: "",
  });

  useEffect(() => {
    if (id) {
      loadHazardDetail(id);
    }
  }, [id]);

  const loadHazardDetail = async (hazardId: string) => {
    try {
      setLoading(true);
      const [hazardRes, assessmentsRes, controlsRes] = await Promise.all([
        ehsApi.getHazard(hazardId),
        ehsApi.listRiskAssessments(hazardId),
        ehsApi.listControlMeasures(hazardId),
      ]);

      if (hazardRes.success && hazardRes.data) {
        // Convert SafetyHazard to Hazard format
        const safetyHazard = hazardRes.data as any;
        const hazardData: Hazard = {
          id: safetyHazard.id,
          name: safetyHazard.name,
          description: safetyHazard.description,
          category: safetyHazard.category,
          location: safetyHazard.location,
          severity: safetyHazard.level?.includes("高")
            ? "high"
            : safetyHazard.level?.includes("重大")
              ? "high"
              : safetyHazard.level?.includes("中")
                ? "medium"
                : "low",
          exposure: "medium",
          likelihood: "medium",
          status:
            safetyHazard.status === "identified"
              ? "active"
              : safetyHazard.status === "controlled"
                ? "controlled"
                : safetyHazard.status === "eliminated"
                  ? "eliminated"
                  : "archived",
          created_at: safetyHazard.created_at,
          updated_at: safetyHazard.updated_at,
        };
        setHazard(hazardData);
        setFormData({
          name: hazardData.name || "",
          description: hazardData.description || "",
          category: hazardData.category || "",
          location: hazardData.location || "",
          severity: hazardData.severity || "medium",
          exposure: hazardData.exposure || "medium",
          likelihood: hazardData.likelihood || "medium",
          status: hazardData.status || "active",
        });
      }

      if (assessmentsRes.success && assessmentsRes.data) {
        const assessmentsData = assessmentsRes.data as any;
        const assessmentsArray = Array.isArray(assessmentsData)
          ? assessmentsData
          : assessmentsData.data || assessmentsData.assessments || [];
        setAssessments(assessmentsArray);
      }

      if (controlsRes.success && controlsRes.data) {
        const controlsData = controlsRes.data as any;
        const controlsArray = Array.isArray(controlsData)
          ? controlsData
          : controlsData.data || controlsData.measures || [];
        setControls(controlsArray);
      }
    } catch (error) {
      console.error("加载危险源详情失败:", error);
      toast.error("加载危险源详情失败");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return <EHSStatusBadge status={status} type="hazard" />;
  };

  const handleUpdateHazard = async () => {
    if (!hazard) return;
    if (!formData.name.trim()) {
      toast.error("请输入危险源名称");
      return;
    }
    try {
      const response = await ehsApi.updateHazard(hazard.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        level:
          formData.severity === "high"
            ? "高"
            : formData.severity === "medium"
              ? "中"
              : "低",
        status: formData.status,
      });
      if (response.success) {
        toast.success("危险源更新成功");
        setShowEditModal(false);
        loadHazardDetail(hazard.id);
      } else {
        toast.error("更新失败，请稍后重试");
      }
    } catch (error) {
      console.error("更新危险源失败:", error);
      toast.error("更新失败，请稍后重试");
    }
  };

  const handleAddControl = async () => {
    if (!hazard) return;
    if (!controlFormData.description.trim()) {
      toast.error("请输入措施描述");
      return;
    }
    try {
      const response = await ehsApi.createControlMeasure(hazard.id, {
        measure_type: controlFormData.measure_type,
        description: controlFormData.description,
        responsible: controlFormData.responsible || null,
        deadline: controlFormData.deadline || null,
        status: "pending",
      });
      if (response.success) {
        toast.success("控制措施添加成功");
        setShowControlModal(false);
        setControlFormData({
          measure_type: "engineering",
          description: "",
          responsible: "",
          deadline: "",
        });
        loadHazardDetail(hazard.id);
      } else {
        toast.error("添加失败，请稍后重试");
      }
    } catch (error) {
      console.error("添加控制措施失败:", error);
      toast.error("添加失败，请稍后重试");
    }
  };

  const handleDeleteControl = async (measureId: string) => {
    if (!hazard) return;
    if (!confirm("确定要删除此控制措施吗？")) return;
    try {
      const response = await ehsApi.deleteControlMeasure(hazard.id, measureId);
      if (response.success) {
        toast.success("控制措施删除成功");
        loadHazardDetail(hazard.id);
      } else {
        toast.error("删除失败，请稍后重试");
      }
    } catch (error) {
      console.error("删除控制措施失败:", error);
      toast.error("删除失败，请稍后重试");
    }
  };

  const assessmentColumns: ColumnDef<RiskAssessment>[] = [
    {
      accessorKey: "assessment_date",
      header: "评估日期",
      cell: ({ row }) => (
        <span>
          {row.original.assessment_date
            ? new Date(row.original.assessment_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "assessor",
      header: "评估人",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{row.original.assessor || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "risk_level",
      header: "风险等级",
      cell: ({ row }) => {
        const riskResult = calculateRiskLevel(
          row.original.severity || "medium",
          row.original.likelihood || "medium",
        );
        const colorMap: Record<string, { bg: string; color: string }> = {
          '高风险': { bg: '#fee2e2', color: '#dc2626' },
          '中风险': { bg: '#fef9c3', color: '#ca8a04' },
          '低风险': { bg: '#dcfce7', color: '#16a34a' },
        };
        const colors = colorMap[`${riskResult.level}风险`] || { bg: '#f3f4f6', color: '#4b5563' };
        return (
          <Chip label={`${riskResult.level}风险`} size="small" sx={{ backgroundColor: colors.bg, color: colors.color }} />
        );
      },
    },
    { accessorKey: "recommendations", header: "建议措施" },
  ];

  const controlColumns: ColumnDef<ControlMeasure>[] = [
    {
      accessorKey: "measure_type",
      header: "措施类型",
      cell: ({ row }) => (
        <EHSMeasureTypeBadge type={row.original.measure_type} />
      ),
    },
    { accessorKey: "description", header: "措施描述" },
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
      accessorKey: "deadline",
      header: "完成期限",
      cell: ({ row }) => (
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {row.original.deadline
            ? new Date(row.original.deadline).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <EHSStatusBadge status={row.original.status} type="control" />
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Button
          variant="text"
          size="small"
          onClick={() => handleDeleteControl(row.original.id)}
          sx={{ color: '#dc2626', '&:hover': { backgroundColor: '#fef2f2' } }}
          startIcon={<Box component={Trash2} sx={{ fontSize: 16 }} />}
        />
      ),
    },
  ];

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

  if (!hazard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">危险源不存在或已被删除</p>
          <Button onClick={() => navigate("/ehs")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const riskInfo = calculateRiskLevel(
    hazard.severity || "medium",
    hazard.likelihood || "medium",
  );

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
                <h1 className="text-xl font-bold text-slate-900">危险源详情</h1>
                <p className="text-xs text-slate-500">Hazard Detail</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outlined"
                onClick={() => setShowControlModal(true)}
                startIcon={<Box component={Plus} sx={{ fontSize: 16 }} />}
              >
                添加控制措施
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowEditModal(true)}
                startIcon={<Box component={Edit3} sx={{ fontSize: 16 }} />}
              >
                编辑
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={AlertTriangle} sx={{ fontSize: 20, color: '#ea580c' }} />
                  危险源信息
                </Typography>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">危险源名称</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {hazard.name}
                    </p>
                  </div>
                  {getStatusBadge(hazard.status)}
                </div>
                <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-lg">
                  <Shield className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600">风险等级</p>
                    <p
                      className={`text-xl font-bold mt-1 px-3 py-1 rounded-lg ${riskInfo.bgColor} ${riskInfo.color}`}
                    >
                      {riskInfo.level}风险
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">分类</p>
                    <p className="text-slate-900 mt-1">
                      {hazard.category || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">位置</p>
                    <p className="text-slate-900 mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {hazard.location || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">严重程度</p>
                    <p className="font-medium text-red-700 mt-1">
                      {hazard.severity === "high"
                        ? "高"
                        : hazard.severity === "medium"
                          ? "中"
                          : "低"}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600">暴露频率</p>
                    <p className="font-medium text-yellow-700 mt-1">
                      {hazard.exposure === "high"
                        ? "高"
                        : hazard.exposure === "medium"
                          ? "中"
                          : "低"}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">发生概率</p>
                    <p className="font-medium text-blue-700 mt-1">
                      {hazard.likelihood === "high"
                        ? "高"
                        : hazard.likelihood === "medium"
                          ? "中"
                          : "低"}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">描述</p>
                  <p className="text-slate-900 mt-1 text-sm leading-relaxed">
                    {hazard.description || "暂无描述"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={AlertTriangle} sx={{ fontSize: 20, color: '#ea580c' }} />
                  风险评估记录
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  共 {assessments.length} 条记录
                </Typography>
              </CardHeader>
              <CardContent>
                {assessments.length > 0 ? (
                  <DataTable
                    columns={assessmentColumns}
                    data={assessments}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无风险评估记录</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={Shield} sx={{ fontSize: 20, color: '#2563eb' }} />
                  控制措施
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  共 {controls.length} 条措施
                </Typography>
              </CardHeader>
              <CardContent>
                {controls.length > 0 ? (
                  <DataTable
                    columns={controlColumns}
                    data={controls}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无控制措施</p>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowControlModal(true)}
                      startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                    >
                      添加控制措施
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Hazard Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>编辑危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>危险源名称 *</Typography>
              <TextField
                size="small"
                fullWidth
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入危险源名称"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>分类</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="请输入分类"
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>位置</Typography>
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
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
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
                        severity: e.target.value as "high" | "medium" | "low",
                      }))
                    }
                  >
                    <MenuItem value="high">高</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="low">低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>暴露频率</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>暴露频率</InputLabel>
                  <Select
                    value={formData.exposure}
                    label="暴露频率"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        exposure: e.target.value as "high" | "medium" | "low",
                      }))
                    }
                  >
                    <MenuItem value="high">高</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="low">低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>发生概率</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>发生概率</InputLabel>
                  <Select
                    value={formData.likelihood}
                    label="发生概率"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        likelihood: e.target.value as "high" | "medium" | "low",
                      }))
                    }
                  >
                    <MenuItem value="high">高</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="low">低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>状态</Typography>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status}
                  label="状态"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as "active" | "controlled" | "eliminated" | "archived",
                    }))
                  }
                >
                  <MenuItem value="active">活动中</MenuItem>
                  <MenuItem value="controlled">已控制</MenuItem>
                  <MenuItem value="eliminated">已消除</MenuItem>
                  <MenuItem value="archived">已归档</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>描述</Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述危险源..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpdateHazard} sx={{ backgroundColor: '#ea580c', '&:hover': { backgroundColor: '#c2410c' } }}>保存更改</Button>
        </DialogActions>
      </Dialog>

      {/* Add Control Measure Modal */}
      <Dialog open={showControlModal} onClose={() => setShowControlModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加控制措施</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>措施类型 *</Typography>
              <FormControl fullWidth size="small">
                <InputLabel>措施类型</InputLabel>
                <Select
                  value={controlFormData.measure_type}
                  label="措施类型"
                  onChange={(e) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      measure_type: e.target.value as "engineering" | "administrative" | "ppe",
                    }))
                  }
                >
                  <MenuItem value="engineering">工程控制</MenuItem>
                  <MenuItem value="administrative">管理控制</MenuItem>
                  <MenuItem value="ppe">个人防护</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>措施描述 *</Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={controlFormData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setControlFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述具体的控制措施..."
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>负责人</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={controlFormData.responsible}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      responsible: e.target.value,
                    }))
                  }
                  placeholder="请输入负责人"
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>完成期限</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={controlFormData.deadline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      deadline: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowControlModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddControl} sx={{ backgroundColor: '#ea580c', '&:hover': { backgroundColor: '#c2410c' } }}>添加措施</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EhsHazardDetailPage;
