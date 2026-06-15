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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component={Users} sx={{ fontSize: 16 }} />
          <span>{row.original.assessor || "-"}</span>
        </Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component={Users} sx={{ fontSize: 16 }} />
          <span>{row.original.responsible || "-"}</span>
        </Box>
      ),
    },
    {
      accessorKey: "deadline",
      header: "完成期限",
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component={Clock} sx={{ fontSize: 16 }} />
          {row.original.deadline
            ? new Date(row.original.deadline).toLocaleDateString("zh-CN")
            : "-"}
        </Box>
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
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ width: 48, height: 48, border: 4, borderColor: '#fed7aa', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 1s linear infinite', mx: 'auto', mb: 2 }} />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!hazard) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box component={AlertCircle} sx={{ fontSize: 64, color: '#ef4444', mx: 'auto', mb: 2 }} />
          <Typography sx={{ color: 'slate.600' }}>危险源不存在或已被删除</Typography>
          <Button onClick={() => navigate("/ehs")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  const riskInfo = calculateRiskLevel(
    hazard.severity || "medium",
    hazard.likelihood || "medium",
  );

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
      <Box component="header" sx={{ bgcolor: 'background.paper', boxShadow: 1, borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, zIndex: 10 }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Button
                variant="text"
                onClick={() => navigate("/ehs")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
              </Button>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'slate.900' }}>危险源详情</Typography>
                <Typography variant="caption" sx={{ color: 'slate.500' }}>Hazard Detail</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            </Box>
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, lg: 3 }, gap: 3 }}>
          <Box sx={{ gridColumn: { lg: 'span 1' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardHeader sx={{ pb: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component={AlertTriangle} sx={{ fontSize: 20, color: '#ea580c' }} />
                  危险源信息
                </Typography>
              </CardHeader>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 14 }}>危险源名称</Typography>
                    <Typography sx={{ color: 'slate.900', fontWeight: 600, fontSize: 18, mt: 0.5 }}>
                      {hazard.name}
                    </Typography>
                  </Box>
                  {getStatusBadge(hazard.status)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#fff7ed', borderRadius: 2 }}>
                  <Box component={Shield} sx={{ fontSize: 32, color: '#ea580c' }} />
                  <Box>
                    <Typography sx={{ color: '#ea580c', fontSize: 14 }}>风险等级</Typography>
                    <Typography
                      sx={{
                        fontSize: 20,
                        fontWeight: 700,
                        mt: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: riskInfo.bgColor,
                        color: riskInfo.color,
                      }}
                    >
                      {riskInfo.level}风险
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 14 }}>分类</Typography>
                    <Typography sx={{ color: 'slate.900', mt: 0.5 }}>
                      {hazard.category || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 14 }}>位置</Typography>
                    <Typography sx={{ color: 'slate.900', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component={MapPin} sx={{ fontSize: 16 }} />
                      {hazard.location || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#fef2f2', borderRadius: 1 }}>
                    <Typography sx={{ color: '#dc2626', fontSize: 12 }}>严重程度</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#b91c1c', mt: 0.5 }}>
                      {hazard.severity === "high"
                        ? "高"
                        : hazard.severity === "medium"
                          ? "中"
                          : "低"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#fefce8', borderRadius: 1 }}>
                    <Typography sx={{ color: '#ca8a04', fontSize: 12 }}>暴露频率</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#a16207', mt: 0.5 }}>
                      {hazard.exposure === "high"
                        ? "高"
                        : hazard.exposure === "medium"
                          ? "中"
                          : "低"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#eff6ff', borderRadius: 1 }}>
                    <Typography sx={{ color: '#2563eb', fontSize: 12 }}>发生概率</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#1d4ed8', mt: 0.5 }}>
                      {hazard.likelihood === "high"
                        ? "高"
                        : hazard.likelihood === "medium"
                          ? "中"
                          : "低"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography sx={{ color: 'slate.500', fontSize: 14 }}>描述</Typography>
                  <Typography sx={{ color: 'slate.900', mt: 0.5, fontSize: 14, lineHeight: 1.6 }}>
                    {hazard.description || "暂无描述"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ gridColumn: { lg: 'span 2' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>
                    <Box component={AlertTriangle} sx={{ fontSize: 64, color: 'slate.400', mx: 'auto', mb: 2 }} />
                    <Typography>暂无风险评估记录</Typography>
                  </Box>
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
                  <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>
                    <Box component={Shield} sx={{ fontSize: 64, color: 'slate.400', mx: 'auto', mb: 2 }} />
                    <Typography>暂无控制措施</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowControlModal(true)}
                      startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                    >
                      添加控制措施
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

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
    </Box>
  );
};

export default EhsHazardDetailPage;
