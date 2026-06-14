import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
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
import { toast } from "react-toastify";
import * as z from "zod";

interface Nonconformance {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  status: "open" | "in_progress" | "closed";
  category: string;
  reported_by: string;
  reported_at: string;
  assigned_to: string;
}

interface Audit {
  id: string;
  code: string;
  title: string;
  type: string;
  status: "scheduled" | "in_progress" | "completed";
  auditor: string;
  audit_date: string;
  findings_count: number;
}

const QmsQualityControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"nonconformance" | "audit">(
    "nonconformance",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    Nonconformance | Audit | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    severity: "medium" as "high" | "medium" | "low",
    category: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const nonconformanceSchema = z.object({
    code: z.string().regex(/^NC-\d{4}-\d{3}$/, "编号格式应为 NC-XXXX-XXX"),
    title: z
      .string()
      .min(2, "标题至少需要2个字符")
      .max(100, "标题不能超过100个字符"),
    description: z.string().max(500, "描述不能超过500个字符"),
    severity: z.enum(["high", "medium", "low"]),
    category: z.string().max(50, "类别不能超过50个字符"),
  });

  const validateForm = (data: typeof formData) => {
    const result = nonconformanceSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        newErrors[field] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const [nonconformances, setNonconformances] = useState<Nonconformance[]>([
    {
      id: "1",
      code: "NC-2024-001",
      title: "产品表面划痕",
      description: "产品表面存在明显划痕，影响外观质量",
      severity: "medium",
      status: "open",
      category: "外观缺陷",
      reported_by: "张三",
      reported_at: "2024-01-15",
      assigned_to: "李四",
    },
    {
      id: "2",
      code: "NC-2024-002",
      title: "尺寸偏差",
      description: "产品尺寸超出公差范围",
      severity: "high",
      status: "in_progress",
      category: "尺寸问题",
      reported_by: "王五",
      reported_at: "2024-01-14",
      assigned_to: "赵六",
    },
    {
      id: "3",
      code: "NC-2024-003",
      title: "包装破损",
      description: "运输过程中包装破损",
      severity: "low",
      status: "closed",
      category: "包装问题",
      reported_by: "孙七",
      reported_at: "2024-01-10",
      assigned_to: "周八",
    },
  ]);

  const [audits, setAudits] = useState<Audit[]>([
    {
      id: "1",
      code: "AUD-2024-Q1",
      title: "Q1季度质量审核",
      type: "内部审核",
      status: "completed",
      auditor: "张三",
      audit_date: "2024-01-10",
      findings_count: 5,
    },
    {
      id: "2",
      code: "AUD-2024-Q2",
      title: "Q2季度质量审核",
      type: "内部审核",
      status: "scheduled",
      auditor: "李四",
      audit_date: "2024-04-15",
      findings_count: 0,
    },
    {
      id: "3",
      code: "AUD-2024-C01",
      title: "客户投诉专项审核",
      type: "专项审核",
      status: "in_progress",
      auditor: "王五",
      audit_date: "2024-01-20",
      findings_count: 3,
    },
  ]);

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: { bg: '#fee2e2', color: '#dc2626' },
      medium: { bg: '#fef9c3', color: '#ca8a04' },
      low: { bg: '#dcfce7', color: '#16a34a' },
    };
    const labels = { high: "严重", medium: "中等", low: "轻微" };
    return (
      <Chip label={labels[severity as keyof typeof labels]} size="small" sx={{ backgroundColor: colors[severity as keyof typeof colors].bg, color: colors[severity as keyof typeof colors].color }} />
    );
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === "audit") {
      const colors = {
        scheduled: { bg: '#dbeafe', color: '#2563eb' },
        in_progress: { bg: '#fef9c3', color: '#ca8a04' },
        completed: { bg: '#dcfce7', color: '#16a34a' },
      };
      const labels = {
        scheduled: "已计划",
        in_progress: "进行中",
        completed: "已完成",
      };
      return (
        <Chip label={labels[status as keyof typeof labels]} size="small" sx={{ backgroundColor: colors[status as keyof typeof colors].bg, color: colors[status as keyof typeof colors].color }} />
      );
    }
    const colors = {
      open: { bg: '#fee2e2', color: '#dc2626' },
      in_progress: { bg: '#fef9c3', color: '#ca8a04' },
      closed: { bg: '#dcfce7', color: '#16a34a' },
    };
    const labels = { open: "待处理", in_progress: "处理中", closed: "已关闭" };
    return (
      <Chip label={labels[status as keyof typeof labels]} size="small" sx={{ backgroundColor: colors[status as keyof typeof colors].bg, color: colors[status as keyof typeof colors].color }} />
    );
  };

  const nonconformanceColumns: ColumnDef<Nonconformance>[] = [
    { accessorKey: "code", header: "编号" },
    { accessorKey: "title", header: "问题标题" },
    { accessorKey: "category", header: "类别" },
    {
      accessorKey: "severity",
      header: "严重程度",
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status, "nc"),
    },
    { accessorKey: "reported_by", header: "报告人" },
    { accessorKey: "reported_at", header: "报告日期" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => viewItem(row.original)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="small"
            onClick={() => editItem(row.original)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="small"
            onClick={() => deleteItem(row.original.id)}
            sx={{ color: 'error.main' }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </Box>
      ),
    },
  ];

  const auditColumns: ColumnDef<Audit>[] = [
    { accessorKey: "code", header: "审核编号" },
    { accessorKey: "title", header: "审核标题" },
    { accessorKey: "type", header: "审核类型" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status, "audit"),
    },
    { accessorKey: "auditor", header: "审核人" },
    { accessorKey: "audit_date", header: "审核日期" },
    { accessorKey: "findings_count", header: "发现问题数" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => viewItem(row.original)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="small"
            onClick={() => editItem(row.original)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </Box>
      ),
    },
  ];

  const viewItem = (item: Nonconformance | Audit) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const editItem = (item: Nonconformance | Audit) => {
    setSelectedItem(item);
    setIsEditing(true);
    setShowModal(true);
    if ("severity" in item) {
      setFormData({
        code: item.code,
        title: item.title,
        description: item.description,
        severity: item.severity,
        category: item.category,
      });
    }
  };

  const deleteItem = (id: string) => {
    if (!confirm("确定要删除此记录吗？")) return;
    setNonconformances((prev) => prev.filter((item) => item.id !== id));
    toast.success("记录删除成功");
  };

  const handleSubmit = () => {
    if (!validateForm(formData)) {
      return;
    }
    if (isEditing && selectedItem) {
      setNonconformances((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id ? { ...item, ...formData } : item,
        ),
      );
      toast.success("记录更新成功");
    } else {
      const newItem: Nonconformance = {
        ...formData,
        id: String(Date.now()),
        status: "open",
        reported_by: "当前用户",
        reported_at: new Date().toISOString().split("T")[0],
        assigned_to: "",
      };
      setNonconformances((prev) => [newItem, ...prev]);
      toast.success("记录创建成功");
    }
    setShowModal(false);
    setIsEditing(false);
    setFormData({
      code: "",
      title: "",
      description: "",
      severity: "medium",
      category: "",
    });
    setErrors({});
  };

  const filteredData =
    activeTab === "nonconformance"
      ? nonconformances.filter(
          (item) =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : audits.filter(
          (item) =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  const stats = {
    totalNonconformances: nonconformances.length,
    openNonconformances: nonconformances.filter((n) => n.status === "open")
      .length,
    closedNonconformances: nonconformances.filter((n) => n.status === "closed")
      .length,
    totalAudits: audits.length,
    completedAudits: audits.filter((a) => a.status === "completed").length,
    inProgressAudits: audits.filter((a) => a.status === "in_progress").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">质量管理</h1>
                  <p className="text-xs text-slate-500">
                    Quality Management System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">不合格品总数</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalNonconformances}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">待处理</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.openNonconformances}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">已关闭</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.closedNonconformances}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">审核总数</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalAudits}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">进行中审核</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.inProgressAudits}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">已完成审核</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.completedAudits}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("nonconformance")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "nonconformance"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>不合格品管理</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "audit"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>审核管理</span>
            </div>
          </button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Box className="flex-1 min-w-[200px]" sx={{ position: 'relative' }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="搜索编号或标题..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ pl: 5 }}
                />
              </Box>
              <Button variant="contained" onClick={() => setShowModal(true)} startIcon={<Plus className="w-4 h-4" />}>
                {activeTab === "nonconformance" ? "新增不合格品" : "新增审核"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {activeTab === "nonconformance" ? (
              <DataTable
                columns={nonconformanceColumns}
                data={filteredData as Nonconformance[]}
                enablePagination={false}
              />
            ) : (
              <DataTable
                columns={auditColumns}
                data={filteredData as Audit[]}
                enablePagination={false}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {isEditing ? "编辑不合格品" : "新增不合格品"}
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-4" sx={{ mt: 1 }}>
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>编号</Box>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.code}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, code: e.target.value }));
                    if (errors.code)
                      setErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  placeholder="NC-XXXX-XXX"
                  error={!!errors.code}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
              </Box>
              <Box className="space-y-2">
                <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>严重程度</Box>
                <FormControl fullWidth size="small">
                  <InputLabel>请选择</InputLabel>
                  <Select
                    value={formData.severity}
                    label="请选择"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as "high" | "medium" | "low",
                      }))
                    }
                  >
                    <MenuItem value="high">严重</MenuItem>
                    <MenuItem value="medium">中等</MenuItem>
                    <MenuItem value="low">轻微</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box className="space-y-2">
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>问题标题 *</Box>
              <TextField
                size="small"
                fullWidth
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="请输入问题标题"
                error={!!errors.title}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </Box>
            <Box className="space-y-2">
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>问题类别</Box>
              <TextField
                size="small"
                fullWidth
                value={formData.category}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }));
                  if (errors.category)
                    setErrors((prev) => ({ ...prev, category: "" }));
                }}
                placeholder="外观缺陷、尺寸问题、包装问题等"
                error={!!errors.category}
              />
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category}</p>
              )}
            </Box>
            <Box className="space-y-2">
              <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>问题描述</Box>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  if (errors.description)
                    setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="请详细描述问题..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${errors.description ? '#fca5a5' : '#e2e8f0'}`, resize: 'none', height: '128px' }}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>{isEditing ? "保存" : "创建"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedItem?.code} - {selectedItem?.title}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box className="space-y-4" sx={{ mt: 1 }}>
              {"severity" in selectedItem ? (
                <>
                  <Box className="grid grid-cols-2 gap-4">
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>严重程度</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getSeverityBadge(selectedItem.severity)}
                      </Box>
                    </Box>
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>状态</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusBadge(selectedItem.status, "nc")}
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>问题类别</Typography>
                    <Typography sx={{ mt: 0.5 }}>{selectedItem.category}</Typography>
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>问题描述</Typography>
                    <Typography sx={{ mt: 0.5 }}>{selectedItem.description}</Typography>
                  </Box>
                  <Box className="grid grid-cols-2 gap-4">
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>报告人</Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.reported_by}</Typography>
                    </Box>
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>报告日期</Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.reported_at}</Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
                  <Box className="grid grid-cols-2 gap-4">
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>审核类型</Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.type}</Typography>
                    </Box>
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>状态</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusBadge(selectedItem.status, "audit")}
                      </Box>
                    </Box>
                  </Box>
                  <Box className="grid grid-cols-2 gap-4">
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>审核人</Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.auditor}</Typography>
                    </Box>
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>审核日期</Typography>
                      <Typography sx={{ mt: 0.5 }}>{selectedItem.audit_date}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>发现问题数</Typography>
                    <Typography sx={{ mt: 0.5 }}>{selectedItem.findings_count} 个</Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QmsQualityControlPage;
