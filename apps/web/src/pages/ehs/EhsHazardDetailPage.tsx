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
        return (
          <Badge className={riskResult.bgColor}>{riskResult.level}风险</Badge>
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
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteControl(row.original.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
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
                variant="ghost"
                size="icon"
                onClick={() => navigate("/ehs")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">危险源详情</h1>
                <p className="text-xs text-slate-500">Hazard Detail</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowControlModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加控制措施
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
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
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  危险源信息
                </CardTitle>
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  风险评估记录
                </CardTitle>
                <span className="text-sm text-slate-500">
                  共 {assessments.length} 条记录
                </span>
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  控制措施
                </CardTitle>
                <span className="text-sm text-slate-500">
                  共 {controls.length} 条措施
                </span>
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
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowControlModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
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
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑危险源</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>危险源名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入危险源名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>分类</Label>
                <Input
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="请输入分类"
                />
              </div>
              <div>
                <Label>位置</Label>
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
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>严重程度</Label>
                <select
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      severity: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div>
                <Label>暴露频率</Label>
                <select
                  value={formData.exposure}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      exposure: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div>
                <Label>发生概率</Label>
                <select
                  value={formData.likelihood}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      likelihood: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div>
              <Label>状态</Label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">活动中</option>
                <option value="controlled">已控制</option>
                <option value="eliminated">已消除</option>
                <option value="archived">已归档</option>
              </select>
            </div>
            <div>
              <Label>描述</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述危险源..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button
              onClick={handleUpdateHazard}
              className="bg-orange-600 hover:bg-orange-700"
            >
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Control Measure Modal */}
      <Dialog open={showControlModal} onOpenChange={setShowControlModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加控制措施</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>措施类型 *</Label>
              <select
                value={controlFormData.measure_type}
                onChange={(e) =>
                  setControlFormData((prev) => ({
                    ...prev,
                    measure_type: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="engineering">工程控制</option>
                <option value="administrative">管理控制</option>
                <option value="ppe">个人防护</option>
              </select>
            </div>
            <div>
              <Label>措施描述 *</Label>
              <textarea
                value={controlFormData.description}
                onChange={(e) =>
                  setControlFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述具体的控制措施..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>负责人</Label>
                <Input
                  value={controlFormData.responsible}
                  onChange={(e) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      responsible: e.target.value,
                    }))
                  }
                  placeholder="请输入负责人"
                />
              </div>
              <div>
                <Label>完成期限</Label>
                <Input
                  type="date"
                  value={controlFormData.deadline}
                  onChange={(e) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      deadline: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowControlModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleAddControl}
              className="bg-orange-600 hover:bg-orange-700"
            >
              添加措施
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EhsHazardDetailPage;
