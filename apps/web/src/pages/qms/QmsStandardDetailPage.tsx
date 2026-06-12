import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  FileCheck,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  Download,
  Upload,
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
import { qmsApi } from "../../api/qms";
import type { QualityStandard, StandardRevision } from "../../api/qms";

const QmsStandardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [standard, setStandard] = useState<QualityStandard | null>(null);
  const [revisions, setRevisions] = useState<StandardRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    version: "",
    status: "active",
    category: "",
    effective_date: "",
  });

  useEffect(() => {
    if (id) {
      loadStandardDetail(id);
    }
  }, [id]);

  const loadStandardDetail = async (standardId: string) => {
    try {
      setLoading(true);
      const [standardRes, revisionsRes] = await Promise.all([
        qmsApi.getStandard(standardId),
        qmsApi.listRevisions(standardId),
      ]);

      if (standardRes.success && standardRes.data) {
        setStandard(standardRes.data as QualityStandard);
        const data = standardRes.data as QualityStandard;
        setFormData({
          title: data.title || "",
          code: data.code || "",
          description: data.description || "",
          version: data.version || "",
          status: data.status || "active",
          category: data.category || "",
          effective_date: data.effective_date
            ? new Date(data.effective_date).toISOString().split("T")[0]
            : "",
        });
      }

      if (revisionsRes.success && revisionsRes.data) {
        const revisionsData = revisionsRes.data as any;
        const revisionsArray = Array.isArray(revisionsData)
          ? revisionsData
          : revisionsData.revisions || [];
        setRevisions(revisionsArray);
      }
    } catch (error) {
      console.error("加载质量标准详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: "bg-green-100 text-green-700", label: "有效" },
      有效: { color: "bg-green-100 text-green-700", label: "有效" },
      draft: { color: "bg-yellow-100 text-yellow-700", label: "草稿" },
      草稿: { color: "bg-yellow-100 text-yellow-700", label: "草稿" },
      expired: { color: "bg-red-100 text-red-700", label: "已过期" },
      已过期: { color: "bg-red-100 text-red-700", label: "已过期" },
      archived: { color: "bg-gray-100 text-gray-700", label: "已归档" },
      已归档: { color: "bg-gray-100 text-gray-700", label: "已归档" },
    };
    const item = statusMap[status] || {
      color: "bg-gray-100 text-gray-700",
      label: status,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const handleUpdateStandard = async () => {
    if (!standard) return;
    try {
      const response = await qmsApi.updateStandard(standard.id, {
        name: formData.title,
        code: formData.code,
        description: formData.description,
        version: formData.version,
        status: formData.status,
        category: formData.category,
        content: standard.content || "",
        effective_date: formData.effective_date,
      });
      if (response.success) {
        setShowEditModal(false);
        loadStandardDetail(standard.id);
      }
    } catch (error) {
      console.error("更新质量标准失败:", error);
    }
  };

  const handleCreateRevision = async () => {
    if (!standard) return;
    try {
      const newVersion = formData.version || standard.version || "1.0";
      const [major, minor] = newVersion.split(".").map(Number);
      const nextVersion = `${major}.${minor + 1}`;

      // Create a new standard as a revision
      const response = await qmsApi.createStandard({
        name: standard.name,
        code: `${standard.code}-v${nextVersion}`,
        version: nextVersion,
        description: `升级至版本 ${nextVersion}`,
        category: standard.category,
        content: standard.content,
        status: "draft",
        effective_date: new Date().toISOString().split("T")[0],
      });
      if (response.success) {
        setShowRevisionModal(false);
        navigate("/qms/standards");
      }
    } catch (error) {
      console.error("创建版本失败:", error);
    }
  };

  const revisionColumns: ColumnDef<StandardRevision>[] = [
    {
      accessorKey: "version",
      header: "版本号",
      cell: ({ row }) => (
        <Badge className="bg-purple-100 text-purple-700 font-medium">
          v{row.original.version}
        </Badge>
      ),
    },
    { accessorKey: "description", header: "变更说明" },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_by",
      header: "创建人",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{row.original.created_by || "-"}</span>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!standard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">质量标准不存在或已被删除</p>
          <Button onClick={() => navigate("/qms")} className="mt-4">
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
                onClick={() => navigate("/qms")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  质量标准详情
                </h1>
                <p className="text-xs text-slate-500">
                  Quality Standard Detail
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRevisionModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                新建版本
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
                  <FileText className="w-5 h-5 text-blue-600" />
                  标准信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">标准编号</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {standard.code || standard.id}
                    </p>
                  </div>
                  {getStatusBadge(standard.status)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">标准名称</p>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {standard.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">版本</p>
                    <p className="text-slate-900 mt-1">
                      <Badge className="bg-purple-100 text-purple-700">
                        v{standard.version}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">分类</p>
                    <p className="text-slate-900 mt-1">
                      {standard.category || "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">生效日期</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {standard.effective_date
                      ? new Date(standard.effective_date).toLocaleDateString(
                          "zh-CN",
                        )
                      : "-"}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">标准描述</p>
                  <p className="text-slate-900 mt-1 text-sm leading-relaxed">
                    {standard.description || "暂无描述"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-green-600" />
                  操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  下载标准文档
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  上传新版本文件
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  版本历史
                </CardTitle>
                <span className="text-sm text-slate-500">
                  共 {revisions.length} 个版本
                </span>
              </CardHeader>
              <CardContent>
                {revisions.length > 0 ? (
                  <DataTable
                    columns={revisionColumns}
                    data={revisions}
                    enablePagination={false}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无版本记录</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowRevisionModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      创建第一个版本
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑质量标准</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>标准编号 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="请输入标准编号"
                />
              </div>
              <div>
                <Label>版本号</Label>
                <Input
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder="如 1.0"
                />
              </div>
            </div>
            <div>
              <Label>标准名称 *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入标准名称"
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
                <Label>状态</Label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="active">有效</option>
                  <option value="draft">草稿</option>
                  <option value="expired">已过期</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>
            <div>
              <Label>生效日期</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
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
                placeholder="请输入标准描述..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStandard}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建版本</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              当前版本: <span className="font-medium">{standard.version}</span>
            </p>
            <p className="text-slate-600 mt-2">
              创建新版本后，版本号将自动递增（如 1.0 → 1.1）
            </p>
            <div className="mt-4">
              <Label>变更说明</Label>
              <textarea
                placeholder="请描述本次版本变更的内容..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowRevisionModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateRevision}
              className="bg-purple-600 hover:bg-purple-700"
            >
              创建版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QmsStandardDetailPage;
