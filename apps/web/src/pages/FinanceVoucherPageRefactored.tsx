/**
 * FinanceVoucherPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Download,
  Check,
  X,
  FileText,
  FileCheck,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import {
  voucherApi,
  accountingSubjectApi,
  type FinancialVoucher,
  type VoucherItem,
  type VoucherItemRequest,
  type AccountingSubject,
} from "../api/erp";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "../components/ui/OrganizationFilter";
import { MetricCard } from "../components/MetricCard";

// ============ 列定义 ============
const getVoucherColumns = (
  onView: (voucher: FinancialVoucher) => void,
  onEdit: (voucher: FinancialVoucher) => void,
  onDelete: (voucher: FinancialVoucher) => void,
): ColumnDef<FinancialVoucher>[] => [
  {
    id: "voucher_number",
    header: "凭证编号",
    accessor: "voucher_number",
    render: (value) => (
      <Box sx={{ fontWeight: 500, color: "primary.main" }}>{value}</Box>
    ),
  },
  {
    id: "voucher_date",
    header: "凭证日期",
    accessor: "voucher_date",
    render: (value) => value?.split("T")[0] || "-",
  },
  {
    id: "period",
    header: "期间",
    accessor: "period",
  },
  {
    id: "total_debit",
    header: "借方金额",
    accessor: "total_debit",
    render: (value) => (
      <Box sx={{ fontWeight: "bold", color: "error.main" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "total_credit",
    header: "贷方金额",
    accessor: "total_credit",
    render: (value) => (
      <Box sx={{ fontWeight: "bold", color: "success.main" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "maker_name",
    header: "制单人",
    accessor: "maker_name",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => getStatusChip(value),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (voucher: FinancialVoucher) => void,
  onEdit: (voucher: FinancialVoucher) => void,
  onDelete: (voucher: FinancialVoucher) => void,
): RowAction<FinancialVoucher>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit2 style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索凭证编号或摘要...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "draft", label: "草稿" },
      { value: "pending", label: "待审核" },
      { value: "approved", label: "已审核" },
      { value: "posted", label: "已记账" },
      { value: "imported", label: "已导入" },
    ],
  },
  {
    id: "period",
    label: "期间",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "2024-01", label: "2024年01月" },
      { value: "2024-02", label: "2024年02月" },
      { value: "2024-03", label: "2024年03月" },
      { value: "2024-04", label: "2024年04月" },
      { value: "2024-05", label: "2024年05月" },
      { value: "2024-06", label: "2024年06月" },
    ],
  },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusChip = (status: string) => {
  const variants: Record<
    string,
    { color: "success" | "error" | "default" | "warning" | "info"; label: string }
  > = {
    draft: { color: "default", label: "草稿" },
    pending: { color: "warning", label: "待审核" },
    approved: { color: "success", label: "已审核" },
    posted: { color: "info", label: "已记账" },
    imported: { color: "warning", label: "已导入" },
  };
  const config = variants[status] || variants.draft;
  return <Chip size="small" color={config.color} label={config.label} />;
};

// ============ 组件 ============
const FinanceVoucherPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 状态
  const [activeTab, setActiveTab] = useState<string>("vouchers");
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterValue>({});

  // 模态框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<FinancialVoucher | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<FinancialVoucher | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState({
    voucher_number: "",
    voucher_date: "",
    period: "",
    attachment_count: 0,
    summary: "",
    maker_name: "",
    items: [] as VoucherItemRequest[],
  });

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [voucherResult, subjectResult] = await Promise.all([
        voucherApi.list(),
        accountingSubjectApi.list(),
      ]);

      if (voucherResult.success && voucherResult.data) {
        setVouchers(voucherResult.data.items || []);
      }

      if (subjectResult.success && subjectResult.data) {
        setSubjects(subjectResult.data.items || []);
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // 初始加载
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 加载凭证明细
  const fetchVoucherItems = useCallback(
    async (voucherId: string) => {
      try {
        const result = await voucherApi.getItems(voucherId);
        if (result.success && result.data) {
          setVoucherItems(result.data);
        }
      } catch (error) {
        console.error("加载凭证明细失败:", error);
      }
    },
    [],
  );

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return vouchers.filter((voucher) => {
      const matchesSearch =
        !searchText ||
        voucher.voucher_number.toLowerCase().includes(searchText.toLowerCase()) ||
        voucher.summary?.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !filterStatus || voucher.status === filterStatus;
      const matchesPeriod = !filterPeriod || voucher.period === filterPeriod;
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [vouchers, searchText, filterStatus, filterPeriod]);

  // 统计数据
  const voucherStats = useMemo(() => {
    const totalCount = vouchers.length;
    const approvedCount = vouchers.filter(
      (v) => v.status === "approved" || v.status === "posted",
    ).length;
    const pendingCount = vouchers.filter((v) => v.status === "pending").length;
    const totalAmount = vouchers.reduce((sum, v) => sum + v.total_debit, 0);
    return { totalCount, approvedCount, pendingCount, totalAmount };
  }, [vouchers]);

  // 科目统计数据
  const subjectStats = useMemo(() => {
    const totalSubjects = subjects.length;
    const activeSubjects = subjects.filter((s) => s.status === "active").length;
    const level1Subjects = subjects.filter((s) => s.level === 1).length;
    const cashFlowSubjects = subjects.filter((s) => s.is_cash_flow).length;
    return { totalSubjects, activeSubjects, level1Subjects, cashFlowSubjects };
  }, [subjects]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setFilterStatus(value);
      if (filterId === "period") setFilterPeriod(value);
    },
    [],
  );

  // 处理查看
  const handleView = useCallback(
    (voucher: FinancialVoucher) => {
      setSelectedVoucher(voucher);
      fetchVoucherItems(voucher.id);
      setShowDetailDialog(true);
    },
    [fetchVoucherItems],
  );

  // 处理编辑
  const handleEdit = useCallback((voucher: FinancialVoucher) => {
    setEditingVoucher(voucher);
    setFormData({
      voucher_number: voucher.voucher_number,
      voucher_date: voucher.voucher_date?.split("T")[0] || "",
      period: voucher.period,
      attachment_count: voucher.attachment_count || 0,
      summary: voucher.summary || "",
      maker_name: voucher.maker_name || "",
      items: [],
    });
    setShowCreateDialog(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (voucher: FinancialVoucher) => {
      if (!window.confirm("确定要删除该凭证吗？")) return;
      try {
        const response = await voucherApi.delete(voucher.id);
        if (response.success) {
          addNotification({
            type: "success",
            title: "删除成功",
            message: "凭证已删除",
          });
          fetchData();
        }
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除凭证",
        });
      }
    },
    [addNotification, fetchData],
  );

  // 处理批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(`确定要删除选中的 ${selectedIds.length} 张凭证吗？`)
    )
      return;

    try {
      const promises = selectedIds.map((id) => voucherApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          type: "success",
          title: "批量删除成功",
          message: `成功删除 ${successCount} 条记录`,
        });
      } else {
        addNotification({
          type: "warning",
          title: "部分成功",
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
        });
      }

      setSelectedIds([]);
      fetchData();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "批量删除失败",
        message: error.message || "批量删除失败",
      });
    }
  }, [selectedIds, addNotification, fetchData]);

  // 处理批量审核
  const handleBatchAudit = useCallback(async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) =>
        voucherApi.update(id, { status: "approved" }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          type: "success",
          title: "批量审核成功",
          message: `成功审核 ${successCount} 条记录`,
        });
      } else {
        addNotification({
          type: "warning",
          title: "部分成功",
          message: `成功审核 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
        });
      }

      setSelectedIds([]);
      fetchData();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "批量审核失败",
        message: error.message || "批量审核失败",
      });
    }
  }, [selectedIds, addNotification, fetchData]);

  // 处理创建/更新
  const handleSave = useCallback(async () => {
    if (!formData.voucher_number || !formData.voucher_date || !formData.period) {
      addNotification({
        type: "warning",
        title: "提示",
        message: "请填写必填字段",
      });
      return;
    }

    const totalDebit = formData.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = formData.items.reduce((sum, item) => sum + item.credit_amount, 0);

    if (formData.items.length > 0 && totalDebit !== totalCredit) {
      addNotification({
        type: "error",
        title: "错误",
        message: "借贷不平，无法保存凭证",
      });
      return;
    }

    try {
      const response = editingVoucher
        ? await voucherApi.update(editingVoucher.id, formData)
        : await voucherApi.create(formData);

      if (response.success) {
        addNotification({
          type: "success",
          title: "成功",
          message: editingVoucher ? "凭证更新成功" : "凭证创建成功",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "错误",
        message: error.message || "操作失败",
      });
    }
  }, [formData, editingVoucher, addNotification, fetchData]);

  // 处理导入
  const handleImport = useCallback(
    async (fileContent: string) => {
      try {
        const result = await voucherApi.importU8({
          file_name: "u8_vouchers.json",
          file_content: fileContent,
          import_mode: "insert",
        });

        if (result.success && result.data) {
          const { success_count, failed_count } = result.data;
          if (failed_count === 0) {
            addNotification({
              type: "success",
              title: "成功",
              message: `成功导入 ${success_count} 张凭证`,
            });
          } else {
            addNotification({
              type: "warning",
              title: "部分成功",
              message: `成功导入 ${success_count} 张，失败 ${failed_count} 张`,
            });
          }
          setShowImportDialog(false);
          fetchData();
        }
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "错误",
          message: error.message || "导入失败",
        });
      }
    },
    [addNotification, fetchData],
  );

  const resetForm = () => {
    setFormData({
      voucher_number: "",
      voucher_date: "",
      period: "",
      attachment_count: 0,
      summary: "",
      maker_name: "",
      items: [],
    });
    setEditingVoucher(null);
  };

  // 添加凭证明细行
  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: formData.items.length + 1,
      subject_code: "",
      subject_name: "",
      summary: "",
      debit_amount: 0,
      credit_amount: 0,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // 更新凭证明细行
  const updateVoucherItem = (index: number, field: string, value: any) => {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };

    if (field === "subject_code") {
      const subject = subjects.find((s) => s.code === value);
      if (subject) {
        items[index].subject_name = subject.name;
      }
    }

    setFormData((prev) => ({ ...prev, items }));
  };

  // 删除凭证明细行
  const removeVoucherItem = (index: number) => {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      items: items.map((item, i) => ({ ...item, line_number: i + 1 })),
    }));
  };

  return (
    <>
      <PageHeader
        title="财务凭证管理"
        subtitle="管理财务凭证、会计科目，支持用友凭证导入"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Upload style={{ width: 18, height: 18 }} />}
              onClick={() => setShowImportDialog(true)}
              sx={{ borderColor: "#22c55e", color: "#22c55e" }}
            >
              导入用友凭证
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
              sx={{ backgroundColor: "#22c55e" }}
            >
              新增凭证
            </Button>
          </Box>
        }
      />

      {/* 组织筛选 */}
      <Box sx={{ bgcolor: "grey.100", borderRadius: 1, p: 2, mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={false}
        />
      </Box>

      {/* Tab 切换 */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab value="vouchers" label="财务凭证" icon={<FileText style={{ width: 16, height: 16 }} />} iconPosition="start" />
        <Tab value="subjects" label="会计科目" icon={<DollarSign style={{ width: 16, height: 16 }} />} iconPosition="start" />
      </Tabs>

      {activeTab === "vouchers" ? (
        <>
          {/* 统计卡片 */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <MetricCard
              title="凭证总数"
              value={voucherStats.totalCount}
              icon={<FileText sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="blue"
            />
            <MetricCard
              title="已审核"
              value={voucherStats.approvedCount}
              icon={<FileCheck sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="green"
            />
            <MetricCard
              title="待审核"
              value={voucherStats.pendingCount}
              icon={<Clock sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="orange"
            />
            <MetricCard
              title="总金额"
              value={formatCurrency(voucherStats.totalAmount)}
              icon={<DollarSign sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="purple"
            />
          </Box>

          {/* 批量操作栏 */}
          {selectedIds.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "primary.50",
                px: 2,
                py: 1.5,
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip size="small" label={selectedIds.length} />
                <span>条记录已选择</span>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBatchAudit}
                  startIcon={<Check style={{ width: 16, height: 16 }} />}
                  sx={{ borderColor: "#22c55e", color: "#22c55e" }}
                >
                  批量审核
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBatchDelete}
                  startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
                  color="error"
                >
                  批量删除
                </Button>
                <Button variant="outlined" size="small" onClick={() => setSelectedIds([])}>
                  取消选择
                </Button>
              </Box>
            </Box>
          )}

          {/* 列表 */}
          <ListPageTemplate
            columns={getVoucherColumns(handleView, handleEdit, handleDelete)}
            data={filteredData}
            loading={loading}
            rowActions={getRowActions(handleView, handleEdit, handleDelete)}
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={fetchData}
            searchable
            searchPlaceholder="搜索凭证编号或摘要..."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getRowId={(row) => row.id}
            emptyMessage="暂无凭证数据"
          />
        </>
      ) : (
        <>
          {/* 会计科目统计卡片 */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <MetricCard
              title="科目总数"
              value={subjectStats.totalSubjects}
              icon={<DollarSign sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="blue"
            />
            <MetricCard
              title="已启用"
              value={subjectStats.activeSubjects}
              icon={<FileCheck sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="green"
            />
            <MetricCard
              title="一级科目"
              value={subjectStats.level1Subjects}
              icon={<Clock sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="orange"
            />
            <MetricCard
              title="现金流量科目"
              value={subjectStats.cashFlowSubjects}
              icon={<DollarSign sx={{ width: 20, height: 20 }} />}
              trend={null}
              color="purple"
            />
          </Box>
        </>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          resetForm();
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{editingVoucher ? "编辑凭证" : "新增财务凭证"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              <TextField
                size="small"
                label="凭证编号 *"
                value={formData.voucher_number}
                onChange={(e) =>
                  setFormData({ ...formData, voucher_number: e.target.value })
                }
                fullWidth
              />
              <TextField
                size="small"
                type="date"
                label="凭证日期 *"
                value={formData.voucher_date}
                onChange={(e) =>
                  setFormData({ ...formData, voucher_date: e.target.value })
                }
                fullWidth
              />
              <TextField
                size="small"
                label="期间 *"
                value={formData.period}
                onChange={(e) =>
                  setFormData({ ...formData, period: e.target.value })
                }
                placeholder="如: 2024-06"
                fullWidth
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="附件数量"
                value={formData.attachment_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    attachment_count: parseInt(e.target.value) || 0,
                  })
                }
                fullWidth
              />
              <TextField
                size="small"
                label="制单人"
                value={formData.maker_name}
                onChange={(e) =>
                  setFormData({ ...formData, maker_name: e.target.value })
                }
                fullWidth
              />
            </Box>
            <TextField
              size="small"
              multiline
              rows={2}
              label="摘要"
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              fullWidth
            />

            {/* 凭证明细 */}
            <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box component="h6" sx={{ fontWeight: 600, m: 0 }}>
                  凭证明细
                </Box>
                <Button size="small" onClick={addVoucherItem} startIcon={<Plus style={{ width: 16, height: 16 }} />}>
                  添加分录
                </Button>
              </Box>
              <Box sx={{ maxHeight: 256, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                {formData.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ width: 24, textAlign: "center", color: "text.secondary", fontSize: "0.875rem" }}>
                      {item.line_number}
                    </Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>选择科目</InputLabel>
                      <Select
                        value={item.subject_code}
                        label="选择科目"
                        onChange={(e) => updateVoucherItem(index, "subject_code", e.target.value)}
                      >
                        {subjects.map((s) => (
                          <MenuItem key={s.id} value={s.code}>
                            {s.code} - {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      sx={{ width: 100 }}
                      size="small"
                      value={item.subject_name}
                      slotProps={{ input: { readOnly: true } }}
                      placeholder="科目名称"
                    />
                    <TextField
                      sx={{ width: 100 }}
                      size="small"
                      type="number"
                      value={item.debit_amount || ""}
                      onChange={(e) =>
                        updateVoucherItem(index, "debit_amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="借方"
                    />
                    <TextField
                      sx={{ width: 100 }}
                      size="small"
                      type="number"
                      value={item.credit_amount || ""}
                      onChange={(e) =>
                        updateVoucherItem(index, "credit_amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="贷方"
                    />
                    <Button
                      variant="text"
                      size="small"
                      sx={{ color: "error.main" }}
                      onClick={() => removeVoucherItem(index)}
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </Button>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 4, mt: 2 }}>
                <Box sx={{ textAlign: "right" }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>借方合计</Box>
                  <Box sx={{ fontWeight: "bold", color: "error.main" }}>
                    {formatCurrency(formData.items.reduce((sum, item) => sum + item.debit_amount, 0))}
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>贷方合计</Box>
                  <Box sx={{ fontWeight: "bold", color: "success.main" }}>
                    {formatCurrency(formData.items.reduce((sum, item) => sum + item.credit_amount, 0))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: "#22c55e" }}>
            <Check style={{ width: 16, height: 16, mr: 1 }} />
            保存凭证
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>导入用友财务凭证</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: "primary.50", borderRadius: 1, border: 1, borderColor: "primary.200" }}>
              <Box sx={{ color: "primary.main", fontWeight: 500, mb: 1 }}>导入说明</Box>
              <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                请将用友U8系统导出的凭证数据粘贴到下方文本框中。支持JSON格式数据导入。
              </Box>
            </Box>
            <TextField
              id="importData"
              multiline
              rows={12}
              placeholder='[{"voucher_number": "记-001", "voucher_date": "2024-01-15", "period": "2024-01", "summary": "支付办公费用", "maker": "张三", "items": [{"line_number": 1, "subject_code": "6602", "subject_name": "管理费用", "summary": "办公用品", "debit_amount": 500.00, "credit_amount": 0}]}]'
              fullWidth
              sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowImportDialog(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const content = (document.getElementById("importData") as HTMLTextAreaElement)?.value;
              if (!content?.trim()) {
                addNotification({
                  type: "warning",
                  title: "提示",
                  message: "请输入凭证数据",
                });
                return;
              }
              handleImport(content);
            }}
            sx={{ backgroundColor: "#22c55e" }}
          >
            <Upload style={{ width: 16, height: 16, mr: 1 }} />
            开始导入
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <FileText sx={{ width: 20, height: 20, mr: 1, color: "#22c55e" }} />
          凭证详情
        </DialogTitle>
        <DialogContent>
          {selectedVoucher && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>凭证编号</Box>
                  <Box sx={{ fontWeight: "bold", color: "primary.main" }}>{selectedVoucher.voucher_number}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>凭证日期</Box>
                  <Box sx={{ fontWeight: "bold" }}>{selectedVoucher.voucher_date?.split("T")[0]}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>期间</Box>
                  <Box sx={{ fontWeight: "bold" }}>{selectedVoucher.period}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>状态</Box>
                  {getStatusChip(selectedVoucher.status)}
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>摘要</Box>
                <Box sx={{ fontWeight: 500 }}>{selectedVoucher.summary || "-"}</Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>制单人</Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedVoucher.maker_name || "-"}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>审核人</Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedVoucher.checker_name || "-"}</Box>
                </Box>
              </Box>

              {/* 凭证明细 */}
              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                <Box sx={{ fontWeight: 600, mb: 2 }}>凭证明细</Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {voucherItems.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1.5,
                        bgcolor: "grey.50",
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ width: 24, textAlign: "center", color: "text.secondary", fontSize: "0.875rem" }}>
                          {item.line_number}
                        </Box>
                        <Box sx={{ fontWeight: 500 }}>{item.subject_code}</Box>
                        <Box>{item.subject_name}</Box>
                        <Box sx={{ color: "text.secondary" }}>{item.summary}</Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Box sx={{ color: "error.main", fontWeight: "bold", minWidth: 80 }}>
                          {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ""}
                        </Box>
                        <Box sx={{ color: "success.main", fontWeight: "bold", minWidth: 80 }}>
                          {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ""}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 8, mt: 3, borderTop: 1, borderColor: "divider", pt: 2 }}>
                  <Box sx={{ textAlign: "right" }}>
                    <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>借方合计</Box>
                    <Box sx={{ color: "error.main", fontWeight: "bold" }}>{formatCurrency(selectedVoucher.total_debit)}</Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>贷方合计</Box>
                    <Box sx={{ color: "success.main", fontWeight: "bold" }}>{formatCurrency(selectedVoucher.total_credit)}</Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceVoucherPageRefactored;
