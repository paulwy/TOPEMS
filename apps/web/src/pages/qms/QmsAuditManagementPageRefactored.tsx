/**
 * QmsAuditManagementPage 重构版本 (审核管理)
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 PageHeader 统一页面头部
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 ColumnDef 定义表格列
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import {
  Plus,
  Edit,
  Eye,
  ClipboardCheck,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

interface AuditPlan {
  id: string;
  plan_no: string;
  title: string;
  audit_type: string;
  auditors: string[];
  departments: string[];
  start_date: string;
  end_date: string;
  status: string;
  findings_count: number;
}

const mockAuditPlans: AuditPlan[] = [
  {
    id: "1",
    plan_no: "AP2024001",
    title: "Q1季度内部质量审核",
    audit_type: "内部审核",
    auditors: ["张审核员", "李审核员"],
    departments: ["生产部", "质量部"],
    start_date: "2024-01-15",
    end_date: "2024-01-20",
    status: "已完成",
    findings_count: 5,
  },
  {
    id: "2",
    plan_no: "AP2024002",
    title: "供应商外部审核",
    audit_type: "外部审核",
    auditors: ["王审核员"],
    departments: ["采购部"],
    start_date: "2024-02-01",
    end_date: "2024-02-05",
    status: "进行中",
    findings_count: 2,
  },
  {
    id: "3",
    plan_no: "AP2024003",
    title: "产品工艺专项审核",
    audit_type: "专项审核",
    auditors: ["赵审核员", "钱审核员"],
    departments: ["研发部", "生产部"],
    start_date: "2024-02-10",
    end_date: "2024-02-15",
    status: "计划中",
    findings_count: 0,
  },
  {
    id: "4",
    plan_no: "AP2024004",
    title: "环境管理体系审核",
    audit_type: "内部审核",
    auditors: ["孙审核员"],
    departments: ["环保部"],
    start_date: "2024-03-01",
    end_date: "2024-03-05",
    status: "计划中",
    findings_count: 0,
  },
  {
    id: "5",
    plan_no: "AP2024005",
    title: "职业健康安全审核",
    audit_type: "内部审核",
    auditors: ["周审核员", "吴审核员"],
    departments: ["安环部", "人事部"],
    start_date: "2024-01-20",
    end_date: "2024-01-25",
    status: "已完成",
    findings_count: 8,
  },
];

// ============ 列定义 ============
const columns: ColumnDef<AuditPlan>[] = [
  { accessorKey: "plan_no", header: "审核计划编号", width: 140 },
  { accessorKey: "title", header: "审核计划名称", width: 200 },
  {
    accessorKey: "audit_type",
    header: "审核类型",
    render: (value) => {
      const colors: Record<string, { bg: string; color: string }> = {
        "内部审核": { bg: "#dbeafe", color: "#2563eb" },
        "外部审核": { bg: "#f3e8ff", color: "#7c3aed" },
        "专项审核": { bg: "#fef9c3", color: "#ca8a04" },
      };
      const c = colors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    accessorKey: "auditors",
    header: "审核员",
    render: (value) => (Array.isArray(value) ? value.join(", ") : value || "-"),
  },
  {
    accessorKey: "departments",
    header: "涉及部门",
    render: (value) => (Array.isArray(value) ? value.join(", ") : value || "-"),
  },
  { accessorKey: "start_date", header: "开始日期", width: 120 },
  { accessorKey: "end_date", header: "结束日期", width: 120 },
  {
    accessorKey: "status",
    header: "状态",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "已完成": { bg: "#dcfce7", color: "#16a34a" },
        "进行中": { bg: "#fef9c3", color: "#ca8a04" },
        "计划中": { bg: "#dbeafe", color: "#2563eb" },
        "已取消": { bg: "#f3f4f6", color: "#4b5563" },
      };
      const colors = statusColors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    accessorKey: "findings_count",
    header: "发现问题",
    render: (value) => (
      <Chip
        label={`${value} 项`}
        size="small"
        sx={{
          backgroundColor: value > 0 ? "#fee2e2" : "#dcfce7",
          color: value > 0 ? "#dc2626" : "#16a34a",
          fontWeight: 500,
        }}
      />
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (plan: AuditPlan) => void,
  onEdit: (plan: AuditPlan) => void,
): RowAction<AuditPlan>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    value: "",
  },
  {
    id: "audit_type",
    label: "审核类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "内部审核", label: "内部审核" },
      { value: "外部审核", label: "外部审核" },
      { value: "专项审核", label: "专项审核" },
    ],
    value: "all",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "计划中", label: "计划中" },
      { value: "进行中", label: "进行中" },
      { value: "已完成", label: "已完成" },
      { value: "已取消", label: "已取消" },
    ],
    value: "all",
  },
];

// ============ 组件 ============
const QmsAuditManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: AuditPlan[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AuditPlan | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<AuditPlan>>({});

  // 获取审核计划列表
  const fetchAuditPlans = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = mockAuditPlans;

      if (searchText) {
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(searchText.toLowerCase()) ||
            p.plan_no.toLowerCase().includes(searchText.toLowerCase()),
        );
      }

      if (typeFilter !== "all") {
        filtered = filtered.filter((p) => p.audit_type === typeFilter);
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }

      setData({
        items: filtered,
        total: filtered.length,
        page: 1,
        page_size: 10,
      });
      setLoading(false);
    }, 500);
  }, [searchText, typeFilter, statusFilter]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "audit_type") setTypeFilter(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback((plan: AuditPlan) => {
    setSelectedPlan(plan);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((plan: AuditPlan) => {
    setSelectedPlan(plan);
    setFormData(plan);
    setShowCreateModal(true);
  }, []);

  // 处理创建
  const handleCreate = useCallback(async () => {
    const newPlan: AuditPlan = {
      id: String(Date.now()),
      plan_no: `AP${Date.now()}`,
      title: formData.title || "",
      audit_type: formData.audit_type || "内部审核",
      auditors: formData.auditors || [],
      departments: formData.departments || [],
      start_date: formData.start_date || "",
      end_date: formData.end_date || "",
      status: "计划中",
      findings_count: 0,
    };
    setData((prev) => ({
      ...prev,
      items: [newPlan, ...prev.items],
      total: prev.total + 1,
    }));
    setShowCreateModal(false);
    setFormData({});
  }, [formData]);

  // 初始加载
  React.useEffect(() => {
    fetchAuditPlans();
  }, [fetchAuditPlans]);

  const stats = {
    total: mockAuditPlans.length,
    inProgress: mockAuditPlans.filter((p) => p.status === "进行中").length,
    completed: mockAuditPlans.filter((p) => p.status === "已完成").length,
    planned: mockAuditPlans.filter((p) => p.status === "计划中").length,
  };

  return (
    <>
      <PageHeader
        title="审核管理"
        subtitle={`共 ${data.total} 个审核计划`}
        breadcrumbs={[
          { label: "QMS", href: "/qms" },
          { label: "审核管理" },
        ]}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                setFormData({});
                setShowCreateModal(true);
              }}
              sx={{ bgcolor: "#3b82f6" }}
            >
              创建审核计划
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 4 },
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: "#eff6ff",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <ClipboardCheck style={{ width: 24, height: 24, color: "#3b82f6" }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                审核计划总数
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              p: 2,
              bgcolor: "#fef9c3",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <AlertCircle style={{ width: 24, height: 24, color: "#ca8a04" }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                进行中
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.inProgress}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              p: 2,
              bgcolor: "#dcfce7",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <CheckCircle style={{ width: 24, height: 24, color: "#16a34a" }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                已完成
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.completed}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              p: 2,
              bgcolor: "#dbeafe",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Calendar style={{ width: 24, height: 24, color: "#2563eb" }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                计划中
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.planned}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3 }}>
        <ListPageTemplate
          columns={columns}
          data={data.items}
          loading={loading}
          rowActions={getRowActions(handleView, handleEdit)}
          filters={filters}
          onFilterChange={handleFilterChange}
          pagination={{
            page: data.page,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: handlePageChange,
            onPageSizeChange: (size) => setData((prev) => ({ ...prev, page_size: size })),
          }}
          onRowClick={handleView}
          emptyMessage="暂无审核计划"
        />
      </Box>

      {/* 查看模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>审核计划详情</DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  审核计划编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedPlan.plan_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  审核类型
                </Box>
                <Box>{selectedPlan.audit_type}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  审核计划名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedPlan.title}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  审核员
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Users style={{ width: 16, height: 16 }} />
                  {selectedPlan.auditors.join(", ")}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  涉及部门
                </Box>
                <Box>{selectedPlan.departments.join(", ")}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  开始日期
                </Box>
                <Box>{selectedPlan.start_date}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  结束日期
                </Box>
                <Box>{selectedPlan.end_date}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  发现问题
                </Box>
                <Box
                  sx={{
                    color: selectedPlan.findings_count > 0 ? "#dc2626" : "#16a34a",
                    fontWeight: 500,
                  }}
                >
                  {selectedPlan.findings_count} 项
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPlan ? "编辑审核计划" : "创建审核计划"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="审核计划名称 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入审核计划名称"
            />
            <TextField
              fullWidth
              select
              label="审核类型"
              value={formData.audit_type || "内部审核"}
              onChange={(e) => setFormData({ ...formData, audit_type: e.target.value })}
            >
              <option value="内部审核">内部审核</option>
              <option value="外部审核">外部审核</option>
              <option value="专项审核">专项审核</option>
            </TextField>
            <TextField
              fullWidth
              label="审核员"
              value={(formData.auditors || []).join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auditors: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              placeholder="多人用逗号分隔"
            />
            <TextField
              fullWidth
              label="涉及部门"
              value={(formData.departments || []).join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  departments: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              placeholder="多部门用逗号分隔"
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="开始日期"
                value={formData.start_date || ""}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="结束日期"
                value={formData.end_date || ""}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: "#3b82f6" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QmsAuditManagementPageRefactored;
