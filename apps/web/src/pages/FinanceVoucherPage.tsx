import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Tabs,
  Tab,
  Checkbox,
  Box,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  ChevronLeft,
  Calendar,
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  DollarSign,
  FileCheck,
  Clock,
  Building2,
  CheckSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  voucherApi,
  accountingSubjectApi,
  type FinancialVoucher,
  type VoucherItem,
  type VoucherItemRequest,
  type AccountingSubject,
} from "@/api/erp";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

const FinanceVoucherPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>("vouchers");
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [newVoucher, setNewVoucher] = useState({
    voucher_number: "",
    voucher_date: "",
    period: "",
    attachment_count: 0,
    summary: "",
    maker_name: "",
    items: [] as VoucherItemRequest[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    } catch (err) {
      console.error("加载数据失败:", err);
      addNotification({
        title: "错误",
        message: "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVoucherItems = async (voucherId: string) => {
    try {
      const result = await voucherApi.getItems(voucherId);
      if (result.success && result.data) {
        setVoucherItems(result.data);
      }
    } catch (err) {
      console.error("加载凭证明细失败:", err);
    }
  };

  const handleCreate = async () => {
    if (
      !newVoucher.voucher_number ||
      !newVoucher.voucher_date ||
      !newVoucher.period
    ) {
      addNotification({
        title: "提示",
        message: "请填写必填字段",
        type: "warning",
      });
      return;
    }

    const totalDebit = newVoucher.items.reduce(
      (sum, item) => sum + item.debit_amount,
      0,
    );
    const totalCredit = newVoucher.items.reduce(
      (sum, item) => sum + item.credit_amount,
      0,
    );

    if (totalDebit !== totalCredit) {
      addNotification({
        title: "错误",
        message: "借贷不平，无法创建凭证",
        type: "error",
      });
      return;
    }

    try {
      const result = await voucherApi.create({
        ...newVoucher,
        items: newVoucher.items,
      });

      if (result.success) {
        addNotification({
          title: "成功",
          message: "凭证创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: result.message || "创建失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({ title: "错误", message: "操作失败", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该凭证吗？")) return;

    try {
      const result = await voucherApi.delete(id);
      if (result.success) {
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: result.message || "删除失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({ title: "错误", message: "操作失败", type: "error" });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 张凭证吗？`)) return;

    try {
      const promises = selectedIds.map((id) => voucherApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: "成功",
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: "success",
        });
      } else {
        addNotification({
          title: "部分成功",
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: "warning",
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "批量删除失败",
        type: "error",
      });
    }
  };

  const handleBatchAudit = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) =>
        voucherApi.update(id, { status: "approved" }),
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: "成功",
          message: `批量审核成功，共 ${successCount} 条记录`,
          type: "success",
        });
      } else {
        addNotification({
          title: "部分成功",
          message: `成功审核 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: "warning",
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "批量审核失败",
        type: "error",
      });
    }
  };

  const advancedFilters = useMemo(
    () => [
      {
        label: "状态",
        key: "status",
        type: "select" as const,
        options: [
          { value: "draft", label: "草稿" },
          { value: "pending", label: "待审核" },
          { value: "approved", label: "已审核" },
          { value: "posted", label: "已记账" },
          { value: "imported", label: "已导入" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
      {
        label: "期间",
        key: "period",
        type: "select" as const,
        options: [
          { value: "2024-01", label: "2024年01月" },
          { value: "2024-02", label: "2024年02月" },
          { value: "2024-03", label: "2024年03月" },
          { value: "2024-04", label: "2024年04月" },
          { value: "2024-05", label: "2024年05月" },
          { value: "2024-06", label: "2024年06月" },
        ],
        value: periodFilter,
        onChange: setPeriodFilter,
      },
    ],
    [statusFilter, periodFilter],
  );

  const handleImport = async (fileContent: string) => {
    try {
      const result = await voucherApi.importU8({
        file_name: "u8_vouchers.json",
        file_content: fileContent,
        import_mode: "insert",
      });

      if (result.success && result.data) {
        const { success_count, failed_count, errors } = result.data;
        if (failed_count === 0) {
          addNotification({
            title: "成功",
            message: `成功导入${success_count}张凭证`,
            type: "success",
          });
        } else {
          addNotification({
            title: "部分成功",
            message: `成功导入${success_count}张，失败${failed_count}张`,
            type: "warning",
          });
          errors.forEach((err) => console.warn("导入错误:", err));
        }
        setShowImportModal(false);
        loadData();
      }
    } catch (err) {
      addNotification({ title: "错误", message: "导入失败", type: "error" });
    }
  };

  const resetForm = () => {
    setNewVoucher({
      voucher_number: "",
      voucher_date: "",
      period: "",
      attachment_count: 0,
      summary: "",
      maker_name: "",
      items: [],
    });
  };

  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: newVoucher.items.length + 1,
      subject_code: "",
      subject_name: "",
      summary: "",
      debit_amount: 0,
      credit_amount: 0,
    };
    setNewVoucher((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateVoucherItem = (index: number, field: string, value: any) => {
    const items = [...newVoucher.items];
    items[index] = { ...items[index], [field]: value };

    if (field === "subject_code") {
      const subject = subjects.find((s) => s.code === value);
      if (subject) {
        items[index].subject_name = subject.name;
      }
    }

    setNewVoucher((prev) => ({ ...prev, items }));
  };

  const removeVoucherItem = (index: number) => {
    const items = newVoucher.items.filter((_, i) => i !== index);
    setNewVoucher((prev) => ({
      ...prev,
      items: items.map((item, i) => ({ ...item, line_number: i + 1 })),
    }));
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      draft: { variant: "outline", label: "草稿" },
      pending: { variant: "secondary", label: "待审核" },
      approved: { variant: "default", label: "已审核" },
      posted: { variant: "default", label: "已记账" },
      imported: { variant: "secondary", label: "已导入" },
    };
    const config = badges[status] || {
      variant: "outline" as const,
      label: status,
    };
    return (
      <Chip
        size="small"
        variant={config.variant === "outline" ? "outlined" : "filled"}
        label={config.label}
      />
    );
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

  const voucherColumns = useMemo<ColumnDef<FinancialVoucher>[]>(
    () => [
      {
        accessorKey: "voucher_number",
        header: "凭证编号",
        cell: ({ row }) => (
          <Typography sx={{ fontWeight: 500, color: "primary.main" }}>
            {row.original.voucher_number}
          </Typography>
        ),
      },
      {
        accessorKey: "voucher_date",
        header: "凭证日期",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            {row.original.voucher_date?.split("T")[0] || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "period",
        header: "期间",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {row.original.period}
          </Typography>
        ),
      },
      {
        accessorKey: "total_debit",
        header: "借方金额",
        cell: ({ row }) => (
          <Typography sx={{ fontWeight: "bold", color: "red.600" }}>
            {formatCurrency(row.original.total_debit)}
          </Typography>
        ),
      },
      {
        accessorKey: "total_credit",
        header: "贷方金额",
        cell: ({ row }) => (
          <Typography sx={{ fontWeight: "bold", color: "green.600" }}>
            {formatCurrency(row.original.total_credit)}
          </Typography>
        ),
      },
      {
        accessorKey: "maker_name",
        header: "制单人",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            {row.original.maker_name || "-"}
          </Typography>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setCurrentVoucher(row.original);
                loadVoucherItems(row.original.id);
                setShowDetailModal(true);
              }}
            >
              <Eye sx={{ width: 16, height: 16 }} />
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setNewVoucher({
                  voucher_number: row.original.voucher_number,
                  voucher_date: row.original.voucher_date?.split("T")[0] || "",
                  period: row.original.period,
                  attachment_count: row.original.attachment_count || 0,
                  summary: row.original.summary || "",
                  maker_name: row.original.maker_name || "",
                  items: [],
                });
                setShowCreateModal(true);
              }}
            >
              <Edit sx={{ width: 16, height: 16 }} />
            </Button>
            <Button
              variant="text"
              size="small"
              sx={{ color: "red.600" }}
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 sx={{ width: 16, height: 16 }} />
            </Button>
          </Box>
        ),
      },
    ],
    [],
  );

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      const matchesSearch =
        !searchQuery ||
        voucher.voucher_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        voucher.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPeriod = !periodFilter || voucher.period === periodFilter;
      const matchesStatus = !statusFilter || voucher.status === statusFilter;
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [vouchers, searchQuery, periodFilter, statusFilter]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "slate.50",
        dark: { bgcolor: "slate.900" },
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          dark: { bgcolor: "slate.800" },
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Button>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <FileText
                    sx={{ width: 28, height: 28, mr: 1.5, color: "indigo.600" }}
                  />
                  财务凭证管理
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mt: 0.5, color: "text.secondary" }}
                >
                  管理财务凭证、会计科目，支持用友凭证导入
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                onClick={() => setShowImportModal(true)}
                sx={{
                  backgroundColor: "green.600",
                  "&:hover": { backgroundColor: "green.700" },
                }}
              >
                <Upload sx={{ width: 16, height: 16, mr: 1 }} />
                导入用友凭证
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              >
                <Plus sx={{ width: 16, height: 16, mr: 1 }} />
                新增凭证
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab
            value="vouchers"
            label="财务凭证"
            icon={<FileText sx={{ width: 16, height: 16 }} />}
            iconPosition="start"
          />
          <Tab
            value="subjects"
            label="会计科目"
            icon={<Search sx={{ width: 16, height: 16 }} />}
            iconPosition="start"
          />
        </Tabs>

        <Box sx={{ display: activeTab === "vouchers" ? "block" : "none" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr 1fr",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            <Card
              sx={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      凭证总数
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: "bold", mt: 1 }}>
                      {vouchers.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <FileText sx={{ width: 24, height: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      已审核
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: "bold", mt: 1 }}>
                      {
                        vouchers.filter(
                          (v) =>
                            v.status === "approved" || v.status === "posted",
                        ).length
                      }
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <FileCheck sx={{ width: 24, height: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      待审核
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: "bold", mt: 1 }}>
                      {vouchers.filter((v) => v.status === "pending").length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Clock sx={{ width: 24, height: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      总金额
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: "bold", mt: 1 }}>
                      {formatCurrency(
                        vouchers.reduce((sum, v) => sum + v.total_debit, 0),
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <DollarSign sx={{ width: 24, height: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {selectedIds.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "blue.50",
                px: 2,
                py: 1.5,
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" sx={{ color: "blue.700" }}>
                  已选择{" "}
                  <Chip
                    size="small"
                    sx={{ ml: 2 }}
                    label={selectedIds.length.toString()}
                  />
                  条记录
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBatchAudit}
                  sx={{
                    color: "green.600",
                    borderColor: "green.600",
                    "&:hover": { color: "green.700", borderColor: "green.700" },
                  }}
                >
                  <Check sx={{ width: 16, height: 16, mr: 0.5 }} />
                  批量审核
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBatchDelete}
                  sx={{
                    color: "red.600",
                    borderColor: "red.600",
                    "&:hover": { color: "red.700", borderColor: "red.700" },
                  }}
                >
                  <Trash2 sx={{ width: 16, height: 16, mr: 0.5 }} />
                  批量删除
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedIds([])}
                >
                  取消选择
                </Button>
              </Box>
            </Box>
          )}

          <Card>
            <CardHeader>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}
              >
                <FileText
                  sx={{ width: 20, height: 20, mr: 1, color: "indigo.600" }}
                />
                财务凭证列表
              </Typography>
            </CardHeader>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ p: 6, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      width: 32,
                      height: 32,
                      border: 4,
                      borderColor: "primary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <Typography sx={{ mt: 2, color: "text.secondary" }}>
                    加载中...
                  </Typography>
                </Box>
              ) : (
                <EnhancedDataTable
                  columns={voucherColumns}
                  data={filteredVouchers}
                  searchPlaceholder="搜索凭证编号或摘要..."
                  searchKey="voucher_number"
                  loading={loading}
                  enableSelection={true}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  selectionKey="id"
                  enableAdvancedFilter={true}
                  advancedFilters={advancedFilters}
                  exportFileName="voucher-report"
                  onRefresh={loadData}
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: activeTab === "subjects" ? "block" : "none" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    科目总数
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: "indigo.600", mt: 1 }}
                  >
                    {subjects.length}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "blue.100" }}>
                  <Building2
                    sx={{ width: 24, height: 24, color: "blue.600" }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    已启用
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: "green.600", mt: 1 }}
                  >
                    {subjects.filter((s) => s.status === "active").length}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "green.100" }}>
                  <FileCheck
                    sx={{ width: 24, height: 24, color: "green.600" }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    一级科目
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: "orange.600", mt: 1 }}
                  >
                    {subjects.filter((s) => s.level === 1).length}
                  </Typography>
                </Box>
                <Box
                  sx={{ p: 1.5, borderRadius: "50%", bgcolor: "orange.100" }}
                >
                  <DollarSign
                    sx={{ width: 24, height: 24, color: "orange.600" }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    现金流量科目
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: "purple.600", mt: 1 }}
                  >
                    {subjects.filter((s) => s.is_cash_flow).length}
                  </Typography>
                </Box>
                <Box
                  sx={{ p: 1.5, borderRadius: "50%", bgcolor: "purple.100" }}
                >
                  <Clock sx={{ width: 24, height: 24, color: "purple.600" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              sx={{
                "&:hover": { boxShadow: 3 },
                transition: "box-shadow 0.3s",
                border: 1,
                borderColor: "divider",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "bold", color: "indigo.600" }}
                    >
                      {subject.code}
                    </Typography>
                    {subject.is_cash_flow && (
                      <Chip
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.75rem" }}
                        label="现金流量"
                      />
                    )}
                  </Box>
                  <Chip
                    size="small"
                    variant={
                      subject.status === "active" ? "filled" : "outlined"
                    }
                    sx={{ backgroundColor: "green.100", color: "green.700" }}
                    label={subject.status === "active" ? "启用" : "禁用"}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {subject.name}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mt: 1,
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">层级: {subject.level}</Typography>
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      bgcolor: "grey.300",
                    }}
                  />
                  <Typography variant="body2">
                    {subject.category || "未分类"}
                  </Typography>
                </Box>
                {subject.parent_code && (
                  <Box
                    sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "grey.100" }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled" }}
                    >
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{ fontWeight: 500 }}
                      >
                        上级科目:
                      </Typography>{" "}
                      {subject.parent_code}
                    </Typography>
                  </Box>
                )}
                {subject.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mt: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {subject.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        <Dialog
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          maxWidth="lg"
        >
          <DialogTitle>
            {newVoucher.voucher_number ? "编辑凭证" : "新增财务凭证"}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                <TextField
                  label="凭证编号 *"
                  value={newVoucher.voucher_number}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({
                      ...prev,
                      voucher_number: e.target.value,
                    }))
                  }
                  placeholder="请输入凭证编号"
                  fullWidth
                />
                <TextField
                  label="凭证日期 *"
                  type="date"
                  value={newVoucher.voucher_date}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({
                      ...prev,
                      voucher_date: e.target.value,
                    }))
                  }
                  fullWidth
                />
                <TextField
                  label="期间 *"
                  value={newVoucher.period}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({
                      ...prev,
                      period: e.target.value,
                    }))
                  }
                  placeholder="如: 2024-06"
                  fullWidth
                />
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <TextField
                  label="附件数量"
                  type="number"
                  value={newVoucher.attachment_count}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({
                      ...prev,
                      attachment_count: parseInt(e.target.value) || 0,
                    }))
                  }
                  fullWidth
                />
                <TextField
                  label="制单人"
                  value={newVoucher.maker_name}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({
                      ...prev,
                      maker_name: e.target.value,
                    }))
                  }
                  placeholder="制单人姓名"
                  fullWidth
                />
              </Box>
              <TextField
                label="摘要"
                multiline
                rows={2}
                value={newVoucher.summary}
                onChange={(e) =>
                  setNewVoucher((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                placeholder="凭证摘要"
                fullWidth
              />

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    凭证明细
                  </Typography>
                  <Button size="small" onClick={addVoucherItem}>
                    <Plus sx={{ width: 16, height: 16 }} />
                    添加分录
                  </Button>
                </Box>
                <Box
                  sx={{
                    maxHeight: 256,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {newVoucher.items.map((item, index) => (
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
                      <Typography
                        sx={{
                          width: 24,
                          textAlign: "center",
                          color: "text.secondary",
                          fontSize: "0.875rem",
                        }}
                      >
                        {item.line_number}
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>选择科目</InputLabel>
                        <Select
                          value={item.subject_code}
                          label="选择科目"
                          onChange={(e) =>
                            updateVoucherItem(
                              index,
                              "subject_code",
                              e.target.value,
                            )
                          }
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
                        value={item.subject_name}
                        slotProps={{ input: { readOnly: true } }}
                        placeholder="科目名称"
                      />
                      <TextField
                        sx={{ width: 100 }}
                        type="number"
                        value={item.debit_amount || ""}
                        onChange={(e) =>
                          updateVoucherItem(
                            index,
                            "debit_amount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="借方"
                      />
                      <TextField
                        sx={{ width: 100 }}
                        type="number"
                        value={item.credit_amount || ""}
                        onChange={(e) =>
                          updateVoucherItem(
                            index,
                            "credit_amount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="贷方"
                      />
                      <Button
                        variant="text"
                        size="small"
                        sx={{ color: "red" }}
                        onClick={() => removeVoucherItem(index)}
                      >
                        <X sx={{ width: 16, height: 16 }} />
                      </Button>
                    </Box>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 4,
                    mt: 2,
                  }}
                >
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      借方合计
                    </Typography>
                    <Typography sx={{ fontWeight: "bold", color: "red.600" }}>
                      {formatCurrency(
                        newVoucher.items.reduce(
                          (sum, item) => sum + item.debit_amount,
                          0,
                        ),
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      贷方合计
                    </Typography>
                    <Typography sx={{ fontWeight: "bold", color: "green.600" }}>
                      {formatCurrency(
                        newVoucher.items.reduce(
                          (sum, item) => sum + item.credit_amount,
                          0,
                        ),
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <DialogActions>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button onClick={handleCreate}>
                <Check sx={{ width: 16, height: 16, mr: 1 }} />
                保存凭证
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          maxWidth="lg"
        >
          <DialogTitle>导入用友财务凭证</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <Box sx={{ p: 2, bgcolor: "blue.50", borderRadius: 1 }}>
                <AlertCircle
                  sx={{ width: 20, height: 20, color: "blue.600", mb: 1 }}
                />
                <Typography variant="body2" sx={{ color: "blue.800" }}>
                  请将用友U8系统导出的凭证数据粘贴到下方文本框中。支持JSON格式数据导入。
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  用友凭证数据 (JSON格式)
                </Typography>
                <TextField
                  id="importData"
                  multiline
                  rows={12}
                  placeholder='[{"voucher_number": "记-001", "voucher_date": "2024-01-15", "period": "2024-01", "summary": "支付办公费用", "maker": "张三", "items": [{"line_number": 1, "subject_code": "6602", "subject_name": "管理费用", "summary": "办公用品", "debit_amount": 500.00, "credit_amount": 0}]}]'
                  fullWidth
                  sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const sampleData = JSON.stringify(
                      [
                        {
                          voucher_number: "记-001",
                          voucher_date: "2024-01-15",
                          period: "2024-01",
                          summary: "支付办公费用",
                          maker: "张三",
                          items: [
                            {
                              line_number: 1,
                              subject_code: "6602",
                              subject_name: "管理费用",
                              summary: "办公用品",
                              debit_amount: 500.0,
                              credit_amount: 0,
                            },
                            {
                              line_number: 2,
                              subject_code: "1002",
                              subject_name: "银行存款",
                              summary: "",
                              debit_amount: 0,
                              credit_amount: 500.0,
                            },
                          ],
                        },
                      ],
                      null,
                      2,
                    );
                    (
                      document.getElementById(
                        "importData",
                      ) as HTMLTextAreaElement
                    ).value = sampleData;
                  }}
                >
                  <Download sx={{ width: 16, height: 16, mr: 1 }} />
                  加载示例数据
                </Button>
              </Box>
            </Box>
            <DialogActions>
              <Button
                variant="outlined"
                onClick={() => setShowImportModal(false)}
              >
                取消
              </Button>
              <Button
                sx={{
                  backgroundColor: "green",
                  "&:hover": { backgroundColor: "green" },
                }}
                onClick={() => {
                  const content = (
                    document.getElementById("importData") as HTMLTextAreaElement
                  ).value;
                  if (!content.trim()) {
                    addNotification({
                      title: "提示",
                      message: "请输入凭证数据",
                      type: "warning",
                    });
                    return;
                  }
                  handleImport(content);
                }}
              >
                <Upload sx={{ width: 16, height: 16, mr: 1 }} />
                开始导入
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          maxWidth="lg"
        >
          <DialogTitle>凭证详情</DialogTitle>
          <DialogContent>
            {currentVoucher && (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      凭证编号
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ color: "indigo.600", fontWeight: "bold" }}
                    >
                      {currentVoucher.voucher_number}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      凭证日期
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {currentVoucher.voucher_date?.split("T")[0]}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      期间
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {currentVoucher.period}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      状态
                    </Typography>
                    {getStatusBadge(currentVoucher.status)}
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    摘要
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {currentVoucher.summary || "-"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      制单人
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {currentVoucher.maker_name || "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      审核人
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {currentVoucher.checker_name || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    凭证明细
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Typography
                            sx={{
                              width: 24,
                              textAlign: "center",
                              color: "text.secondary",
                              fontSize: "0.875rem",
                            }}
                          >
                            {item.line_number}
                          </Typography>
                          <Typography sx={{ fontWeight: 500 }}>
                            {item.subject_code}
                          </Typography>
                          <Typography>{item.subject_name}</Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                          >
                            {item.summary}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Typography
                            sx={{ color: "red.600", fontWeight: "bold" }}
                          >
                            {item.debit_amount > 0
                              ? formatCurrency(item.debit_amount)
                              : ""}
                          </Typography>
                          <Typography
                            sx={{ color: "green.600", fontWeight: "bold" }}
                          >
                            {item.credit_amount > 0
                              ? formatCurrency(item.credit_amount)
                              : ""}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      mt: 3,
                      borderTop: 1,
                      borderColor: "divider",
                      pt: 2,
                    }}
                  >
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        借方合计
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ color: "red.600", fontWeight: "bold" }}
                      >
                        {formatCurrency(currentVoucher.total_debit)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        贷方合计
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ color: "green.600", fontWeight: "bold" }}
                      >
                        {formatCurrency(currentVoucher.total_credit)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
            <DialogActions>
              <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default FinanceVoucherPage;
