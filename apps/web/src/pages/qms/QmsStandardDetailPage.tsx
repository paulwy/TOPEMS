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
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.color.includes('green') ? '#dcfce7' : item.color.includes('yellow') ? '#fef9c3' : item.color.includes('red') ? '#fee2e2' : '#f3f4f6', color: item.color.includes('green') ? '#15803d' : item.color.includes('yellow') ? '#a16207' : item.color.includes('red') ? '#b91c1c' : '#4b5563' }} />;
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
        <Chip label={`v${row.original.version}`} size="small" sx={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }} />
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
              variant="outlined"
              onClick={() => navigate("/qms")}
              sx={{ minWidth: 'auto', padding: '4px 8px' }}
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
                variant="outlined"
                onClick={() => setShowRevisionModal(true)}
                startIcon={<Plus className="w-4 h-4" />}
              >
                新建版本
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowEditModal(true)}
                startIcon={<Edit3 className="w-4 h-4" />}
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
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <FileText className="w-5 h-5" />
                  标准信息
                </Typography>
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
                      <Chip label={`v${standard.version}`} size="small" sx={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }} />
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
              <CardHeader sx={{ pb: 1 }}>
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                  <FileCheck className="w-5 h-5" />
                  操作
                </Typography>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button fullWidth sx={{ justifyContent: 'flex-start' }} variant="outlined" startIcon={<Download className="w-4 h-4" />}>
                  下载标准文档
                </Button>
                <Button fullWidth sx={{ justifyContent: 'flex-start' }} variant="outlined" startIcon={<Upload className="w-4 h-4" />}>
                  上传新版本文件
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <FileText className="w-5 h-5" />
                  版本历史
                </Typography>
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
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => setShowRevisionModal(true)}
                      startIcon={<Plus className="w-3 h-3" />}
                    >
                      创建第一个版本
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>编辑质量标准</DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>标准编号 *</Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="请输入标准编号"
                />
              </Box>
              <Box>
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>版本号</Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder="如 1.0"
                />
              </Box>
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>标准名称 *</Box>
              <TextField
                size="small"
                fullWidth
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入标准名称"
              />
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>分类</Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="请输入分类"
                />
              </Box>
              <Box>
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>状态</Box>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <option value="active">有效</option>
                  <option value="draft">草稿</option>
                  <option value="expired">已过期</option>
                  <option value="archived">已归档</option>
                </select>
              </Box>
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>生效日期</Box>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>描述</Box>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请输入标准描述..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none', height: '96px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpdateStandard}>保存更改</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRevisionModal} onClose={() => setShowRevisionModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建版本</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>当前版本:</Box>
              <Box component="span" sx={{ fontWeight: 500 }}>{standard.version}</Box>
            </Box>
            <Box sx={{ color: 'text.secondary', mt: 2 }}>
              创建新版本后，版本号将自动递增（如 1.0 → 1.1）
            </Box>
            <Box sx={{ mt: 2 }}>
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>变更说明</Box>
              <textarea
                placeholder="请描述本次版本变更的内容..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'none', height: '96px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowRevisionModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateRevision} sx={{ backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }}>创建版本</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QmsStandardDetailPage;
