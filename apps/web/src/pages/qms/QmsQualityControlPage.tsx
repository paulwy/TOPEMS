import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Card, CardContent, Box, Typography, FormControl, InputLabel, Select, MenuItem,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { toast } from "react-toastify";
import * as z from "zod";
import {
  ListPageTemplate,
  PageHeader,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from "@/components/templates";

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
      high: { bg: "#fee2e2", color: "#dc2626" },
      medium: { bg: "#fef9c3", color: "#ca8a04" },
      low: { bg: "#dcfce7", color: "#16a34a" },
    };
    const labels = { high: "严重", medium: "中等", low: "轻微" };
    return (
      <Chip
        label={labels[severity as keyof typeof labels]}
        size="small"
        sx={{
          backgroundColor: colors[severity as keyof typeof colors].bg,
          color: colors[severity as keyof typeof colors].color,
        }}
      />
    );
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === "audit") {
      const colors = {
        scheduled: { bg: "#dbeafe", color: "#2563eb" },
        in_progress: { bg: "#fef9c3", color: "#ca8a04" },
        completed: { bg: "#dcfce7", color: "#16a34a" },
      };
      const labels = {
        scheduled: "已计划",
        in_progress: "进行中",
        completed: "已完成",
      };
      return (
        <Chip
          label={labels[status as keyof typeof labels]}
          size="small"
          sx={{
            backgroundColor: colors[status as keyof typeof colors].bg,
            color: colors[status as keyof typeof colors].color,
          }}
        />
      );
    }
    const colors = {
      open: { bg: "#fee2e2", color: "#dc2626" },
      in_progress: { bg: "#fef9c3", color: "#ca8a04" },
      closed: { bg: "#dcfce7", color: "#16a34a" },
    };
    const labels = { open: "待处理", in_progress: "处理中", closed: "已关闭" };
    return (
      <Chip
        label={labels[status as keyof typeof labels]}
        size="small"
        sx={{
          backgroundColor: colors[status as keyof typeof colors].bg,
          color: colors[status as keyof typeof colors].color,
        }}
      />
    );
  };

  // Nonconformance columns and row actions
  const nonconformanceColumns: ColumnDef<Nonconformance>[] = [
    { id: "code", label: "编号" },
    { id: "title", label: "问题标题" },
    { id: "category", label: "类别" },
    {
      id: "severity",
      label: "严重程度",
      render: (row) => getSeverityBadge(row.severity),
    },
    {
      id: "status",
      label: "状态",
      render: (row) => getStatusBadge(row.status, "nc"),
    },
    { id: "reported_by", label: "报告人" },
    { id: "reported_at", label: "报告日期" },
  ];

  const nonconformanceRowActions: RowAction<Nonconformance>[] = [
    {
      label: "查看",
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
    {
      label: "编辑",
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editItem(row),
    },
    {
      label: "删除",
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: "error",
      onClick: (row) => deleteItem(row.id),
    },
  ];

  // Audit columns and row actions
  const auditColumns: ColumnDef<Audit>[] = [
    { id: "code", label: "审核编号" },
    { id: "title", label: "审核标题" },
    { id: "type", label: "审核类型" },
    {
      id: "status",
      label: "状态",
      render: (row) => getStatusBadge(row.status, "audit"),
    },
    { id: "auditor", label: "审核人" },
    { id: "audit_date", label: "审核日期" },
    { id: "findings_count", label: "发现问题数" },
  ];

  const auditRowActions: RowAction<Audit>[] = [
    {
      label: "查看",
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
    {
      label: "编辑",
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => editItem(row),
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

  const filteredNonconformances = useMemo(() => {
    return nonconformances.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [nonconformances, searchTerm]);

  const filteredAudits = useMemo(() => {
    return audits.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [audits, searchTerm]);

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

  const statsCards = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(1, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(6, 1fr)",
        },
        gap: 2,
        mb: 4,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#fee2e2",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20, color: "#dc2626" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                不合格品总数
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.totalNonconformances}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#fef9c3",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20, color: "#ca8a04" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                待处理
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.openNonconformances}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#dcfce7",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: "#16a34a" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                已关闭
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.closedNonconformances}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#dbeafe",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: "#2563eb" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                审核总数
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.totalAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#f3e8ff",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: "#7c3aed" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                进行中审核
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.inProgressAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#dcfce7",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: "#16a34a" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                已完成审核
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.completedAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const currentData =
    activeTab === "nonconformance" ? filteredNonconformances : filteredAudits;
  const currentColumns =
    activeTab === "nonconformance" ? nonconformanceColumns : auditColumns;
  const currentRowActions =
    activeTab === "nonconformance" ? nonconformanceRowActions : auditRowActions;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)",
      }}
    >
      <PageHeader
        title="质量管理"
        subtitle="Quality Management System"
        pageIcon={<Shield style={{ width: 20, height: 20 }} />}
        pageColor="linear-gradient(135deg, #6366F1, #8B5CF6)"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "QMS" },
          { label: "质量管理" },
        ]}
        tabs={[
          {
            label: "不合格品管理",
            value: "nonconformance",
            active: activeTab === "nonconformance",
          },
          { label: "审核管理", value: "audit", active: activeTab === "audit" },
        ]}
        onTabChange={(value) =>
          setActiveTab(value as "nonconformance" | "audit")
        }
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "搜索编号或标题...",
        }}
        actions={[
          {
            label: activeTab === "nonconformance" ? "新增不合格品" : "新增审核",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: "contained",
            color: "primary",
            onClick: () => setShowModal(true),
          },
        ]}
      />

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        {statsCards}

        <Card>
          <CardContent sx={{ p: 0 }}>
            <ListPageTemplate
              columns={currentColumns}
              data={currentData as any[]}
              getRowId={(row: any) => row.id}
              rowActions={currentRowActions as any}
              searchable={false}
              filters={[]}
              actions={[]}
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{isEditing ? "编辑不合格品" : "新增不合格品"}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  编号
                </Box>
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
                  <Typography
                    variant="caption"
                    sx={{ color: "error.main", fontSize: "0.875rem" }}
                  >
                    {errors.code}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    mb: 0.5,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  严重程度
                </Box>
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                问题标题 *
              </Box>
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
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", fontSize: "0.875rem" }}
                >
                  {errors.title}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                问题类别
              </Box>
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
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", fontSize: "0.875rem" }}
                >
                  {errors.category}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box
                component="label"
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                }}
              >
                问题描述
              </Box>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
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
                error={!!errors.description}
              />
              {errors.description && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", fontSize: "0.875rem" }}
                >
                  {errors.description}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            {isEditing ? "保存" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedItem?.code} - {selectedItem?.title}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              {"severity" in selectedItem ? (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        严重程度
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getSeverityBadge(selectedItem.severity)}
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        状态
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusBadge(selectedItem.status, "nc")}
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      component="label"
                      sx={{
                        display: "block",
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        mb: 0.5,
                      }}
                    >
                      问题类别
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {selectedItem.category}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      component="label"
                      sx={{
                        display: "block",
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        mb: 0.5,
                      }}
                    >
                      问题描述
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {selectedItem.description}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        报告人
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.reported_by}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        报告日期
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.reported_at}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        审核类型
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.type}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        状态
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusBadge(selectedItem.status, "audit")}
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        审核人
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.auditor}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        component="label"
                        sx={{
                          display: "block",
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mb: 0.5,
                        }}
                      >
                        审核日期
                      </Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        {selectedItem.audit_date}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      component="label"
                      sx={{
                        display: "block",
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        mb: 0.5,
                      }}
                    >
                      发现问题数
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {selectedItem.findings_count} 个
                    </Typography>
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
    </Box>
  );
};

export default QmsQualityControlPage;
